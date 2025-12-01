package main

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
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
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize hotkey manager
	a.hotkeyManager = hotkeys.NewHotkeyManager()
	a.hotkeyManager.SetCallback(a.onHotkey)

	// Register default hotkeys (may fail if keys are already registered)
	a.hotkeyManager.RegisterDefaults()
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
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
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

// MinimizeToTray hides the window (minimize to tray)
func (a *App) MinimizeToTray() {
	runtime.WindowHide(a.ctx)
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
		Fullscreen: "PrintScreen",
		Region:     "Ctrl+PrintScreen",
		Window:     "Ctrl+Shift+PrintScreen",
	}
}
