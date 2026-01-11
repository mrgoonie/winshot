# WinShot - Codebase Summary

**Date:** 2025-12-24 | **Version:** 1.2

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
│   │   ├── utils/                  # Utility functions (Phase 2: Color extraction)
│   │   │   └── extract-edge-color.ts
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
│   ├── overlay/
│   │   ├── types.go                # Win32 constants + GDI structures
│   │   ├── overlay.go              # Native overlay manager + message loop
│   │   └── draw.go                 # GDI drawing with DIB double buffering
│   ├── screenshot/
│   │   ├── capture.go              # Multi-display screen capture
│   │   ├── window.go               # Window capture + DPI handling
│   │   └── clipboard.go            # Win32 clipboard DIB image reader
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

## Go Backend (~3,100 LOC)

### Package: `internal/config`
**Files:** config.go (203 LOC), startup.go (100 LOC, Phase 1 update)

Manages application configuration persistence and Windows startup registry integration.

**Key Structures:**
```go
type Config struct {
  Hotkeys    HotkeyConfig
  Startup    StartupConfig    // Includes MinimizeToTray, LaunchOnStartup, CloseToTray
  QuickSave  QuickSaveConfig
  Export     ExportConfig
  Window     WindowConfig
  Editor     EditorConfig    // Phase 2: Added Inset, AutoBackground
  Cloud      CloudConfig     // R2, Google Drive uploads
}

type EditorConfig struct {
  Padding        int    // Space around screenshot
  CornerRadius   int    // Rounded corners (0-50px)
  ShadowSize     int    // Drop shadow depth
  BackgroundColor string // Gradient or solid color
  OutputRatio    string // Aspect ratio preset
  ShowBackground bool   // Include background in export
  Inset          int    // Phase 2: 0-50 percentage for screenshot scaling
  AutoBackground bool   // Phase 2: Auto-extract edge color
}

type StartupConfig struct {
  LaunchOnStartup bool  // Windows Registry autostart
  MinimizeToTray  bool  // Start hidden (Wails StartHidden)
  CloseToTray     bool  // Minimize on close button click
}
```

**Features:**
- JSON persistence at `%APPDATA%\WinShot\config.json`
- Windows Registry startup entry with quoted path handling (Phase 1: Fixed quoting)
- Registry verification for write integrity (Phase 1: Added)
- Improved error handling with context (Phase 1: Enhanced)
- Default values factory pattern
- Type-safe config loading

**Registry Integration (Phase 1 - Startup Fixes):**
- `IsStartupEnabled()` - Check if app registered in Run key
- `SetStartupEnabled(enabled bool)` - Enable/disable autostart
- `enableStartup()` - Private: Write quoted path to registry with verification
- `disableStartup()` - Private: Remove registry entry gracefully

**Key Changes (Phase 1):**
1. Fixed registry path quoting to handle spaces in executable path
2. Added verification step to confirm registry write succeeded
3. Improved error wrapping with `fmt.Errorf()` for better debugging
4. Graceful disableStartup if registry key doesn't exist

**Entry Points:**
- `config.Load()` - Load or create config
- `config.Save()` - Persist to disk
- `config.Default()` - Get default config
- `config.IsStartupEnabled()` - Check autostart status
- `config.SetStartupEnabled(bool)` - Toggle autostart

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

### Package: `internal/overlay`
**Files:** types.go (150 LOC), overlay.go (400 LOC), draw.go (300 LOC)

Implements native Win32 layered window for region selection overlay with high-performance GDI rendering.

**Key Components:**

1. **Window Management (overlay.go)**
   - Native layered window with `WS_EX_LAYERED` style for transparency support
   - Thread-safe message loop bound to OS thread via `runtime.LockOSThread()`
   - Command channel for async control (Show, Hide, Stop)
   - Class registration with custom window procedure callback

2. **GDI Drawing (draw.go)**
   - 32-bit DIB (Device-Independent Bitmap) double buffering
   - Top-down DIB creation with negative height for proper pixel ordering
   - Direct pixel access via unsafe pointers for fast drawing
   - Zero-copy rendering to overlay via UpdateLayeredWindow

3. **Key Data Types (types.go)**
   ```go
   type Selection struct {
     StartX, StartY int  // Drag start coordinates
     EndX, EndY     int  // Drag end coordinates
     IsDragging     bool
     SpaceHeld      bool // For repositioning selection
   }

   type DrawContext struct {
     HMemDC     uintptr       // Memory device context
     hBitmap    uintptr       // DIB bitmap handle
     pixels     unsafe.Pointer // Direct pixel buffer access
     width      int
     height     int
   }
   ```

4. **Drawing Operations**
   - `DrawOverlay()` - Renders darkened overlay with selection bounds
   - `drawScreenshot()` - Blits captured screenshot to DIB
   - `fillOverlay()` - Semi-transparent dark overlay (50% alpha)
   - `clearRegion()` - Reveals screenshot in selection area
   - `drawSelectionBorder()` - Blue selection rectangle
   - `drawCornerHandles()` - Resize handles at corners
   - `drawDimensionText()` - Width x Height label

5. **Threading Model**
   - Dedicated OS thread for message loop (Win32 requirement)
   - Channel-based command queue for thread-safe Show/Hide/Stop
   - SetCapture/ReleaseCapture for exclusive mouse input
   - Blocks on PeekMessageW until user interaction or stop command

6. **Performance Optimizations**
   - DIB double buffering avoids flicker
   - Direct pixel manipulation instead of GDI drawing for screenshot
   - Minimal redraws - only on selection change
   - Fast alpha blending via UpdateLayeredWindow with AC_SRC_ALPHA

**Entry Points:**
- `NewManager()` - Create overlay manager
- `Start()` - Initialize OS thread and window
- `Show(screenshot, bounds, scaleRatio)` - Display overlay with async result
- `Hide()` - Hide overlay (user cancelled)
- `Stop()` - Shutdown and cleanup

### Package: `internal/screenshot`
**Files:** capture.go (150 LOC), window.go (90 LOC), clipboard.go (200 LOC)

Wraps kbinani/screenshot library with DPI-awareness, multi-display support, and Windows clipboard integration.

**Features:**
- `CaptureFullscreen()` - All displays combined
- `CaptureRegion(x, y, w, h)` - Bounded area capture with multi-monitor support
- `CaptureVirtualScreen()` - Capture entire virtual display (extended monitors)
- `GetVirtualScreenBounds()` - Calculate combined bounds across all monitors
- `CaptureWindow(hwnd)` - Specific window capture with GDI
- `GetClipboardImage()` - Read DIB format images from Windows clipboard
- DPI scaling calculations
- Base64 PNG encoding for transport

**Multi-Monitor Region Capture (v1.2):**
- Virtual screen bounds detection using Windows GetSystemMetrics() API
- Region selection overlay spans entire combined monitor space
- Coordinates properly mapped for extended/duplicate display layouts
- Window position restored after region capture completes
- Frontend: region-selector.tsx uses actual virtual bounds instead of 100vw/100vh

**Clipboard Implementation:**
- Uses Win32 API: OpenClipboard, GetClipboardData, GlobalLock
- Supports 24-bit BGR and 32-bit BGRA DIB formats
- Thread-safe with `runtime.LockOSThread()` (clipboard API requirement)
- Handles top-down and bottom-up image layouts
- 100MB max size limit (DoS prevention)
- Converts DIB to RGBA PNG for consistent output

**Entry Points:**
- `CaptureFullscreen()` → CaptureResult
- `CaptureRegion(x, y, w, h)` → CaptureResult
- `CaptureVirtualScreen()` → CaptureResult (new)
- `GetVirtualScreenBounds()` → (width, height int) (new)
- `CaptureWindow(hwnd)` → CaptureResult
- `GetClipboardImage()` → CaptureResult (new)

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
**File:** app.go (~550 LOC)

Central App struct with all Wails-bound methods called from frontend.

**App Struct Fields:**
```go
type App struct {
  ctx              context.Context
  hotkeyManager    *hotkeys.HotkeyManager
  overlayManager   *overlay.Manager        // Native overlay window
  trayIcon         *tray.TrayIcon
  config           *config.Config
  lastWidth, lastHeight int                // Tracked for persistence
  preCaptureWidth, preCaptureHeight int    // Pre-capture size
  preCaptureX, preCaptureY int             // Pre-capture position
  isCapturing      bool                    // Prevent resize during capture
  isWindowHidden   bool                    // Track visibility state (Phase 1: Added)
}
```

**Key Methods (~30 total):**
```go
// Capture operations
CaptureFullscreen()
CaptureWindow(handle int)
GetClipboardImage()
PrepareRegionCapture()
FinishRegionCapture(x, y, w, h int)
CaptureVirtualScreen()
GetVirtualScreenBounds()

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
MinimizeToTray()        // Hide window to tray
UpdateWindowSize(width, height)
ShowWindow()            // Show from tray + refresh z-order
OnBeforeClose()         // Handle close-to-tray setting
```

**Lifecycle (Phase 1 Update):**
- `startup(ctx)` - Load config, check MinimizeToTray flag, initialize managers, set initial isWindowHidden state
- `shutdown(ctx)` - Save window size and state, cleanup overlay/hotkeys/tray

**Window Visibility Tracking (Phase 1 - New):**
`isWindowHidden` boolean tracks actual window state:
- Initialized to `cfg.Startup.MinimizeToTray` at startup
- Set `true` when MinimizeToTray(), WindowHide(), OnBeforeClose() called
- Set `false` when ShowWindow(), tray.OnShow callback triggered
- Prevents race conditions in async capture flow (region selection waits for hide)
- Used in PrepareRegionCapture() to avoid double-hide on already-hidden windows

**Notable Implementation Details:**
- Overlay manager started before hotkey listener (native overlay takes priority)
- StartHidden Wails option set from cfg.Startup.MinimizeToTray (Phase 1: Added to main.go)
- Window visibility state tracks actual Wails window state, not just intent
- SetAlwaysOnTop toggle refreshes window z-order when showing from tray
- UpdateWindowSize skips updates during capture (preserves pre-capture dimensions)
- Pre-capture position saved for window restoration after region selection

---

## React Frontend (~3,000 LOC)

### File: `App.tsx`
**Size:** 32KB (7,100+ tokens, Phase 3: +1,300 tokens)

Central state management and orchestration.

**State Categories:**

1. **Capture State**
   - `screenshot` - CaptureResult (width, height, base64 data)
   - `isCapturing` - Boolean flag
   - `captureMode` - 'fullscreen' | 'region' | 'window'
   - `pendingAutoCopy` - Boolean flag to trigger styled canvas auto-copy after capture

2. **Editor Settings (localStorage-persisted)**
   - `padding`, `cornerRadius`, `shadowSize`
   - `backgroundColor` - Gradient string
   - `outputRatio` - 9 output aspect ratios

3. **Annotation State**
   - `annotations[]` - Array of shape objects
   - `activeTool` - Current editor tool ('select' | 'crop' | AnnotationType)
   - `selectedAnnotationId` - Selected shape
   - `strokeColor`, `strokeWidth` - Drawing properties
   - `fontSize`, `fontStyle` - Text annotation properties

4. **Crop State (Phase 01 Complete)**
   - `cropMode` - Boolean flag for active crop editing
   - `cropArea` - CropArea {x, y, width, height} | null
   - `cropAspectRatio` - 'free' | '16:9' | '4:3' | '1:1' | '9:16' | '3:4'
   - `isDrawingCrop` - Boolean flag for drag operation
   - `appliedCrop` - CropArea | null (persisted crop applied to screenshot)

**Crop Handlers (Phase 01):**
   - `handleCropToolSelect()` - Activate crop mode, restore previous crop if exists
   - `handleCropChange(area)` - Update crop bounds during editing
   - `handleCropApply()` - Confirm crop, persist to appliedCrop
   - `handleCropCancel()` - Discard changes, reset crop state
   - `handleCropAspectRatioChange(ratio)` - Update aspect ratio, constrain existing area
   - `handleCropReset()` - Clear applied crop completely
   - `constrainToAspectRatio()` - Helper to maintain aspect ratio during resize

5. **Export State (Phase 02 New, Phase 3: Enhanced)**
   - `lastSavedPath` - String | null - Tracks most recent file save location
   - `isExporting` - Boolean flag for export operation in progress
   - `jpegQuality` - Number (0-100, default: 95) - JPEG compression quality loaded from config

6. **UI State**
   - `showWindowPicker`, `showRegionSelector`, `showSettings`
   - `statusMessage` - Toast/notification
   - `displayBounds` - Screen dimensions

**Auto-Copy to Clipboard:**
   - `copyStyledCanvasToClipboard()` - Helper that exports the styled canvas (with background, padding, effects) to clipboard PNG
   - `handleCopyToClipboard()` - Manual copy trigger used by UI buttons
   - Auto-copy flow: Sets `pendingAutoCopy` on capture → useEffect detects pending flag → Waits for canvas render → Calls `copyStyledCanvasToClipboard()` if `autoCopyToClipboard` config enabled

**Save & Path Management (Phase 02 New):**
   - `handleQuickSave(format)` - Quick save with auto-clipboard path copy
   - `handleCopyPath()` - Copy last saved file path to clipboard
   - Auto-copy path: After QuickSave succeeds, immediately copies file path to clipboard with feedback
   - `lastSavedPath` cleared on new capture to prevent stale paths

**Key Features:**
- localStorage persistence for editor settings
- Hotkey event listeners (via Wails EventsOn)
- Wails method bindings for backend calls
- Canvas stage ref management with Konva
- Styled canvas auto-copy to clipboard on capture completion (if enabled in config)
- Capture notifications with toast messages
- File path clipboard integration for quick access to saved files
- Keyboard shortcuts for all major operations (see Phase 3 section below)
- JPEG quality configuration loaded from app config on startup

### Utils: `utils/extract-edge-color.ts`
**File:** extract-edge-color.ts (Phase 2 - Color Extraction)

Color extraction utility for identifying dominant edge colors from screenshot images.

**Features:**
- Edge color extraction from image borders
- Dominant color detection algorithm
- Support for color normalization

**Entry Points:**
- `extractEdgeColor(imageData)` - Extract dominant color from image edges

### Components (13 total)

**Toolbars (4 files):**
- `capture-toolbar.tsx` - Fullscreen/Region/Window buttons
- `annotation-toolbar.tsx` - Rectangle/Ellipse/Arrow/Line/Text tools
- `export-toolbar.tsx` - Export with format/quality options + Copy Path button (Phase 02 New)
- `crop-toolbar.tsx` - Crop mode controls

**Modals & Panels (3 files):**
- `settings-modal.tsx` - Config dialog (hotkeys, startup, quick-save, export)
- `settings-panel.tsx` - Editor settings (padding, radius, shadow, bg)
- `title-bar.tsx` - Minimize/settings/close + drag

**Selectors (2 files):**
- `window-picker.tsx` - Window enumeration + preview
- `hotkey-input.tsx` - Custom hotkey binding UI (Phase 01: Preset buttons for browser-blocked keys)
- *(region-selector.tsx removed - replaced by native overlay)*

**Canvas & Drawing (3 files):**
- `editor-canvas.tsx` - Konva Stage wrapper (15KB)
- `annotation-shapes.tsx` - 5 shape types: Rectangle, Ellipse, Arrow, Line, Text (19KB)
- `crop-overlay.tsx` - Crop area visualization

**UI Utilities (1 file):**
- `status-bar.tsx` - Bottom info bar

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
  type: 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text' | 'spotlight'
  x, y, width, height: number
  stroke: string
  strokeWidth: number
  fill?: string
  points?: number[]  // For arrows/lines
  text?: string
  fontSize?: number
  fontFamily?: string
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic'
  textAlign?: 'left' | 'center' | 'right'
  dimOpacity?: number  // For spotlight (0-1)
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

type CropAspectRatio = 'free' | '16:9' | '4:3' | '1:1' | '9:16' | '3:4'

type EditorTool = 'select' | 'crop' | AnnotationType

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
| Total Tokens | ~65,000+ (Phase 3: +5,000) |
| Total Characters | ~250,000+ |
| Total Files | 49+ |
| Go Files | 10 |
| Test Files | 2 |
| TypeScript/React Files | 18 |
| Configuration Files | 8 |
| Binary Files | 1 (font) |
| Top File | App.tsx (7,100+ tokens, Phase 3: +1,300) |

**Phase 3 Additions (Dec 24, 2025):**
- Ctrl+V keyboard shortcut for clipboard paste
- JPEG quality state and config loading
- Enhanced export configuration management

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
- No database - configs stored as JSON files and Windows Registry (startup)
- Windows-only (uses Win32 APIs extensively)
- Frameless window with custom title bar (Vibrant Glassmorphism design)

## Phase 1 - Startup & Autostart Fixes (Dec 24, 2025)

**Overview:** Fixed Windows startup registry integration and added window visibility state tracking.

**Changes:**
1. **main.go** - Added StartHidden Wails option tied to cfg.Startup.MinimizeToTray
2. **app.go** - Added isWindowHidden state tracking + removed timing hacks from region capture
3. **internal/config/startup.go** - Fixed registry path quoting, added verification, improved error handling
4. **Tests** - Created app_test.go and internal/config/startup_test.go for new functionality

**Key Improvements:**
- Executable paths with spaces now properly quoted in registry
- Registry write verification prevents silent failures
- Window visibility state prevents double-hide race conditions
- Better error context for debugging startup issues
- Comprehensive unit tests for registry operations

---

## Phase 2 - Notifications & Copy Path (Dec 24, 2025)

**Overview:** Added capture notifications, file path tracking, and Copy Path button for quick clipboard access to saved files.

**Changes:**
1. **frontend/src/App.tsx** - Added lastSavedPath state + handleCopyPath handler
2. **frontend/src/components/export-toolbar.tsx** - Added Copy Path button with icon + tooltip
3. **Notification flow** - Capture operations now show toast messages (Fullscreen/Window/Region captured)
4. **Auto-copy path** - QuickSave auto-copies file path to clipboard with feedback

**New Features:**
- Capture mode notifications: "Fullscreen captured", "Window captured", "Region captured"
- lastSavedPath tracks most recent file location after successful save
- Copy Path button appears only after file save
- Tooltip shows full file path on hover
- QuickSave automatically copies path to clipboard with "Saved & path copied:" message
- lastSavedPath cleared on new capture to prevent stale paths
- Copy Path handler with user-friendly error messages

**UI Changes:**
- Added Link icon (lucide-react) to Copy Path button
- Conditional rendering: Copy Path button only visible when lastSavedPath is set
- Full path accessible via button tooltip
- Toast notifications updated to include operation confirmation

---

## Phase 3 - Clipboard Import & Compression (Dec 24, 2025)

**Overview:** Added Ctrl+V clipboard paste support and configurable JPEG export quality for image compression control.

**Changes:**
1. **frontend/src/App.tsx** - Added Ctrl+V keyboard shortcut + jpegQuality state loading
2. **frontend/src/App.tsx** - Load JPEG quality from config on app startup via GetConfig()
3. **frontend/src/App.tsx** - Pass jpegQuality to canvas export methods

**Keyboard Shortcuts (Phase 3 - Enhanced):**
- **Tool Selection** (single keys, no modifiers):
  - `V` - Select tool (pointer/move)
  - `R` - Rectangle annotation
  - `E` - Ellipse annotation
  - `A` - Arrow annotation
  - `L` - Line annotation
  - `T` - Text annotation
  - `C` - Crop tool

- **Undo/Redo:**
  - `Ctrl+Z` - Undo annotation
  - `Ctrl+Shift+Z` or `Ctrl+Y` - Redo annotation
  - `Delete` or `Backspace` - Delete selected annotation

- **Capture & Import (Ctrl modifiers):**
  - `Ctrl+O` - Open/import image file dialog
  - `Ctrl+V` - Paste image from clipboard (Phase 3 - NEW)

- **Export & Copy:**
  - `Ctrl+S` - Quick save with default format
  - `Ctrl+Shift+S` - Export with format dialog
  - `Ctrl+C` - Copy styled canvas to clipboard

- **Navigation:**
  - `Escape` - Cancel crop mode, deselect annotation, or reset tool

**Export Configuration (Phase 3 - NEW):**
- **JPEG Quality** (0-100 scale):
  - Loaded from config file: `config.export.jpegQuality`
  - Default value: 95 (high quality)
  - Applied during canvas export: `quality = jpegQuality / 100`
  - Affects file size: 95 ≈ visually lossless, lower values = smaller files
  - Configuration persists across app restarts

**Clipboard Paste Flow (Phase 3 - NEW):**
```
User presses Ctrl+V
  → handleClipboardCapture() triggered
  → Calls GetClipboardImage() (Go backend)
  → Reads DIB image from Windows clipboard
  → Returns CaptureResult {width, height, base64 data}
  → Replaces current screenshot
  → Resets annotations and crop state
  → Shows toast: "Image pasted from clipboard"
```

**New Features:**
- Clipboard image import via Ctrl+V (works anytime)
- Replaces current screenshot (same as file import)
- Full reset of annotations and crop state on paste
- Clipboard error handling: "No image in clipboard" message
- JPEG quality configurable per user preference
- Quality setting exposed in Settings → Export tab (backend config)

**Technical Details:**
- `handleClipboardCapture()` mirrors `handleImportImage()` flow
- Resets `cropState`, `annotations`, and `selectedAnnotationId`
- Clears `lastSavedPath` on new clipboard import
- Quality conversion: Wails canvas API uses 0-1 scale, so `jpegQuality / 100`
- Config loaded on component mount via `useEffect` in GetConfig()
- No config UI in Phase 3 (handled in Settings → Export backend)

---

## Phase 01 - Preset Buttons for Browser-Blocked Hotkeys (Jan 12, 2026)

**Overview:** Added preset button UI to HotkeyInput component for easy assignment of PrintScreen-based hotkeys that browsers/WebView2 cannot capture directly.

**Changes:**
1. **frontend/src/components/hotkey-input.tsx** - Added preset buttons with HOTKEY_PRESETS constant

**New Feature:**
- `HOTKEY_PRESETS` constant defines 3 preset combinations:
  - `PrintScreen` → label "PrtSc"
  - `Ctrl+PrintScreen` → label "Ctrl+PrtSc"
  - `Ctrl+Shift+PrintScreen` → label "Ctrl+Shift+PrtSc"
- Preset buttons displayed below hotkey input field with text "or select preset:"
- Button styling follows glassmorphism design:
  - Inactive: `bg-white/5 text-slate-400 border-white/10` (light hover states)
  - Active: `bg-violet-500/30 text-violet-300 border-violet-500/50` (purple highlight)
  - Disabled: `opacity-50 cursor-not-allowed` (grayed out)
- Click preset button → directly sets hotkey value (no need for keyboard input)
- Solves browser blocking of PrintScreen key capture in frontend

**Technical Details:**
- Presets are static and non-configurable (covers common use cases)
- Button click calls `onChange(preset.value)` directly
- Respects disabled state like main input field
- Small font size (text-xs) for compact layout in hotkey form
- Flex wrap allows responsive button layout on small screens

---

## Phase 2 - Color Extraction Utility (Jan 12, 2026)

**Overview:** Created color extraction utility for identifying dominant edge colors from screenshot images.

**Changes:**
1. **frontend/src/utils/extract-edge-color.ts** - New color extraction utility (foundation for Phase 3+ features)

**New Files:**
- `frontend/src/utils/` folder created
- `extract-edge-color.ts` - Color extraction algorithm with edge detection and normalization

**Features:**
- Edge color extraction from screenshot borders
- Dominant color detection for palette analysis
- Color normalization for consistent output

**Purpose:** Foundation utility for future color-based features (auto-background selection, color grading, etc.)

**Technical Details:**
- Zero dependencies (vanilla TypeScript)
- Pure function design for testability
- Handles multiple color spaces and normalizations

---

## Phase 2 - State Management & Backend Config Completion (Jan 12, 2026)

**Overview:** Finalized state management in React frontend and added editor configuration fields to support Inset and AutoBackground features.

**Changes:**

1. **frontend/src/App.tsx** - Enhanced state management:
   - Added editor state loading from Go backend config (EditorConfig fields)
   - Integrated `Inset` state for screenshot scaling (0-50 percentage)
   - Integrated `AutoBackground` state for auto edge-color extraction
   - Load editor config on component mount via `useEffect` + `GetEditorConfig()`
   - State updates reflect backend config persistence

2. **internal/config/config.go** - Extended EditorConfig:
   - Added `Inset` field (int, 0-50 percentage) for screenshot inset/scaling
   - Added `AutoBackground` field (bool) for automatic edge color detection
   - Default values: `Inset: 0`, `AutoBackground: true`
   - Both fields persist to `config.json` with existing editor settings

**Architecture:**
- Config persistence: JSON file at `%APPDATA%\WinShot\config.json`
- Go ↔ TypeScript binding: Wails auto-generates types from Go structs
- Frontend loads config on startup, can modify and persist back to Go
- All editor settings survive app restarts (full persistence layer)

**State Flow:**
```
App.tsx startup
  → useEffect calls GetEditorConfig()
  → Returns EditorConfig {padding, cornerRadius, shadowSize, ...inset, autoBackground}
  → setState(editorConfig)
  → SettingsPanel displays all fields
  → User changes values
  → SaveEditorConfig() persists back to Go
  → Config written to disk at next save
```

**Default Values (Phase 2):**
```json
{
  "padding": 40,
  "cornerRadius": 12,
  "shadowSize": 20,
  "backgroundColor": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "outputRatio": "auto",
  "showBackground": true,
  "inset": 0,
  "autoBackground": true
}
```

**New Config Fields:**
- **Inset** (0-50): Percentage-based scaling/margin for screenshot content within editor bounds
  - 0 = no inset (full screenshot)
  - 50 = maximum inset (50% reduction in effective screenshot size)
  - Used by frontend to render screenshot with internal margin for visual breathing room

- **AutoBackground** (true/false): Enable automatic edge color extraction for background
  - When true: App can auto-detect dominant edge color and apply as background
  - When false: Use user-selected gradient or custom color
  - Powered by `extractDominantEdgeColor()` utility from Phase 2 color extraction

**Impact on UI:**
- SettingsPanel now displays Inset slider (0-50 range)
- SettingsPanel now displays AutoBackground toggle
- Changes immediately reflect in EditorCanvas viewport
- All changes persist across app restarts

**Technical Details:**
- Inset calculation in EditorCanvas affects canvas scaling and positioning
- AutoBackground flag enables/disables color extraction pipeline
- No breaking changes to existing config files (new fields use defaults if missing)
- Full backward compatibility with older config versions
