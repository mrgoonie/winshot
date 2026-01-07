package upload

import (
	"context"
	"testing"
	"time"
)

func TestGDriveUploader_IsConfigured(t *testing.T) {
	cm := NewCredentialManager()

	tests := []struct {
		name   string
		config *GDriveConfig
		want   bool
	}{
		{
			name:   "nil config no token",
			config: nil,
			want:   false,
		},
		{
			name:   "empty config no token",
			config: &GDriveConfig{},
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			uploader := NewGDriveUploader(cm, tt.config)
			if got := uploader.IsConfigured(); got != tt.want {
				t.Errorf("IsConfigured() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGDriveUploader_IsConnected(t *testing.T) {
	cm := NewCredentialManager()

	uploader := NewGDriveUploader(cm, nil)
	connected, email, err := uploader.IsConnected()

	// Should not be connected without token
	if connected {
		t.Error("Expected not connected without token")
	}
	if email != "" {
		t.Errorf("Expected empty email, got %q", email)
	}
	if err != nil {
		t.Errorf("Expected no error for missing token, got %v", err)
	}
}

func TestGDriveUploader_GetOAuthConfigMissingCredentials(t *testing.T) {
	cm := NewCredentialManager()

	uploader := NewGDriveUploader(cm, nil)
	_, err := uploader.getOAuthConfig()

	if err == nil {
		t.Error("Expected error for missing OAuth credentials")
	}
}

func TestGDriveUploader_StartAuthMissingCredentials(t *testing.T) {
	cm := NewCredentialManager()

	uploader := NewGDriveUploader(cm, nil)
	_, err := uploader.StartAuth()

	if err == nil {
		t.Error("Expected error for missing OAuth credentials")
	}
}

func TestGDriveUploader_UploadMissingAuth(t *testing.T) {
	cm := NewCredentialManager()

	uploader := NewGDriveUploader(cm, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := uploader.Upload(ctx, []byte("test data"), "test.png")

	if err == nil {
		t.Error("Expected error for missing auth")
	}
	if result.Success {
		t.Error("Expected Success=false for missing auth")
	}
}

func TestGDriveUploader_UploadEmptyData(t *testing.T) {
	cm := NewCredentialManager()

	uploader := NewGDriveUploader(cm, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := uploader.Upload(ctx, []byte{}, "test.png")

	if err == nil {
		t.Error("Expected error for empty data")
	}
	if result.Success {
		t.Error("Expected Success=false for empty data")
	}
	if result.Error != "empty file data" {
		t.Errorf("Expected 'empty file data' error, got: %s", result.Error)
	}
}

func TestGDriveUploader_UploadCancelledContext(t *testing.T) {
	cm := NewCredentialManager()

	uploader := NewGDriveUploader(cm, nil)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	result, err := uploader.Upload(ctx, []byte("test data"), "test.png")

	if err == nil {
		t.Error("Expected error for cancelled context")
	}
	if result.Success {
		t.Error("Expected Success=false for cancelled context")
	}
}

func TestGDriveUploader_TestConnectionMissingAuth(t *testing.T) {
	cm := NewCredentialManager()

	uploader := NewGDriveUploader(cm, nil)

	err := uploader.TestConnection()
	if err == nil {
		t.Error("Expected error for missing auth")
	}
}

func TestGDriveUploader_Disconnect(t *testing.T) {
	cm := NewCredentialManager()

	uploader := NewGDriveUploader(cm, nil)

	// Should not error even when no token exists
	err := uploader.Disconnect()
	if err != nil {
		t.Errorf("Disconnect should not error, got: %v", err)
	}
}

func TestGDriveConfig_Struct(t *testing.T) {
	cfg := GDriveConfig{
		UseDefaultCredentials: true,
		FolderID:              "folder123",
	}

	if !cfg.UseDefaultCredentials {
		t.Error("UseDefaultCredentials should be true")
	}
	if cfg.FolderID != "folder123" {
		t.Errorf("FolderID = %q, want %q", cfg.FolderID, "folder123")
	}
}
