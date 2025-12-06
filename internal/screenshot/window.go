package screenshot

import (
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32Win = windows.NewLazySystemDLL("user32.dll")
	shcore    = windows.NewLazySystemDLL("shcore.dll")
	dwmapi    = windows.NewLazySystemDLL("dwmapi.dll")

	procGetWindowRectSS        = user32Win.NewProc("GetWindowRect")
	procSetProcessDPIAware     = user32Win.NewProc("SetProcessDPIAware")
	procDwmGetWindowAttribute  = dwmapi.NewProc("DwmGetWindowAttribute")
	procSetProcessDpiAwareness = shcore.NewProc("SetProcessDpiAwareness")
	procSetForegroundWindow    = user32Win.NewProc("SetForegroundWindow")
	procBringWindowToTop       = user32Win.NewProc("BringWindowToTop")
	procShowWindow             = user32Win.NewProc("ShowWindow")
	procIsIconic               = user32Win.NewProc("IsIconic")
	procGetCursorPos           = user32Win.NewProc("GetCursorPos")
)

const (
	DWMWA_EXTENDED_FRAME_BOUNDS   = 9
	PROCESS_PER_MONITOR_DPI_AWARE = 2
	SW_RESTORE                    = 9
)

type RECT struct {
	Left, Top, Right, Bottom int32
}

type POINT struct {
	X, Y int32
}

func init() {
	// Set DPI awareness for accurate window coordinates
	// Try per-monitor DPI awareness first (Windows 8.1+)
	if shcore.Load() == nil && procSetProcessDpiAwareness.Find() == nil {
		procSetProcessDpiAwareness.Call(uintptr(PROCESS_PER_MONITOR_DPI_AWARE))
	} else {
		// Fallback to basic DPI awareness (Windows Vista+)
		procSetProcessDPIAware.Call()
	}
}

// bringWindowToForeground brings the specified window to the foreground
// This ensures the window is visible and not covered by other windows before capture
func bringWindowToForeground(hwnd uintptr) {
	// Check if window is minimized and restore it
	isMinimized, _, _ := procIsIconic.Call(hwnd)
	if isMinimized != 0 {
		procShowWindow.Call(hwnd, SW_RESTORE)
	}

	// Bring window to top of z-order
	procBringWindowToTop.Call(hwnd)

	// Set as foreground window (makes it active)
	procSetForegroundWindow.Call(hwnd)

	// Small delay to allow window to fully render in foreground
	time.Sleep(100 * time.Millisecond)
}

// CaptureWindowByCoords captures a window by capturing the screen region at window coordinates
// This approach is more reliable than direct GDI capture for hardware-accelerated windows
func CaptureWindowByCoords(hwnd uintptr) (*CaptureResult, error) {
	// Bring window to foreground before capture to ensure it's visible
	bringWindowToForeground(hwnd)

	var rect RECT

	// Try DWM extended frame bounds first (more accurate for modern windows)
	// This accounts for window shadows and DPI scaling
	if dwmapi.Load() == nil && procDwmGetWindowAttribute.Find() == nil {
		ret, _, _ := procDwmGetWindowAttribute.Call(
			hwnd,
			uintptr(DWMWA_EXTENDED_FRAME_BOUNDS),
			uintptr(unsafe.Pointer(&rect)),
			unsafe.Sizeof(rect),
		)
		if ret != 0 {
			// DWM failed, fall back to GetWindowRect
			procGetWindowRectSS.Call(hwnd, uintptr(unsafe.Pointer(&rect)))
		}
	} else {
		// DWM not available, use GetWindowRect
		procGetWindowRectSS.Call(hwnd, uintptr(unsafe.Pointer(&rect)))
	}

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

// GetCursorPosition returns the current cursor position in screen coordinates
func GetCursorPosition() (x, y int) {
	var pt POINT
	procGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
	return int(pt.X), int(pt.Y)
}

// GetMonitorAtCursor returns the display index where the cursor is currently located
// Returns 0 (primary display) if cursor position cannot be determined
func GetMonitorAtCursor() int {
	cursorX, cursorY := GetCursorPosition()

	numDisplays := GetDisplayCount()
	for i := 0; i < numDisplays; i++ {
		bounds := GetDisplayBounds(i)
		// Check if cursor is within this display's bounds
		if cursorX >= bounds.Min.X && cursorX < bounds.Max.X &&
			cursorY >= bounds.Min.Y && cursorY < bounds.Max.Y {
			return i
		}
	}

	// Fallback to primary display
	return 0
}
