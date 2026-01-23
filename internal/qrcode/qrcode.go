package qrcode

import (
	"bytes"
	"image"
	_ "image/jpeg"
	_ "image/png"

	"github.com/liyue201/goqr"
)

// DecodeQR decodes a QR code from image bytes (PNG or JPEG)
func DecodeQR(imageData []byte) (string, error) {
	img, _, err := image.Decode(bytes.NewReader(imageData))
	if err != nil {
		return "", err
	}

	qrCodes, err := goqr.Recognize(img)
	if err != nil {
		return "", err
	}

	if len(qrCodes) == 0 {
		return "", nil // No QR code found
	}

	// return the first QR code found
	return string(qrCodes[0].Payload), nil
}
