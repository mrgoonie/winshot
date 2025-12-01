package screenshot

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32Win = windows.NewLazySystemDLL("user32.dll")

	procGetWindowRectSS = user32Win.NewProc("GetWindowRect")
)

type RECT struct {
	Left, Top, Right, Bottom int32
}

// CaptureWindowByCoords captures a window by capturing the screen region at window coordinates
// This approach is more reliable than direct GDI capture for hardware-accelerated windows
func CaptureWindowByCoords(hwnd uintptr) (*CaptureResult, error) {
	// Get window rect
	var rect RECT
	procGetWindowRectSS.Call(hwnd, uintptr(unsafe.Pointer(&rect)))

	x := int(rect.Left)
	y := int(rect.Top)
	width := int(rect.Right - rect.Left)
	height := int(rect.Bottom - rect.Top)

	// Ensure valid dimensions
	if width <= 0 || height <= 0 {
		return nil, nil
	}

	// Capture the screen region at window coordinates
	return CaptureRegion(x, y, width, height)
}
