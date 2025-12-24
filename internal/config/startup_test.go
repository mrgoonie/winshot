package config

import (
	"fmt"
	"os"
	"testing"

	"golang.org/x/sys/windows/registry"
)

// TestSetStartupEnabled verifies registry operations for startup enabling
func TestSetStartupEnabled(t *testing.T) {
	tests := []struct {
		name    string
		enabled bool
		wantErr bool
	}{
		{
			name:    "Enable startup",
			enabled: true,
			wantErr: false,
		},
		{
			name:    "Disable startup",
			enabled: false,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set the startup setting
			err := SetStartupEnabled(tt.enabled)
			if (err != nil) != tt.wantErr {
				t.Errorf("SetStartupEnabled(%v) error = %v, wantErr %v", tt.enabled, err, tt.wantErr)
			}

			if tt.wantErr {
				return
			}

			// Verify the setting was applied
			isEnabled, err := IsStartupEnabled()
			if err != nil {
				t.Errorf("IsStartupEnabled() error = %v", err)
			}

			if isEnabled != tt.enabled {
				t.Errorf("SetStartupEnabled(%v) resulted in IsStartupEnabled() = %v, want %v", tt.enabled, isEnabled, tt.enabled)
			}

			// Cleanup: disable startup after test
			DisableStartupForTest()
		})
	}
}

// TestIsStartupEnabled verifies registry read operations
func TestIsStartupEnabled(t *testing.T) {
	// Cleanup from any previous tests
	DisableStartupForTest()

	// Test when startup is disabled
	isEnabled, err := IsStartupEnabled()
	if err != nil {
		t.Errorf("IsStartupEnabled() error = %v", err)
	}
	if isEnabled {
		t.Errorf("IsStartupEnabled() = %v, want false (after cleanup)", isEnabled)
	}

	// Enable startup
	if err := SetStartupEnabled(true); err != nil {
		t.Errorf("SetStartupEnabled(true) error = %v", err)
	}

	// Test when startup is enabled
	isEnabled, err = IsStartupEnabled()
	if err != nil {
		t.Errorf("IsStartupEnabled() error = %v", err)
	}
	if !isEnabled {
		t.Errorf("IsStartupEnabled() = %v, want true (after enabling)", isEnabled)
	}

	// Cleanup
	DisableStartupForTest()
}

// TestRegistryPathQuoting ensures registry paths with spaces are quoted correctly
func TestRegistryPathQuoting(t *testing.T) {
	// This test validates that the fmt.Sprintf quoting works correctly
	exePath, err := os.Executable()
	if err != nil {
		t.Fatalf("Failed to get executable path: %v", err)
	}

	// Test the quoting logic
	quotedPath := fmt.Sprintf(`"%s"`, exePath)

	// Verify quoted path starts and ends with quotes
	if len(quotedPath) < 2 || quotedPath[0] != '"' || quotedPath[len(quotedPath)-1] != '"' {
		t.Errorf("Quoted path format invalid: %s", quotedPath)
	}

	// Verify inner path matches original
	innerPath := quotedPath[1 : len(quotedPath)-1]
	if innerPath != exePath {
		t.Errorf("Quoted path inner content doesn't match. Got %s, want %s", innerPath, exePath)
	}

	// Enable startup to test actual registry operation
	if err := SetStartupEnabled(true); err != nil {
		t.Errorf("SetStartupEnabled(true) error = %v", err)
	}

	// Verify registry contains quoted path
	key, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Run`, registry.QUERY_VALUE)
	if err != nil {
		t.Fatalf("Failed to open registry key: %v", err)
	}
	defer key.Close()

	val, _, err := key.GetStringValue("WinShot")
	if err != nil {
		t.Fatalf("Failed to read registry value: %v", err)
	}

	if val != quotedPath {
		t.Errorf("Registry value mismatch. Got %s, want %s", val, quotedPath)
	}

	// Cleanup
	DisableStartupForTest()
}

// TestVerificationRead ensures write verification works
func TestVerificationRead(t *testing.T) {
	// Ensure startup is disabled first
	DisableStartupForTest()

	// Enable startup
	err := SetStartupEnabled(true)
	if err != nil {
		t.Fatalf("SetStartupEnabled(true) error = %v", err)
	}

	// Verify that the value was actually written
	// (This tests the verification read in enableStartup())
	isEnabled, err := IsStartupEnabled()
	if err != nil {
		t.Fatalf("IsStartupEnabled() error = %v", err)
	}
	if !isEnabled {
		t.Error("Verification read failed: value not found in registry after write")
	}

	// Cleanup
	DisableStartupForTest()
}

// TestEnableStartupWithInvalidPath tests error handling for invalid executable paths
func TestEnableStartupErrorHandling(t *testing.T) {
	// The enable function should handle the current executable path correctly
	// This test mainly ensures no panic occurs during normal operation

	err := SetStartupEnabled(true)
	if err != nil {
		t.Errorf("SetStartupEnabled(true) error = %v", err)
	}

	// Verify it was set
	isEnabled, err := IsStartupEnabled()
	if err != nil {
		t.Errorf("IsStartupEnabled() error = %v", err)
	}
	if !isEnabled {
		t.Error("Startup should be enabled")
	}

	// Cleanup
	DisableStartupForTest()
}

// TestDisableStartupWhenAlreadyDisabled tests idempotency of disable operation
func TestDisableStartupIdempotency(t *testing.T) {
	// Ensure it's disabled
	DisableStartupForTest()

	// Disable again (should not error)
	err := SetStartupEnabled(false)
	if err != nil {
		t.Errorf("SetStartupEnabled(false) error = %v", err)
	}

	// Verify it's disabled
	isEnabled, err := IsStartupEnabled()
	if err != nil {
		t.Errorf("IsStartupEnabled() error = %v", err)
	}
	if isEnabled {
		t.Error("Startup should be disabled")
	}
}

// DisableStartupForTest is a helper to cleanup registry state between tests
func DisableStartupForTest() {
	_ = SetStartupEnabled(false)
}
