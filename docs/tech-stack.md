# WinShot - Technology Stack

**Date:** 2025-12-01 | **Version:** 1.0

---

## Overview

WinShot is a Windows screenshot application built with Wails (Go + React) for native performance with modern UI.

---

## Core Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Wails | v2.9.3 | Go backend + Web frontend desktop framework |
| **Backend** | Go | 1.21+ | System APIs, screenshot capture, file I/O |
| **Frontend** | React | 18.x | UI components and state management |
| **Language** | TypeScript | 5.x | Type-safe frontend development |
| **Styling** | TailwindCSS | 3.x | Utility-first CSS framework |
| **Canvas** | react-konva | 18.x | Canvas rendering for editor |
| **Build** | Vite | 5.x | Frontend bundler (Wails default) |

---

## Go Dependencies

```go
// Core
github.com/wailsapp/wails/v2  // Desktop framework

// Screenshot
github.com/kbinani/screenshot  // Multi-monitor screen capture

// Windows API
golang.org/x/sys/windows       // Window enumeration, hotkeys, system tray
```

---

## Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "konva": "^9.2.0",
    "react-konva": "^18.2.10",
    "use-image": "^1.1.1"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

---

## Architecture Decisions

### Why Wails v2?
- **90% smaller** than Electron (~10MB vs 100MB+)
- **Native Go** for system-level operations (screenshots, hotkeys)
- **Modern UI** via React + TypeScript
- **NSIS installer** support built-in

### Why react-konva over fabric.js?
- **Declarative React** patterns (vs imperative fabric.js)
- **Better performance** with layer-based rendering
- **Smaller bundle** (~70KB vs 300KB+)
- **Native React** state management integration

### Why kbinani/screenshot?
- **Production-ready**, actively maintained
- **Multi-monitor** support built-in
- **Cross-platform** bonus (future macOS/Linux)
- **Simple API**: `screenshot.Capture(x, y, w, h)`

---

## Windows-Specific Features

### Global Hotkeys
Implemented via `golang.org/x/sys/windows`:
- `RegisterHotKey()` for global shortcuts
- Default: Ctrl+Shift+1 (region), Ctrl+Shift+2 (fullscreen)

### Window Enumeration
- `EnumWindows()` callback for window listing
- `GetWindowText()` for window titles
- Custom GDI capture for specific windows

### System Tray
- Custom implementation via Windows API
- Persistent icon for quick access
- Context menu for capture modes

---

## Distribution

| Type | Method | Output |
|------|--------|--------|
| Portable | `wails build` | `winshot.exe` (~10-15MB) |
| Installer | `wails build -nsis` | `winshot_installer.exe` |

---

## Development Requirements

### Prerequisites
- Go 1.21+
- Node.js 18+
- WebView2 Runtime (pre-installed on Windows 11)
- NSIS (for installer builds)

### Setup
```bash
# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Verify setup
wails doctor

# Development
wails dev

# Build
wails build -nsis
```

---

## File Structure

```
winshot/
├── main.go              # Wails app entry
├── app.go               # App struct with bound methods
├── wails.json           # Wails configuration
├── go.mod               # Go dependencies
├── build/               # Build assets (icons, manifest)
├── frontend/            # React application
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── internal/            # Go internal packages
│   ├── screenshot/      # Capture logic
│   ├── hotkeys/         # Global hotkey registration
│   ├── windows/         # Window enumeration
│   └── tray/            # System tray
├── docs/                # Documentation
└── plans/               # Implementation plans
```

---

## Sources

- [Wails Documentation](https://wails.io/docs/)
- [kbinani/screenshot](https://github.com/kbinani/screenshot)
- [react-konva](https://konvajs.org/docs/react/)
- [golang.org/x/sys/windows](https://pkg.go.dev/golang.org/x/sys/windows)
