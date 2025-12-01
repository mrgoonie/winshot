# Research Report: Windows Screenshot Capture Methods for Go

**Research Date:** 2025-12-01
**Platform:** Windows
**Language:** Go (Golang)

## Executive Summary

Go provides multiple viable approaches for Windows screenshot capture: high-level cross-platform libraries (kbinani/screenshot, vova616/screenshot) for simplicity, or raw Win32 API via syscall/golang.org/x/sys for fine-grained control. For production applications, **kbinani/screenshot** offers best balance of features (multi-monitor, region capture, display enumeration) with clean API. Direct GDI/BitBlt syscall useful for specific window capture or performance optimization, though vulnerable to hardware-accelerated apps (Edge, modern browsers).

---

## Key Findings

### 1. High-Level Go Libraries

#### kbinani/screenshot (Recommended)
- **Status:** Production-ready, actively maintained
- **Multi-platform:** Windows, macOS, Linux, FreeBSD, OpenBSD, NetBSD, Solaris
- **Key APIs:**
  - `Capture(x, y, width, height int) (*image.RGBA, error)` - Region capture
  - `CaptureDisplay(displayIndex int) (*image.RGBA, error)` - Full display
  - `CaptureRect(rect image.Rectangle) (*image.RGBA, error)` - Rectangle by coords
  - `GetDisplayBounds(displayIndex int) image.Rectangle` - Display info
  - `NumActiveDisplays() int` - Monitor count

**Coordinate System:** Y-axis downward, origin at upper-left of main display.

#### vova616/screenshot
- **Status:** Simple, cross-platform (Linux, Windows, OSX)
- **Simpler API:** `CaptureScreen()`, `CaptureRect()`, `ScreenRect()`
- **Trade-off:** Less feature-rich, less active maintenance

**Recommendation:** Use kbinani/screenshot for production; vova616 for minimal deps projects.

---

### 2. Windows GDI/BitBlt Direct API via syscall

**When to use:** Specific window capture, hardware acceleration workarounds, performance tuning.

#### Basic Full-Screen Capture Workflow
```go
import (
  "syscall"
  "unsafe"
)

// Load Windows DLLs
var (
  user32 = syscall.NewLazyDLL("user32.dll")
  gdi32  = syscall.NewLazyDLL("gdi32.dll")
  kernel32 = syscall.NewLazyDLL("kernel32.dll")
)

// Key procedures
var (
  getDesktopWindow = user32.NewProc("GetDesktopWindow")
  getClientRect    = user32.NewProc("GetClientRect")
  getDC            = user32.NewProc("GetDC")
  releaseDC        = user32.NewProc("ReleaseDC")
  createCompatibleDC = gdi32.NewProc("CreateCompatibleDC")
  createCompatibleBitmap = gdi32.NewProc("CreateCompatibleBitmap")
  selectObject     = gdi32.NewProc("SelectObject")
  bitBlt           = gdi32.NewProc("BitBlt")
  deleteObject     = gdi32.NewProc("DeleteObject")
  getLastError     = kernel32.NewProc("GetLastError")
)

// Capture sequence:
// 1. GetDesktopWindow() -> get HWND
// 2. GetDC(hWnd) -> get device context
// 3. CreateCompatibleDC(hdc) -> create target DC
// 4. CreateCompatibleBitmap(hdc, width, height) -> create bitmap
// 5. SelectObject(hdcMem, hbmp) -> select bitmap into DC
// 6. BitBlt(hdcMem, 0, 0, width, height, hdc, 0, 0, SRCCOPY)
// 7. GetDIBits() -> extract pixels to []byte
```

#### Specific Window Capture
```go
// Use GetWindowRect(hWnd) to get window bounds
// Use GetDC(hWnd) instead of GetDesktopWindow()
// Optional: BitBlt with CAPTUREBLT flag for layered windows
```

#### Critical Limitations
- **Hardware-accelerated apps:** BitBlt captures black/blank for Edge, Chrome, modern DirectX apps
- **Layered windows:** Add `CAPTUREBLT` flag if needed, performance cost
- **Performance:** BitBlt slower than GDI+/D3D alternatives
- **Complex:** Requires manual device context management, bitmap conversion

---

### 3. Window Enumeration & Handle Detection

#### Key APIs
- **EnumWindows()** - Iterate all top-level windows via callback (most reliable)
- **GetWindow()** - Navigate window hierarchy (avoid loops; prefer EnumWindows)
- **FindWindow()** - Find by class/title (limited in Go standard lib)
- **GetWindowText()** - Get window title
- **GetClassName()** - Get window class name

#### Go Implementation Pattern
```go
// EnumWindows approach (recommended)
// Load callback and call EnumWindows with callback
// Callback receives HWND for each window
// Use GetWindowText(hwnd, ...) to extract titles
// Compare against search criteria, return true to continue enum

// Alt: Use golang.org/x/sys/windows package for cleaner API
import "golang.org/x/sys/windows"
// windows.EnumWindows() available
```

#### Process-based Enumeration
- `CreateToolHelp32Snapshot(TH32CS_SNAPPROCESS, 0)` - Get process snapshot
- `EnumProcesses()` - List all PIDs
- Use with window enumeration to filter by process

---

### 4. Multi-Monitor Support

#### Key APIs
- **EnumDisplayMonitors()** - Enumerate monitors via callback, pass NULL HDC for all
- **GetMonitorInfo()** - Retrieve MONITORINFO/MONITORINFOEX for specific monitor
- **MonitorFromWindow/Point/Rect()** - Get monitor handle from object

#### Implementation Strategy
```go
// 1. Call EnumDisplayMonitors(NULL, NULL, callback, 0)
// 2. Callback receives HMONITOR, HDC, LPRECT
// 3. Use GetMonitorInfo(hMonitor, &monitorInfo)
// 4. Extract monitor bounds from monitorInfo.rcMonitor
// 5. Calculate virtual screen dimensions (leftmost + widths)
// 6. Capture each display, splice into unified image
```

#### Multi-Monitor Layout
- Monitors can have negative coordinates (left of primary)
- Calculate composite bounding box across all monitors
- Stitch individual captures into single image

**Note:** kbinani/screenshot handles this automatically via `CaptureDisplay(index)` + `NumActiveDisplays()`.

---

### 5. Transparent Overlay for Region Selection

**Approach:**
1. Create fullscreen transparent window (layered window, WS_EX_LAYERED)
2. Use `SetLayeredWindowAttributes()` with color key or alpha
3. Paint selection rect on window DC
4. Mouse events (WM_MOUSEMOVE, WM_LBUTTONUP) to track drag
5. Extract selection coords, capture region via BitBlt
6. Destroy overlay window

**Libraries:**
- `github.com/lxn/walk` - Windows UI framework (native look)
- `fyne` - Cross-platform (heavier)
- `golang.org/x/sys/windows` - Direct API (lightweight)

---

### 6. Comparison Matrix

| Feature | kbinani/screenshot | vova616/screenshot | Direct GDI/BitBlt |
|---------|------|--------|--------|
| Multi-monitor | ✓ | Limited | ✓ |
| Region capture | ✓ | ✓ | ✓ |
| Specific window | ✗ | ✗ | ✓ |
| Hardware-accel safe | ✓ | ✓ | ✗ |
| Cross-platform | ✓ | ✓ | ✗ |
| Maintenance | Active | Dormant | Custom |
| Lines of code | ~100 | ~100 | 500+ |
| API simplicity | High | High | Low |

---

## Implementation Recommendations

### Quick Start: Full-Screen Capture
```go
import "github.com/kbinani/screenshot"

img, err := screenshot.Capture(0, 0, 1920, 1080)
if err != nil {
  panic(err)
}
// img is *image.RGBA, can encode to PNG/JPEG
```

### Quick Start: All Displays
```go
numDisplays := screenshot.NumActiveDisplays()
for i := 0; i < numDisplays; i++ {
  bounds := screenshot.GetDisplayBounds(i)
  img, _ := screenshot.CaptureDisplay(i)
  // Process img
}
```

### Window-Specific Capture (Custom GDI)
Requires syscall implementation; reference: [gist.github.com/rgl/284d7a56d839e503fd953c110b9cee13](https://gist.github.com/rgl/284d7a56d839e503fd953c110b9cee13)

### Hardware-Accelerated App Workaround
- Option 1: Use kbinani/screenshot (handles via platform layer)
- Option 2: Fall back to DXGI (Direct3D) capture for modern apps (complex)
- Option 3: Use Windows.Graphics.Capture API (requires cgo/Windows Runtime)

---

## Common Pitfalls

1. **Coordinate system mismatch** - Y-axis downward in Windows GDI
2. **Device context leaks** - Always ReleaseDC() matching GetDC()
3. **BitBlt on hardware-accelerated apps** - Returns black; use library or DXGI
4. **Monitor ordering** - Display indices may not match visual layout; use GetMonitorInfo
5. **DPI scaling** - High-DPI monitors scale coordinates; handle via GetDpiForMonitor (Windows 10+)

---

## Resources & References

### Official Documentation
- [Microsoft: Capturing an Image (GDI)](https://learn.microsoft.com/en-us/windows/win32/gdi/capturing-an-image)
- [Microsoft: Multiple Monitor System Metrics](https://learn.microsoft.com/en-us/windows/win32/gdi/multiple-monitor-system-metrics)
- [Microsoft: EnumDisplayMonitors Function](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaymonitors)
- [Microsoft: GetMonitorInfo Function](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getmonitorinfo)
- [Microsoft: GetWindow Function](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindow)

### Go Libraries
- [kbinani/screenshot on GitHub](https://github.com/kbinani/screenshot)
- [kbinani/screenshot on pkg.go.dev](https://pkg.go.dev/github.com/kbinani/screenshot)
- [vova616/screenshot on GitHub](https://github.com/vova616/screenshot)
- [vova616/screenshot on pkg.go.dev](https://pkg.go.dev/github.com/vova616/screenshot)

### Code Examples & Tutorials
- [Stack Overflow: Capture Screen in Go](https://stackoverflow.com/questions/13790852/capture-the-screen-in-go)
- [Stack Overflow: Screenshot Specific Window via Handle](https://stackoverflow.com/questions/76622144/golang-takes-a-screenshot-of-a-window-using-a-window-handle)
- [GitHub Gist: Specific Window Capture in Pure Go](https://gist.github.com/rgl/284d7a56d839e503fd953c110b9cee13)
- [GitHub Gist: Find Windows Handle in Golang](https://gist.github.com/EliCDavis/5374fa4947897b16a81f6550d142ab28)
- [Blog: Capture Desktop Screenshots in Go](https://blog.petehouston.com/capture-desktop-screenshots-in-go/)
- [Apriorit: Multi-Monitor Screenshots Using WinAPI](https://www.apriorit.com/dev-blog/193-multi-monitor-screenshot)

### Community Resources
- [Stack Overflow tag: windows-api + go](https://stackoverflow.com/questions/tagged/windows-api+go)
- [golang-nuts group: Window enumeration in Go](https://groups.google.com/g/golang-nuts/c/04fTztPeDtE)

---

## Recommendation Summary

**For 80% of use cases:** Use **kbinani/screenshot**
- Simplest, most maintainable
- Handles multi-monitor, DPI, hardware acceleration
- Cross-platform bonus

**For window-specific or low-level control:** Custom GDI via syscall
**For overlay/region selection:** Combine kbinani + golang.org/x/sys/windows for window management
**For production apps capturing modern browsers:** Verify kbinani/screenshot behavior; consider DXGI fallback if needed

---

## Unresolved Questions

1. Does kbinani/screenshot handle hardware-accelerated window content (Edge/Chrome) on all Windows 10/11 versions?
2. What is the performance difference between GDI BitBlt and platform-specific captures in kbinani?
3. Are there Go bindings for Windows.Graphics.Capture API for modern app capture?
4. How to handle DPI-aware region selection in high-DPI displays?
