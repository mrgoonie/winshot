// Package upload provides cloud upload functionality for screenshots.
package upload

import (
	"errors"
	"fmt"

	"github.com/danieljoos/wincred"
)

// Credential key constants for Windows Credential Manager
const (
	credentialPrefix = "WinShot_"

	// CredR2AccessKeyID is the key for R2 access key ID
	CredR2AccessKeyID = credentialPrefix + "R2_AccessKeyID"
	// CredR2SecretAccessKey is the key for R2 secret access key
	CredR2SecretAccessKey = credentialPrefix + "R2_SecretAccessKey"
	// CredR2Endpoint is the key for R2 endpoint URL
	CredR2Endpoint = credentialPrefix + "R2_Endpoint"
	// CredR2BucketName is the key for R2 bucket name
	CredR2BucketName = credentialPrefix + "R2_BucketName"
	// CredR2PublicURL is the key for R2 public URL base
	CredR2PublicURL = credentialPrefix + "R2_PublicURL"
	// CredGDriveToken is the key for Google Drive OAuth token JSON
	CredGDriveToken = credentialPrefix + "GDrive_Token"
	// CredGDriveClientID is the key for user-provided OAuth client ID
	CredGDriveClientID = credentialPrefix + "GDrive_ClientID"
	// CredGDriveClientSecret is the key for user-provided OAuth client secret
	CredGDriveClientSecret = credentialPrefix + "GDrive_ClientSecret"
)

// ErrCredentialNotFound is returned when a credential does not exist
var ErrCredentialNotFound = errors.New("credential not found")

// CredentialManager provides methods to store and retrieve credentials
// using Windows Credential Manager (DPAPI encrypted storage).
type CredentialManager struct{}

// NewCredentialManager creates a new CredentialManager instance.
func NewCredentialManager() *CredentialManager {
	return &CredentialManager{}
}

// Set stores a credential value in Windows Credential Manager.
// If the credential already exists, it will be overwritten.
// Credentials are stored per-user (not machine-wide) to avoid requiring admin.
func (cm *CredentialManager) Set(key, value string) error {
	if key == "" {
		return errors.New("credential key cannot be empty")
	}
	cred := wincred.NewGenericCredential(key)
	cred.CredentialBlob = []byte(value)
	cred.Persist = wincred.PersistEnterprise // Per-user, roaming-profile compatible
	return cred.Write()
}

// Get retrieves a credential value from Windows Credential Manager.
// Returns ErrCredentialNotFound if the credential does not exist.
// Note: Error string matching based on wincred v1.2.3 behavior.
func (cm *CredentialManager) Get(key string) (string, error) {
	cred, err := wincred.GetGenericCredential(key)
	if err != nil {
		// Check if credential not found (wincred v1.2.3 error message)
		if err.Error() == "Element not found." {
			return "", ErrCredentialNotFound
		}
		return "", fmt.Errorf("failed to get credential: %w", err)
	}
	return string(cred.CredentialBlob), nil
}

// Delete removes a credential from Windows Credential Manager.
// Returns nil if the credential doesn't exist.
// Note: Error string matching based on wincred v1.2.3 behavior.
func (cm *CredentialManager) Delete(key string) error {
	cred, err := wincred.GetGenericCredential(key)
	if err != nil {
		// Credential doesn't exist, nothing to delete (wincred v1.2.3 error message)
		if err.Error() == "Element not found." {
			return nil
		}
		return fmt.Errorf("failed to get credential for deletion: %w", err)
	}
	return cred.Delete()
}

// Exists checks if a credential exists in Windows Credential Manager.
func (cm *CredentialManager) Exists(key string) bool {
	_, err := wincred.GetGenericCredential(key)
	return err == nil
}
