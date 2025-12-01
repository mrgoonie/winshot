# Phase 09: System Integration

**Context:** [plan.md](./plan.md) | [Phase 08](./phase-08-export-save.md) | [Windows APIs Research](../reports/researcher-251201-windows-screenshot-apis.md)
**Date:** 2025-12-01 | **Priority:** Medium | **Status:** Pending
**Estimated Time:** 4 hours

---

## Overview

Implement Windows system integration: global hotkeys for quick capture, system tray icon with context menu, and window enumeration for window-specific capture. All implemented via golang.org/x/sys/windows since Wails v2 doesn't include these features.

---

## Key Insights

- Wails v2 lacks system tray and global hotkeys (v3 feature)
- Use Win32 API directly via golang.org/x/sys/windows
- RegisterHotKey() for global shortcuts (works even when minimized)
- EnumWindows() callback for window list
- Shell_NotifyIcon for system tray (requires message loop)

---

## Requirements

### Global Hotkeys
| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+1 | Region capture |
| Ctrl+Shift+2 | Fullscreen capture |
| Ctrl+Shift+3 | Window capture (show picker) |
| PrintScreen | Region capture (optional) |

### System Tray
1. **Tray Icon:** App icon in notification area
2. **Left Click:** Show/hide main window
3. **Right Click:** Context menu
4. **Menu Items:** Capture Region, Capture Fullscreen, Capture Window, Settings, Exit

### Window Enumeration
1. **List Windows:** Get all visible top-level windows
2. **Window Info:** Title, handle, thumbnail preview
3. **Window Picker:** UI to select window for capture

---

## Architecture

```
internal/
├── hotkeys/
│   └── hotkeys.go          # Global hotkey registration
├── tray/
│   └── tray.go             # System tray management
└── windows/
    └── enum.go             # Window enumeration

Go Backend                      React Frontend
+---------------------------+   +---------------------------+
| RegisterHotkeys()         |   | Window picker modal       |
| UnregisterHotkeys()       |   | Capture mode indicators   |
| CreateTrayIcon()          |   | Settings UI               |
| GetWindowList()           |   |                           |
+---------------------------+   +---------------------------+
```

---

## Related Code Files

- `internal/hotkeys/hotkeys.go` - Hotkey registration
- `internal/tray/tray.go` - System tray
- `internal/windows/enum.go` - Window enumeration
- `app.go` - Wails-bound methods

---

## Implementation Steps

### Step 1: Implement Global Hotkeys (1 hour)

**internal/hotkeys/hotkeys.go:**
```go
package hotkeys

import (
    "syscall"
    "unsafe"

    "golang.org/x/sys/windows"
)

var (
    user32          = windows.NewLazySystemDLL("user32.dll")
    procRegisterHotKey   = user32.NewProc("RegisterHotKey")
    procUnregisterHotKey = user32.NewProc("UnregisterHotKey")
    procGetMessage       = user32.NewProc("GetMessageW")
)

const (
    MOD_CTRL  = 0x0002
    MOD_SHIFT = 0x0004
    MOD_ALT   = 0x0001

    WM_HOTKEY = 0x0312

    HOTKEY_REGION     = 1
    HOTKEY_FULLSCREEN = 2
    HOTKEY_WINDOW     = 3
)

type HotkeyCallback func(id int)

type HotkeyManager struct {
    hwnd     uintptr
    callback HotkeyCallback
    quit     chan struct{}
}

func NewHotkeyManager(callback HotkeyCallback) *HotkeyManager {
    return &HotkeyManager{
        callback: callback,
        quit:     make(chan struct{}),
    }
}

func (m *HotkeyManager) Register() error {
    // Register Ctrl+Shift+1 for region
    ret, _, err := procRegisterHotKey.Call(0, HOTKEY_REGION, MOD_CTRL|MOD_SHIFT, uintptr('1'))
    if ret == 0 {
        return err
    }

    // Register Ctrl+Shift+2 for fullscreen
    ret, _, err = procRegisterHotKey.Call(0, HOTKEY_FULLSCREEN, MOD_CTRL|MOD_SHIFT, uintptr('2'))
    if ret == 0 {
        return err
    }

    // Register Ctrl+Shift+3 for window
    ret, _, err = procRegisterHotKey.Call(0, HOTKEY_WINDOW, MOD_CTRL|MOD_SHIFT, uintptr('3'))
    if ret == 0 {
        return err
    }

    return nil
}

func (m *HotkeyManager) Listen() {
    type MSG struct {
        HWND    uintptr
        Message uint32
        WParam  uintptr
        LParam  uintptr
        Time    uint32
        Pt      struct{ X, Y int32 }
    }

    var msg MSG
    for {
        select {
        case <-m.quit:
            return
        default:
            ret, _, _ := procGetMessage.Call(
                uintptr(unsafe.Pointer(&msg)),
                0, 0, 0,
            )
            if ret == 0 {
                continue
            }
            if msg.Message == WM_HOTKEY {
                m.callback(int(msg.WParam))
            }
        }
    }
}

func (m *HotkeyManager) Unregister() {
    procUnregisterHotKey.Call(0, HOTKEY_REGION)
    procUnregisterHotKey.Call(0, HOTKEY_FULLSCREEN)
    procUnregisterHotKey.Call(0, HOTKEY_WINDOW)
    close(m.quit)
}
```

### Step 2: Implement Window Enumeration (45 min)

**internal/windows/enum.go:**
```go
package windows

import (
    "syscall"
    "unsafe"

    "golang.org/x/sys/windows"
)

var (
    user32           = windows.NewLazySystemDLL("user32.dll")
    procEnumWindows  = user32.NewProc("EnumWindows")
    procGetWindowTextW = user32.NewProc("GetWindowTextW")
    procGetWindowTextLengthW = user32.NewProc("GetWindowTextLengthW")
    procIsWindowVisible = user32.NewProc("IsWindowVisible")
    procGetWindowLongW = user32.NewProc("GetWindowLongW")
)

const (
    GWL_STYLE   = -16
    GWL_EXSTYLE = -20
    WS_VISIBLE  = 0x10000000
    WS_EX_TOOLWINDOW = 0x00000080
)

type WindowInfo struct {
    HWND  uintptr `json:"hwnd"`
    Title string  `json:"title"`
}

func GetWindowList() []WindowInfo {
    var windows []WindowInfo

    callback := syscall.NewCallback(func(hwnd, lparam uintptr) uintptr {
        // Check if visible
        visible, _, _ := procIsWindowVisible.Call(hwnd)
        if visible == 0 {
            return 1 // Continue
        }

        // Check if tool window (skip)
        exStyle, _, _ := procGetWindowLongW.Call(hwnd, uintptr(GWL_EXSTYLE))
        if exStyle&WS_EX_TOOLWINDOW != 0 {
            return 1
        }

        // Get title length
        length, _, _ := procGetWindowTextLengthW.Call(hwnd)
        if length == 0 {
            return 1
        }

        // Get title
        buf := make([]uint16, length+1)
        procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), length+1)
        title := syscall.UTF16ToString(buf)

        if title != "" {
            windows = append(windows, WindowInfo{
                HWND:  hwnd,
                Title: title,
            })
        }

        return 1 // Continue enumeration
    })

    procEnumWindows.Call(callback, 0)
    return windows
}
```

### Step 3: Implement System Tray (1 hour)

**internal/tray/tray.go:**
```go
package tray

import (
    "syscall"
    "unsafe"

    "golang.org/x/sys/windows"
)

var (
    shell32 = windows.NewLazySystemDLL("shell32.dll")
    user32  = windows.NewLazySystemDLL("user32.dll")

    procShell_NotifyIconW = shell32.NewProc("Shell_NotifyIconW")
    procCreatePopupMenu   = user32.NewProc("CreatePopupMenu")
    procAppendMenuW       = user32.NewProc("AppendMenuW")
    procTrackPopupMenu    = user32.NewProc("TrackPopupMenu")
    procDestroyMenu       = user32.NewProc("DestroyMenu")
)

const (
    NIM_ADD    = 0x00000000
    NIM_MODIFY = 0x00000001
    NIM_DELETE = 0x00000002
    NIF_ICON   = 0x00000002
    NIF_TIP    = 0x00000004
    NIF_MESSAGE = 0x00000001

    WM_TRAYICON = 0x0400 + 1
    WM_LBUTTONUP = 0x0202
    WM_RBUTTONUP = 0x0205

    MF_STRING = 0x00000000
    MF_SEPARATOR = 0x00000800

    ID_REGION     = 1001
    ID_FULLSCREEN = 1002
    ID_WINDOW     = 1003
    ID_SETTINGS   = 1004
    ID_EXIT       = 1005
)

type NOTIFYICONDATA struct {
    CbSize           uint32
    HWnd             uintptr
    UID              uint32
    UFlags           uint32
    UCallbackMessage uint32
    HIcon            uintptr
    SzTip            [128]uint16
}

type TrayIcon struct {
    hwnd     uintptr
    iconData NOTIFYICONDATA
    callback func(id int)
}

func NewTrayIcon(hwnd uintptr, callback func(id int)) *TrayIcon {
    return &TrayIcon{
        hwnd:     hwnd,
        callback: callback,
    }
}

func (t *TrayIcon) Create(iconPath string, tooltip string) error {
    // Load icon and create NOTIFYICONDATA
    // ... implementation
    return nil
}

func (t *TrayIcon) ShowContextMenu() {
    menu, _, _ := procCreatePopupMenu.Call()
    defer procDestroyMenu.Call(menu)

    appendMenu(menu, ID_REGION, "Capture Region\tCtrl+Shift+1")
    appendMenu(menu, ID_FULLSCREEN, "Capture Fullscreen\tCtrl+Shift+2")
    appendMenu(menu, ID_WINDOW, "Capture Window\tCtrl+Shift+3")
    appendSeparator(menu)
    appendMenu(menu, ID_SETTINGS, "Settings...")
    appendSeparator(menu)
    appendMenu(menu, ID_EXIT, "Exit")

    // Get cursor position and show menu
    // ... implementation
}

func (t *TrayIcon) Destroy() {
    t.iconData.CbSize = uint32(unsafe.Sizeof(t.iconData))
    procShell_NotifyIconW.Call(NIM_DELETE, uintptr(unsafe.Pointer(&t.iconData)))
}

func appendMenu(menu uintptr, id int, text string) {
    textPtr, _ := syscall.UTF16PtrFromString(text)
    procAppendMenuW.Call(menu, MF_STRING, uintptr(id), uintptr(unsafe.Pointer(textPtr)))
}

func appendSeparator(menu uintptr) {
    procAppendMenuW.Call(menu, MF_SEPARATOR, 0, 0)
}
```

### Step 4: Integrate with App (30 min)

**app.go (add methods):**
```go
package main

import (
    "context"

    "winshot/internal/hotkeys"
    "winshot/internal/tray"
    winapi "winshot/internal/windows"

    "github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
    ctx           context.Context
    hotkeyManager *hotkeys.HotkeyManager
    trayIcon      *tray.TrayIcon
}

func (a *App) startup(ctx context.Context) {
    a.ctx = ctx

    // Setup hotkeys
    a.hotkeyManager = hotkeys.NewHotkeyManager(a.onHotkey)
    a.hotkeyManager.Register()
    go a.hotkeyManager.Listen()

    // Setup tray (needs window handle from Wails)
    // Note: Wails v2 doesn't expose HWND easily; may need workaround
}

func (a *App) shutdown(ctx context.Context) {
    if a.hotkeyManager != nil {
        a.hotkeyManager.Unregister()
    }
    if a.trayIcon != nil {
        a.trayIcon.Destroy()
    }
}

func (a *App) onHotkey(id int) {
    switch id {
    case hotkeys.HOTKEY_REGION:
        runtime.EventsEmit(a.ctx, "capture:region")
    case hotkeys.HOTKEY_FULLSCREEN:
        runtime.EventsEmit(a.ctx, "capture:fullscreen")
    case hotkeys.HOTKEY_WINDOW:
        runtime.EventsEmit(a.ctx, "capture:window")
    }
}

// GetWindowList returns list of capturable windows
func (a *App) GetWindowList() []winapi.WindowInfo {
    return winapi.GetWindowList()
}
```

### Step 5: Create Window Picker UI (45 min)

**frontend/src/components/WindowPicker/WindowPicker.tsx:**
```typescript
import { useState, useEffect } from 'react'
import { GetWindowList } from '../../wailsjs/go/main/App'

interface WindowInfo {
  hwnd: number
  title: string
}

interface WindowPickerProps {
  isOpen: boolean
  onSelect: (hwnd: number) => void
  onCancel: () => void
}

export function WindowPicker({ isOpen, onSelect, onCancel }: WindowPickerProps) {
  const [windows, setWindows] = useState<WindowInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      GetWindowList().then(list => {
        setWindows(list)
        setLoading(false)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[500px] max-h-[600px] overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Select Window to Capture</h2>
        </div>

        <div className="overflow-y-auto max-h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading windows...</div>
          ) : (
            <div className="divide-y">
              {windows.map(win => (
                <button
                  key={win.hwnd}
                  onClick={() => onSelect(win.hwnd)}
                  className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                    {/* Window icon placeholder */}
                    <span className="text-gray-400 text-xs">Win</span>
                  </div>
                  <span className="truncate">{win.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onCancel}
            className="w-full py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Step 6: Listen for Capture Events (15 min)

**frontend/src/App.tsx (add event listeners):**
```typescript
import { EventsOn } from '../wailsjs/runtime'

useEffect(() => {
  const unsubRegion = EventsOn('capture:region', () => {
    // Trigger region capture mode
    startRegionCapture()
  })

  const unsubFullscreen = EventsOn('capture:fullscreen', async () => {
    const result = await CaptureFullscreen(0)
    setImageData(result)
  })

  const unsubWindow = EventsOn('capture:window', () => {
    setShowWindowPicker(true)
  })

  return () => {
    unsubRegion()
    unsubFullscreen()
    unsubWindow()
  }
}, [])
```

---

## Todo List

- [ ] Implement HotkeyManager with RegisterHotKey
- [ ] Register default hotkeys (Ctrl+Shift+1/2/3)
- [ ] Implement hotkey message loop
- [ ] Implement window enumeration via EnumWindows
- [ ] Filter visible, non-tool windows
- [ ] Implement system tray icon
- [ ] Create tray context menu
- [ ] Handle tray click events
- [ ] Bind Go methods to Wails
- [ ] Create WindowPicker modal UI
- [ ] Connect hotkey events to frontend
- [ ] Test hotkeys when app minimized

---

## Success Criteria

1. Ctrl+Shift+1 triggers region capture (even when minimized)
2. Ctrl+Shift+2 triggers fullscreen capture
3. Ctrl+Shift+3 opens window picker
4. System tray icon visible in notification area
5. Left-click tray shows/hides window
6. Right-click tray shows context menu
7. Window picker lists all visible windows
8. Selecting window captures that window

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Hotkey conflicts with other apps | Medium | Medium | Allow user to customize shortcuts |
| Tray icon not appearing | Medium | Low | Ensure proper icon format/path |
| Window enumeration incomplete | Low | Low | Filter criteria may need tuning |
| Wails HWND access | Medium | Medium | May need custom window proc |

---

## Next Steps

After completing this phase, the MVP is complete. Future enhancements:
1. Settings persistence (hotkey customization)
2. Auto-start with Windows
3. Region selection overlay (transparent fullscreen window)
4. OCR text extraction
5. Cloud upload integrations
