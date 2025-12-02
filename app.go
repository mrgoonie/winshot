package main

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"winshot/internal/config"
	"winshot/internal/hotkeys"
	"winshot/internal/screenshot"
	"winshot/internal/tray"
	winEnum "winshot/internal/windows"
)

// App struct
type App struct {
	ctx           context.Context
	hotkeyManager *hotkeys.HotkeyManager
	trayIcon      *tray.TrayIcon
	config        *config.Config
	lastWidth     int
	lastHeight    int
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		cfg = config.Default()
	}
	a.config = cfg

	// Initialize hotkey manager
	a.hotkeyManager = hotkeys.NewHotkeyManager()
	a.hotkeyManager.SetCallback(a.onHotkey)

	// Register hotkeys from config
	a.registerHotkeysFromConfig()
	a.hotkeyManager.Start()

	// Initialize system tray
	a.trayIcon = tray.NewTrayIcon("WinShot - Screenshot Tool")
	a.trayIcon.SetCallback(a.onTrayMenu)
	a.trayIcon.SetOnShow(func() {
		runtime.WindowShow(a.ctx)
		runtime.WindowSetAlwaysOnTop(a.ctx, true)
		runtime.WindowSetAlwaysOnTop(a.ctx, false)
	})
	a.trayIcon.Start()

	// Initialize window size tracking with config values
	a.lastWidth = cfg.Window.Width
	a.lastHeight = cfg.Window.Height
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	// Save window size before closing using tracked values
	if a.config != nil && a.lastWidth >= 800 && a.lastHeight >= 600 {
		a.config.Window.Width = a.lastWidth
		a.config.Window.Height = a.lastHeight
		a.config.Save()
	}

	// Cleanup resources
	if a.hotkeyManager != nil {
		a.hotkeyManager.Stop()
		a.hotkeyManager.UnregisterAll()
	}
	if a.trayIcon != nil {
		a.trayIcon.Stop()
	}
}

// onHotkey handles global hotkey events
func (a *App) onHotkey(id int) {
	switch id {
	case hotkeys.HotkeyFullscreen:
		runtime.EventsEmit(a.ctx, "hotkey:fullscreen")
	case hotkeys.HotkeyRegion:
		runtime.EventsEmit(a.ctx, "hotkey:region")
	case hotkeys.HotkeyWindow:
		runtime.EventsEmit(a.ctx, "hotkey:window")
	}
}

// onTrayMenu handles tray menu selections
func (a *App) onTrayMenu(menuID int) {
	switch menuID {
	case tray.MenuFullscreen:
		runtime.EventsEmit(a.ctx, "hotkey:fullscreen")
	case tray.MenuRegion:
		runtime.EventsEmit(a.ctx, "hotkey:region")
	case tray.MenuWindow:
		runtime.EventsEmit(a.ctx, "hotkey:window")
	case tray.MenuQuit:
		runtime.Quit(a.ctx)
	}
}

// UpdateWindowSize tracks the current window size for persistence
func (a *App) UpdateWindowSize(width, height int) {
	if width >= 800 && height >= 600 {
		a.lastWidth = width
		a.lastHeight = height
	}
}

// MinimizeToTray hides the window (minimize to tray)
func (a *App) MinimizeToTray() {
	runtime.WindowHide(a.ctx)
}

// RegionCaptureData holds the fullscreen screenshot and display info for region selection
type RegionCaptureData struct {
	Screenshot  *screenshot.CaptureResult `json:"screenshot"`
	ScreenX     int                       `json:"screenX"`
	ScreenY     int                       `json:"screenY"`
	Width       int                       `json:"width"`
	Height      int                       `json:"height"`
	ScaleRatio  float64                   `json:"scaleRatio"`  // DPI scale ratio (physical/logical)
	PhysicalW   int                       `json:"physicalW"`   // Actual screenshot width
	PhysicalH   int                       `json:"physicalH"`   // Actual screenshot height
}

// PrepareRegionCapture prepares for region selection by capturing fullscreen and setting up overlay
func (a *App) PrepareRegionCapture() (*RegionCaptureData, error) {
	// Hide the window first so it's not in the screenshot
	runtime.WindowHide(a.ctx)

	// Wait for window to fully hide
	time.Sleep(150 * time.Millisecond)

	// Capture fullscreen screenshot (at physical/native resolution)
	result, err := screenshot.CaptureFullscreen()
	if err != nil {
		// Show window again on error
		runtime.WindowShow(a.ctx)
		return nil, err
	}

	// Get logical screen info from Wails runtime
	// Wails ScreenGetAll returns logical (DPI-scaled) dimensions
	screens, _ := runtime.ScreenGetAll(a.ctx)
	var primaryScreen runtime.Screen
	for _, s := range screens {
		if s.IsPrimary {
			primaryScreen = s
			break
		}
	}
	if primaryScreen.Size.Width == 0 {
		// Fallback to first screen if no primary found
		primaryScreen = screens[0]
	}

	logicalWidth := primaryScreen.Size.Width
	logicalHeight := primaryScreen.Size.Height

	// Position window at screen origin (primary monitor is typically at 0,0)
	runtime.WindowSetPosition(a.ctx, 0, 0)

	// Disable min size constraint temporarily
	runtime.WindowSetMinSize(a.ctx, 0, 0)

	// Set window size to full screen using LOGICAL dimensions
	runtime.WindowSetSize(a.ctx, logicalWidth, logicalHeight)

	// Make window always on top
	runtime.WindowSetAlwaysOnTop(a.ctx, true)

	// Show the window
	runtime.WindowShow(a.ctx)

	// Calculate DPI scale ratio (physical screenshot size / logical screen size)
	scaleRatio := float64(result.Width) / float64(logicalWidth)
	if scaleRatio < 1.0 {
		scaleRatio = 1.0
	}

	return &RegionCaptureData{
		Screenshot:  result,
		ScreenX:     0,
		ScreenY:     0,
		Width:       logicalWidth,
		Height:      logicalHeight,
		ScaleRatio:  scaleRatio,
		PhysicalW:   result.Width,
		PhysicalH:   result.Height,
	}, nil
}

// FinishRegionCapture restores the window to normal state after region selection
func (a *App) FinishRegionCapture() {
	// Remove always on top
	runtime.WindowSetAlwaysOnTop(a.ctx, false)

	// Restore min size constraint
	runtime.WindowSetMinSize(a.ctx, 800, 600)

	// Restore window to saved size from config
	width := 1200
	height := 800
	if a.config != nil && a.config.Window.Width >= 800 && a.config.Window.Height >= 600 {
		width = a.config.Window.Width
		height = a.config.Window.Height
	}
	runtime.WindowSetSize(a.ctx, width, height)

	// Center the window
	runtime.WindowCenter(a.ctx)
}

// ShowWindow shows the main window
func (a *App) ShowWindow() {
	runtime.WindowShow(a.ctx)
	runtime.WindowSetAlwaysOnTop(a.ctx, true)
	runtime.WindowSetAlwaysOnTop(a.ctx, false)
}

// CaptureFullscreen captures the entire primary display
func (a *App) CaptureFullscreen() (*screenshot.CaptureResult, error) {
	return screenshot.CaptureFullscreen()
}

// CaptureRegion captures a specific region of the screen
func (a *App) CaptureRegion(x, y, width, height int) (*screenshot.CaptureResult, error) {
	return screenshot.CaptureRegion(x, y, width, height)
}

// CaptureDisplay captures a specific display by index
func (a *App) CaptureDisplay(displayIndex int) (*screenshot.CaptureResult, error) {
	return screenshot.CaptureDisplay(displayIndex)
}

// CaptureWindow captures a specific window by handle
func (a *App) CaptureWindow(hwnd int) (*screenshot.CaptureResult, error) {
	return screenshot.CaptureWindowByCoords(uintptr(hwnd))
}

// GetDisplayCount returns the number of active displays
func (a *App) GetDisplayCount() int {
	return screenshot.GetDisplayCount()
}

// DisplayBounds represents the bounds of a display
type DisplayBounds struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
}

// GetDisplayBounds returns the bounds of a display
func (a *App) GetDisplayBounds(displayIndex int) DisplayBounds {
	bounds := screenshot.GetDisplayBounds(displayIndex)
	return DisplayBounds{
		X:      bounds.Min.X,
		Y:      bounds.Min.Y,
		Width:  bounds.Dx(),
		Height: bounds.Dy(),
	}
}

// GetWindowList returns a list of all visible windows
func (a *App) GetWindowList() ([]winEnum.WindowInfo, error) {
	return winEnum.EnumWindows()
}

// GetWindowInfo returns information about a specific window
func (a *App) GetWindowInfo(hwnd int) (*winEnum.WindowInfo, error) {
	return winEnum.GetWindowInfo(uintptr(hwnd))
}

// SaveImageResult represents the result of saving an image
type SaveImageResult struct {
	Success  bool   `json:"success"`
	FilePath string `json:"filePath"`
	Error    string `json:"error,omitempty"`
}

// SaveImage saves a base64 encoded image to a file using a save dialog
func (a *App) SaveImage(imageData string, format string) SaveImageResult {
	// Determine file filter based on format
	var filters []runtime.FileFilter
	var defaultExt string

	switch strings.ToLower(format) {
	case "jpeg", "jpg":
		filters = []runtime.FileFilter{{DisplayName: "JPEG Image", Pattern: "*.jpg;*.jpeg"}}
		defaultExt = ".jpg"
	default:
		filters = []runtime.FileFilter{{DisplayName: "PNG Image", Pattern: "*.png"}}
		defaultExt = ".png"
	}

	// Show save dialog
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Screenshot",
		DefaultFilename: "screenshot" + defaultExt,
		Filters:         filters,
	})

	if err != nil {
		return SaveImageResult{Success: false, Error: err.Error()}
	}

	if filePath == "" {
		return SaveImageResult{Success: false, Error: "No file selected"}
	}

	// Ensure correct extension
	ext := filepath.Ext(filePath)
	if ext == "" {
		filePath += defaultExt
	}

	// Decode base64 data
	data, err := base64.StdEncoding.DecodeString(imageData)
	if err != nil {
		return SaveImageResult{Success: false, Error: "Failed to decode image data: " + err.Error()}
	}

	// Write to file
	err = os.WriteFile(filePath, data, 0644)
	if err != nil {
		return SaveImageResult{Success: false, Error: "Failed to save file: " + err.Error()}
	}

	return SaveImageResult{Success: true, FilePath: filePath}
}

// QuickSave saves a base64 encoded image to a predefined directory
func (a *App) QuickSave(imageData string, format string) SaveImageResult {
	// Get user's Pictures folder
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return SaveImageResult{Success: false, Error: "Failed to get home directory: " + err.Error()}
	}

	// Create WinShot folder in Pictures
	saveDir := filepath.Join(homeDir, "Pictures", "WinShot")
	err = os.MkdirAll(saveDir, 0755)
	if err != nil {
		return SaveImageResult{Success: false, Error: "Failed to create save directory: " + err.Error()}
	}

	// Generate filename with timestamp
	var ext string
	switch strings.ToLower(format) {
	case "jpeg", "jpg":
		ext = ".jpg"
	default:
		ext = ".png"
	}

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := "winshot_" + timestamp + ext
	filePath := filepath.Join(saveDir, filename)

	// Decode and save
	data, err := base64.StdEncoding.DecodeString(imageData)
	if err != nil {
		return SaveImageResult{Success: false, Error: "Failed to decode image data: " + err.Error()}
	}

	err = os.WriteFile(filePath, data, 0644)
	if err != nil {
		return SaveImageResult{Success: false, Error: "Failed to save file: " + err.Error()}
	}

	return SaveImageResult{Success: true, FilePath: filePath}
}

// HotkeyConfig represents a hotkey configuration
type HotkeyConfig struct {
	Fullscreen string `json:"fullscreen"`
	Region     string `json:"region"`
	Window     string `json:"window"`
}

// GetHotkeyConfig returns the current hotkey configuration
func (a *App) GetHotkeyConfig() HotkeyConfig {
	return HotkeyConfig{
		Fullscreen: a.config.Hotkeys.Fullscreen,
		Region:     a.config.Hotkeys.Region,
		Window:     a.config.Hotkeys.Window,
	}
}

// GetConfig returns the current application configuration
func (a *App) GetConfig() *config.Config {
	return a.config
}

// SaveConfig saves the application configuration
func (a *App) SaveConfig(cfg *config.Config) error {
	// Update startup setting if changed
	if cfg.Startup.LaunchOnStartup != a.config.Startup.LaunchOnStartup {
		if err := config.SetStartupEnabled(cfg.Startup.LaunchOnStartup); err != nil {
			return err
		}
	}

	// Update hotkeys if changed
	hotkeysChanged := cfg.Hotkeys.Fullscreen != a.config.Hotkeys.Fullscreen ||
		cfg.Hotkeys.Region != a.config.Hotkeys.Region ||
		cfg.Hotkeys.Window != a.config.Hotkeys.Window

	// Store new config
	a.config = cfg

	// Save to disk
	if err := cfg.Save(); err != nil {
		return err
	}

	// Re-register hotkeys if they changed
	if hotkeysChanged {
		a.hotkeyManager.UnregisterAll()
		a.registerHotkeysFromConfig()
	}

	return nil
}

// SelectFolder opens a folder selection dialog
func (a *App) SelectFolder() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Save Folder",
	})
}

// registerHotkeysFromConfig registers hotkeys based on current config
func (a *App) registerHotkeysFromConfig() {
	// Parse and register fullscreen hotkey
	if mods, key, ok := hotkeys.ParseHotkeyString(a.config.Hotkeys.Fullscreen); ok {
		a.hotkeyManager.Register(hotkeys.HotkeyFullscreen, mods, key)
	}

	// Parse and register region hotkey
	if mods, key, ok := hotkeys.ParseHotkeyString(a.config.Hotkeys.Region); ok {
		a.hotkeyManager.Register(hotkeys.HotkeyRegion, mods, key)
	}

	// Parse and register window hotkey
	if mods, key, ok := hotkeys.ParseHotkeyString(a.config.Hotkeys.Window); ok {
		a.hotkeyManager.Register(hotkeys.HotkeyWindow, mods, key)
	}
}

// GetBackgroundImages returns the list of saved background images (base64 data URLs)
func (a *App) GetBackgroundImages() []string {
	if a.config == nil || a.config.BackgroundImages == nil {
		return []string{}
	}
	return a.config.BackgroundImages
}

// SaveBackgroundImages saves the list of background images to persistent config
func (a *App) SaveBackgroundImages(images []string) error {
	if a.config == nil {
		return nil
	}
	a.config.BackgroundImages = images
	return a.config.Save()
}
