# WinShot - System Architecture

**Date:** 2025-12-03 | **Version:** 1.0

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
│   │   ├── Initialize hotkey manager
│   │   ├── Initialize system tray
│   │   └── Register hotkey listeners
│   └── shutdown(ctx)
│       ├── Save window size
│       ├── Cleanup hotkey manager
│       └── Cleanup tray icon
│
├── [Screenshot Methods] → internal/screenshot
│   ├── CaptureFullscreen() → CaptureResult
│   ├── CaptureWindow(handle) → CaptureResult
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

**Responsibility:** Screen and window capture with DPI awareness

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
```

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

**Responsibility:** System tray icon and context menu

**Lifecycle:**
```
NewTrayIcon("WinShot")
  ├─ Create system tray icon
  ├─ Register context menu
  └─ Set callbacks

tray.Start()
  └─ Display icon in system tray

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
├── RegionSelector (if showRegionSelector)
│   └── Drag-to-select region UI
├── EditorCanvas
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

**Hotkey Event Flow:**
```
User presses Ctrl+PrintScreen (global)
  ↓
Go hotkey listener detects WM_HOTKEY(id=2)
  ↓
app.onHotkey(id=2)
  ├─ Match id=2 to HotkeyRegion
  └─ runtime.EventsEmit(ctx, "hotkey:region")
  ↓
Frontend receives Wails event
  ↓
App.useEffect (EventsOn)
  ├─ setShowRegionSelector(true)
  └─ RegionSelector UI appears
  ↓
User drags region
  ↓
User releases mouse
  ↓
RegionSelector.onFinish(x, y, w, h)
  ├─ FinishRegionCapture(x, y, w, h) [Go binding]
  ├─ Go captures region → base64 PNG
  ├─ Return CaptureResult
  └─ setScreenshot(result)
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
- **Fullscreen:** Multi-display capture is combined into single image
- **Region:** Faster, only captures specified rectangle
- **Window:** Uses GDI, may be slower if window is partially hidden
- **DPI:** Scaling calculations may add latency

### Canvas Rendering (Konva)
- **Layer-based:** Efficient re-renders only affected layers
- **Shape complexity:** 5 types (rectangle, ellipse, arrow, line, text)
- **Large images:** May impact memory if >4K resolution

### File I/O
- **Async:** SaveImage() is non-blocking to frontend
- **Compression:** PNG is lossless; JPEG is lossy with quality setting

### Memory Management
- **Screenshots:** Stored as base64 strings in memory
- **Annotations:** Array of objects, minimal overhead
- **Cleanup:** On app close, all references released

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

