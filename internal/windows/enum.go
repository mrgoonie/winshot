package windows

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/png"
	"syscall"
	"unsafe"

	"golang.org/x/image/draw"
	"golang.org/x/sys/windows"
)

var (
	user32 = windows.NewLazySystemDLL("user32.dll")
	gdi32  = windows.NewLazySystemDLL("gdi32.dll")

	procEnumWindows          = user32.NewProc("EnumWindows")
	procGetWindowTextW       = user32.NewProc("GetWindowTextW")
	procGetWindowTextLengthW = user32.NewProc("GetWindowTextLengthW")
	procGetClassNameW        = user32.NewProc("GetClassNameW")
	procGetWindowRect        = user32.NewProc("GetWindowRect")
	procIsWindowVisible      = user32.NewProc("IsWindowVisible")
	procGetWindowLongW       = user32.NewProc("GetWindowLongW")
	procPrintWindow          = user32.NewProc("PrintWindow")
	procGetWindowDC          = user32.NewProc("GetWindowDC")
	procReleaseDC            = user32.NewProc("ReleaseDC")
	procGetDC                = user32.NewProc("GetDC")

	procCreateCompatibleDC     = gdi32.NewProc("CreateCompatibleDC")
	procCreateCompatibleBitmap = gdi32.NewProc("CreateCompatibleBitmap")
	procSelectObject           = gdi32.NewProc("SelectObject")
	procDeleteObject           = gdi32.NewProc("DeleteObject")
	procDeleteDC               = gdi32.NewProc("DeleteDC")
	procBitBlt                 = gdi32.NewProc("BitBlt")
	procGetDIBits              = gdi32.NewProc("GetDIBits")
)

const (
	GWL_STYLE   = -16
	GWL_EXSTYLE = -20
	WS_VISIBLE  = 0x10000000
	WS_CAPTION  = 0x00C00000

	PW_CLIENTONLY    = 0x00000001
	PW_RENDERFULLCONTENT = 0x00000002
	SRCCOPY          = 0x00CC0020
	DIB_RGB_COLORS   = 0
	BI_RGB           = 0
)

// BITMAPINFOHEADER for DIB
type BITMAPINFOHEADER struct {
	BiSize          uint32
	BiWidth         int32
	BiHeight        int32
	BiPlanes        uint16
	BiBitCount      uint16
	BiCompression   uint32
	BiSizeImage     uint32
	BiXPelsPerMeter int32
	BiYPelsPerMeter int32
	BiClrUsed       uint32
	BiClrImportant  uint32
}

// BITMAPINFO for DIB
type BITMAPINFO struct {
	BmiHeader BITMAPINFOHEADER
	BmiColors [1]uint32
}

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

// WindowInfoWithThumbnail includes window info plus a thumbnail image
type WindowInfoWithThumbnail struct {
	Handle    uintptr `json:"handle"`
	Title     string  `json:"title"`
	ClassName string  `json:"className"`
	X         int     `json:"x"`
	Y         int     `json:"y"`
	Width     int     `json:"width"`
	Height    int     `json:"height"`
	Thumbnail string  `json:"thumbnail"` // Base64 encoded PNG thumbnail
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

// CaptureWindowThumbnail captures a thumbnail of a window
// Returns base64 encoded PNG image scaled to specified max dimensions
func CaptureWindowThumbnail(hwnd uintptr, maxWidth, maxHeight int) string {
	var rect RECT
	procGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&rect)))

	width := int(rect.Right - rect.Left)
	height := int(rect.Bottom - rect.Top)

	if width <= 0 || height <= 0 {
		return ""
	}

	// Get window DC
	hdcWindow, _, _ := procGetWindowDC.Call(hwnd)
	if hdcWindow == 0 {
		return ""
	}
	defer procReleaseDC.Call(hwnd, hdcWindow)

	// Create compatible DC and bitmap
	hdcMem, _, _ := procCreateCompatibleDC.Call(hdcWindow)
	if hdcMem == 0 {
		return ""
	}
	defer procDeleteDC.Call(hdcMem)

	hBitmap, _, _ := procCreateCompatibleBitmap.Call(hdcWindow, uintptr(width), uintptr(height))
	if hBitmap == 0 {
		return ""
	}
	defer procDeleteObject.Call(hBitmap)

	// Select bitmap into memory DC
	oldBitmap, _, _ := procSelectObject.Call(hdcMem, hBitmap)
	defer procSelectObject.Call(hdcMem, oldBitmap)

	// Try PrintWindow first (works for windows not on screen)
	ret, _, _ := procPrintWindow.Call(hwnd, hdcMem, PW_RENDERFULLCONTENT)
	if ret == 0 {
		// Fallback to BitBlt (only works for visible windows)
		procBitBlt.Call(hdcMem, 0, 0, uintptr(width), uintptr(height),
			hdcWindow, 0, 0, SRCCOPY)
	}

	// Get bitmap data
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	bmi := BITMAPINFO{
		BmiHeader: BITMAPINFOHEADER{
			BiSize:        uint32(unsafe.Sizeof(BITMAPINFOHEADER{})),
			BiWidth:       int32(width),
			BiHeight:      -int32(height), // Negative for top-down
			BiPlanes:      1,
			BiBitCount:    32,
			BiCompression: BI_RGB,
		},
	}

	procGetDIBits.Call(hdcMem, hBitmap, 0, uintptr(height),
		uintptr(unsafe.Pointer(&img.Pix[0])),
		uintptr(unsafe.Pointer(&bmi)), DIB_RGB_COLORS)

	// Convert BGRA to RGBA
	for i := 0; i < len(img.Pix); i += 4 {
		img.Pix[i], img.Pix[i+2] = img.Pix[i+2], img.Pix[i]
	}

	// Calculate thumbnail size maintaining aspect ratio
	thumbWidth := maxWidth
	thumbHeight := maxHeight
	aspectRatio := float64(width) / float64(height)

	if float64(thumbWidth)/float64(thumbHeight) > aspectRatio {
		thumbWidth = int(float64(thumbHeight) * aspectRatio)
	} else {
		thumbHeight = int(float64(thumbWidth) / aspectRatio)
	}

	if thumbWidth < 1 {
		thumbWidth = 1
	}
	if thumbHeight < 1 {
		thumbHeight = 1
	}

	// Scale image
	thumbnail := image.NewRGBA(image.Rect(0, 0, thumbWidth, thumbHeight))
	draw.CatmullRom.Scale(thumbnail, thumbnail.Bounds(), img, img.Bounds(), draw.Over, nil)

	// Encode to PNG
	var buf bytes.Buffer
	if err := png.Encode(&buf, thumbnail); err != nil {
		return ""
	}

	return base64.StdEncoding.EncodeToString(buf.Bytes())
}

// EnumWindowsWithThumbnails returns a list of all visible windows with thumbnails
func EnumWindowsWithThumbnails(thumbnailWidth, thumbnailHeight int) ([]WindowInfoWithThumbnail, error) {
	var windowList []WindowInfoWithThumbnail

	cb := syscall.NewCallback(func(hwnd syscall.Handle, lparam uintptr) uintptr {
		// Check if window is visible
		visible, _, _ := procIsWindowVisible.Call(uintptr(hwnd))
		if visible == 0 {
			return 1
		}

		// Get window style
		style, _, _ := procGetWindowLongW.Call(uintptr(hwnd), uintptr(GWL_STYLE&0xFFFFFFFF))
		if style&WS_CAPTION == 0 {
			return 1
		}

		// Get window title length
		titleLen, _, _ := procGetWindowTextLengthW.Call(uintptr(hwnd))
		if titleLen == 0 {
			return 1
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

		// Skip very small windows
		width := int(rect.Right - rect.Left)
		height := int(rect.Bottom - rect.Top)
		if width < 50 || height < 50 {
			return 1
		}

		// Capture thumbnail
		thumbnail := CaptureWindowThumbnail(uintptr(hwnd), thumbnailWidth, thumbnailHeight)

		windowList = append(windowList, WindowInfoWithThumbnail{
			Handle:    uintptr(hwnd),
			Title:     title,
			ClassName: className,
			X:         int(rect.Left),
			Y:         int(rect.Top),
			Width:     width,
			Height:    height,
			Thumbnail: thumbnail,
		})

		return 1
	})

	procEnumWindows.Call(cb, 0)

	return windowList, nil
}
