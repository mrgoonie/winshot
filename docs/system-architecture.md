# WinShot - System Architecture

**Date:** 2025-12-12 | **Version:** 1.1

---

## Architecture Overview

WinShot is a **hybrid architecture** combining a **Go backend** (system-level operations) with a **React frontend** (user interface), communicating via **Wails IPC bindings**.

```
┌─────────────────────────────────────────────────────────────┐
│                  Windows Application Window                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         React UI (WebView2 / Chromium)                 │ │
│  │  - Components, State, Canvas (Konva)                  │ │
│  │  - Handles user interaction                           │ │
│  └──────────────────┬──────────────────────────────────┘ │ │
│                     │ Wails IPC (JSON)                   │ │
│  ┌──────────────────▼──────────────────────────────────┐ │ │
│  │        Go Runtime (app.go + internal packages)        │ │ │
│  │  - Screenshot capture                                │ │ │
│  │  - Window enumeration                                │ │ │
│  │  - Hotkey registration                               │ │ │
│  │  - File I/O (save/load)                             │ │ │
│  └───────────────────────────────────────────────────┘ │ │
│                     │ Windows APIs                       │ │
│  ┌──────────────────▼──────────────────────────────────┐ │ │
│  │           Win32 / System Libraries                   │ │ │
│  │  - GDI (graphics), DWM (window manager)             │ │ │
│  │  - RegisterHotKey, EnumWindows, GetMessage          │ │ │
│  │  - Shell Notify Icon (system tray)                  │ │ │
│  └───────────────────────────────────────────────────┘ │ │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Package Diagram

```
app.go (App struct)
├── [Lifecycle]
│   ├── startup(ctx)
│   │   ├── Load config
│   │   ├── Initialize overlay manager (NEW)
│   │   ├── Initialize hotkey manager
│   │   ├── Initialize system tray
│   │   └── Register hotkey listeners
│   └── shutdown(ctx)
│       ├── Stop overlay manager (NEW)
│       ├── Save window size
│       ├── Cleanup hotkey manager
│       └── Cleanup tray icon
│
├── [Screenshot Methods] → internal/screenshot
│   ├── CaptureFullscreen() → CaptureResult
│   ├── CaptureWindow(handle) → CaptureResult
│   ├── GetClipboardImage() → CaptureResult
│   ├── PrepareRegionCapture() → DisplayBounds
│   └── FinishRegionCapture(x, y, w, h) → CaptureResult
│
├── [Window Methods] → internal/windows
│   ├── GetWindows() → []WindowInfo
│   └── GetDisplayBounds() → DisplayBounds
│
├── [File Methods] → file I/O
│   ├── SaveImage(data, path, filename)
│   └── QuickSave(data)
│
├── [Config Methods] → internal/config
│   ├── GetConfig() → Config
│   └── SaveConfig(config)
│
├── [Hotkey Methods]
│   └── SetHotkey(mode, combo)
│
├── [Library Methods] → internal/library (NEW)
│   ├── GetLibraryImages() → []LibraryImage
│   ├── OpenInEditor(imagePath) → CaptureResult
│   └── DeleteScreenshot(imagePath)
│
└── [Utility Methods]
    ├── MinimizeToTray()
    └── UpdateWindowSize(width, height)
```

### Package: `internal/config`

**Responsibility:** Application configuration persistence

**Data Flow:**
```
On Startup:
  config.Load()
    → Read %APPDATA%\WinShot\config.json
    → Unmarshal JSON → Config struct
    → Or return Default()

On Shutdown:
  App.shutdown()
    → Save window dimensions to config
    → config.Save()
    → Write to %APPDATA%\WinShot\config.json

On User Change:
  User modifies hotkey in UI
    → Call App.SaveConfig(newConfig)
    → Write to disk
```

**Key Types:**
```go
type Config struct {
  Hotkeys    HotkeyConfig    // Ctrl+PrintScreen, etc.
  Startup    StartupConfig   // launchOnStartup, minimizeToTray
  QuickSave  QuickSaveConfig // folder, filename pattern
  Export     ExportConfig    // format, quality, background
  Window     WindowConfig    // width, height
}
```

**Persistence:**
- **Location:** `%APPDATA%\WinShot\config.json`
- **Format:** JSON
- **Lifetime:** Survives app restarts

### Package: `internal/overlay`

**Responsibility:** Native Win32 layered window for region selection with hardware-accelerated GDI rendering

**Architecture:**

```
User presses Ctrl+PrintScreen (region capture)
  ↓
App.onHotkey(HotkeyRegion)
  ├─ Calls PrepareRegionCapture() → captures screenshot
  └─ Emits Wails event "hotkey:region"
  ↓
Frontend receives event
  ├─ Calls FinishRegionCapture() with base screenshot
  ├─ Passes to Overlay.Show(screenshot, bounds, scaleRatio)
  └─ Overlay window appears on top
  ↓
Overlay Message Loop (dedicated OS thread)
  ├─ Listens for WM_LBUTTONDOWN (drag start)
  ├─ Listens for WM_MOUSEMOVE (drag update)
  ├─ Listens for WM_LBUTTONUP (drag end)
  ├─ Listens for VK_ESCAPE (cancel)
  └─ Redraws on each event via GDI
  ↓
User releases mouse or presses Escape
  ├─ Selection result sent to Frontend via channel
  └─ Overlay hides
```

**Threading Model:**

- **Main Goroutine:** App lifecycle, Wails bindings
- **Overlay Goroutine:** OS thread-locked message loop
  - `runtime.LockOSThread()` - Win32 requirement for window messages
  - `PeekMessageW()` - Blocks until window message or cmdCh signal
  - Channel-based Show/Hide/Stop for thread-safe control
  - SetCapture/ReleaseCapture for exclusive mouse input

**Rendering Pipeline:**

```
1. Show Command Received
   ├─ Create window class (WS_EX_LAYERED, WS_EX_TOPMOST, WS_EX_NOACTIVATE)
   ├─ Create DrawContext (32-bit DIB with direct pixel access)
   └─ Show window at full screen bounds

2. User Drags Selection
   ├─ WM_MOUSEMOVE event triggers
   ├─ Call DrawOverlay():
   │  ├─ Draw full screenshot to DIB
   │  ├─ Fill 50% dark overlay (0x00000080 alpha)
   │  ├─ Clear selection area (reveal screenshot)
   │  ├─ Draw blue border (2px)
   │  ├─ Draw corner handles (8px squares)
   │  └─ Draw "WxH" dimension label
   └─ UpdateLayeredWindow() blits DIB to screen (zero-copy alpha blending)

3. Selection Complete
   ├─ WM_LBUTTONUP or VK_ESCAPE
   ├─ Hide window
   └─ Send Result to resultCh {X, Y, Width, Height, Cancelled}
```

**Performance Optimizations:**

1. **DIB Double Buffering**
   - 32-bit ARGB DIB with pre-allocated pixel buffer
   - Top-down (negative height) for proper pixel ordering
   - No intermediate image allocations during draw

2. **Direct Pixel Manipulation**
   - Screenshot copied via unsafe pointer arithmetic (not GDI calls)
   - Alpha blending calculated per-pixel for overlay
   - Avoids expensive GDI BitBlt operations

3. **UpdateLayeredWindow Alpha Blending**
   - Leverages Windows layered window transparency
   - BLENDFUNCTION with AC_SRC_ALPHA flag
   - GPU-accelerated on modern hardware

4. **Minimal Redraws**
   - Full redraw only on mouse move (necessary for overlay effect)
   - No background processing or idle redraws
   - Message loop blocks until next event

### Package: `internal/hotkeys`

**Responsibility:** Global hotkey registration and listening

**Threading Model:**
```
Main Goroutine                  Hotkey Listener Goroutine
│                               │
├─ hotkeyManager.Start() ──────►├─ PeekMessageW loop
│                               │
│ (user presses Ctrl+PrintScreen)
│                               │ Windows notifies
│                               ├─ WM_HOTKEY message
│                               │
│                               └─ hm.callback(id) ──┐
│                                                    ▼
└──────────────────────────────────────── EventsEmit("hotkey:region")
                                           (Wails IPC to React)
```

**Key Methods:**
- `RegisterHotKey()` - Win32 API call with modifiers (Ctrl, Shift, Alt, Win)
- `UnregisterHotKey()` - Cleanup
- `GetMessageW()` / `PeekMessageW()` - Listen for WM_HOTKEY

**Hotkey Constants:**
```go
const (
  HotkeyFullscreen = 1  // Registered as hotkey ID 1
  HotkeyRegion     = 2  // Registered as hotkey ID 2
  HotkeyWindow     = 3  // Registered as hotkey ID 3
)
```

**Event Emission:**
```go
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
```

### Package: `internal/screenshot`

**Responsibility:** Screen, window, and clipboard image capture with DPI awareness

**Capture Modes:**
```
1. Fullscreen
   ├─ Enumerate all monitors
   ├─ Combine into single image
   └─ Return combined CaptureResult

2. Region
   ├─ Receive (x, y, width, height) from UI
   ├─ Capture sub-rectangle
   └─ Return CaptureResult

3. Window
   ├─ Receive window HWND
   ├─ Use GDI to capture window content
   ├─ Apply DPI scaling
   └─ Return CaptureResult

4. Clipboard
   ├─ Lock OS thread (Win32 clipboard requirement)
   ├─ Open clipboard and check for DIB format
   ├─ Parse BITMAPINFOHEADER (width, height, bit depth)
   ├─ Convert DIB (24-bit BGR or 32-bit BGRA) to RGBA
   ├─ Handle both top-down and bottom-up image layouts
   ├─ Encode as PNG
   └─ Return CaptureResult or error ("no image in clipboard")
```

**Clipboard Implementation Details:**
- **Thread Safety:** `runtime.LockOSThread()` ensures OpenClipboard/CloseClipboard on same thread
- **Formats Supported:** 24-bit BGR, 32-bit BGRA DIB (via CF_DIB flag)
- **Size Limit:** 100MB max (prevents DoS attacks)
- **Buffer Safety:** Validates pixel data bounds before access via unsafe pointers
- **Alpha Handling:** Sets alpha=255 for 32-bit if source alpha is 0 (compatibility with some apps)

**Data Format:**
```
CaptureResult {
  Width:  int          // Pixel width
  Height: int          // Pixel height
  Data:   string       // base64-encoded PNG
}
```

**PNG Encoding:**
```go
// Pseudo-code
screenshot := capture.Capture(...)  // Returns image.Image
buffer := &bytes.Buffer{}
png.Encode(buffer, screenshot)      // Encode to PNG bytes
base64String := base64.StdEncoding.EncodeToString(buffer.Bytes())
// Transmit JSON: {"width": 1920, "height": 1080, "data": "iVBORw0KGgo..."}
```

**DPI Handling:**
- Windows 11 may have DPI scaling (e.g., 125%, 150%)
- Internal code converts pixel coordinates to physical DPI
- Frontend receives DPI-aware image

### Package: `internal/windows`

**Responsibility:** Window enumeration via Windows API

**Implementation:**
```go
// Uses EnumWindows() callback to iterate all windows
func EnumVisibleWindows() []WindowInfo {
  var windows []WindowInfo

  syscall.Syscall(procEnumWindows, 2,
    uintptr(unsafe.Pointer(syscall.NewCallback(func(hwnd uintptr, lParam uintptr) uintptr {
      // Check if window is visible
      // Get window title via GetWindowText()
      // Add to windows[]
      return 1  // Continue enumeration
    }))),
    0, 0)

  return windows
}
```

**Window Filtering:**
- Excludes invisible windows
- Excludes taskbar/system windows
- Returns visible application windows

**Result Type:**
```go
type WindowInfo struct {
  Handle    int    // HWND (window handle)
  Title     string // Window title bar text
  ClassName string // Window class name
  X, Y      int    // Window position
  Width     int    // Window size
  Height    int
}
```

### Package: `internal/tray`

**Responsibility:** System tray icon, context menu, and library trigger

**Lifecycle:**
```
NewTrayIcon("WinShot")
  ├─ Create system tray icon
  ├─ Register context menu
  └─ Set callbacks

tray.Start()
  └─ Display icon in system tray

User left-clicks tray icon (NEW)
  ├─ WM_LBUTTONUP detected in window procedure
  ├─ Invoke callback(MenuLibrary)
  └─ Opens Screenshot Library window

User right-clicks tray icon
  ├─ Show context menu
  │  ├─ Fullscreen Capture
  │  ├─ Region Capture
  │  ├─ Window Capture
  │  ├─ Show/Hide Window
  │  └─ Exit
  └─ Invoke callback

tray.Stop()
  └─ Hide icon and cleanup
```

**Implementation Details:**
- Uses Windows Shell.NotifyIcon API
- Custom menu handling
- Callback-based event notification
- Left-click triggers MenuLibrary (1007) for library window

### Package: `internal/library`

**Responsibility:** Screenshot history management with thumbnail generation

**Architecture:**
```
GetLibraryImages() called from frontend
  ↓
library.ScanFolder(quickSavePath)
  ├─ Check if folder exists (create if missing)
  ├─ List files with .png/.jpeg/.jpg extensions
  ├─ For each file:
  │  ├─ Read file info (name, modified date)
  │  ├─ GenerateThumbnail() → base64 PNG (150px max)
  │  └─ Add to []LibraryImage
  ├─ Sort by ModifiedDate descending
  └─ Return result array
  ↓
Frontend receives LibraryImage[]
  └─ Render grid with thumbnails

DeleteScreenshot() called
  ↓
library.DeleteImage(filepath)
  ├─ Validate path within QuickSave folder (security)
  ├─ os.Remove(filepath)
  └─ Return success/error
```

**Thumbnail Generation:**
```
GenerateThumbnail(imagePath)
  ├─ Decode image (PNG or JPEG)
  ├─ Calculate scaled dimensions (max 150px, preserve aspect)
  ├─ Create destination image
  ├─ draw.CatmullRom.Scale() (high-quality resampling)
  ├─ Encode as PNG to bytes
  └─ Return base64, originalWidth, originalHeight
```

**Key Types:**
```go
type LibraryImage struct {
  Filepath     string    // Full path for operations
  Filename     string    // Display name
  ModifiedDate time.Time // Sort key
  Thumbnail    string    // Base64 PNG (150px max)
  Width        int       // Original dimensions
  Height       int
}
```

**Security:**
- Path validation prevents directory traversal attacks
- All operations constrained to QuickSave folder
- Relative paths resolved and validated before file access

### Root: `app.go`

**Responsibility:** Wails binding layer + orchestration

**Key Responsibilities:**
1. **Lifecycle Management** - startup, shutdown
2. **Wails Bindings** - ~25 exported methods callable from React
3. **Event Emission** - Send events to React via EventsEmit
4. **State Management** - Track window size, manage hotkey manager
5. **Event Handling** - Handle hotkey and tray menu callbacks

**Method Categories:**

```go
// Capture (3 methods)
func (a *App) CaptureFullscreen() CaptureResult
func (a *App) CaptureWindow(handle int) CaptureResult
func (a *App) PrepareRegionCapture() DisplayBounds
func (a *App) FinishRegionCapture(x, y, w, h int) CaptureResult

// Window (2 methods)
func (a *App) GetWindows() []WindowInfo
func (a *App) GetDisplayBounds() DisplayBounds

// File I/O (2 methods)
func (a *App) SaveImage(data, path, filename string) error
func (a *App) QuickSave(data string) error

// Config (2 methods)
func (a *App) GetConfig() Config
func (a *App) SaveConfig(cfg Config) error

// Hotkey (1 method)
func (a *App) SetHotkey(mode, combo string) error

// Utility (2 methods)
func (a *App) MinimizeToTray() error
func (a *App) UpdateWindowSize(w, h int) error
```

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx (Root)
├── TitleBar
│   └── Settings button, Minimize, Close
├── CaptureToolbar
│   └── Fullscreen, Region, Window buttons
├── WindowPicker (if showWindowPicker)
│   └── Window list + preview
├── LibraryWindow (if showLibrary) [NEW]
│   ├── Modal overlay with glassmorphism
│   ├── Grid of thumbnail cards
│   │   ├── Image preview
│   │   ├── Filename + date overlay
│   │   └── Selection highlight
│   ├── Action bar
│   │   ├── Capture button
│   │   ├── Edit button
│   │   ├── Delete button
│   │   └── Close button
│   └── Keyboard navigation handler
├── EditorCanvas (direct after capture, no React region selector)
│   ├── Konva Stage
│   │   ├── Layer
│   │   │   ├── Image (screenshot)
│   │   │   ├── Shapes (annotations)
│   │   │   └── Crop overlay
│   │   └── Layer (UI layer)
│   └── Mouse event handlers
├── AnnotationToolbar (if in editor mode)
│   └── Tool buttons + color picker
├── CropToolbar (if in crop mode)
│   └── Crop controls + aspect ratios
├── ExportToolbar
│   ├── Export button
│   ├── Format selector
│   ├── Library button [NEW]
│   └── Quality/settings
├── SettingsPanel (collapsible)
│   └── Padding, radius, shadow, background
├── SettingsModal
│   ├── Hotkey configuration
│   ├── Startup settings
│   ├── Quick-save settings
│   └── Export settings
├── StatusBar
│   └── Dimensions, scale, messages
└── HotkeyInput (inside SettingsModal)
    └── Custom hotkey binding
```

**Note:** RegionSelector (React component) removed - region selection now handled by native Win32 overlay in Go backend

### State Management

**Central State in App.tsx:**

```typescript
// Screenshot & Capture
const [screenshot, setScreenshot] = useState<CaptureResult | null>(null)
const [isCapturing, setIsCapturing] = useState(false)

// UI Navigation
const [showWindowPicker, setShowWindowPicker] = useState(false)
const [showRegionSelector, setShowRegionSelector] = useState(false)
const [showSettings, setShowSettings] = useState(false)

// Editor Settings (localStorage-persisted)
const [padding, setPadding] = useState<number>()
const [cornerRadius, setCornerRadius] = useState<number>()
const [shadowSize, setShadowSize] = useState<number>()
const [backgroundColor, setBackgroundColor] = useState<string>()
const [outputRatio, setOutputRatio] = useState<OutputRatio>()

// Drawing/Annotation
const [activeTool, setActiveTool] = useState<EditorTool>('select')
const [annotations, setAnnotations] = useState<Annotation[]>([])
const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
const [strokeColor, setStrokeColor] = useState<string>()
const [strokeWidth, setStrokeWidth] = useState<number>()

// Cropping
const [cropArea, setCropArea] = useState<CropArea | null>(null)
const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free')

// Export
const [isExporting, setIsExporting] = useState(false)

// Display Info
const [displayBounds, setDisplayBounds] = useState({width, height})
const [statusMessage, setStatusMessage] = useState<string | undefined>()
```

**No Redux/Zustand** - Direct useState for simplicity

**localStorage Persistence:**
- Editor settings saved to `winshot-editor-settings` key
- On App load, restored via `loadEditorSettings()`
- Survives app restarts

### Data Flow Diagram

**Fullscreen Capture Flow:**
```
User clicks "Fullscreen" button
  ↓
CaptureToolbar.onFullscreenCapture
  ↓
App.handleFullscreenCapture()
  ├─ setIsCapturing(true)
  ├─ Call CaptureFullscreen() [Go binding]
  │  └─ Go: Capture all displays
  │  └─ Encode as base64 PNG
  │  └─ Return CaptureResult {width, height, data}
  ├─ setScreenshot(result)
  ├─ setActiveTool('select')
  └─ setIsCapturing(false)
  ↓
EditorCanvas re-renders
  ├─ Create image from base64 data
  ├─ Render Konva Stage with image
  └─ Setup mouse handlers for annotation
```

**Annotation Flow:**
```
User selects "Rectangle" tool
  ↓
AnnotationToolbar.onSelectTool('rectangle')
  ↓
App.setActiveTool('rectangle')
  ↓
User drags on canvas
  ↓
EditorCanvas.onMouseDown → onMouseMove → onMouseUp
  ├─ Calculate bounding box
  ├─ Create Annotation object
  ├─ Generate unique ID
  ├─ Add to annotations[] state
  └─ setSelectedAnnotationId(id)
  ↓
EditorCanvas re-renders
  ├─ Konva renders new Rect shape
  └─ Shape is now selectable (clicking selects)
```

**Export Flow:**
```
User clicks "Export"
  ↓
ExportToolbar.onExport()
  ↓
App.handleExport()
  ├─ Collect editor settings
  │  └─ {padding, cornerRadius, shadowSize, backgroundColor}
  ├─ Collect current annotations
  ├─ Collect crop area (if cropped)
  ├─ Render final canvas in Konva
  │  ├─ Draw background (solid/gradient)
  │  ├─ Draw screenshot
  │  ├─ Draw annotations
  │  ├─ Draw crop overlay
  │  └─ Apply aspect ratio
  ├─ Export to canvas
  ├─ Convert to Blob (PNG or JPEG)
  └─ Call SaveImage() or QuickSave() [Go binding]
     └─ Go: Write file to disk
     └─ Return success/error
  ↓
setStatusMessage('Exported successfully')
```

**Clipboard Capture Flow:**
```
User clicks "Clipboard" button
  ↓
CaptureToolbar.onClipboardCapture
  ↓
App.handleClipboardCapture()
  ├─ setIsCapturing(true)
  ├─ Call GetClipboardImage() [Go binding]
  │  └─ Go: Lock OS thread
  │  └─ Open clipboard, check for DIB format
  │  └─ Parse BITMAPINFOHEADER
  │  └─ Convert DIB (24/32-bit) to RGBA
  │  └─ Encode as PNG
  │  └─ Return CaptureResult {width, height, data} or error
  ├─ If success: setScreenshot(result)
  ├─ If error: setStatusMessage("No image in clipboard")
  └─ setIsCapturing(false)
  ↓
EditorCanvas re-renders with clipboard image
  ├─ Create image from base64 data
  ├─ Render Konva Stage with image
  └─ Setup mouse handlers for annotation
```

**Hotkey Event Flow (Region Capture):**
```
User presses Ctrl+PrintScreen (global)
  ↓
Go hotkey listener detects WM_HOTKEY(id=2)
  ↓
app.onHotkey(id=2) → HotkeyRegion
  ├─ Call PrepareRegionCapture() → captures full screenshot
  ├─ Emit runtime.EventsEmit(ctx, "hotkey:region")
  └─ Return virtual screen bounds
  ↓
Frontend receives Wails event
  ↓
App.useEffect (EventsOn)
  ├─ Call FinishRegionCapture() with base64 screenshot
  ├─ Pass to overlayManager.Show(screenshot, bounds, scaleRatio)
  └─ Native Win32 overlay window appears (Go backend)
  ↓
User drags region on overlay (native window, not React)
  ├─ GDI rendering updates in real-time
  ├─ Shows darkened overlay + selection rect + handles
  └─ Displays dimension label (WxH)
  ↓
User releases mouse or presses Escape
  ├─ Overlay sends Result via channel
  ├─ Frontend receives {X, Y, Width, Height, Cancelled}
  ├─ If not cancelled: CaptureRegion(x, y, w, h) [Go binding]
  ├─ Go captures region → base64 PNG
  ├─ Return CaptureResult
  └─ setScreenshot(result) → EditorCanvas renders
```

**Library Flow (Tray Left-Click):**
```
User left-clicks system tray icon
  ↓
Go tray window procedure detects WM_LBUTTONUP
  ↓
tray.callback(MenuLibrary)
  ↓
app.onTrayMenu(MenuLibrary)
  ├─ Emit runtime.EventsEmit(ctx, "tray:library")
  └─ Call runtime.WindowShow(ctx) if hidden
  ↓
Frontend receives Wails event "tray:library"
  ↓
App.useEffect (EventsOn)
  └─ setShowLibrary(true)
  ↓
LibraryWindow renders
  ├─ Call GetLibraryImages() [Go binding]
  │  └─ Go: library.ScanFolder() → generate thumbnails
  ├─ Display grid of LibraryImage cards
  └─ Setup keyboard navigation (arrows, Enter, Delete, Escape)
  ↓
User interacts with library
  ├─ Click thumbnail → select
  ├─ Double-click or Enter → OpenInEditor(path)
  │  └─ Go loads image → frontend receives CaptureResult
  ├─ Delete key → DeleteScreenshot(path)
  │  └─ Go removes file → frontend refreshes list
  └─ Escape or Close → setShowLibrary(false)
```

**Library Flow (Export Toolbar Button):**
```
User clicks Library button in export toolbar
  ↓
ExportToolbar.onOpenLibrary()
  ↓
App.setShowLibrary(true)
  ↓
LibraryWindow renders (same flow as tray left-click)
```

---

## Communication Protocol

### Wails IPC (Inter-Process Communication)

**Frontend → Backend (Method Calls)**
```typescript
// Frontend code
const result = await CaptureFullscreen()  // Returns Promise<CaptureResult>
const windows = await GetWindows()         // Returns Promise<WindowInfo[]>
await SaveImage(data, path, filename)      // Returns Promise<void>
```

**Go Binding Generation:**
```go
// app.go
func (a *App) CaptureFullscreen() CaptureResult {
  // Go code
  return result
}

// Wails auto-generates:
// frontend/wailsjs/go/main/App.d.ts
// frontend/wailsjs/go/main/App.js
```

**Backend → Frontend (Events)**
```typescript
// Frontend listener
import { EventsOn } from '../wailsjs/runtime/runtime'

useEffect(() => {
  const unsub = EventsOn('hotkey:region', () => {
    // Handle hotkey event
  })
  return () => unsub()
}, [])
```

```go
// Go emitter (in app.go)
runtime.EventsEmit(a.ctx, "hotkey:region")
```

**Data Serialization:**
- Go structs → JSON (automatic marshaling)
- JSON → TypeScript types (generated .d.ts)
- Base64 PNG for image data

**Example Request/Response:**
```
Frontend Request:
  CaptureFullscreen()
  → IPC call: {"method": "CaptureFullscreen", "args": []}

Backend Response:
  return CaptureResult{Width: 1920, Height: 1080, Data: "iVBORw0KGgo..."}
  → JSON: {"width": 1920, "height": 1080, "data": "iVBORw0KGgo..."}

Frontend receives:
  TypeScript: {width: 1920, height: 1080, data: "iVBORw0KGgo..."}
  Type: CaptureResult (auto-generated from Go)
```

---

## Data Persistence Strategy

### Configuration

**Storage:** JSON file at `%APPDATA%\WinShot\config.json`

**Lifecycle:**
```
App Start:
  ├─ app.startup()
  ├─ config.Load() reads JSON
  └─ If missing, use config.Default()

App Running:
  ├─ User changes hotkey
  ├─ UI calls SaveConfig(newConfig)
  └─ Go writes to %APPDATA%\WinShot\config.json

App Shutdown:
  ├─ app.shutdown()
  ├─ Save window dimensions to config
  └─ config.Save() writes to disk
```

**Example config.json:**
```json
{
  "hotkeys": {
    "fullscreen": "PrintScreen",
    "region": "Ctrl+PrintScreen",
    "window": "Ctrl+Shift+PrintScreen"
  },
  "startup": {
    "launchOnStartup": false,
    "minimizeToTray": false,
    "showNotification": true
  },
  "quickSave": {
    "folder": "C:\\Users\\Admin\\Pictures\\WinShot",
    "pattern": "timestamp"
  },
  "export": {
    "defaultFormat": "png",
    "jpegQuality": 95,
    "includeBackground": true
  },
  "window": {
    "width": 1200,
    "height": 800
  }
}
```

### Editor Settings

**Storage:** Browser localStorage (in-memory with WebView2 persistence)

**Key:** `winshot-editor-settings`

**Lifecycle:**
```
App Start:
  ├─ App.tsx loads
  ├─ useEffect calls loadEditorSettings()
  ├─ Read from localStorage
  └─ Populate state

User changes setting (e.g., padding):
  ├─ setPadding(newValue)
  ├─ Trigger useEffect
  └─ saveEditorSettings({padding, cornerRadius, ...})

Persist:
  ├─ localStorage.setItem('winshot-editor-settings', JSON.stringify(...))
  └─ Survives app restart (WebView2 persists localStorage)
```

**Example localStorage data:**
```json
{
  "padding": 40,
  "cornerRadius": 12,
  "shadowSize": 20,
  "backgroundColor": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "outputRatio": "16:9"
}
```

### Screenshot Data

**Storage:** In-memory (CaptureResult state)

**Lifetime:** Current session only

**Transmission:**
```
Go: Capture → PNG bytes → base64 encode → JSON string
  → IPC to React

React: localStorage for editor settings
  → Final canvas render (Konva export)
  → User clicks Export
  → Call SaveImage(base64PNG, path, filename)
  → Go: base64 decode → Write to disk

File location: User-selected or configured quick-save folder
```

---

## Threading Model

### Go Goroutines

**Main Thread (Wails):**
```go
main()
  └─ wails.Run(options)
     └─ Blocks until app closes
```

**Hotkey Listener Goroutine:**
```go
hotkeyManager.Start()
  └─ Creates goroutine with message loop
     ├─ GetMessageW() blocks waiting for WM_HOTKEY
     ├─ On hotkey event, calls callback
     └─ Loop continues until Stop() called
```

**Tray Icon Goroutine:**
```go
trayIcon.Start()
  └─ Creates goroutine monitoring tray events
     ├─ Listens for context menu clicks
     ├─ Calls callback
     └─ Loop continues until Stop() called
```

**Thread Safety:**
- Hotkey/Tray use channels to communicate with main thread
- Config file access is synchronized (read on startup, write on shutdown)
- Screenshot library is thread-safe

### React/Browser Threading

**Single-Threaded Event Loop:**
- All React state updates in main thread
- Wails IPC calls are async (Promise-based)
- UI remains responsive via event-driven model

---

## Performance Considerations

### Screenshot Capture
- **Fullscreen:** Multi-display capture combined into single image
- **Region:** Faster, only captures specified rectangle
- **Window:** Uses GDI, may be slower if window is partially hidden
- **DPI:** Scaling calculations may add latency
- **Optimization:** Performance profiling shows region capture ~50ms on typical hardware

### Overlay Rendering
- **DIB Double Buffering:** Eliminates flicker without GPU overhead
- **Direct Pixel Manipulation:** Faster than GDI BitBlt for large buffers
- **UpdateLayeredWindow:** GPU-accelerated alpha blending on Win10+
- **Message Loop Blocking:** Minimal CPU usage while idle (blocks on PeekMessageW)
- **Redraw Frequency:** Only on mouse movement, not idle polling

### Canvas Rendering (Konva)
- **Layer-based:** Efficient re-renders only affected layers
- **Shape complexity:** 5 types (rectangle, ellipse, arrow, line, text)
- **Large images:** May impact memory if >4K resolution
- **Note:** Simplified by removing React region selector (native overlay handles this)

### File I/O
- **Async:** SaveImage() is non-blocking to frontend
- **Compression:** PNG is lossless; JPEG is lossy with quality setting
- **Optimization:** Skip hide delay if window already hidden (isWindowHidden flag)

### Encoding Optimizations
- **Crop before encode:** Apply crop bounds before PNG encoding (reduces file size)
- **Base64 transmission:** Used only for IPC; file save uses binary I/O

### Memory Management
- **Screenshots:** Stored as base64 strings in memory
- **DIB Buffers:** Allocated per overlay session, freed on hide
- **Annotations:** Array of objects, minimal overhead
- **Cleanup:** On app close, all references released
- **Peak Memory:** ~20-30MB for typical screenshot operations

---

## Security Considerations

### File Access
- Saves to user's Pictures folder or configured location
- No write to system directories
- File permissions respected

### Windows API Usage
- `RegisterHotKey()` - Global hotkeys (requires admin for some combinations)
- `EnumWindows()` - Window enumeration is safe
- `GDI` - Screenshot capture is standard Windows operation

### Screenshot Data
- Not encrypted at rest
- Base64 transmission is plaintext (safe over app IPC)
- No telemetry or external network calls

### Configuration
- Stored in `%APPDATA%` (user-accessible only)
- No credentials stored in config
- No hardcoded API keys

---

## Error Handling Strategy

### Go Errors
- Most functions return `error` as second value
- Callers decide whether to fail or fallback
- User feedback via status messages

### Frontend Errors
- Try/catch for async operations
- User-friendly error messages shown in status bar
- Console logging for debugging

### Recovery
- Failed screenshot: Show message, allow retry
- Failed file save: Show message, suggest location
- Failed hotkey registration: Log warning, user can reconfigure

