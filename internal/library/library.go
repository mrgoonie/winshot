// Package library provides screenshot history scanning and management
package library

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// LibraryImage represents a screenshot in the library
type LibraryImage struct {
	Filepath     string `json:"filepath"`
	Filename     string `json:"filename"`
	ModifiedDate string `json:"modifiedDate"`
	Thumbnail    string `json:"thumbnail"` // Base64 encoded PNG
	Width        int    `json:"width"`
	Height       int    `json:"height"`
}

// ScanOptions configures the folder scan behavior
type ScanOptions struct {
	ThumbnailWidth  int // Max thumbnail width (default: 160)
	ThumbnailHeight int // Max thumbnail height (default: 120)
	MaxFiles        int // Max files to scan (0 = unlimited, default: 500)
}

// DefaultScanOptions returns sensible defaults for scanning
func DefaultScanOptions() ScanOptions {
	return ScanOptions{
		ThumbnailWidth:  160,
		ThumbnailHeight: 120,
		MaxFiles:        500,
	}
}

// supportedExtensions defines which image formats are supported
var supportedExtensions = map[string]bool{
	".png":  true,
	".jpg":  true,
	".jpeg": true,
}

// ScanFolder scans a directory for image files and returns a list of LibraryImage
// sorted by modified date (newest first). Creates folder if it doesn't exist.
func ScanFolder(folderPath string, opts ScanOptions) ([]LibraryImage, error) {
	if folderPath == "" {
		return nil, fmt.Errorf("folder path is empty")
	}

	// Auto-create folder if not exists (per design decision)
	info, err := os.Stat(folderPath)
	if os.IsNotExist(err) {
		if err := os.MkdirAll(folderPath, 0755); err != nil {
			return nil, fmt.Errorf("failed to create folder: %w", err)
		}
		return []LibraryImage{}, nil // Empty list for newly created folder
	}
	if err != nil {
		return nil, fmt.Errorf("failed to stat folder: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("path is not a directory: %s", folderPath)
	}

	// Read directory entries
	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var images []LibraryImage

	for _, entry := range entries {
		// Skip directories
		if entry.IsDir() {
			continue
		}

		// Check file extension
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if !supportedExtensions[ext] {
			continue
		}

		fullPath := filepath.Join(folderPath, entry.Name())

		// Get file info for modified date
		fileInfo, err := entry.Info()
		if err != nil {
			continue // Skip files we can't stat
		}

		// Generate thumbnail
		thumb, width, height, err := GenerateThumbnail(fullPath, opts.ThumbnailWidth, opts.ThumbnailHeight)
		if err != nil {
			continue // Skip files we can't read/decode
		}

		images = append(images, LibraryImage{
			Filepath:     fullPath,
			Filename:     entry.Name(),
			ModifiedDate: fileInfo.ModTime().Format(time.RFC3339),
			Thumbnail:    thumb,
			Width:        width,
			Height:       height,
		})

		// Respect MaxFiles limit
		if opts.MaxFiles > 0 && len(images) >= opts.MaxFiles {
			break
		}
	}

	// Sort by modified date descending (newest first)
	sort.Slice(images, func(i, j int) bool {
		ti, _ := time.Parse(time.RFC3339, images[i].ModifiedDate)
		tj, _ := time.Parse(time.RFC3339, images[j].ModifiedDate)
		return ti.After(tj)
	})

	return images, nil
}

// DeleteImage removes an image file from disk
// Returns error if file doesn't exist or can't be deleted
func DeleteImage(filepath string) error {
	if filepath == "" {
		return fmt.Errorf("filepath is empty")
	}
	return os.Remove(filepath)
}
