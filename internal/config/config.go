package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// HotkeyConfig holds hotkey settings
type HotkeyConfig struct {
	Fullscreen string `json:"fullscreen"`
	Region     string `json:"region"`
	Window     string `json:"window"`
}

// StartupConfig holds startup-related settings
type StartupConfig struct {
	LaunchOnStartup  bool `json:"launchOnStartup"`
	MinimizeToTray   bool `json:"minimizeToTray"`
	ShowNotification bool `json:"showNotification"`
	CloseToTray      bool `json:"closeToTray"`
}

// UpdateConfig holds update-related settings
type UpdateConfig struct {
	CheckOnStartup bool   `json:"checkOnStartup"`
	SkippedVersion string `json:"skippedVersion,omitempty"`
}

// QuickSaveConfig holds quick save settings
type QuickSaveConfig struct {
	Folder  string `json:"folder"`
	Pattern string `json:"pattern"` // "timestamp", "date", "increment"
}

// ExportConfig holds export default settings
type ExportConfig struct {
	DefaultFormat      string `json:"defaultFormat"`      // "png" or "jpeg"
	JpegQuality        int    `json:"jpegQuality"`        // 0-100
	IncludeBackground  bool   `json:"includeBackground"`
	AutoCopyToClipboard bool  `json:"autoCopyToClipboard"`
}

// WindowConfig holds window size and position settings
type WindowConfig struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// EditorConfig holds editor panel settings (persisted separately from localStorage)
type EditorConfig struct {
	Padding              int    `json:"padding"`
	CornerRadius         int    `json:"cornerRadius"`
	ShadowSize           int    `json:"shadowSize"`
	BackgroundColor      string `json:"backgroundColor"`
	OutputRatio          string `json:"outputRatio"`
	ShowBackground       bool   `json:"showBackground"`
	Inset                int    `json:"inset"`                          // 0-50 percentage for screenshot scaling
	AutoBackground       bool   `json:"autoBackground"`                 // Auto-extract edge color for background
	InsetBackgroundColor string `json:"insetBackgroundColor,omitempty"` // Custom inset background color
	ShapeCornerRadius    int    `json:"shapeCornerRadius"`              // Default corner radius for rectangle annotations (0-50)
}

// R2Config holds Cloudflare R2 settings (secrets stored in Credential Manager)
type R2Config struct {
	AccountID string `json:"accountId,omitempty"`
	Bucket    string `json:"bucket,omitempty"`
	PublicURL string `json:"publicUrl,omitempty"` // r2.dev or custom domain
	Directory string `json:"directory,omitempty"` // Optional path prefix for uploads
}

// GDriveConfig holds Google Drive settings (OAuth tokens in Credential Manager)
type GDriveConfig struct {
	FolderID string `json:"folderId,omitempty"` // Optional upload folder ID
}

// CloudConfig holds cloud upload provider settings
type CloudConfig struct {
	R2     R2Config     `json:"r2,omitempty"`
	GDrive GDriveConfig `json:"gdrive,omitempty"`
}

// Config holds all application settings
type Config struct {
	Hotkeys          HotkeyConfig    `json:"hotkeys"`
	Startup          StartupConfig   `json:"startup"`
	QuickSave        QuickSaveConfig `json:"quickSave"`
	Export           ExportConfig    `json:"export"`
	Window           WindowConfig    `json:"window"`
	Editor           EditorConfig    `json:"editor"`
	Update           UpdateConfig    `json:"update"`
	Cloud            CloudConfig     `json:"cloud,omitempty"`
	BackgroundImages []string        `json:"backgroundImages,omitempty"`
}

// Default returns default configuration
func Default() *Config {
	homeDir, _ := os.UserHomeDir()
	defaultFolder := filepath.Join(homeDir, "Pictures", "WinShot")

	return &Config{
		Hotkeys: HotkeyConfig{
			Fullscreen: "PrintScreen",
			Region:     "Ctrl+PrintScreen",
			Window:     "Ctrl+Shift+PrintScreen",
		},
		Startup: StartupConfig{
			LaunchOnStartup:  false,
			MinimizeToTray:   false,
			ShowNotification: true,
			CloseToTray:      true,
		},
		QuickSave: QuickSaveConfig{
			Folder:  defaultFolder,
			Pattern: "timestamp",
		},
		Export: ExportConfig{
			DefaultFormat:       "png",
			JpegQuality:         95,
			IncludeBackground:   true,
			AutoCopyToClipboard: true,
		},
		Window: WindowConfig{
			Width:  1200,
			Height: 800,
		},
		Editor: EditorConfig{
			Padding:           40,
			CornerRadius:      12,
			ShadowSize:        20,
			BackgroundColor:   "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
			OutputRatio:       "auto",
			ShowBackground:    true,
			Inset:             0,
			AutoBackground:    true,
			ShapeCornerRadius: 0,
		},
		Update: UpdateConfig{
			CheckOnStartup: true,
			SkippedVersion: "",
		},
		Cloud: CloudConfig{
			R2:     R2Config{},
			GDrive: GDriveConfig{},
		},
	}
}

// GetConfigPath returns the path to the config file
func GetConfigPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "WinShot", "config.json"), nil
}

// Load reads config from disk, returns default if not found
func Load() (*Config, error) {
	configPath, err := GetConfigPath()
	if err != nil {
		return Default(), nil
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			// Config doesn't exist, return defaults
			cfg := Default()
			// Save defaults for first run
			cfg.Save()
			return cfg, nil
		}
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		// Invalid JSON, return defaults
		return Default(), nil
	}

	return &cfg, nil
}

// Save writes config to disk
func (c *Config) Save() error {
	configPath, err := GetConfigPath()
	if err != nil {
		return err
	}

	// Ensure directory exists
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0644)
}
