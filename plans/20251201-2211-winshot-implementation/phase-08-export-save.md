# Phase 08: Export & Save

**Context:** [plan.md](./plan.md) | [Phase 07](./phase-07-crop-ratio.md) | [Editor Research](../reports/251201-image-editor-features.md)
**Date:** 2025-12-01 | **Priority:** High | **Status:** Pending
**Estimated Time:** 2 hours

---

## Overview

Implement export functionality: save to file (PNG/JPEG) and copy to clipboard. Go backend handles file save dialog and clipboard operations. Frontend renders final canvas for export.

---

## Key Insights

- Konva Stage.toDataURL() exports canvas as base64
- Clipboard API (navigator.clipboard) requires HTTPS or localhost
- Wails runtime.SaveFileDialog() for native file picker
- PNG for transparency, JPEG for smaller file size

---

## Requirements

### Export Options
1. **Save to File:** PNG or JPEG with quality setting
2. **Copy to Clipboard:** PNG format (clipboard standard)
3. **Quick Save:** Save to last used directory without dialog

### File Formats
| Format | Use Case | Quality |
|--------|----------|---------|
| PNG | Transparency, lossless | N/A |
| JPEG | Smaller file, no transparency | 0.7-1.0 |

### Export Settings
- Output format: PNG / JPEG
- JPEG quality: 70-100%
- Scale: 1x / 2x (retina)

---

## Architecture

```
Go Backend                      React Frontend
+-------------------------+     +---------------------------+
| SaveFile(data, path)    | <-- | Export button click       |
| CopyToClipboard(data)   |     | Stage.toDataURL()         |
| GetSaveDirectory()      |     | ExportPanel controls      |
+-------------------------+     +---------------------------+

frontend/src/
├── components/
│   └── Sidebar/
│       └── ExportPanel.tsx     # Export format, quality UI
├── hooks/
│   └── useExport.ts            # Export logic
└── types/
    └── export.ts               # Export options types
```

---

## Related Code Files

- `app.go` - Go export methods (SaveFile, CopyToClipboard)
- `frontend/src/components/Sidebar/ExportPanel.tsx` - Export UI
- `frontend/src/hooks/useExport.ts` - Export logic
- `frontend/wailsjs/go/main/App.ts` - Generated bindings

---

## Implementation Steps

### Step 1: Define Export Types (10 min)

**frontend/src/types/export.ts:**
```typescript
export type ExportFormat = 'png' | 'jpeg'

export interface ExportOptions {
  format: ExportFormat
  quality: number      // 0.7-1.0 for JPEG
  scale: number        // 1 or 2 (retina)
}

export const defaultExportOptions: ExportOptions = {
  format: 'png',
  quality: 0.9,
  scale: 1
}
```

### Step 2: Implement Go Save Methods (30 min)

**app.go (add methods):**
```go
package main

import (
    "context"
    "encoding/base64"
    "os"
    "path/filepath"

    "github.com/wailsapp/wails/v2/pkg/runtime"
    "golang.org/x/sys/windows"
)

// SaveFile saves base64 image data to file via save dialog
func (a *App) SaveFile(base64Data string, defaultName string) (string, error) {
    // Open save dialog
    path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
        DefaultFilename: defaultName,
        Title:          "Save Screenshot",
        Filters: []runtime.FileFilter{
            {DisplayName: "PNG Image", Pattern: "*.png"},
            {DisplayName: "JPEG Image", Pattern: "*.jpg;*.jpeg"},
        },
    })
    if err != nil {
        return "", err
    }
    if path == "" {
        return "", nil // User cancelled
    }

    // Decode base64 and write to file
    data, err := base64.StdEncoding.DecodeString(base64Data)
    if err != nil {
        return "", err
    }

    if err := os.WriteFile(path, data, 0644); err != nil {
        return "", err
    }

    return path, nil
}

// QuickSave saves to specified path without dialog
func (a *App) QuickSave(base64Data string, path string) error {
    data, err := base64.StdEncoding.DecodeString(base64Data)
    if err != nil {
        return err
    }
    return os.WriteFile(path, data, 0644)
}

// CopyToClipboard copies image to Windows clipboard
func (a *App) CopyToClipboard(base64Data string) error {
    data, err := base64.StdEncoding.DecodeString(base64Data)
    if err != nil {
        return err
    }

    // Use Windows clipboard API via golang.org/x/sys/windows
    // This requires creating a DIB (Device Independent Bitmap)
    return copyImageToClipboard(data)
}

// GetDefaultSaveDir returns Pictures folder path
func (a *App) GetDefaultSaveDir() string {
    home, _ := os.UserHomeDir()
    return filepath.Join(home, "Pictures", "WinShot")
}
```

### Step 3: Implement Clipboard Helper (30 min)

**internal/clipboard/clipboard.go:**
```go
package clipboard

import (
    "bytes"
    "image"
    "image/png"
    "syscall"
    "unsafe"

    "golang.org/x/sys/windows"
)

var (
    user32           = windows.NewLazySystemDLL("user32.dll")
    kernel32         = windows.NewLazySystemDLL("kernel32.dll")
    procOpenClipboard   = user32.NewProc("OpenClipboard")
    procCloseClipboard  = user32.NewProc("CloseClipboard")
    procEmptyClipboard  = user32.NewProc("EmptyClipboard")
    procSetClipboardData = user32.NewProc("SetClipboardData")
    procGlobalAlloc     = kernel32.NewProc("GlobalAlloc")
    procGlobalLock      = kernel32.NewProc("GlobalLock")
    procGlobalUnlock    = kernel32.NewProc("GlobalUnlock")
)

const (
    CF_DIB       = 8
    GMEM_MOVEABLE = 0x0002
)

func CopyImage(pngData []byte) error {
    // Decode PNG
    img, err := png.Decode(bytes.NewReader(pngData))
    if err != nil {
        return err
    }

    // Convert to DIB format
    dibData := imageToDIB(img)

    // Open clipboard
    procOpenClipboard.Call(0)
    defer procCloseClipboard.Call()

    procEmptyClipboard.Call()

    // Allocate global memory
    hMem, _, _ := procGlobalAlloc.Call(GMEM_MOVEABLE, uintptr(len(dibData)))
    pMem, _, _ := procGlobalLock.Call(hMem)

    // Copy DIB data
    copy((*[1 << 30]byte)(unsafe.Pointer(pMem))[:len(dibData)], dibData)
    procGlobalUnlock.Call(hMem)

    // Set clipboard data
    procSetClipboardData.Call(CF_DIB, hMem)

    return nil
}

func imageToDIB(img image.Image) []byte {
    // Convert image.Image to DIB byte array
    // ... implementation details
    return nil
}
```

### Step 4: Create Export Hook (20 min)

**frontend/src/hooks/useExport.ts:**
```typescript
import { useCallback, useState } from 'react'
import Konva from 'konva'
import { SaveFile, CopyToClipboard, QuickSave } from '../../wailsjs/go/main/App'
import { ExportOptions, defaultExportOptions } from '../types/export'

export function useExport(stageRef: React.RefObject<Konva.Stage>) {
  const [options, setOptions] = useState<ExportOptions>(defaultExportOptions)
  const [lastSavePath, setLastSavePath] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const getExportData = useCallback((): string => {
    if (!stageRef.current) return ''

    const mimeType = options.format === 'png' ? 'image/png' : 'image/jpeg'
    const dataUrl = stageRef.current.toDataURL({
      mimeType,
      quality: options.quality,
      pixelRatio: options.scale
    })

    // Strip data URL prefix, return only base64
    return dataUrl.replace(/^data:image\/\w+;base64,/, '')
  }, [stageRef, options])

  const saveToFile = useCallback(async () => {
    setIsExporting(true)
    try {
      const data = getExportData()
      const ext = options.format === 'png' ? '.png' : '.jpg'
      const defaultName = `screenshot_${Date.now()}${ext}`

      const path = await SaveFile(data, defaultName)
      if (path) {
        setLastSavePath(path)
      }
      return path
    } finally {
      setIsExporting(false)
    }
  }, [getExportData, options])

  const quickSave = useCallback(async () => {
    if (!lastSavePath) {
      return saveToFile()
    }

    setIsExporting(true)
    try {
      const data = getExportData()
      const dir = lastSavePath.substring(0, lastSavePath.lastIndexOf('\\'))
      const ext = options.format === 'png' ? '.png' : '.jpg'
      const newPath = `${dir}\\screenshot_${Date.now()}${ext}`

      await QuickSave(data, newPath)
      setLastSavePath(newPath)
      return newPath
    } finally {
      setIsExporting(false)
    }
  }, [getExportData, lastSavePath, options, saveToFile])

  const copyToClipboard = useCallback(async () => {
    setIsExporting(true)
    try {
      // Always export as PNG for clipboard
      const dataUrl = stageRef.current?.toDataURL({
        mimeType: 'image/png',
        pixelRatio: options.scale
      })
      if (!dataUrl) return

      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      await CopyToClipboard(base64)
    } finally {
      setIsExporting(false)
    }
  }, [stageRef, options])

  return {
    options,
    setOptions,
    isExporting,
    saveToFile,
    quickSave,
    copyToClipboard
  }
}
```

### Step 5: Create Export Panel UI (30 min)

**frontend/src/components/Sidebar/ExportPanel.tsx:**
```typescript
import { ExportOptions, ExportFormat } from '../../types/export'

interface ExportPanelProps {
  options: ExportOptions
  onChange: (options: ExportOptions) => void
  onSave: () => void
  onQuickSave: () => void
  onCopy: () => void
  isExporting: boolean
}

export function ExportPanel({
  options,
  onChange,
  onSave,
  onQuickSave,
  onCopy,
  isExporting
}: ExportPanelProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-gray-700">Export</h3>

      {/* Format Selection */}
      <div>
        <label className="text-xs text-gray-600">Format</label>
        <div className="flex gap-2 mt-1">
          {(['png', 'jpeg'] as ExportFormat[]).map(format => (
            <button
              key={format}
              onClick={() => onChange({ ...options, format })}
              className={`flex-1 py-1.5 text-xs rounded uppercase ${
                options.format === format
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      {/* Quality (JPEG only) */}
      {options.format === 'jpeg' && (
        <div>
          <label className="text-xs text-gray-600">Quality</label>
          <input
            type="range"
            min={70}
            max={100}
            value={options.quality * 100}
            onChange={e => onChange({ ...options, quality: +e.target.value / 100 })}
            className="w-full"
          />
          <span className="text-xs text-gray-500">{Math.round(options.quality * 100)}%</span>
        </div>
      )}

      {/* Scale */}
      <div>
        <label className="text-xs text-gray-600">Scale</label>
        <div className="flex gap-2 mt-1">
          {[1, 2].map(scale => (
            <button
              key={scale}
              onClick={() => onChange({ ...options, scale })}
              className={`flex-1 py-1.5 text-xs rounded ${
                options.scale === scale
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {scale}x
            </button>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={onSave}
          disabled={isExporting}
          className="w-full py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Save As...
        </button>

        <button
          onClick={onQuickSave}
          disabled={isExporting}
          className="w-full py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          Quick Save (Ctrl+S)
        </button>

        <button
          onClick={onCopy}
          disabled={isExporting}
          className="w-full py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          Copy to Clipboard (Ctrl+C)
        </button>
      </div>
    </div>
  )
}
```

### Step 6: Add Keyboard Shortcuts (15 min)

```typescript
// In Editor.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      quickSave()
    }
    if (e.ctrlKey && e.key === 'c' && !selectedId) {
      e.preventDefault()
      copyToClipboard()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [quickSave, copyToClipboard, selectedId])
```

---

## Todo List

- [ ] Create export type definitions
- [ ] Implement Go SaveFile with native dialog
- [ ] Implement Go QuickSave without dialog
- [ ] Implement Go CopyToClipboard with Windows API
- [ ] Create useExport hook
- [ ] Create ExportPanel UI
- [ ] Add keyboard shortcuts (Ctrl+S, Ctrl+C)
- [ ] Test PNG export
- [ ] Test JPEG export with quality
- [ ] Test clipboard copy
- [ ] Test 2x scale export

---

## Success Criteria

1. Save As opens native file dialog
2. PNG files save with transparency
3. JPEG files save with configurable quality
4. Quick Save uses last directory
5. Ctrl+S triggers quick save
6. Clipboard copy works (paste in other apps)
7. Ctrl+C copies to clipboard
8. 2x scale produces double resolution

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Clipboard DIB format issues | Medium | Medium | Test on multiple Windows versions |
| Large file export slow | Low | Low | Show progress indicator |
| JPEG transparency loss | Low | Low | Warn user when format changes |

---

## Next Steps

After completing this phase:
1. Proceed to [Phase 09: System Integration](./phase-09-system-integration.md)
2. Implement global hotkeys
3. Add system tray icon and menu
