package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/image/bmp"
	"golang.org/x/image/webp"
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
	trayIcon         *tray.TrayIcon
	config           *config.Config
	lastWidth        int
	lastHeight       int
	preCaptureWidth  int // Window size before capture (protected from resize events)
	preCaptureHeight int
	isCapturing      bool // Flag to prevent resize events during capture
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
	// Skip updates during capture to preserve pre-capture size
	if a.isCapturing {
		return
	}
	if width >= 800 && height >= 600 {
		a.lastWidth = width
		a.lastHeight = height
	}
}

// MinimizeToTray hides the window (minimize to tray)
func (a *App) MinimizeToTray() {
	runtime.WindowHide(a.ctx)
}

// OnBeforeClose is called when the window close button is clicked
// Returns true to prevent the default close behavior (if close-to-tray is enabled)
func (a *App) OnBeforeClose(ctx context.Context) bool {
	if a.config != nil && a.config.Startup.CloseToTray {
		// Hide window instead of closing
		runtime.WindowHide(ctx)
		return true // Prevent default close
	}
	return false // Allow normal close
}

// RegionCaptureData holds the fullscreen screenshot and display info for region selection
type RegionCaptureData struct {
	Screenshot   *screenshot.CaptureResult `json:"screenshot"`
	ScreenX      int                       `json:"screenX"`
	ScreenY      int                       `json:"screenY"`
	Width        int                       `json:"width"`
	Height       int                       `json:"height"`
	ScaleRatio   float64                   `json:"scaleRatio"`   // DPI scale ratio (physical/logical)
	PhysicalW    int                       `json:"physicalW"`    // Actual screenshot width
	PhysicalH    int                       `json:"physicalH"`    // Actual screenshot height
	DisplayIndex int                       `json:"displayIndex"` // Index of the captured display
}

// PrepareRegionCapture prepares for region selection by capturing the active monitor and setting up overlay
func (a *App) PrepareRegionCapture() (*RegionCaptureData, error) {
	// Set capturing flag to prevent resize events from overwriting saved size
	a.isCapturing = true

	// Save current window size before hiding (protected from resize events)
	width, height := runtime.WindowGetSize(a.ctx)
	if width >= 800 && height >= 600 {
		a.preCaptureWidth = width
		a.preCaptureHeight = height
	} else if a.lastWidth >= 800 && a.lastHeight >= 600 {
		// Fallback to last tracked size
		a.preCaptureWidth = a.lastWidth
		a.preCaptureHeight = a.lastHeight
	} else {
		// Default fallback
		a.preCaptureWidth = 1200
		a.preCaptureHeight = 800
	}

	// Hide the window first so it's not in the screenshot
	runtime.WindowHide(a.ctx)

	// Wait for window to fully hide (350ms needed for Windows DWM compositor)
	time.Sleep(350 * time.Millisecond)

	// Capture the display where cursor is located (at physical/native resolution)
	result, displayIndex, err := screenshot.CaptureActiveDisplay()
	if err != nil {
		// Show window again on error
		runtime.WindowShow(a.ctx)
		return nil, err
	}

	// Get the physical bounds of the captured display
	displayBounds := screenshot.GetDisplayBounds(displayIndex)
	screenX := displayBounds.Min.X
	screenY := displayBounds.Min.Y

	// Get logical screen info from Wails runtime
	// Wails ScreenGetAll returns logical (DPI-scaled) dimensions
	screens, _ := runtime.ScreenGetAll(a.ctx)

	// Calculate logical dimensions based on physical screenshot and DPI
	// We use the screenshot dimensions directly since they represent the actual captured area
	logicalWidth := result.Width
	logicalHeight := result.Height
	scaleRatio := 1.0

	// Try to find matching screen from Wails to get logical dimensions
	// This helps handle DPI scaling correctly
	if len(screens) > 0 {
		// Find screen that best matches our captured display
		var matchedScreen *runtime.Screen
		for i := range screens {
			s := &screens[i]
			// Check if this screen's size roughly matches our physical capture
			// (accounting for potential DPI differences)
			if s.Size.Width > 0 && s.Size.Height > 0 {
				// For now, use the screen at the matching index if available
				if i == displayIndex && i < len(screens) {
					matchedScreen = s
					break
				}
			}
		}

		// If we found a match, use its logical dimensions
		if matchedScreen != nil {
			logicalWidth = matchedScreen.Size.Width
			logicalHeight = matchedScreen.Size.Height
			scaleRatio = float64(result.Width) / float64(logicalWidth)
			if scaleRatio < 1.0 {
				scaleRatio = 1.0
			}
		} else if len(screens) > 0 {
			// Fallback: estimate scale from first screen's DPI
			firstScreen := screens[0]
			if firstScreen.Size.Width > 0 {
				estimatedScale := float64(displayBounds.Dx()) / float64(firstScreen.Size.Width)
				if estimatedScale > 1.0 && estimatedScale < 4.0 {
					scaleRatio = estimatedScale
					logicalWidth = int(float64(result.Width) / scaleRatio)
					logicalHeight = int(float64(result.Height) / scaleRatio)
				}
			}
		}
	}

	// Position window at the captured display's origin
	runtime.WindowSetPosition(a.ctx, screenX, screenY)

	// Disable min size constraint temporarily
	runtime.WindowSetMinSize(a.ctx, 0, 0)

	// Set window size to match the logical display dimensions
	runtime.WindowSetSize(a.ctx, logicalWidth, logicalHeight)

	// Make window always on top
	runtime.WindowSetAlwaysOnTop(a.ctx, true)

	// Show the window
	runtime.WindowShow(a.ctx)

	return &RegionCaptureData{
		Screenshot:   result,
		ScreenX:      screenX,
		ScreenY:      screenY,
		Width:        logicalWidth,
		Height:       logicalHeight,
		ScaleRatio:   scaleRatio,
		PhysicalW:    result.Width,
		PhysicalH:    result.Height,
		DisplayIndex: displayIndex,
	}, nil
}

// FinishRegionCapture restores the window to normal state after region selection
func (a *App) FinishRegionCapture() {
	// Remove always on top
	runtime.WindowSetAlwaysOnTop(a.ctx, false)

	// Restore min size constraint
	runtime.WindowSetMinSize(a.ctx, 800, 600)

	// Restore window to the size it was before capture (protected value)
	width := a.preCaptureWidth
	height := a.preCaptureHeight
	if width < 800 || height < 600 {
		// Fallback to defaults
		width = 1200
		height = 800
	}
	runtime.WindowSetSize(a.ctx, width, height)

	// Clear capturing flag to allow resize tracking again
	a.isCapturing = false

	// Center the window
	runtime.WindowCenter(a.ctx)
}

// ShowWindow shows the main window
func (a *App) ShowWindow() {
	runtime.WindowShow(a.ctx)
	runtime.WindowSetAlwaysOnTop(a.ctx, true)
	runtime.WindowSetAlwaysOnTop(a.ctx, false)
}

// CaptureFullscreen captures the display where the cursor is currently located
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
	result, err := screenshot.CaptureWindowByCoords(uintptr(hwnd))

	// Bring WinShot back to front after capture
	runtime.WindowShow(a.ctx)
	runtime.WindowSetAlwaysOnTop(a.ctx, true)
	time.Sleep(50 * time.Millisecond)
	runtime.WindowSetAlwaysOnTop(a.ctx, false)

	return result, err
}

// GetDisplayCount returns the number of active displays
func (a *App) GetDisplayCount() int {
	return screenshot.GetDisplayCount()
}

// GetActiveDisplayIndex returns the index of the display where the cursor is located
func (a *App) GetActiveDisplayIndex() int {
	return screenshot.GetMonitorAtCursor()
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

// GetWindowListWithThumbnails returns a list of all visible windows with thumbnails
func (a *App) GetWindowListWithThumbnails() ([]winEnum.WindowInfoWithThumbnail, error) {
	// Use 160x120 for thumbnails (4:3 aspect, good balance of quality and speed)
	return winEnum.EnumWindowsWithThumbnails(160, 120)
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

// OpenImage opens a file dialog to select an image and returns it as a CaptureResult
func (a *App) OpenImage() (*screenshot.CaptureResult, error) {
	// Show open file dialog
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Open Image",
		Filters: []runtime.FileFilter{
			{DisplayName: "Image Files", Pattern: "*.png;*.jpg;*.jpeg;*.gif;*.bmp;*.webp"},
			{DisplayName: "PNG Images", Pattern: "*.png"},
			{DisplayName: "JPEG Images", Pattern: "*.jpg;*.jpeg"},
			{DisplayName: "GIF Images", Pattern: "*.gif"},
			{DisplayName: "BMP Images", Pattern: "*.bmp"},
			{DisplayName: "WebP Images", Pattern: "*.webp"},
		},
	})

	if err != nil {
		return nil, err
	}

	if filePath == "" {
		return nil, nil // User cancelled
	}

	// Read file
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	// Decode image to get dimensions
	var img image.Image
	ext := strings.ToLower(filepath.Ext(filePath))

	switch ext {
	case ".png":
		img, err = png.Decode(bytes.NewReader(data))
	case ".jpg", ".jpeg":
		img, err = jpeg.Decode(bytes.NewReader(data))
	case ".gif":
		img, err = gif.Decode(bytes.NewReader(data))
	case ".bmp":
		img, err = bmp.Decode(bytes.NewReader(data))
	case ".webp":
		img, err = webp.Decode(bytes.NewReader(data))
	default:
		// Try to decode as any supported format
		img, _, err = image.Decode(bytes.NewReader(data))
	}

	if err != nil {
		return nil, err
	}

	bounds := img.Bounds()

	// Re-encode as PNG for consistent handling in frontend
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}

	// Return as base64 encoded PNG
	return &screenshot.CaptureResult{
		Width:  bounds.Dx(),
		Height: bounds.Dy(),
		Data:   base64.StdEncoding.EncodeToString(buf.Bytes()),
	}, nil
}
