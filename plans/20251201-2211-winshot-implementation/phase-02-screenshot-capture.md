# Phase 02: Screenshot Capture

**Context:** [plan.md](./plan.md) | [Phase 01](./phase-01-project-setup.md) | [Windows APIs Research](../reports/researcher-251201-windows-screenshot-apis.md)
**Date:** 2025-12-01 | **Priority:** Critical | **Status:** Pending
**Estimated Time:** 4 hours

---

## Overview

Implement Go backend for three capture modes: region selection, fullscreen, and specific window. Use kbinani/screenshot for region/fullscreen; custom GDI for window capture. Return base64-encoded PNG to frontend.

---

## Key Insights

- kbinani/screenshot handles multi-monitor, DPI, hardware acceleration
- Window capture requires GetDC(hwnd) + BitBlt for specific windows
- Y-axis is downward in Windows coordinate system
- Return base64 to avoid temp file management initially

---

## Requirements

### Capture Modes
1. **Region:** User drags rectangle; capture specified bounds
2. **Fullscreen:** Capture entire primary display (or all monitors)
3. **Window:** Capture specific window by HWND

### Input/Output
- **Input:** Capture mode + coordinates (for region) or HWND (for window)
- **Output:** Base64-encoded PNG string

---

## Architecture

```
internal/screenshot/
├── capture.go       # Main capture functions
├── region.go        # Region capture (kbinani)
├── fullscreen.go    # Fullscreen capture (kbinani)
├── window.go        # Window capture (GDI/BitBlt)
└── types.go         # CaptureResult, CaptureOptions

app.go
├── CaptureRegion(x, y, w, h int) (string, error)
├── CaptureFullscreen() (string, error)
└── CaptureWindow(hwnd uintptr) (string, error)
```

---

## Related Code Files

- `internal/screenshot/capture.go` - Core capture logic
- `internal/screenshot/window.go` - GDI window capture
- `app.go` - Wails-bound methods
- `frontend/wailsjs/go/main/App.ts` - Auto-generated bindings

---

## Implementation Steps

### Step 1: Create Types (15 min)

**internal/screenshot/types.go:**
```go
package screenshot

type CaptureResult struct {
    Base64 string `json:"base64"`
    Width  int    `json:"width"`
    Height int    `json:"height"`
}

type CaptureOptions struct {
    X, Y, Width, Height int
    DisplayIndex        int
    HWND                uintptr
}
```

### Step 2: Implement Region Capture (30 min)

**internal/screenshot/region.go:**
```go
package screenshot

import (
    "bytes"
    "encoding/base64"
    "image/png"

    "github.com/kbinani/screenshot"
)

func CaptureRegion(x, y, width, height int) (*CaptureResult, error) {
    img, err := screenshot.Capture(x, y, width, height)
    if err != nil {
        return nil, err
    }

    var buf bytes.Buffer
    if err := png.Encode(&buf, img); err != nil {
        return nil, err
    }

    return &CaptureResult{
        Base64: base64.StdEncoding.EncodeToString(buf.Bytes()),
        Width:  width,
        Height: height,
    }, nil
}
```

### Step 3: Implement Fullscreen Capture (30 min)

**internal/screenshot/fullscreen.go:**
```go
package screenshot

import (
    "bytes"
    "encoding/base64"
    "image/png"

    kb "github.com/kbinani/screenshot"
)

func CaptureFullscreen(displayIndex int) (*CaptureResult, error) {
    bounds := kb.GetDisplayBounds(displayIndex)
    img, err := kb.CaptureDisplay(displayIndex)
    if err != nil {
        return nil, err
    }

    var buf bytes.Buffer
    if err := png.Encode(&buf, img); err != nil {
        return nil, err
    }

    return &CaptureResult{
        Base64: base64.StdEncoding.EncodeToString(buf.Bytes()),
        Width:  bounds.Dx(),
        Height: bounds.Dy(),
    }, nil
}

func GetDisplayCount() int {
    return kb.NumActiveDisplays()
}

func GetDisplayBounds(index int) (x, y, w, h int) {
    b := kb.GetDisplayBounds(index)
    return b.Min.X, b.Min.Y, b.Dx(), b.Dy()
}
```

### Step 4: Implement Window Capture (1 hour)

**internal/screenshot/window.go:**
```go
package screenshot

import (
    "bytes"
    "encoding/base64"
    "image"
    "image/png"
    "unsafe"

    "golang.org/x/sys/windows"
)

var (
    user32 = windows.NewLazySystemDLL("user32.dll")
    gdi32  = windows.NewLazySystemDLL("gdi32.dll")

    procGetWindowRect        = user32.NewProc("GetWindowRect")
    procGetDC                = user32.NewProc("GetDC")
    procReleaseDC            = user32.NewProc("ReleaseDC")
    procCreateCompatibleDC   = gdi32.NewProc("CreateCompatibleDC")
    procCreateCompatibleBitmap = gdi32.NewProc("CreateCompatibleBitmap")
    procSelectObject         = gdi32.NewProc("SelectObject")
    procBitBlt               = gdi32.NewProc("BitBlt")
    procDeleteObject         = gdi32.NewProc("DeleteObject")
    procDeleteDC             = gdi32.NewProc("DeleteDC")
    procGetDIBits            = gdi32.NewProc("GetDIBits")
)

const SRCCOPY = 0x00CC0020

type RECT struct {
    Left, Top, Right, Bottom int32
}

type BITMAPINFOHEADER struct {
    Size          uint32
    Width         int32
    Height        int32
    Planes        uint16
    BitCount      uint16
    Compression   uint32
    SizeImage     uint32
    XPelsPerMeter int32
    YPelsPerMeter int32
    ClrUsed       uint32
    ClrImportant  uint32
}

func CaptureWindow(hwnd uintptr) (*CaptureResult, error) {
    var rect RECT
    procGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&rect)))

    width := int(rect.Right - rect.Left)
    height := int(rect.Bottom - rect.Top)

    hdc, _, _ := procGetDC.Call(hwnd)
    defer procReleaseDC.Call(hwnd, hdc)

    hdcMem, _, _ := procCreateCompatibleDC.Call(hdc)
    defer procDeleteDC.Call(hdcMem)

    hbmp, _, _ := procCreateCompatibleBitmap.Call(hdc, uintptr(width), uintptr(height))
    defer procDeleteObject.Call(hbmp)

    procSelectObject.Call(hdcMem, hbmp)
    procBitBlt.Call(hdcMem, 0, 0, uintptr(width), uintptr(height), hdc, 0, 0, SRCCOPY)

    // Extract pixels via GetDIBits
    img := image.NewRGBA(image.Rect(0, 0, width, height))
    // ... GetDIBits implementation (see full code in project)

    var buf bytes.Buffer
    png.Encode(&buf, img)

    return &CaptureResult{
        Base64: base64.StdEncoding.EncodeToString(buf.Bytes()),
        Width:  width,
        Height: height,
    }, nil
}
```

### Step 5: Bind Methods in app.go (30 min)

**app.go:**
```go
package main

import (
    "winshot/internal/screenshot"
)

type App struct {
    ctx context.Context
}

func (a *App) CaptureRegion(x, y, w, h int) (*screenshot.CaptureResult, error) {
    return screenshot.CaptureRegion(x, y, w, h)
}

func (a *App) CaptureFullscreen(displayIndex int) (*screenshot.CaptureResult, error) {
    return screenshot.CaptureFullscreen(displayIndex)
}

func (a *App) CaptureWindow(hwnd uintptr) (*screenshot.CaptureResult, error) {
    return screenshot.CaptureWindow(hwnd)
}

func (a *App) GetDisplayCount() int {
    return screenshot.GetDisplayCount()
}
```

### Step 6: Test Capture from Frontend (30 min)

**frontend/src/App.tsx:**
```typescript
import { CaptureFullscreen } from '../wailsjs/go/main/App'

const handleCapture = async () => {
  const result = await CaptureFullscreen(0)
  const imgSrc = `data:image/png;base64,${result.base64}`
  // Display in img element or pass to editor
}
```

---

## Todo List

- [ ] Create types.go with CaptureResult struct
- [ ] Implement CaptureRegion using kbinani/screenshot
- [ ] Implement CaptureFullscreen with display index support
- [ ] Implement CaptureWindow with GDI/BitBlt
- [ ] Bind all capture methods in app.go
- [ ] Generate frontend bindings (automatic with wails dev)
- [ ] Test all three capture modes
- [ ] Handle multi-monitor negative coordinates

---

## Success Criteria

1. CaptureRegion returns valid base64 PNG for arbitrary coordinates
2. CaptureFullscreen captures correct display by index
3. CaptureWindow captures content of specified HWND
4. Capture latency < 200ms for 1080p region
5. Multi-monitor support works (negative coordinates)

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Hardware-accelerated window black | Medium | Medium | Fall back to desktop capture at window coords |
| Negative coords on multi-monitor | Medium | Medium | Handle in kbinani (built-in support) |
| HWND invalid or closed | Low | Medium | Return error, let frontend handle |

---

## Next Steps

After completing this phase:
1. Proceed to [Phase 03: Basic Editor UI](./phase-03-basic-editor-ui.md)
2. Create overlay for region selection
3. Build window list for window capture
