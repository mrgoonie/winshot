package windows

import (
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32 = windows.NewLazySystemDLL("user32.dll")

	procEnumWindows       = user32.NewProc("EnumWindows")
	procGetWindowTextW    = user32.NewProc("GetWindowTextW")
	procGetWindowTextLengthW = user32.NewProc("GetWindowTextLengthW")
	procGetClassNameW     = user32.NewProc("GetClassNameW")
	procGetWindowRect     = user32.NewProc("GetWindowRect")
	procIsWindowVisible   = user32.NewProc("IsWindowVisible")
	procGetWindowLongW    = user32.NewProc("GetWindowLongW")
)

const (
	GWL_STYLE   = -16
	GWL_EXSTYLE = -20
	WS_VISIBLE  = 0x10000000
	WS_CAPTION  = 0x00C00000
)

// WindowInfo represents information about a window
type WindowInfo struct {
	Handle    uintptr `json:"handle"`
	Title     string  `json:"title"`
	ClassName string  `json:"className"`
	X         int     `json:"x"`
	Y         int     `json:"y"`
	Width     int     `json:"width"`
	Height    int     `json:"height"`
}

type RECT struct {
	Left, Top, Right, Bottom int32
}

// EnumWindows returns a list of all visible windows with titles
func EnumWindows() ([]WindowInfo, error) {
	var windowList []WindowInfo

	cb := syscall.NewCallback(func(hwnd syscall.Handle, lparam uintptr) uintptr {
		// Check if window is visible
		visible, _, _ := procIsWindowVisible.Call(uintptr(hwnd))
		if visible == 0 {
			return 1 // Continue enumeration
		}

		// Get window style
		style, _, _ := procGetWindowLongW.Call(uintptr(hwnd), uintptr(GWL_STYLE&0xFFFFFFFF))
		if style&WS_CAPTION == 0 {
			return 1 // Skip windows without caption
		}

		// Get window title length
		titleLen, _, _ := procGetWindowTextLengthW.Call(uintptr(hwnd))
		if titleLen == 0 {
			return 1 // Skip windows without title
		}

		// Get window title
		titleBuf := make([]uint16, titleLen+1)
		procGetWindowTextW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&titleBuf[0])), titleLen+1)
		title := syscall.UTF16ToString(titleBuf)

		// Get class name
		classNameBuf := make([]uint16, 256)
		procGetClassNameW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&classNameBuf[0])), 256)
		className := syscall.UTF16ToString(classNameBuf)

		// Get window rect
		var rect RECT
		procGetWindowRect.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&rect)))

		// Skip very small windows or windows with no size
		width := int(rect.Right - rect.Left)
		height := int(rect.Bottom - rect.Top)
		if width < 50 || height < 50 {
			return 1
		}

		windowList = append(windowList, WindowInfo{
			Handle:    uintptr(hwnd),
			Title:     title,
			ClassName: className,
			X:         int(rect.Left),
			Y:         int(rect.Top),
			Width:     width,
			Height:    height,
		})

		return 1 // Continue enumeration
	})

	procEnumWindows.Call(cb, 0)

	return windowList, nil
}

// GetWindowInfo returns information about a specific window
func GetWindowInfo(hwnd uintptr) (*WindowInfo, error) {
	// Check if window is valid
	visible, _, _ := procIsWindowVisible.Call(hwnd)
	if visible == 0 {
		return nil, nil
	}

	// Get window title
	titleLen, _, _ := procGetWindowTextLengthW.Call(hwnd)
	titleBuf := make([]uint16, titleLen+1)
	procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&titleBuf[0])), titleLen+1)
	title := syscall.UTF16ToString(titleBuf)

	// Get class name
	classNameBuf := make([]uint16, 256)
	procGetClassNameW.Call(hwnd, uintptr(unsafe.Pointer(&classNameBuf[0])), 256)
	className := syscall.UTF16ToString(classNameBuf)

	// Get window rect
	var rect RECT
	procGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&rect)))

	return &WindowInfo{
		Handle:    hwnd,
		Title:     title,
		ClassName: className,
		X:         int(rect.Left),
		Y:         int(rect.Top),
		Width:     int(rect.Right - rect.Left),
		Height:    int(rect.Bottom - rect.Top),
	}, nil
}
