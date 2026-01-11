package config

import (
	"fmt"
	"os"
	"path/filepath"

	"golang.org/x/sys/windows/registry"
)

const (
	// Windows Run registry key for current user startup
	startupKeyPath = `Software\Microsoft\Windows\CurrentVersion\Run`
	appName        = "WinShot"
)

// IsStartupEnabled checks if the app is set to run on Windows startup
func IsStartupEnabled() (bool, error) {
	key, err := registry.OpenKey(registry.CURRENT_USER, startupKeyPath, registry.QUERY_VALUE)
	if err != nil {
		return false, err
	}
	defer key.Close()

	_, _, err = key.GetStringValue(appName)
	if err == registry.ErrNotExist {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

// SetStartupEnabled enables or disables running the app on Windows startup
func SetStartupEnabled(enabled bool) error {
	if enabled {
		return enableStartup()
	}
	return disableStartup()
}

func enableStartup() error {
	// Get executable path
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	// Resolve symlinks and get absolute path
	exePath, err = filepath.Abs(exePath)
	if err != nil {
		return fmt.Errorf("failed to resolve path: %w", err)
	}

	// Open registry key for writing and reading (for verification)
	key, err := registry.OpenKey(registry.CURRENT_USER, startupKeyPath, registry.SET_VALUE|registry.QUERY_VALUE)
	if err != nil {
		return fmt.Errorf("failed to open registry: %w", err)
	}
	defer key.Close()

	// Set value with path in quotes (for paths with spaces)
	quotedPath := fmt.Sprintf(`"%s"`, exePath)
	if err := key.SetStringValue(appName, quotedPath); err != nil {
		return fmt.Errorf("failed to set registry value: %w", err)
	}

	// Verify write by reading back the value
	val, _, err := key.GetStringValue(appName)
	if err != nil {
		return fmt.Errorf("failed to verify registry write: %w", err)
	}
	if val != quotedPath {
		return fmt.Errorf("registry verification failed: expected %s, got %s", quotedPath, val)
	}

	return nil
}

// SyncStartupPath updates the registry startup path to match current executable.
// This fixes the duplicate app issue when user downloads new version to different location.
// Call this on app startup when startup is enabled.
func SyncStartupPath() error {
	enabled, err := IsStartupEnabled()
	if err != nil || !enabled {
		return nil // No sync needed if startup not enabled
	}

	// Re-enable startup to update path to current executable
	return enableStartup()
}

func disableStartup() error {
	key, err := registry.OpenKey(registry.CURRENT_USER, startupKeyPath, registry.SET_VALUE)
	if err != nil {
		// If key doesn't exist, autostart is already disabled
		if err == registry.ErrNotExist {
			return nil
		}
		return fmt.Errorf("failed to open registry: %w", err)
	}
	defer key.Close()

	// Delete the value (ignore error if not exists)
	err = key.DeleteValue(appName)
	if err == registry.ErrNotExist {
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to delete registry value: %w", err)
	}
	return nil
}
