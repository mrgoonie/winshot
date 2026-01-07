package upload

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

const (
	gdriveCallbackPort  = 8089
	gdriveAuthTimeout   = 5 * time.Minute
	gdriveUploadTimeout = 60 * time.Second
	gdriveMaxFileSize   = 50 * 1024 * 1024 // 50MB
)

// GDriveConfig holds configuration for Google Drive.
type GDriveConfig struct {
	UseDefaultCredentials bool   `json:"useDefaultCredentials"`
	FolderID              string `json:"folderId,omitempty"`
}

// GDriveUploader implements Uploader for Google Drive.
type GDriveUploader struct {
	creds     *CredentialManager
	config    *GDriveConfig
	authState string
	authDone  chan string
	authErr   chan error
	server    *http.Server
	mu        sync.Mutex
}

// NewGDriveUploader creates a new GDriveUploader instance.
func NewGDriveUploader(creds *CredentialManager, cfg *GDriveConfig) *GDriveUploader {
	return &GDriveUploader{
		creds:  creds,
		config: cfg,
	}
}

// getOAuthConfig returns the OAuth2 configuration.
func (g *GDriveUploader) getOAuthConfig() (*oauth2.Config, error) {
	var clientID, clientSecret string

	// Check for user-provided credentials in Credential Manager
	if storedClientID, err := g.creds.Get(CredGDriveClientID); err == nil && storedClientID != "" {
		clientID = storedClientID
	}
	if storedClientSecret, err := g.creds.Get(CredGDriveClientSecret); err == nil && storedClientSecret != "" {
		clientSecret = storedClientSecret
	}

	if clientID == "" || clientSecret == "" {
		return nil, errors.New("Google OAuth credentials not configured. Please set Client ID and Client Secret in Settings")
	}

	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  fmt.Sprintf("http://localhost:%d/callback", gdriveCallbackPort),
		Scopes:       []string{drive.DriveFileScope},
		Endpoint:     google.Endpoint,
	}, nil
}

// IsConfigured returns true if GDrive has valid stored token.
func (g *GDriveUploader) IsConfigured() bool {
	connected, _, _ := g.IsConnected()
	return connected
}

// IsConnected checks if a valid token exists and returns user email.
func (g *GDriveUploader) IsConnected() (bool, string, error) {
	tokenJSON, err := g.creds.Get(CredGDriveToken)
	if err != nil {
		return false, "", nil
	}

	var token oauth2.Token
	if err := json.Unmarshal([]byte(tokenJSON), &token); err != nil {
		return false, "", nil
	}

	// Try to get user info
	svc, err := g.getService()
	if err != nil {
		return false, "", nil
	}

	about, err := svc.About.Get().Fields("user").Do()
	if err != nil {
		return false, "", nil
	}

	return true, about.User.EmailAddress, nil
}

// StartAuth begins the OAuth2 flow and returns the auth URL.
func (g *GDriveUploader) StartAuth() (string, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	cfg, err := g.getOAuthConfig()
	if err != nil {
		return "", err
	}

	// Generate state token for CSRF protection
	g.authState = fmt.Sprintf("%d", time.Now().UnixNano())
	g.authDone = make(chan string, 1)
	g.authErr = make(chan error, 1)

	// Check if port is available
	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", gdriveCallbackPort))
	if err != nil {
		return "", fmt.Errorf("callback port %d is in use: %w", gdriveCallbackPort, err)
	}

	// Start callback server
	mux := http.NewServeMux()
	mux.HandleFunc("/callback", g.handleCallback)

	g.server = &http.Server{
		Handler: mux,
	}

	go func() {
		if err := g.server.Serve(listener); err != nil && err != http.ErrServerClosed {
			g.authErr <- err
		}
	}()

	// Return auth URL
	authURL := cfg.AuthCodeURL(g.authState, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	return authURL, nil
}

// handleCallback processes the OAuth callback.
func (g *GDriveUploader) handleCallback(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	if state != g.authState {
		http.Error(w, "Invalid state", http.StatusBadRequest)
		g.authErr <- errors.New("invalid state parameter")
		return
	}

	errParam := r.URL.Query().Get("error")
	if errParam != "" {
		http.Error(w, "Authorization denied", http.StatusUnauthorized)
		g.authErr <- fmt.Errorf("authorization denied: %s", errParam)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "No code provided", http.StatusBadRequest)
		g.authErr <- errors.New("no authorization code received")
		return
	}

	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, `<!DOCTYPE html><html><head><title>WinShot - Authorization</title>
<style>body{font-family:system-ui;text-align:center;padding-top:50px;background:#f5f5f5}
.container{background:white;border-radius:8px;padding:40px;max-width:400px;margin:0 auto;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
h1{color:#22c55e;margin-bottom:10px}p{color:#666}</style></head>
<body><div class="container"><h1>Authorization Successful!</h1>
<p>You can close this window and return to WinShot.</p></div>
<script>setTimeout(function(){window.close()},2000);</script></body></html>`)

	g.authDone <- code
}

// WaitForAuth waits for the OAuth callback with timeout.
func (g *GDriveUploader) WaitForAuth() error {
	select {
	case code := <-g.authDone:
		return g.CompleteAuth(code)
	case err := <-g.authErr:
		g.stopServer()
		return err
	case <-time.After(gdriveAuthTimeout):
		g.stopServer()
		return errors.New("authorization timeout - please try again")
	}
}

// CompleteAuth exchanges the auth code for tokens.
func (g *GDriveUploader) CompleteAuth(code string) error {
	cfg, err := g.getOAuthConfig()
	if err != nil {
		g.stopServer()
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	token, err := cfg.Exchange(ctx, code)
	if err != nil {
		g.stopServer()
		return fmt.Errorf("failed to exchange code for token: %w", err)
	}

	tokenJSON, err := json.Marshal(token)
	if err != nil {
		g.stopServer()
		return fmt.Errorf("failed to serialize token: %w", err)
	}

	if err := g.creds.Set(CredGDriveToken, string(tokenJSON)); err != nil {
		g.stopServer()
		return fmt.Errorf("failed to save token: %w", err)
	}

	g.stopServer()
	return nil
}

// stopServer gracefully stops the callback server.
func (g *GDriveUploader) stopServer() {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		g.server.Shutdown(ctx)
		g.server = nil
	}
}

// Disconnect removes stored tokens.
func (g *GDriveUploader) Disconnect() error {
	g.creds.Delete(CredGDriveToken)
	return nil
}

// getService creates a Google Drive service client.
func (g *GDriveUploader) getService() (*drive.Service, error) {
	tokenJSON, err := g.creds.Get(CredGDriveToken)
	if err != nil {
		return nil, errors.New("not authenticated - please connect your Google account")
	}

	var token oauth2.Token
	if err := json.Unmarshal([]byte(tokenJSON), &token); err != nil {
		return nil, errors.New("invalid stored token - please reconnect your Google account")
	}

	cfg, err := g.getOAuthConfig()
	if err != nil {
		return nil, err
	}

	// Create token source that auto-refreshes
	tokenSource := cfg.TokenSource(context.Background(), &token)

	// Check if token was refreshed and save new token
	newToken, err := tokenSource.Token()
	if err != nil {
		return nil, fmt.Errorf("token refresh failed - please reconnect: %w", err)
	}

	// Save refreshed token if it changed
	if newToken.AccessToken != token.AccessToken {
		if tokenJSON, err := json.Marshal(newToken); err == nil {
			g.creds.Set(CredGDriveToken, string(tokenJSON))
		}
	}

	return drive.NewService(context.Background(),
		option.WithTokenSource(tokenSource))
}

// Upload uploads image data to Google Drive and returns public URL.
func (g *GDriveUploader) Upload(ctx context.Context, data []byte, filename string) (*UploadResult, error) {
	// Check context before starting
	if err := ctx.Err(); err != nil {
		return &UploadResult{Success: false, Error: err.Error()}, err
	}

	// Validate file size
	if len(data) == 0 {
		return &UploadResult{Success: false, Error: "empty file data"}, errors.New("empty file data")
	}
	if len(data) > gdriveMaxFileSize {
		errMsg := fmt.Sprintf("file size %d exceeds maximum %d bytes", len(data), gdriveMaxFileSize)
		return &UploadResult{Success: false, Error: errMsg}, errors.New(errMsg)
	}

	svc, err := g.getService()
	if err != nil {
		return &UploadResult{Success: false, Error: err.Error()}, err
	}

	// Determine mime type
	mimeType := detectContentType(filename)

	// Create file metadata
	file := &drive.File{
		Name:     filename,
		MimeType: mimeType,
	}

	if g.config != nil && g.config.FolderID != "" {
		file.Parents = []string{g.config.FolderID}
	}

	// Upload with timeout
	uploadCtx, cancel := context.WithTimeout(ctx, gdriveUploadTimeout)
	defer cancel()

	res, err := svc.Files.Create(file).
		Media(bytes.NewReader(data)).
		Context(uploadCtx).
		Do()
	if err != nil {
		return &UploadResult{Success: false, Error: fmt.Sprintf("upload failed: %v", err)}, err
	}

	// Set public permission
	perm := &drive.Permission{
		Type: "anyone",
		Role: "reader",
	}
	_, err = svc.Permissions.Create(res.Id, perm).Context(uploadCtx).Do()
	if err != nil {
		return &UploadResult{
			Success: false,
			Error:   fmt.Sprintf("uploaded but failed to share: %v", err),
		}, err
	}

	publicURL := "https://drive.google.com/file/d/" + res.Id + "/view"

	return &UploadResult{Success: true, PublicURL: publicURL}, nil
}

// TestConnection verifies GDrive credentials are valid.
func (g *GDriveUploader) TestConnection() error {
	svc, err := g.getService()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = svc.About.Get().Fields("user").Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("GDrive connection test failed: %w", err)
	}

	return nil
}
