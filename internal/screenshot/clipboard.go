package screenshot

import (
	"bytes"
	"encoding/base64"
	"errors"
	"image"
	_ "image/gif"  // Register GIF decoder
	_ "image/jpeg" // Register JPEG decoder
	"image/png"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32Clip                     = windows.NewLazySystemDLL("user32.dll")
	procOpenClipboard              = user32Clip.NewProc("OpenClipboard")
	procCloseClipboard             = user32Clip.NewProc("CloseClipboard")
	procGetClipboardData           = user32Clip.NewProc("GetClipboardData")
	procIsClipboardFormatAvailable = user32Clip.NewProc("IsClipboardFormatAvailable")
	procRegisterClipboardFormat    = user32Clip.NewProc("RegisterClipboardFormatW")

	kernel32Clip     = windows.NewLazySystemDLL("kernel32.dll")
	procGlobalLock   = kernel32Clip.NewProc("GlobalLock")
	procGlobalUnlock = kernel32Clip.NewProc("GlobalUnlock")
	procGlobalSize   = kernel32Clip.NewProc("GlobalSize")

	shell32          = windows.NewLazySystemDLL("shell32.dll")
	procDragQueryFile = shell32.NewProc("DragQueryFileW")
)

const (
	CF_BITMAP        = 2
	CF_DIBV5         = 17
	CF_DIB           = 8
	CF_HDROP         = 15 // File list format (File Explorer copy)
	maxClipboardSize = 100 * 1024 * 1024 // 100MB max to prevent DoS
)

// Supported image extensions for file drop
var supportedImageExtensions = map[string]bool{
	".png":  true,
	".jpg":  true,
	".jpeg": true,
	".gif":  true,
	".bmp":  true,
	".webp": true,
}

// getPNGClipboardFormat registers and returns the PNG clipboard format ID.
// Windows uses RegisterClipboardFormat for custom formats like PNG.
func getPNGClipboardFormat() uintptr {
	pngName, _ := windows.UTF16PtrFromString("PNG")
	cfPNG, _, _ := procRegisterClipboardFormat.Call(uintptr(unsafe.Pointer(pngName)))
	return cfPNG
}

// readImageFromHDROP reads the first image file from a CF_HDROP clipboard handle.
// CF_HDROP is used when files are copied from File Explorer.
func readImageFromHDROP(hDrop uintptr) (*CaptureResult, error) {
	// Get number of files (pass 0xFFFFFFFF as index)
	count, _, _ := procDragQueryFile.Call(hDrop, 0xFFFFFFFF, 0, 0)
	if count == 0 {
		return nil, errors.New("no files in clipboard")
	}

	// Try each file until we find an image
	for i := uintptr(0); i < count; i++ {
		// Get required buffer size for filename
		size, _, _ := procDragQueryFile.Call(hDrop, i, 0, 0)
		if size == 0 {
			continue
		}

		// Allocate buffer and get filename (size+1 for null terminator)
		buf := make([]uint16, size+1)
		procDragQueryFile.Call(hDrop, i, uintptr(unsafe.Pointer(&buf[0])), size+1)

		// Convert to Go string
		filePath := windows.UTF16ToString(buf)
		if filePath == "" {
			continue
		}

		// Check if it's a supported image file
		ext := strings.ToLower(filepath.Ext(filePath))
		if !supportedImageExtensions[ext] {
			continue
		}

		// Read and decode the image file
		return readImageFile(filePath)
	}

	return nil, errors.New("no image files in clipboard")
}

// readImageFile reads an image file from disk and returns CaptureResult.
func readImageFile(filePath string) (*CaptureResult, error) {
	// Read file
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, errors.New("failed to read image file")
	}

	if len(data) > maxClipboardSize {
		return nil, errors.New("image file too large")
	}

	// Decode image (supports PNG, JPEG, GIF via registered decoders)
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, errors.New("failed to decode image file")
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Re-encode as PNG for consistent output
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}

	return &CaptureResult{
		Width:  width,
		Height: height,
		Data:   base64.StdEncoding.EncodeToString(buf.Bytes()),
	}, nil
}

// BITMAPINFOHEADER represents the Windows BITMAPINFOHEADER structure
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

// ErrNoImageInClipboard is returned when clipboard has no image
var ErrNoImageInClipboard = errors.New("no image in clipboard")

// readPNGFromClipboard reads PNG data from clipboard handle and returns CaptureResult.
// PNG format contains raw PNG file bytes, which we decode and re-encode to ensure valid output.
func readPNGFromClipboard(hData uintptr) (*CaptureResult, error) {
	// Lock global memory to get pointer to data
	ptr, _, _ := procGlobalLock.Call(hData)
	if ptr == 0 {
		return nil, errors.New("failed to lock clipboard data")
	}
	defer procGlobalUnlock.Call(hData)

	// Get size of clipboard data
	size, _, _ := procGlobalSize.Call(hData)
	if size == 0 {
		return nil, errors.New("failed to get clipboard data size")
	}
	if size > maxClipboardSize {
		return nil, errors.New("clipboard image too large")
	}

	// Copy PNG data from clipboard memory
	pngData := make([]byte, size)
	for i := uintptr(0); i < size; i++ {
		pngData[i] = *(*byte)(unsafe.Pointer(ptr + i))
	}

	// Decode PNG to get dimensions and validate data
	img, err := png.Decode(bytes.NewReader(pngData))
	if err != nil {
		return nil, errors.New("invalid PNG data in clipboard")
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Re-encode to ensure consistent PNG output
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}

	return &CaptureResult{
		Width:  width,
		Height: height,
		Data:   base64.StdEncoding.EncodeToString(buf.Bytes()),
	}, nil
}

// GetClipboardImage reads image from Windows clipboard
func GetClipboardImage() (*CaptureResult, error) {
	// CRITICAL: Lock OS thread because Windows clipboard API requires
	// OpenClipboard and CloseClipboard to be called on the same thread.
	// Go's goroutine scheduler can switch threads between calls otherwise.
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	// Get PNG clipboard format (registered format used by Chrome, Firefox, etc.)
	// Must get this ONCE and reuse - each call returns the same ID
	cfPNG := getPNGClipboardFormat()

	// Open clipboard FIRST, then check formats
	// This ensures consistent format detection
	ret, _, _ := procOpenClipboard.Call(0)
	if ret == 0 {
		return nil, errors.New("failed to open clipboard")
	}
	defer procCloseClipboard.Call()

	// Check formats in priority order: PNG (modern) → DIBV5 (transparency) → DIB (legacy) → HDROP (files)
	var selectedFormat uintptr
	formats := []uintptr{cfPNG, CF_DIBV5, CF_DIB, CF_HDROP}
	for _, format := range formats {
		if format == 0 {
			continue // Skip invalid formats (e.g., if PNG registration failed)
		}
		available, _, _ := procIsClipboardFormatAvailable.Call(format)
		if available != 0 {
			selectedFormat = format
			break
		}
	}
	if selectedFormat == 0 {
		return nil, ErrNoImageInClipboard
	}

	// Handle CF_HDROP (file list from File Explorer)
	if selectedFormat == CF_HDROP {
		hDrop, _, _ := procGetClipboardData.Call(CF_HDROP)
		if hDrop == 0 {
			return nil, ErrNoImageInClipboard
		}
		return readImageFromHDROP(hDrop)
	}

	// Get clipboard data handle for selected format
	hData, _, _ := procGetClipboardData.Call(selectedFormat)
	if hData == 0 {
		return nil, ErrNoImageInClipboard
	}

	// Handle PNG format (raw PNG bytes from modern apps)
	if selectedFormat == cfPNG {
		return readPNGFromClipboard(hData)
	}

	// Lock global memory to get pointer to data
	ptr, _, _ := procGlobalLock.Call(hData)
	if ptr == 0 {
		return nil, errors.New("failed to lock clipboard data")
	}
	// IMPORTANT: Must unlock before clipboard closes to prevent clipboard corruption
	defer procGlobalUnlock.Call(hData)

	// Get size of clipboard data
	size, _, _ := procGlobalSize.Call(hData)
	if size == 0 {
		return nil, errors.New("failed to get clipboard data size")
	}

	// Check size limit to prevent DoS
	if size > maxClipboardSize {
		return nil, errors.New("clipboard image too large")
	}

	// Parse BITMAPINFOHEADER
	header := (*BITMAPINFOHEADER)(unsafe.Pointer(ptr))

	width := int(header.BiWidth)
	height := int(header.BiHeight)
	bitCount := int(header.BiBitCount)

	// Height can be negative (top-down DIB) or positive (bottom-up DIB)
	bottomUp := height > 0
	if height < 0 {
		height = -height
	}

	if width <= 0 || height <= 0 {
		return nil, errors.New("invalid image dimensions in clipboard")
	}

	// Calculate pixel data offset (header + color table if applicable)
	pixelOffset := uintptr(header.BiSize)
	if bitCount <= 8 {
		// For 8-bit or less, there's a color table
		colorTableSize := uintptr(1 << bitCount * 4) // RGBQUAD entries
		if header.BiClrUsed > 0 {
			colorTableSize = uintptr(header.BiClrUsed * 4)
		}
		pixelOffset += colorTableSize
	}

	// Get pixel data pointer
	pixelPtr := ptr + pixelOffset

	// Create RGBA image
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// Calculate row stride (must be aligned to 4 bytes)
	rowSize := ((width*bitCount + 31) / 32) * 4

	// Validate pixel data bounds to prevent buffer overflow
	expectedSize := uintptr(rowSize * height)
	dataSize := size - pixelOffset
	if dataSize < expectedSize {
		return nil, errors.New("invalid clipboard data: pixel data smaller than expected")
	}

	// Convert DIB to RGBA
	switch bitCount {
	case 24:
		// 24-bit BGR
		for y := 0; y < height; y++ {
			srcY := y
			if bottomUp {
				srcY = height - 1 - y
			}
			rowPtr := pixelPtr + uintptr(srcY*rowSize)
			for x := 0; x < width; x++ {
				pixelAddr := rowPtr + uintptr(x*3)
				b := *(*byte)(unsafe.Pointer(pixelAddr))
				g := *(*byte)(unsafe.Pointer(pixelAddr + 1))
				r := *(*byte)(unsafe.Pointer(pixelAddr + 2))
				img.Pix[(y*width+x)*4+0] = r
				img.Pix[(y*width+x)*4+1] = g
				img.Pix[(y*width+x)*4+2] = b
				img.Pix[(y*width+x)*4+3] = 255
			}
		}
	case 32:
		// 32-bit BGRA
		for y := 0; y < height; y++ {
			srcY := y
			if bottomUp {
				srcY = height - 1 - y
			}
			rowPtr := pixelPtr + uintptr(srcY*rowSize)
			for x := 0; x < width; x++ {
				pixelAddr := rowPtr + uintptr(x*4)
				b := *(*byte)(unsafe.Pointer(pixelAddr))
				g := *(*byte)(unsafe.Pointer(pixelAddr + 1))
				r := *(*byte)(unsafe.Pointer(pixelAddr + 2))
				a := *(*byte)(unsafe.Pointer(pixelAddr + 3))
				// Some apps set alpha to 0 for opaque pixels, handle this
				if a == 0 {
					a = 255
				}
				img.Pix[(y*width+x)*4+0] = r
				img.Pix[(y*width+x)*4+1] = g
				img.Pix[(y*width+x)*4+2] = b
				img.Pix[(y*width+x)*4+3] = a
			}
		}
	default:
		return nil, errors.New("unsupported bit depth: only 24-bit and 32-bit images are supported")
	}

	// Encode to PNG and return as CaptureResult
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}

	return &CaptureResult{
		Width:  width,
		Height: height,
		Data:   base64.StdEncoding.EncodeToString(buf.Bytes()),
	}, nil
}
