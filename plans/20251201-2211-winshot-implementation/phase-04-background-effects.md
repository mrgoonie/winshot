# Phase 04: Background Effects

**Context:** [plan.md](./plan.md) | [Phase 03](./phase-03-basic-editor-ui.md) | [Similar Apps Research](../research-similar-apps.md)
**Date:** 2025-12-01 | **Priority:** High | **Status:** Pending
**Estimated Time:** 3 hours

---

## Overview

Implement background beautification inspired by CleanShot X. Features: gradient gallery, custom image backgrounds, adjustable padding, rounded corners, and drop shadow effects. All effects render in real-time on Konva canvas.

---

## Key Insights

- Konva Group with clipping creates rounded corners on images
- Gradients via Konva Rect with fillLinearGradient properties
- Drop shadow via Konva shadowColor/shadowBlur/shadowOffset
- Padding = offset image position from canvas edge + background fill

---

## Requirements

### Background Types
1. **Solid Color:** Single color fill with color picker
2. **Gradient:** Preset gallery (8-12 gradients) + custom creation
3. **Custom Image:** User-uploaded background image

### Effects
1. **Padding:** 0-200px adjustable (all sides)
2. **Rounded Corners:** 0-50px radius
3. **Drop Shadow:** blur, color, x/y offset

---

## Architecture

```
frontend/src/
├── components/
│   ├── Sidebar/
│   │   ├── BackgroundPanel.tsx    # Background type selection
│   │   ├── GradientGallery.tsx    # Preset gradients
│   │   ├── PaddingControl.tsx     # Padding sliders
│   │   └── ShadowControl.tsx      # Shadow settings
│   └── Editor/
│       └── BackgroundLayer.tsx    # Konva background rendering
├── data/
│   └── gradients.ts               # Preset gradient definitions
└── types/
    └── background.ts              # Background type definitions
```

---

## Related Code Files

- `frontend/src/components/Sidebar/BackgroundPanel.tsx` - Main background controls
- `frontend/src/components/Editor/BackgroundLayer.tsx` - Canvas rendering
- `frontend/src/data/gradients.ts` - Gradient presets
- `frontend/src/types/background.ts` - Type definitions

---

## Implementation Steps

### Step 1: Define Background Types (15 min)

**frontend/src/types/background.ts:**
```typescript
export type BackgroundType = 'solid' | 'gradient' | 'image'

export interface GradientStop {
  offset: number  // 0 to 1
  color: string
}

export interface GradientDef {
  id: string
  name: string
  type: 'linear' | 'radial'
  angle: number       // degrees for linear
  stops: GradientStop[]
}

export interface BackgroundSettings {
  type: BackgroundType
  solidColor: string
  gradient: GradientDef | null
  imageUrl: string | null
  padding: number           // px, all sides
  cornerRadius: number      // px
  shadow: {
    enabled: boolean
    color: string
    blur: number
    offsetX: number
    offsetY: number
  }
}

export const defaultBackground: BackgroundSettings = {
  type: 'gradient',
  solidColor: '#ffffff',
  gradient: null,
  imageUrl: null,
  padding: 40,
  cornerRadius: 12,
  shadow: {
    enabled: true,
    color: 'rgba(0,0,0,0.3)',
    blur: 20,
    offsetX: 0,
    offsetY: 10
  }
}
```

### Step 2: Create Gradient Presets (20 min)

**frontend/src/data/gradients.ts:**
```typescript
import { GradientDef } from '../types/background'

export const gradientPresets: GradientDef[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    type: 'linear',
    angle: 135,
    stops: [
      { offset: 0, color: '#667eea' },
      { offset: 1, color: '#764ba2' }
    ]
  },
  {
    id: 'sunset',
    name: 'Sunset',
    type: 'linear',
    angle: 45,
    stops: [
      { offset: 0, color: '#fa709a' },
      { offset: 1, color: '#fee140' }
    ]
  },
  {
    id: 'forest',
    name: 'Forest',
    type: 'linear',
    angle: 90,
    stops: [
      { offset: 0, color: '#134e5e' },
      { offset: 1, color: '#71b280' }
    ]
  },
  {
    id: 'midnight',
    name: 'Midnight',
    type: 'linear',
    angle: 180,
    stops: [
      { offset: 0, color: '#232526' },
      { offset: 1, color: '#414345' }
    ]
  },
  {
    id: 'peach',
    name: 'Peach',
    type: 'linear',
    angle: 90,
    stops: [
      { offset: 0, color: '#ffecd2' },
      { offset: 1, color: '#fcb69f' }
    ]
  },
  {
    id: 'sky',
    name: 'Sky',
    type: 'linear',
    angle: 180,
    stops: [
      { offset: 0, color: '#a1c4fd' },
      { offset: 1, color: '#c2e9fb' }
    ]
  },
  {
    id: 'lavender',
    name: 'Lavender',
    type: 'linear',
    angle: 135,
    stops: [
      { offset: 0, color: '#e0c3fc' },
      { offset: 1, color: '#8ec5fc' }
    ]
  },
  {
    id: 'clean',
    name: 'Clean White',
    type: 'linear',
    angle: 180,
    stops: [
      { offset: 0, color: '#ffffff' },
      { offset: 1, color: '#f5f5f5' }
    ]
  }
]
```

### Step 3: Create Background Layer Component (45 min)

**frontend/src/components/Editor/BackgroundLayer.tsx:**
```typescript
import { Rect, Group, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { BackgroundSettings } from '../../types/background'

interface BackgroundLayerProps {
  settings: BackgroundSettings
  canvasWidth: number
  canvasHeight: number
  imageWidth: number
  imageHeight: number
  children: React.ReactNode  // The screenshot image
}

export function BackgroundLayer({
  settings,
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
  children
}: BackgroundLayerProps) {
  const [bgImage] = useImage(settings.imageUrl || '')
  const { padding, cornerRadius, shadow } = settings

  // Calculate image position (centered with padding)
  const imageX = padding
  const imageY = padding
  const totalWidth = imageWidth + padding * 2
  const totalHeight = imageHeight + padding * 2

  // Gradient angle to coordinates
  const getGradientCoords = (angle: number, w: number, h: number) => {
    const rad = (angle * Math.PI) / 180
    const x1 = w / 2 - Math.cos(rad) * w / 2
    const y1 = h / 2 - Math.sin(rad) * h / 2
    const x2 = w / 2 + Math.cos(rad) * w / 2
    const y2 = h / 2 + Math.sin(rad) * h / 2
    return { x1, y1, x2, y2 }
  }

  const renderBackground = () => {
    if (settings.type === 'solid') {
      return <Rect width={totalWidth} height={totalHeight} fill={settings.solidColor} />
    }

    if (settings.type === 'gradient' && settings.gradient) {
      const { x1, y1, x2, y2 } = getGradientCoords(
        settings.gradient.angle,
        totalWidth,
        totalHeight
      )
      const colorStops = settings.gradient.stops.flatMap(s => [s.offset, s.color])

      return (
        <Rect
          width={totalWidth}
          height={totalHeight}
          fillLinearGradientStartPoint={{ x: x1, y: y1 }}
          fillLinearGradientEndPoint={{ x: x2, y: y2 }}
          fillLinearGradientColorStops={colorStops}
        />
      )
    }

    if (settings.type === 'image' && bgImage) {
      return <KonvaImage image={bgImage} width={totalWidth} height={totalHeight} />
    }

    return <Rect width={totalWidth} height={totalHeight} fill="#f5f5f5" />
  }

  return (
    <Group>
      {/* Background */}
      {renderBackground()}

      {/* Screenshot with rounded corners and shadow */}
      <Group
        x={imageX}
        y={imageY}
        shadowColor={shadow.enabled ? shadow.color : 'transparent'}
        shadowBlur={shadow.enabled ? shadow.blur : 0}
        shadowOffsetX={shadow.enabled ? shadow.offsetX : 0}
        shadowOffsetY={shadow.enabled ? shadow.offsetY : 0}
        clipFunc={(ctx) => {
          ctx.beginPath()
          ctx.roundRect(0, 0, imageWidth, imageHeight, cornerRadius)
          ctx.closePath()
        }}
      >
        {children}
      </Group>
    </Group>
  )
}
```

### Step 4: Create Background Panel UI (45 min)

**frontend/src/components/Sidebar/BackgroundPanel.tsx:**
```typescript
import { BackgroundSettings, BackgroundType } from '../../types/background'
import { gradientPresets } from '../../data/gradients'
import { GradientGallery } from './GradientGallery'
import { PaddingControl } from './PaddingControl'
import { ShadowControl } from './ShadowControl'

interface BackgroundPanelProps {
  settings: BackgroundSettings
  onChange: (settings: BackgroundSettings) => void
}

export function BackgroundPanel({ settings, onChange }: BackgroundPanelProps) {
  const updateType = (type: BackgroundType) => {
    onChange({ ...settings, type })
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-gray-700">Background</h3>

      {/* Type Selection */}
      <div className="flex gap-2">
        {(['solid', 'gradient', 'image'] as BackgroundType[]).map(type => (
          <button
            key={type}
            onClick={() => updateType(type)}
            className={`px-3 py-1.5 text-xs rounded ${
              settings.type === type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Solid Color Picker */}
      {settings.type === 'solid' && (
        <input
          type="color"
          value={settings.solidColor}
          onChange={e => onChange({ ...settings, solidColor: e.target.value })}
          className="w-full h-10 cursor-pointer"
        />
      )}

      {/* Gradient Gallery */}
      {settings.type === 'gradient' && (
        <GradientGallery
          selected={settings.gradient?.id}
          onSelect={gradient => onChange({ ...settings, gradient })}
        />
      )}

      {/* Image Upload */}
      {settings.type === 'image' && (
        <input
          type="file"
          accept="image/*"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) {
              const url = URL.createObjectURL(file)
              onChange({ ...settings, imageUrl: url })
            }
          }}
          className="text-sm"
        />
      )}

      <hr className="border-gray-200" />

      {/* Padding */}
      <PaddingControl
        value={settings.padding}
        onChange={padding => onChange({ ...settings, padding })}
      />

      {/* Corner Radius */}
      <div>
        <label className="text-xs text-gray-600">Corner Radius</label>
        <input
          type="range"
          min={0}
          max={50}
          value={settings.cornerRadius}
          onChange={e => onChange({ ...settings, cornerRadius: +e.target.value })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{settings.cornerRadius}px</span>
      </div>

      <hr className="border-gray-200" />

      {/* Shadow */}
      <ShadowControl
        shadow={settings.shadow}
        onChange={shadow => onChange({ ...settings, shadow })}
      />
    </div>
  )
}
```

### Step 5: Create Supporting Components (30 min)

**GradientGallery.tsx, PaddingControl.tsx, ShadowControl.tsx:**
- GradientGallery: Grid of preset gradient swatches
- PaddingControl: Single slider for padding (0-200px)
- ShadowControl: Toggle + blur/offset/color controls

### Step 6: Integrate with Canvas (15 min)

Update Canvas.tsx to wrap image with BackgroundLayer component.

---

## Todo List

- [ ] Create background type definitions
- [ ] Create gradient presets (8 gradients)
- [ ] Implement BackgroundLayer component
- [ ] Implement gradient rendering with angle
- [ ] Implement rounded corners via clipFunc
- [ ] Implement drop shadow with Konva props
- [ ] Create BackgroundPanel UI
- [ ] Create GradientGallery component
- [ ] Create PaddingControl slider
- [ ] Create ShadowControl panel
- [ ] Integrate BackgroundLayer with Canvas
- [ ] Test all background types

---

## Success Criteria

1. Solid color backgrounds render correctly
2. All 8 gradient presets display and apply
3. Custom image backgrounds load and tile/fit
4. Padding adjustment (0-200px) works in real-time
5. Corner radius (0-50px) clips image properly
6. Drop shadow renders with configurable blur/offset

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| clipFunc browser support | Medium | Low | Polyfill roundRect for older WebView2 |
| Large background images | Low | Medium | Resize/compress on upload |
| Shadow performance | Low | Low | Disable shadow during pan/zoom |

---

## Next Steps

After completing this phase:
1. Proceed to [Phase 05: Annotation Tools](./phase-05-annotation-tools.md)
2. Implement shape drawing (rectangles, ellipses, arrows, lines)
3. Add color picker and stroke width controls
