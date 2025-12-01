package screenshot

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/png"

	"github.com/kbinani/screenshot"
)

// CaptureResult holds the screenshot data
type CaptureResult struct {
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Data   string `json:"data"` // Base64 encoded PNG
}

// CaptureFullscreen captures the entire primary display
func CaptureFullscreen() (*CaptureResult, error) {
	bounds := screenshot.GetDisplayBounds(0)
	img, err := screenshot.CaptureRect(bounds)
	if err != nil {
		return nil, err
	}
	return encodeImage(img)
}

// CaptureRegion captures a specific region of the screen
func CaptureRegion(x, y, width, height int) (*CaptureResult, error) {
	img, err := screenshot.Capture(x, y, width, height)
	if err != nil {
		return nil, err
	}
	return encodeImage(img)
}

// CaptureDisplay captures a specific display by index
func CaptureDisplay(displayIndex int) (*CaptureResult, error) {
	bounds := screenshot.GetDisplayBounds(displayIndex)
	img, err := screenshot.CaptureRect(bounds)
	if err != nil {
		return nil, err
	}
	return encodeImage(img)
}

// GetDisplayCount returns the number of active displays
func GetDisplayCount() int {
	return screenshot.NumActiveDisplays()
}

// GetDisplayBounds returns the bounds of a display
func GetDisplayBounds(displayIndex int) image.Rectangle {
	return screenshot.GetDisplayBounds(displayIndex)
}

// encodeImage converts an image to base64 PNG
func encodeImage(img *image.RGBA) (*CaptureResult, error) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}

	return &CaptureResult{
		Width:  img.Bounds().Dx(),
		Height: img.Bounds().Dy(),
		Data:   base64.StdEncoding.EncodeToString(buf.Bytes()),
	}, nil
}
