package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	wailsWindows "github.com/wailsapp/wails/v2/pkg/options/windows"
	"golang.org/x/sys/windows"
	"winshot/internal/config"
)

//go:embed all:frontend/dist
var assets embed.FS

// Single instance mutex name
const singleInstanceMutex = "WinShot-SingleInstance-Mutex-7F3A9B2E"

func main() {
	// Single instance check using Windows mutex
	mutexName, _ := windows.UTF16PtrFromString(singleInstanceMutex)
	handle, err := windows.CreateMutex(nil, false, mutexName)
	if err != nil {
		// Failed to create mutex - another instance likely running
		println("WinShot is already running")
		return
	}
	defer windows.CloseHandle(handle)

	// Check if mutex already existed (another instance owns it)
	if windows.GetLastError() == windows.ERROR_ALREADY_EXISTS {
		println("WinShot is already running")
		return
	}

	// Load config to get saved window size and startup settings
	cfg, _ := config.Load()

	// Sync startup registry path if startup is enabled (fixes duplicate app issue #61)
	if cfg != nil && cfg.Startup.LaunchOnStartup {
		_ = config.SyncStartupPath()
	}
	width := cfg.Window.Width
	height := cfg.Window.Height
	if width < 800 {
		width = 800
	}
	if height < 600 {
		height = 600
	}

	// Check if app should start hidden (minimize to tray)
	startHidden := cfg != nil && cfg.Startup.MinimizeToTray

	app := NewApp()

	err = wails.Run(&options.App{
		Title:            "WinShot",
		Width:            width,
		Height:           height,
		MinWidth:         800,
		MinHeight:        600,
		Frameless:        true,
		StartHidden:      startHidden,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 255},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		OnBeforeClose:    app.OnBeforeClose,
		Bind: []interface{}{
			app,
		},
		Windows: &wailsWindows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			Theme:                wailsWindows.Dark,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
