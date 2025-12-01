# Wails v2 Framework Research Report

**Date:** 2025-12-01 | **Status:** Current stable version analysis

## 1. Latest Version & Setup

**Current Stable:** v2.9.3 (Feb 2025)

### Installation Requirements
- Go 1.18+ required
- Node.js 15+ (16+ recommended)
- Windows: WebView2 runtime (pre-installed on Win 11, check with `wails doctor`)
- No CGO required on Windows (unlike v1)

```bash
# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Verify setup
wails doctor

# Create React+TypeScript project
wails init -n myproject -t react-ts
```

**Key Advantage:** Zero CGO dependency eliminates mingw compiler requirements.

---

## 2. Go Backend Capabilities

### System-Level Access
- Direct access to Windows APIs via Go
- Public Go methods automatically exposed to frontend via bindings
- Full native Windows programming support

### Screenshot/System Integration
Screenshot support requires third-party Go packages (not built-in):
- `github.com/vova616/screenshot` - Cross-platform option
- Windows Win32 API wrappers for native implementation
- Create bound Go methods to call from frontend

```go
// Example: Expose method to frontend
func (a *App) CaptureScreen() (string, error) {
    // Use Windows screenshot library
    // Return base64 or file path to frontend
}
```

### Method Binding
- Expose Go structs' public methods to JavaScript
- Methods return Promises on frontend
- Error handling via Go error return values

---

## 3. Frontend Integration

### React+TypeScript Setup
```bash
wails dev  # Live reload with hot module replacement (Vite)
```

**Auto-Generated Bindings:**
- Location: `wailsjs/go/` directory
- Automatic generation from Go public methods
- TypeScript-safe bindings

**Configuration (wails.json):**
```json
{
  "frontend": {
    "install": "npm install",
    "build": "npm run build",
    "dev": "npm run dev"
  },
  "bind": ["App"]
}
```

**Development Server:**
- Vite dev server on localhost:34115
- Hot reload for React components
- Native debugging in browser DevTools

---

## 4. Windows-Specific Features

### Supported
- **WebView2 Rendering:** Modern Chromium-based engine (replaces IE11)
- **Native Dialogs:** File/directory pickers, message boxes
- **Application Menus:** Checkboxes, radio groups, submenus, separators
- **Window Control:** Multi-monitor support, full window APIs
- **Dark/Light Theme:** System theme detection + custom theming

### Not Available in v2 (Wails v3 only)
- System tray integration
- Global hotkeys
- Adaptive icon support
- Keyboard shortcuts API

---

## 5. Build & Distribution

### Portable EXE
```bash
wails build  # Generates standalone executable
```
- Single executable, no runtime required (except WebView2)
- ~4-15MB typical size

### NSIS Installer
```bash
# Install NSIS first
winget install NSIS.NSIS --silent

# Build installer
wails build -nsis
```
Generates:
- `app.exe` - Standalone executable
- `app_installer.exe` - NSIS installer

**Installer Customization:**
- Edit `build/windows/installer/project.nsi`
- Standard NSIS script format
- Configure install path, registry entries, shortcuts

---

## 6. Performance vs Electron

| Metric | Wails v2 | Electron |
|--------|----------|----------|
| **Binary Size** | ~4-15MB | ~100MB+ |
| **Memory** | Shared OS (WebView2) | Embedded Chromium |
| **Startup (Windows)** | ~573ms | ~304ms |
| **Startup (Linux)** | ~220ms* | ~274ms* |

*Wails faster on Linux

**Key Notes:**
- 90% smaller binaries than Electron
- Memory usage similar (WebView2 allocated by OS, not app)
- Startup slightly slower on Windows vs Electron
- Native webview = lighter footprint
- No Chromium bundling overhead

---

## Code Examples

### Go Backend (main.go)
```go
package main

import (
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct{}

func (a *App) Greet(name string) string {
	return "Hello " + name
}

func (a *App) OpenFileDialog(ctx context.Context) (string, error) {
	return runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		Title: "Select a file",
	})
}

func main() {
	app := NewApp()
	err := wails.Run(&options.App{
		Title:   "My App",
		Width:   1024,
		Height:  768,
		Bind:    []interface{}{app},
	})
}
```

### Frontend (React/TypeScript)
```typescript
import { Greet } from '../wailsjs/go/main/App'

export function App() {
  const [message, setMessage] = useState('')

  const greet = async () => {
    const result = await Greet('World')
    setMessage(result)
  }

  return <button onClick={greet}>{message}</button>
}
```

---

## Official Documentation Links

- **Main Docs:** https://wails.io/docs/introduction/
- **Installation Guide:** https://wails.io/docs/gettingstarted/installation/
- **First Project:** https://wails.io/docs/gettingstarted/firstproject/
- **How It Works:** https://wails.io/docs/howdoesitwork/
- **NSIS Installer Guide:** https://wails.io/docs/guides/windows-installer/
- **Application Development:** https://wails.io/docs/guides/application-development/
- **GitHub Releases:** https://github.com/wailsapp/wails/releases
- **Changelog:** https://wails.io/changelog/

---

## Recommendations for WinShot Project

1. **Choose Wails v2 if:** Screenshot capture in Go is priority, lightweight binary essential, targeting Windows primarily
2. **Consider v3 alpha if:** System tray + hotkeys needed before production
3. **Dependencies needed:**
   - Screenshot library: `go get github.com/vova616/screenshot` OR native Win32 wrapper
   - Image processing: Consider `github.com/disintegration/imaging` for post-capture ops
4. **NSIS installer** recommended for professional distribution

---

## Unresolved Questions

- Clipboard integration complexity (copy screenshot path or binary?)
- Permission handling for screen capture on Windows 10 Pro/Enterprise
- WebView2 offline bundling vs automatic download
