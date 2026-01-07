// Package upload provides cloud upload functionality for screenshots.
package upload

import "context"

// UploadProvider identifies the cloud storage provider.
type UploadProvider string

const (
	// ProviderR2 is Cloudflare R2 storage.
	ProviderR2 UploadProvider = "r2"
	// ProviderGDrive is Google Drive storage.
	ProviderGDrive UploadProvider = "gdrive"
)

// UploadResult contains the result of an upload operation.
type UploadResult struct {
	Success   bool   `json:"success"`
	PublicURL string `json:"publicUrl"`
	Error     string `json:"error,omitempty"`
}

// Uploader defines the interface for cloud upload providers.
type Uploader interface {
	// Upload uploads data to the cloud storage and returns the public URL.
	Upload(ctx context.Context, data []byte, filename string) (*UploadResult, error)
	// IsConfigured returns true if the uploader has valid credentials.
	IsConfigured() bool
	// TestConnection tests if the credentials are valid and bucket is accessible.
	TestConnection() error
}
