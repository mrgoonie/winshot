package library

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/image/draw"
)

// GenerateThumbnail creates a base64 PNG thumbnail from an image file
// Returns: thumbnail base64 string, original width, original height, error
func GenerateThumbnail(imagePath string, maxWidth, maxHeight int) (string, int, int, error) {
	file, err := os.Open(imagePath)
	if err != nil {
		return "", 0, 0, err
	}
	defer file.Close()

	// Decode based on extension
	var img image.Image
	ext := strings.ToLower(filepath.Ext(imagePath))

	switch ext {
	case ".png":
		img, err = png.Decode(file)
	case ".jpg", ".jpeg":
		img, err = jpeg.Decode(file)
	default:
		// Try generic decode for other formats
		img, _, err = image.Decode(file)
	}

	if err != nil {
		return "", 0, 0, err
	}

	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	// Calculate thumbnail dimensions maintaining aspect ratio
	thumbWidth, thumbHeight := calculateThumbnailSize(origWidth, origHeight, maxWidth, maxHeight)

	// Create thumbnail using high-quality CatmullRom scaling
	thumb := image.NewRGBA(image.Rect(0, 0, thumbWidth, thumbHeight))
	draw.CatmullRom.Scale(thumb, thumb.Bounds(), img, bounds, draw.Over, nil)

	// Encode as PNG (smaller than JPEG for small images with solid colors)
	var buf bytes.Buffer
	if err := png.Encode(&buf, thumb); err != nil {
		return "", 0, 0, err
	}

	return base64.StdEncoding.EncodeToString(buf.Bytes()), origWidth, origHeight, nil
}

// calculateThumbnailSize maintains aspect ratio within max bounds
func calculateThumbnailSize(origW, origH, maxW, maxH int) (int, int) {
	// If image is smaller than max, return original size
	if origW <= maxW && origH <= maxH {
		return origW, origH
	}

	// Calculate scale ratios
	ratioW := float64(maxW) / float64(origW)
	ratioH := float64(maxH) / float64(origH)

	// Use smaller ratio to fit within bounds
	ratio := ratioW
	if ratioH < ratioW {
		ratio = ratioH
	}

	newW := int(float64(origW) * ratio)
	newH := int(float64(origH) * ratio)

	// Ensure minimum size of 1 pixel
	if newW < 1 {
		newW = 1
	}
	if newH < 1 {
		newH = 1
	}

	return newW, newH
}
