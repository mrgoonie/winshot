package upload

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

const (
	r2UploadTimeout  = 60 * time.Second
	r2TestTimeout    = 10 * time.Second
	r2MaxRetries     = 3
	r2RetryBaseDelay = 500 * time.Millisecond
	r2MaxFileSize    = 50 * 1024 * 1024 // 50MB max file size
)

// R2Config holds configuration for Cloudflare R2.
type R2Config struct {
	AccountID string `json:"accountId"`
	Bucket    string `json:"bucket"`
	PublicURL string `json:"publicUrl"`
}

// R2Uploader implements Uploader for Cloudflare R2.
type R2Uploader struct {
	creds  *CredentialManager
	config *R2Config
}

// NewR2Uploader creates a new R2Uploader instance.
func NewR2Uploader(creds *CredentialManager, cfg *R2Config) *R2Uploader {
	return &R2Uploader{creds: creds, config: cfg}
}

// IsConfigured returns true if R2 credentials and config are set.
func (r *R2Uploader) IsConfigured() bool {
	if r.config == nil || r.config.AccountID == "" || r.config.Bucket == "" || r.config.PublicURL == "" {
		return false
	}
	return r.creds.Exists(CredR2AccessKeyID) && r.creds.Exists(CredR2SecretAccessKey)
}

// getClient creates an S3 client configured for Cloudflare R2.
func (r *R2Uploader) getClient() (*s3.Client, error) {
	accessKey, err := r.creds.Get(CredR2AccessKeyID)
	if err != nil {
		return nil, fmt.Errorf("missing R2 access key: %w", err)
	}
	secretKey, err := r.creds.Get(CredR2SecretAccessKey)
	if err != nil {
		return nil, fmt.Errorf("missing R2 secret key: %w", err)
	}

	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", r.config.AccountID)

	client := s3.New(s3.Options{
		Region:       "auto",
		BaseEndpoint: aws.String(endpoint),
		Credentials:  credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
	})

	return client, nil
}

// detectContentType returns the MIME type based on filename extension.
func detectContentType(filename string) string {
	lower := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(lower, ".jpg"), strings.HasSuffix(lower, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(lower, ".png"):
		return "image/png"
	case strings.HasSuffix(lower, ".gif"):
		return "image/gif"
	case strings.HasSuffix(lower, ".webp"):
		return "image/webp"
	case strings.HasSuffix(lower, ".bmp"):
		return "image/bmp"
	case strings.HasSuffix(lower, ".svg"):
		return "image/svg+xml"
	case strings.HasSuffix(lower, ".tiff"), strings.HasSuffix(lower, ".tif"):
		return "image/tiff"
	default:
		return "application/octet-stream"
	}
}

// Upload uploads image data to R2 with retry logic.
func (r *R2Uploader) Upload(ctx context.Context, data []byte, filename string) (*UploadResult, error) {
	// Check context before starting
	if err := ctx.Err(); err != nil {
		return &UploadResult{Success: false, Error: err.Error()}, err
	}

	// Validate file size
	if len(data) == 0 {
		return &UploadResult{Success: false, Error: "empty file data"}, errors.New("empty file data")
	}
	if len(data) > r2MaxFileSize {
		errMsg := fmt.Sprintf("file size %d exceeds maximum %d bytes", len(data), r2MaxFileSize)
		return &UploadResult{Success: false, Error: errMsg}, errors.New(errMsg)
	}

	client, err := r.getClient()
	if err != nil {
		return &UploadResult{Success: false, Error: err.Error()}, err
	}

	contentType := detectContentType(filename)

	var lastErr error
	for attempt := 0; attempt < r2MaxRetries; attempt++ {
		// Check context before each retry
		if err := ctx.Err(); err != nil {
			return &UploadResult{Success: false, Error: err.Error()}, err
		}

		if attempt > 0 {
			// Exponential backoff: 1s, 2s (attempt 1: 1<<1=2*500ms=1s, attempt 2: 1<<2=4*500ms=2s)
			delay := r2RetryBaseDelay * time.Duration(1<<attempt)
			select {
			case <-ctx.Done():
				return &UploadResult{Success: false, Error: ctx.Err().Error()}, ctx.Err()
			case <-time.After(delay):
			}
		}

		uploadCtx, cancel := context.WithTimeout(ctx, r2UploadTimeout)
		_, err = client.PutObject(uploadCtx, &s3.PutObjectInput{
			Bucket:      aws.String(r.config.Bucket),
			Key:         aws.String(filename),
			Body:        bytes.NewReader(data),
			ContentType: aws.String(contentType),
		})
		cancel()

		if err == nil {
			// Success - construct public URL with proper encoding
			encodedFilename := url.PathEscape(filename)
			publicURL := strings.TrimSuffix(r.config.PublicURL, "/") + "/" + encodedFilename
			return &UploadResult{Success: true, PublicURL: publicURL}, nil
		}
		lastErr = err
	}

	// All retries failed
	errMsg := fmt.Sprintf("upload failed after %d attempts: %v", r2MaxRetries, lastErr)
	return &UploadResult{Success: false, Error: errMsg}, lastErr
}

// TestConnection verifies R2 credentials and bucket access.
func (r *R2Uploader) TestConnection() error {
	client, err := r.getClient()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), r2TestTimeout)
	defer cancel()

	_, err = client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(r.config.Bucket),
	})
	if err != nil {
		return fmt.Errorf("R2 connection test failed: %w", err)
	}

	return nil
}
