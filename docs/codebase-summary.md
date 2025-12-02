# WinShot - Codebase Summary

**Date:** 2025-12-03 | **Version:** 1.0

---

## Overview

WinShot is a Windows-native screenshot application built with Wails v2.10.2. The codebase splits evenly between Go backend (~2,300 LOC) and React/TypeScript frontend (~3,000 LOC), communicating via Wails bindings.

**Total Size:** ~58K tokens across 47 files | **Build Size:** ~10-15MB executable

---

## Directory Structure

```
D:\www\winshot/
├── app.go                          # App struct with ~25 frontend methods (500 LOC)
├── main.go                         # Wails entry point (55 LOC)
├── wails.json                      # Wails configuration
├── go.mod / go.sum                 # Go dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Central state management (24KB, 5,452 tokens)
│   │   ├── main.tsx                # React entry point
│   │   ├── types/index.ts          # TypeScript interfaces
│   │   ├── components/             # 14 React components
│   │   │   ├── title-bar.tsx
│   │   │   ├── capture-toolbar.tsx
│   │   │   ├── annotation-toolbar.tsx
│   │   │   ├── export-toolbar.tsx
│   │   │   ├── settings-panel.tsx
│   │   │   ├── settings-modal.tsx  # App config dialog (16KB)
│   │   │   ├── editor-canvas.tsx   # Konva Stage wrapper (15KB)
│   │   │   ├── annotation-shapes.tsx # 5 annotation types (19KB)
│   │   │   ├── crop-toolbar.tsx
│   │   │   ├── crop-overlay.tsx
│   │   │   ├── region-selector.tsx # Region capture UI
│   │   │   ├── window-picker.tsx   # Window enumeration UI
│   │   │   ├── status-bar.tsx
│   │   │   └── hotkey-input.tsx    # Custom hotkey binding
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   └── fonts/
│   │   └── style.css               # Global styles + Tailwind
│   ├── index.html                  # HTML entry point
│   ├── package.json                # npm dependencies
│   ├── vite.config.ts              # Vite build config
│   ├── tailwind.config.js          # Tailwind config
│   ├── tsconfig.json               # TypeScript config
│   └── wailsjs/                    # Auto-generated Wails bindings
│       ├── go/main/App.ts          # Go method bindings
│       └── runtime/                # Wails runtime
├── internal/
│   ├── config/
│   │   ├── config.go               # Configuration struct + persistence
│   │   └── startup.go              # Windows startup registry
│   ├── hotkeys/
│   │   └── hotkeys.go              # RegisterHotKey() implementation
│   ├── screenshot/
│   │   ├── capture.go              # Multi-display screen capture
│   │   └── window.go               # Window capture + DPI handling
│   ├── tray/
│   │   └── tray.go                 # System tray icon + menu
│   └── windows/
│       └── enum.go                 # Window enumeration (EnumWindows)
├── docs/
│   ├── tech-stack.md               # Technology decisions
│   ├── codebase-summary.md         # This file
│   ├── code-standards.md           # Naming & patterns
│   ├── system-architecture.md      # Architecture overview
│   └── project-overview-pdr.md     # Requirements & roadmap
└── build/                          # Build assets (icons, manifest)
```

---

## Go Backend (~2,300 LOC)

### Package: `internal/config`
**Files:** config.go (80 LOC), startup.go (40 LOC)

Manages application configuration persistence.

**Key Structures:**
```go
type Config struct {
  Hotkeys    HotkeyConfig
  Startup    StartupConfig
  QuickSave  QuickSaveConfig
  Export     ExportConfig
  Window     WindowConfig
}
```

**Features:**
- JSON persistence at `%APPDATA%\WinShot\config.json`
- Windows Registry startup entry (via startup.go)
- Default values factory pattern
- Type-safe config loading

**Entry Points:**
- `config.Load()` - Load or create config
- `config.Save()` - Persist to disk
- `config.Default()` - Get default config

### Package: `internal/hotkeys`
**File:** hotkeys.go (150 LOC)

Implements Windows global hotkey registration via `RegisterHotKey()` API.

**Key Constants:**
```go
const (
  HotkeyFullscreen = 1
  HotkeyRegion     = 2
  HotkeyWindow     = 3
)
```

**Key Types:**
- `HotkeyManager` - Goroutine-based hotkey listener
- Modifiers: Ctrl, Shift, Alt, Win
- Virtual keys: PrintScreen, F1-F12

**Features:**
- Global hotkey registration (works even when app is unfocused)
- Message loop via `GetMessageW()` / `PeekMessageW()`
- Callback-based event notification to frontend
- Thread-safe registration/unregistration

**Entry Points:**
- `NewHotkeyManager()` - Create manager
- `RegisterHotkey()` - Register single hotkey
- `Start()` - Begin listening
- `Stop()` - Stop listening gracefully

### Package: `internal/screenshot`
**Files:** capture.go (120 LOC), window.go (90 LOC)

Wraps kbinani/screenshot library with DPI-awareness and multi-display support.

**Features:**
- `CaptureFullscreen()` - All displays combined
- `CaptureRegion(x, y, w, h)` - Bounded area capture
- `CaptureWindow(hwnd)` - Specific window capture with GDI
- DPI scaling calculations
- Base64 PNG encoding for transport

**Entry Points:**
- `CaptureFullscreen()` → CaptureResult
- `CaptureRegion(x, y, w, h)` → CaptureResult
- `CaptureWindow(hwnd)` → CaptureResult

### Package: `internal/tray`
**File:** tray.go (180 LOC)

Implements system tray icon and context menu using Windows APIs.

**Features:**
- Persistent tray icon visibility
- Context menu with 3 capture modes
- Show/minimize window toggle
- Exit action

**Entry Points:**
- `NewTrayIcon(title)` - Create tray icon
- `Start()` - Show icon
- `Stop()` - Hide and cleanup

### Package: `internal/windows`
**File:** enum.go (80 LOC)

Window enumeration via `EnumWindows()` callback.

**Features:**
- List all open windows with titles
- Filter taskbar/hidden windows
- Return WindowInfo structs to frontend

**Entry Points:**
- `EnumVisibleWindows()` → []WindowInfo

### Root: `app.go`
**File:** app.go (500 LOC, 3,515 tokens)

Central App struct with all Wails-bound methods called from frontend.

**Key Methods (~25 total):**
```go
// Capture operations
CaptureFullscreen()
CaptureWindow(handle int)
PrepareRegionCapture()
FinishRegionCapture(x, y, w, h int)

// File operations
SaveImage(data, path, filename string)
QuickSave(data string)

// Window operations
GetWindows()
GetDisplayBounds()

// Config operations
GetConfig()
SaveConfig(config)
SetHotkey(mode, combo)

// Utility
MinimizeToTray()
UpdateWindowSize(width, height)
```

**Lifecycle:**
- `startup(ctx)` - Initialize hotkey manager, tray icon, load config
- `shutdown(ctx)` - Cleanup resources, save window size

---

## React Frontend (~3,000 LOC)

### File: `App.tsx`
**Size:** 24KB (5,452 tokens)

Central state management and orchestration.

**State Categories:**

1. **Capture State**
   - `screenshot` - CaptureResult (width, height, base64 data)
   - `isCapturing` - Boolean flag
   - `captureMode` - 'fullscreen' | 'region' | 'window'

2. **Editor Settings (localStorage-persisted)**
   - `padding`, `cornerRadius`, `shadowSize`
   - `backgroundColor` - Gradient string
   - `outputRatio` - 9 output aspect ratios

3. **Annotation State**
   - `annotations[]` - Array of shape objects
   - `activeTool` - Current editor tool
   - `selectedAnnotationId` - Selected shape
   - `strokeColor`, `strokeWidth` - Drawing properties

4. **Crop State**
   - `cropArea` - {x, y, width, height}
   - `aspectRatio` - 6 preset + free

5. **UI State**
   - `showWindowPicker`, `showRegionSelector`, `showSettings`
   - `statusMessage` - Toast/notification
   - `displayBounds` - Screen dimensions

**Key Features:**
- localStorage persistence for editor settings
- Hotkey event listeners (via Wails EventsOn)
- Wails method bindings for backend calls
- Canvas stage ref management with Konva

### Components (14 total)

**Toolbars (4 files):**
- `capture-toolbar.tsx` - Fullscreen/Region/Window buttons
- `annotation-toolbar.tsx` - Rectangle/Ellipse/Arrow/Line/Text tools
- `export-toolbar.tsx` - Export with format/quality options
- `crop-toolbar.tsx` - Crop mode controls

**Modals & Panels (3 files):**
- `settings-modal.tsx` - Config dialog (hotkeys, startup, quick-save, export)
- `settings-panel.tsx` - Editor settings (padding, radius, shadow, bg)
- `title-bar.tsx` - Minimize/settings/close + drag

**Selectors (3 files):**
- `region-selector.tsx` - Drag-to-select region UI
- `window-picker.tsx` - Window enumeration + preview
- `hotkey-input.tsx` - Custom hotkey binding UI

**Canvas & Drawing (3 files):**
- `editor-canvas.tsx` - Konva Stage wrapper (15KB)
- `annotation-shapes.tsx` - 5 shape types: Rectangle, Ellipse, Arrow, Line, Text (19KB)
- `crop-overlay.tsx` - Crop area visualization

**UI Utilities (2 files):**
- `status-bar.tsx` - Bottom info bar
- `capture-toolbar.tsx` - Top toolbar

### Types: `types/index.ts`

**Core Interfaces:**
```typescript
interface CaptureResult {
  width: number
  height: number
  data: string  // base64 PNG
}

interface WindowInfo {
  handle: number
  title: string
  className: string
  x, y, width, height: number
}

interface Annotation {
  id: string
  type: 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text'
  x, y, width, height: number
  stroke: string
  strokeWidth: number
  fill?: string
  points?: number[]  // For arrows/lines
  text?: string
  fontSize?: number
}

type OutputRatio =
  | 'auto' | '1:1' | '4:3' | '3:2' | '16:9'
  | '5:3' | '9:16' | '3:4' | '2:3'
```

**Config Interfaces:**
```typescript
interface AppConfig {
  hotkeys: HotkeyConfig
  startup: StartupConfig
  quickSave: QuickSaveConfig
  export: ExportConfig
}
```

---

## Data Flow

### Capture Flow (Fullscreen)
```
User clicks "Fullscreen"
  → App.onFullscreenCapture()
  → Calls CaptureFullscreen() (Go)
  → Returns CaptureResult {width, height, data}
  → Stores in state.screenshot
  → EditorCanvas renders with base64 image
```

### Annotation Flow
```
User selects "Rectangle" tool
  → App.setActiveTool('rectangle')
  → Editor listens to mouse events
  → Creates Annotation on mouse-up
  → Adds to annotations[] state
  → EditorCanvas re-renders with Konva shapes
```

### Export Flow
```
User clicks "Export"
  → Collect annotations + editor settings
  → Render final canvas with background + annotations + crop
  → Encode as PNG/JPEG
  → Call SaveImage() or QuickSave() (Go)
  → Go saves file to disk
  → Show toast notification
```

### Hotkey Flow (Backend → Frontend)
```
User presses Ctrl+PrintScreen
  → Global hotkey listener detects
  → HotkeyManager.onHotkey(id)
  → Calls runtime.EventsEmit(ctx, "hotkey:region")
  → Frontend EventsOn('hotkey:region', callback)
  → Triggers RegionSelector UI
```

---

## State Management Approach

**No Redux/Zustand** - Uses React hooks:
- `useState` for all state
- `useCallback` for event handlers
- `useEffect` for lifecycle and hotkey listeners
- `useRef` for Konva stage reference
- `localStorage` for persistence

**Rationale:** Simpler codebase, direct component updates, sufficient for single-window app.

---

## Key Dependencies

**Backend:**
- `wails/v2` - Desktop framework
- `kbinani/screenshot` - Screen capture
- `golang.org/x/sys/windows` - Windows APIs

**Frontend:**
- `react@18.2.0` - UI framework
- `konva@9.2.0` + `react-konva@18.2.10` - Canvas rendering
- `tailwindcss@3.4.0` - Styling
- `typescript@5.3.0` - Type safety
- `vite@3.0.7` - Build tool

---

## Build & Distribution

**Development:**
```bash
wails dev                    # Hot reload
npm run dev                  # (inside frontend/)
```

**Production:**
```bash
wails build                  # Portable EXE
wails build -nsis           # Installer EXE
```

**Output:**
- Portable: `winshot.exe` (~10-15MB)
- Installer: `winshot_installer.exe`

---

## Codebase Statistics

| Metric | Value |
|--------|-------|
| Total Tokens | 58,044 |
| Total Characters | 230,222 |
| Total Files | 47 |
| Go Files | 8 |
| TypeScript/React Files | 18 |
| Configuration Files | 8 |
| Binary Files | 1 (font) |
| Top File | App.tsx (5,452 tokens) |

---

## Entry Points

### Backend
- **app.go** - App struct with 25+ Wails-bound methods
- **main.go** - Wails initialization and config loading
- **internal/hotkeys** - Global hotkey listener

### Frontend
- **frontend/src/main.tsx** - React DOM render
- **frontend/src/App.tsx** - Root component
- **frontend/wailsjs/go/main/App.ts** - Auto-generated Wails bindings

---

## Configuration Files

- **go.mod** - Go dependencies (Wails v2.10.2, kbinani/screenshot, golang.org/x/sys)
- **wails.json** - Wails build config
- **frontend/package.json** - npm dependencies
- **frontend/vite.config.ts** - Vite bundler config
- **frontend/tsconfig.json** - TypeScript config
- **frontend/tailwind.config.js** - Tailwind CSS config

---

## Notes

- All file paths use forward slashes in code (cross-platform compatible)
- Base64 PNG data transmitted as JSON strings between Go/React
- No database - configs stored as JSON files
- Windows-only (uses Win32 APIs extensively)
- Frameless window with custom title bar (Vibrant Glassmorphism design)
