package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"winshot/internal/config"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Load config to get saved window size and startup settings
	cfg, _ := config.Load()
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

	err := wails.Run(&options.App{
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
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			Theme:                windows.Dark,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
