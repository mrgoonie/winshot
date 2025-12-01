# Phase 07: Crop Tool & Aspect Ratio

**Context:** [plan.md](./plan.md) | [Phase 06](./phase-06-text-tool.md)
**Date:** 2025-12-01 | **Priority:** Medium | **Status:** Pending
**Estimated Time:** 3 hours

---

## Overview

Implement crop tool with aspect ratio presets for social media and standard formats. Crop respects padding settings (crops within padded area). Visual crop overlay with dimmed regions outside selection.

---

## Key Insights

- Crop operates on final composite (background + image + annotations)
- Aspect ratio lock: constrain drag to maintain ratio
- Dimmed overlay: semi-transparent rect covering non-crop area
- Apply crop = re-render canvas at cropped bounds

---

## Requirements

### Crop Features
1. **Free Crop:** Drag to select any region
2. **Aspect Ratio Presets:** 16:9, 4:3, 1:1, 9:16, custom
3. **Resize Crop Region:** Drag corners/edges
4. **Move Crop Region:** Drag center
5. **Apply/Cancel:** Confirm or discard crop

### Aspect Ratio Presets
| Preset | Ratio | Use Case |
|--------|-------|----------|
| Free | None | Custom crop |
| 16:9 | 1.78 | YouTube, presentations |
| 4:3 | 1.33 | Photos, slides |
| 1:1 | 1.00 | Instagram, Twitter |
| 9:16 | 0.56 | Mobile, stories |
| 3:2 | 1.50 | Standard photos |

### Padding Awareness
- Crop region bounded by image area (inside padding)
- Background padding preserved after crop

---

## Architecture

```
frontend/src/
├── components/
│   ├── Editor/
│   │   └── CropOverlay.tsx        # Crop selection UI
│   └── Sidebar/
│       └── CropPanel.tsx          # Ratio presets, apply/cancel
├── hooks/
│   └── useCrop.ts                 # Crop state management
└── types/
    └── crop.ts                    # Crop type definitions
```

---

## Related Code Files

- `frontend/src/components/Editor/CropOverlay.tsx` - Visual crop overlay
- `frontend/src/components/Sidebar/CropPanel.tsx` - Crop controls
- `frontend/src/hooks/useCrop.ts` - Crop state hook
- `frontend/src/types/crop.ts` - Type definitions

---

## Implementation Steps

### Step 1: Define Crop Types (10 min)

**frontend/src/types/crop.ts:**
```typescript
export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface AspectRatioPreset {
  id: string
  name: string
  ratio: number | null  // null = free crop
}

export const aspectRatioPresets: AspectRatioPreset[] = [
  { id: 'free', name: 'Free', ratio: null },
  { id: '16:9', name: '16:9', ratio: 16 / 9 },
  { id: '4:3', name: '4:3', ratio: 4 / 3 },
  { id: '1:1', name: '1:1', ratio: 1 },
  { id: '9:16', name: '9:16', ratio: 9 / 16 },
  { id: '3:2', name: '3:2', ratio: 3 / 2 },
]

export interface CropState {
  isActive: boolean
  region: CropRegion
  aspectRatio: number | null
  bounds: CropRegion  // Max crop area (image bounds)
}
```

### Step 2: Create Crop Hook (30 min)

**frontend/src/hooks/useCrop.ts:**
```typescript
import { useState, useCallback } from 'react'
import { CropRegion, CropState } from '../types/crop'

export function useCrop(imageBounds: CropRegion) {
  const [state, setState] = useState<CropState>({
    isActive: false,
    region: { ...imageBounds },
    aspectRatio: null,
    bounds: imageBounds
  })

  const startCrop = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      region: { ...prev.bounds }  // Start with full image
    }))
  }, [])

  const cancelCrop = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      region: { ...prev.bounds }
    }))
  }, [])

  const setAspectRatio = useCallback((ratio: number | null) => {
    setState(prev => {
      const newState = { ...prev, aspectRatio: ratio }
      if (ratio) {
        // Adjust region to match ratio
        newState.region = constrainToRatio(prev.region, ratio, prev.bounds)
      }
      return newState
    })
  }, [])

  const updateRegion = useCallback((region: Partial<CropRegion>) => {
    setState(prev => {
      let newRegion = { ...prev.region, ...region }

      // Constrain to bounds
      newRegion = constrainToBounds(newRegion, prev.bounds)

      // Apply aspect ratio if set
      if (prev.aspectRatio) {
        newRegion = constrainToRatio(newRegion, prev.aspectRatio, prev.bounds)
      }

      return { ...prev, region: newRegion }
    })
  }, [])

  return {
    state,
    startCrop,
    cancelCrop,
    setAspectRatio,
    updateRegion
  }
}

// Helper: Constrain region to bounds
function constrainToBounds(region: CropRegion, bounds: CropRegion): CropRegion {
  return {
    x: Math.max(bounds.x, Math.min(region.x, bounds.x + bounds.width - region.width)),
    y: Math.max(bounds.y, Math.min(region.y, bounds.y + bounds.height - region.height)),
    width: Math.min(region.width, bounds.width),
    height: Math.min(region.height, bounds.height)
  }
}

// Helper: Adjust region to match aspect ratio
function constrainToRatio(region: CropRegion, ratio: number, bounds: CropRegion): CropRegion {
  const currentRatio = region.width / region.height

  if (currentRatio > ratio) {
    // Too wide, reduce width
    const newWidth = region.height * ratio
    return { ...region, width: Math.min(newWidth, bounds.width) }
  } else {
    // Too tall, reduce height
    const newHeight = region.width / ratio
    return { ...region, height: Math.min(newHeight, bounds.height) }
  }
}
```

### Step 3: Create Crop Overlay Component (1 hour)

**frontend/src/components/Editor/CropOverlay.tsx:**
```typescript
import { Group, Rect, Line } from 'react-konva'
import { CropRegion } from '../../types/crop'

interface CropOverlayProps {
  region: CropRegion
  canvasSize: { width: number; height: number }
  onRegionChange: (region: Partial<CropRegion>) => void
}

export function CropOverlay({ region, canvasSize, onRegionChange }: CropOverlayProps) {
  const handleSize = 10
  const { x, y, width, height } = region

  // Dimmed overlay regions (outside crop)
  const dimColor = 'rgba(0, 0, 0, 0.5)'

  return (
    <Group>
      {/* Top dim */}
      <Rect x={0} y={0} width={canvasSize.width} height={y} fill={dimColor} />

      {/* Bottom dim */}
      <Rect
        x={0}
        y={y + height}
        width={canvasSize.width}
        height={canvasSize.height - y - height}
        fill={dimColor}
      />

      {/* Left dim */}
      <Rect x={0} y={y} width={x} height={height} fill={dimColor} />

      {/* Right dim */}
      <Rect
        x={x + width}
        y={y}
        width={canvasSize.width - x - width}
        height={height}
        fill={dimColor}
      />

      {/* Crop border */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke="#ffffff"
        strokeWidth={2}
        dash={[5, 5]}
      />

      {/* Rule of thirds grid */}
      <Line points={[x + width / 3, y, x + width / 3, y + height]} stroke="rgba(255,255,255,0.5)" />
      <Line points={[x + width * 2 / 3, y, x + width * 2 / 3, y + height]} stroke="rgba(255,255,255,0.5)" />
      <Line points={[x, y + height / 3, x + width, y + height / 3]} stroke="rgba(255,255,255,0.5)" />
      <Line points={[x, y + height * 2 / 3, x + width, y + height * 2 / 3]} stroke="rgba(255,255,255,0.5)" />

      {/* Drag handles (corners) */}
      {renderHandle(x, y, 'nw', onRegionChange, region)}
      {renderHandle(x + width, y, 'ne', onRegionChange, region)}
      {renderHandle(x, y + height, 'sw', onRegionChange, region)}
      {renderHandle(x + width, y + height, 'se', onRegionChange, region)}

      {/* Center drag area */}
      <Rect
        x={x + handleSize}
        y={y + handleSize}
        width={width - handleSize * 2}
        height={height - handleSize * 2}
        draggable
        onDragMove={(e) => {
          onRegionChange({
            x: e.target.x() - handleSize,
            y: e.target.y() - handleSize
          })
        }}
      />
    </Group>
  )
}

function renderHandle(
  x: number,
  y: number,
  position: 'nw' | 'ne' | 'sw' | 'se',
  onRegionChange: (region: Partial<CropRegion>) => void,
  region: CropRegion
) {
  const size = 12

  return (
    <Rect
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      fill="#ffffff"
      stroke="#3b82f6"
      strokeWidth={2}
      draggable
      onDragMove={(e) => {
        const newX = e.target.x() + size / 2
        const newY = e.target.y() + size / 2

        // Calculate new region based on which handle
        switch (position) {
          case 'nw':
            onRegionChange({
              x: newX,
              y: newY,
              width: region.x + region.width - newX,
              height: region.y + region.height - newY
            })
            break
          case 'ne':
            onRegionChange({
              y: newY,
              width: newX - region.x,
              height: region.y + region.height - newY
            })
            break
          case 'sw':
            onRegionChange({
              x: newX,
              width: region.x + region.width - newX,
              height: newY - region.y
            })
            break
          case 'se':
            onRegionChange({
              width: newX - region.x,
              height: newY - region.y
            })
            break
        }
      }}
    />
  )
}
```

### Step 4: Create Crop Panel UI (30 min)

**frontend/src/components/Sidebar/CropPanel.tsx:**
```typescript
import { aspectRatioPresets } from '../../types/crop'

interface CropPanelProps {
  selectedRatio: string
  onRatioChange: (ratioId: string) => void
  onApply: () => void
  onCancel: () => void
}

export function CropPanel({ selectedRatio, onRatioChange, onApply, onCancel }: CropPanelProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-gray-700">Crop</h3>

      {/* Aspect Ratio Presets */}
      <div className="grid grid-cols-3 gap-2">
        {aspectRatioPresets.map(preset => (
          <button
            key={preset.id}
            onClick={() => onRatioChange(preset.id)}
            className={`py-2 text-xs rounded ${
              selectedRatio === preset.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <hr className="border-gray-200" />

      {/* Apply/Cancel */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          className="flex-1 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
```

### Step 5: Implement Crop Application (30 min)

Add to Editor/Canvas:
```typescript
const applyCrop = async () => {
  if (!stageRef.current) return

  // Get crop region
  const { x, y, width, height } = cropState.region

  // Export cropped region as image
  const croppedDataUrl = stageRef.current.toDataURL({
    x,
    y,
    width,
    height,
    pixelRatio: 2  // High quality
  })

  // Update image state with cropped image
  // OR create new stage with cropped dimensions
}
```

### Step 6: Integrate with Editor (30 min)

- Show CropOverlay when crop tool active
- Show CropPanel in sidebar when cropping
- Handle apply/cancel actions
- Reset crop state after apply

---

## Todo List

- [ ] Create crop type definitions
- [ ] Implement useCrop hook
- [ ] Create CropOverlay with dim regions
- [ ] Implement rule-of-thirds grid
- [ ] Create corner drag handles
- [ ] Implement aspect ratio constraints
- [ ] Create CropPanel UI
- [ ] Implement crop application (export region)
- [ ] Integrate with canvas and sidebar
- [ ] Test all aspect ratio presets
- [ ] Test crop region drag and resize

---

## Success Criteria

1. Crop tool activates with dimmed overlay
2. All aspect ratio presets work correctly
3. Crop region can be dragged to move
4. Corner handles resize crop region
5. Rule of thirds grid displays
6. Apply button crops image to selection
7. Cancel button exits crop mode
8. Cropped image maintains quality

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Crop region outside bounds | Medium | Medium | Constrain to image bounds |
| Aspect ratio math errors | Low | Medium | Test each preset thoroughly |
| Export quality loss | Medium | Low | Use pixelRatio: 2 for export |

---

## Next Steps

After completing this phase:
1. Proceed to [Phase 08: Export & Save](./phase-08-export-save.md)
2. Implement save to file and clipboard copy
3. Add export quality options
