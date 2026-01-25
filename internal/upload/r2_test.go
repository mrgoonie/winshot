package upload

import (
	"context"
	"testing"
	"time"
)

func TestR2Uploader_IsConfigured(t *testing.T) {
	cm := NewCredentialManager()

	// Check if credentials actually exist in system
	hasCredentials := cm.Exists(CredR2AccessKeyID) && cm.Exists(CredR2SecretAccessKey)

	tests := []struct {
		name   string
		config *R2Config
		want   bool
	}{
		{
			name:   "nil config",
			config: nil,
			want:   false,
		},
		{
			name:   "empty account ID",
			config: &R2Config{AccountID: "", Bucket: "bucket", PublicURL: "https://example.com"},
			want:   false,
		},
		{
			name:   "empty bucket",
			config: &R2Config{AccountID: "account", Bucket: "", PublicURL: "https://example.com"},
			want:   false,
		},
		{
			name:   "empty public URL",
			config: &R2Config{AccountID: "account", Bucket: "bucket", PublicURL: ""},
			want:   false,
		},
		{
			name:   "valid config with credentials",
			config: &R2Config{AccountID: "account", Bucket: "bucket", PublicURL: "https://example.com"},
			want:   hasCredentials, // true if system has credentials, false otherwise
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			uploader := NewR2Uploader(cm, tt.config)
			if got := uploader.IsConfigured(); got != tt.want {
				t.Errorf("IsConfigured() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestR2Uploader_DetectContentType(t *testing.T) {
	tests := []struct {
		filename string
		want     string
	}{
		{"image.png", "image/png"},
		{"IMAGE.PNG", "image/png"},
		{"photo.jpg", "image/jpeg"},
		{"photo.jpeg", "image/jpeg"},
		{"PHOTO.JPG", "image/jpeg"},
		{"anim.gif", "image/gif"},
		{"modern.webp", "image/webp"},
		{"bitmap.bmp", "image/bmp"},
		{"vector.svg", "image/svg+xml"},
		{"scan.tiff", "image/tiff"},
		{"scan.tif", "image/tiff"},
		{"unknown.xyz", "application/octet-stream"},
		{"noextension", "application/octet-stream"},
	}

	for _, tt := range tests {
		t.Run(tt.filename, func(t *testing.T) {
			if got := detectContentType(tt.filename); got != tt.want {
				t.Errorf("detectContentType(%q) = %q, want %q", tt.filename, got, tt.want)
			}
		})
	}
}

func TestR2Uploader_UploadMissingCredentials(t *testing.T) {
	cm := NewCredentialManager()
	cfg := &R2Config{
		AccountID: "test-account",
		Bucket:    "test-bucket",
		PublicURL: "https://test.r2.dev",
	}

	uploader := NewR2Uploader(cm, cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := uploader.Upload(ctx, []byte("test data"), "test.png")

	if err == nil {
		t.Error("Expected error for missing credentials")
	}
	if result.Success {
		t.Error("Expected Success=false for missing credentials")
	}
	if result.Error == "" {
		t.Error("Expected error message in result")
	}
}

func TestR2Uploader_UploadEmptyData(t *testing.T) {
	cm := NewCredentialManager()
	cfg := &R2Config{
		AccountID: "test-account",
		Bucket:    "test-bucket",
		PublicURL: "https://test.r2.dev",
	}

	uploader := NewR2Uploader(cm, cfg)

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

func TestR2Uploader_UploadCancelledContext(t *testing.T) {
	cm := NewCredentialManager()
	cfg := &R2Config{
		AccountID: "test-account",
		Bucket:    "test-bucket",
		PublicURL: "https://test.r2.dev",
	}

	uploader := NewR2Uploader(cm, cfg)

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

func TestR2Uploader_TestConnectionMissingCredentials(t *testing.T) {
	cm := NewCredentialManager()
	cfg := &R2Config{
		AccountID: "test-account",
		Bucket:    "test-bucket",
		PublicURL: "https://test.r2.dev",
	}

	uploader := NewR2Uploader(cm, cfg)

	err := uploader.TestConnection()
	if err == nil {
		t.Error("Expected error for missing credentials")
	}
}

func TestR2Config_Struct(t *testing.T) {
	cfg := R2Config{
		AccountID: "abc123",
		Bucket:    "my-bucket",
		PublicURL: "https://pub.r2.dev",
	}

	if cfg.AccountID != "abc123" {
		t.Errorf("AccountID = %q, want %q", cfg.AccountID, "abc123")
	}
	if cfg.Bucket != "my-bucket" {
		t.Errorf("Bucket = %q, want %q", cfg.Bucket, "my-bucket")
	}
	if cfg.PublicURL != "https://pub.r2.dev" {
		t.Errorf("PublicURL = %q, want %q", cfg.PublicURL, "https://pub.r2.dev")
	}
}

func TestUploadResult_Struct(t *testing.T) {
	success := UploadResult{Success: true, PublicURL: "https://example.com/img.png"}
	if !success.Success || success.PublicURL != "https://example.com/img.png" {
		t.Error("Success result incorrect")
	}

	failure := UploadResult{Success: false, Error: "upload failed"}
	if failure.Success || failure.Error != "upload failed" {
		t.Error("Failure result incorrect")
	}
}
