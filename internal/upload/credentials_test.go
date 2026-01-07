package upload

import (
	"errors"
	"testing"
)

func TestCredentialManager_RoundTrip(t *testing.T) {
	cm := NewCredentialManager()
	testKey := "WinShot_Test_Key"
	testValue := "test-secret-value-12345"

	// Clean up before test
	cm.Delete(testKey)

	// Test: Credential should not exist initially
	if cm.Exists(testKey) {
		t.Errorf("Expected credential to not exist initially")
	}

	// Test: Get non-existent credential
	_, err := cm.Get(testKey)
	if !errors.Is(err, ErrCredentialNotFound) {
		t.Errorf("Expected ErrCredentialNotFound, got: %v", err)
	}

	// Test: Set credential
	err = cm.Set(testKey, testValue)
	if err != nil {
		t.Fatalf("Failed to set credential: %v", err)
	}

	// Test: Credential should exist now
	if !cm.Exists(testKey) {
		t.Errorf("Expected credential to exist after Set")
	}

	// Test: Get credential
	retrieved, err := cm.Get(testKey)
	if err != nil {
		t.Fatalf("Failed to get credential: %v", err)
	}
	if retrieved != testValue {
		t.Errorf("Expected %q, got %q", testValue, retrieved)
	}

	// Test: Update credential
	newValue := "updated-secret-value"
	err = cm.Set(testKey, newValue)
	if err != nil {
		t.Fatalf("Failed to update credential: %v", err)
	}

	retrieved, err = cm.Get(testKey)
	if err != nil {
		t.Fatalf("Failed to get updated credential: %v", err)
	}
	if retrieved != newValue {
		t.Errorf("Expected %q after update, got %q", newValue, retrieved)
	}

	// Test: Delete credential
	err = cm.Delete(testKey)
	if err != nil {
		t.Fatalf("Failed to delete credential: %v", err)
	}

	// Test: Credential should not exist after delete
	if cm.Exists(testKey) {
		t.Errorf("Expected credential to not exist after Delete")
	}

	// Test: Delete non-existent credential should not error
	err = cm.Delete(testKey)
	if err != nil {
		t.Errorf("Delete of non-existent credential should not error, got: %v", err)
	}
}

func TestCredentialManager_CredentialConstants(t *testing.T) {
	// Verify credential constants have correct prefix
	constants := []string{
		CredR2AccessKeyID,
		CredR2SecretAccessKey,
		CredR2Endpoint,
		CredR2BucketName,
		CredR2PublicURL,
		CredGDriveToken,
		CredGDriveClientID,
		CredGDriveClientSecret,
	}

	prefix := "WinShot_"
	for _, c := range constants {
		if len(c) < len(prefix) || c[:len(prefix)] != prefix {
			t.Errorf("Credential constant %q should have prefix %q", c, prefix)
		}
	}
}
