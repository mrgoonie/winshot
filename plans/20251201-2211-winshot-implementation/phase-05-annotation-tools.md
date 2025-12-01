# Phase 05: Annotation Tools

**Context:** [plan.md](./plan.md) | [Phase 04](./phase-04-background-effects.md) | [Editor Research](../reports/251201-image-editor-features.md)
**Date:** 2025-12-01 | **Priority:** High | **Status:** Pending
**Estimated Time:** 6 hours

---

## Overview

Implement core annotation tools: rectangles, ellipses, arrows, and lines. Each shape supports add, modify (resize/move), and color customization. Uses react-konva Transformer for selection and manipulation.

---

## Key Insights

- Konva Transformer handles resize/rotate handles automatically
- Each shape needs unique ID for selection tracking
- Drag-to-draw pattern: mousedown->mousemove->mouseup
- Layer separation: image layer vs annotation layer (performance)

---

## Requirements

### Shape Tools
1. **Rectangle:** Stroke + optional fill, resizable
2. **Ellipse:** Stroke + optional fill, resizable
3. **Arrow:** Two-point line with arrowhead
4. **Line:** Simple two-point line

### Interactions
1. **Add:** Click-drag to create shape
2. **Select:** Click shape to select (shows Transformer)
3. **Move:** Drag selected shape
4. **Resize:** Drag Transformer handles
5. **Delete:** Press Delete/Backspace when selected

### Styling
1. **Stroke Color:** Color picker
2. **Stroke Width:** 1-10px slider
3. **Fill Color:** Optional, for rect/ellipse

---

## Architecture

```
frontend/src/
├── components/
│   ├── Editor/
│   │   └── AnnotationLayer.tsx    # Renders all shapes
│   ├── Shapes/
│   │   ├── Rectangle.tsx          # Rect shape component
│   │   ├── Ellipse.tsx            # Ellipse shape component
│   │   ├── Arrow.tsx              # Arrow shape component
│   │   ├── Line.tsx               # Line shape component
│   │   └── ShapeTransformer.tsx   # Selection handles
│   └── Sidebar/
│       └── ShapeStylePanel.tsx    # Color/stroke controls
├── hooks/
│   └── useShapeDrawing.ts         # Drawing state machine
└── types/
    └── shapes.ts                  # Shape type definitions
```

---

## Related Code Files

- `frontend/src/components/Editor/AnnotationLayer.tsx` - Shape rendering
- `frontend/src/components/Shapes/*.tsx` - Individual shape components
- `frontend/src/hooks/useShapeDrawing.ts` - Drawing logic
- `frontend/src/types/shapes.ts` - Type definitions

---

## Implementation Steps

### Step 1: Define Shape Types (20 min)

**frontend/src/types/shapes.ts:**
```typescript
export type ShapeType = 'rectangle' | 'ellipse' | 'arrow' | 'line'

export interface BaseShape {
  id: string
  type: ShapeType
  x: number
  y: number
  stroke: string
  strokeWidth: number
  draggable: boolean
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle'
  width: number
  height: number
  fill?: string
  cornerRadius?: number
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse'
  radiusX: number
  radiusY: number
  fill?: string
}

export interface ArrowShape extends BaseShape {
  type: 'arrow'
  points: number[]  // [x1, y1, x2, y2]
  pointerLength: number
  pointerWidth: number
}

export interface LineShape extends BaseShape {
  type: 'line'
  points: number[]  // [x1, y1, x2, y2]
}

export type Shape = RectangleShape | EllipseShape | ArrowShape | LineShape

export interface ShapeStyle {
  stroke: string
  strokeWidth: number
  fill: string
}

export const defaultStyle: ShapeStyle = {
  stroke: '#ff0000',
  strokeWidth: 3,
  fill: 'transparent'
}
```

### Step 2: Create Shape Drawing Hook (45 min)

**frontend/src/hooks/useShapeDrawing.ts:**
```typescript
import { useState, useCallback, useRef } from 'react'
import { KonvaEventObject } from 'konva/lib/Node'
import { Shape, ShapeType, ShapeStyle, defaultStyle } from '../types/shapes'
import { nanoid } from 'nanoid'

interface DrawingState {
  isDrawing: boolean
  startX: number
  startY: number
  currentShape: Shape | null
}

export function useShapeDrawing(
  activeTool: ShapeType | 'select',
  style: ShapeStyle = defaultStyle
) {
  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const drawingRef = useRef<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentShape: null
  })

  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'select') return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    setSelectedId(null)
    drawingRef.current = {
      isDrawing: true,
      startX: pos.x,
      startY: pos.y,
      currentShape: createShape(activeTool, pos.x, pos.y, style)
    }
  }, [activeTool, style])

  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!drawingRef.current.isDrawing || !drawingRef.current.currentShape) return

    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (!pos) return

    const { startX, startY, currentShape } = drawingRef.current
    const updated = updateShapeSize(currentShape, startX, startY, pos.x, pos.y)
    drawingRef.current.currentShape = updated

    // Force re-render with temp shape
    setShapes(prev => {
      const existing = prev.filter(s => s.id !== updated.id)
      return [...existing, updated]
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!drawingRef.current.isDrawing) return

    const shape = drawingRef.current.currentShape
    if (shape && isValidShape(shape)) {
      setShapes(prev => [...prev.filter(s => s.id !== shape.id), shape])
    }

    drawingRef.current = {
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentShape: null
    }
  }, [])

  const deleteSelected = useCallback(() => {
    if (selectedId) {
      setShapes(prev => prev.filter(s => s.id !== selectedId))
      setSelectedId(null)
    }
  }, [selectedId])

  const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
    setShapes(prev => prev.map(s =>
      s.id === id ? { ...s, ...updates } as Shape : s
    ))
  }, [])

  return {
    shapes,
    selectedId,
    setSelectedId,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteSelected,
    updateShape,
    setShapes
  }
}

// Helper: Create initial shape
function createShape(type: ShapeType, x: number, y: number, style: ShapeStyle): Shape {
  const base = {
    id: nanoid(),
    x,
    y,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    draggable: true
  }

  switch (type) {
    case 'rectangle':
      return { ...base, type, width: 0, height: 0, fill: style.fill }
    case 'ellipse':
      return { ...base, type, radiusX: 0, radiusY: 0, fill: style.fill }
    case 'arrow':
      return { ...base, type, points: [0, 0, 0, 0], pointerLength: 15, pointerWidth: 10 }
    case 'line':
      return { ...base, type, points: [0, 0, 0, 0] }
  }
}

// Helper: Update shape during drag
function updateShapeSize(shape: Shape, x1: number, y1: number, x2: number, y2: number): Shape {
  const width = x2 - x1
  const height = y2 - y1

  switch (shape.type) {
    case 'rectangle':
      return { ...shape, width: Math.abs(width), height: Math.abs(height), x: Math.min(x1, x2), y: Math.min(y1, y2) }
    case 'ellipse':
      return { ...shape, radiusX: Math.abs(width / 2), radiusY: Math.abs(height / 2), x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
    case 'arrow':
    case 'line':
      return { ...shape, points: [0, 0, width, height] }
  }
}

// Helper: Validate shape has size
function isValidShape(shape: Shape): boolean {
  switch (shape.type) {
    case 'rectangle':
      return shape.width > 5 && shape.height > 5
    case 'ellipse':
      return shape.radiusX > 3 && shape.radiusY > 3
    case 'arrow':
    case 'line':
      const [, , dx, dy] = shape.points
      return Math.abs(dx) > 5 || Math.abs(dy) > 5
  }
}
```

### Step 3: Create Shape Components (1 hour)

**frontend/src/components/Shapes/Rectangle.tsx:**
```typescript
import { Rect } from 'react-konva'
import { RectangleShape } from '../../types/shapes'

interface RectangleProps {
  shape: RectangleShape
  isSelected: boolean
  onSelect: () => void
  onChange: (updates: Partial<RectangleShape>) => void
}

export function Rectangle({ shape, isSelected, onSelect, onChange }: RectangleProps) {
  return (
    <Rect
      id={shape.id}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      fill={shape.fill}
      cornerRadius={shape.cornerRadius}
      draggable={shape.draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({ x: e.target.x(), y: e.target.y() })
      }}
      onTransformEnd={(e) => {
        const node = e.target
        onChange({
          x: node.x(),
          y: node.y(),
          width: node.width() * node.scaleX(),
          height: node.height() * node.scaleY()
        })
        node.scaleX(1)
        node.scaleY(1)
      }}
    />
  )
}
```

**Similar components for Ellipse.tsx, Arrow.tsx, Line.tsx**

### Step 4: Create Annotation Layer (30 min)

**frontend/src/components/Editor/AnnotationLayer.tsx:**
```typescript
import { Layer, Transformer } from 'react-konva'
import { useRef, useEffect } from 'react'
import Konva from 'konva'
import { Shape } from '../../types/shapes'
import { Rectangle } from '../Shapes/Rectangle'
import { Ellipse } from '../Shapes/Ellipse'
import { Arrow } from '../Shapes/Arrow'
import { Line } from '../Shapes/Line'

interface AnnotationLayerProps {
  shapes: Shape[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdate: (id: string, updates: Partial<Shape>) => void
}

export function AnnotationLayer({ shapes, selectedId, onSelect, onUpdate }: AnnotationLayerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)

  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return

    const selected = selectedId
      ? layerRef.current.findOne(`#${selectedId}`)
      : null

    if (selected) {
      transformerRef.current.nodes([selected])
    } else {
      transformerRef.current.nodes([])
    }
    transformerRef.current.getLayer()?.batchDraw()
  }, [selectedId])

  const renderShape = (shape: Shape) => {
    const common = {
      key: shape.id,
      isSelected: shape.id === selectedId,
      onSelect: () => onSelect(shape.id),
      onChange: (updates: Partial<Shape>) => onUpdate(shape.id, updates)
    }

    switch (shape.type) {
      case 'rectangle':
        return <Rectangle shape={shape} {...common} />
      case 'ellipse':
        return <Ellipse shape={shape} {...common} />
      case 'arrow':
        return <Arrow shape={shape} {...common} />
      case 'line':
        return <Line shape={shape} {...common} />
    }
  }

  return (
    <Layer ref={layerRef}>
      {shapes.map(renderShape)}
      <Transformer
        ref={transformerRef}
        boundBoxFunc={(oldBox, newBox) => {
          // Limit minimum size
          if (newBox.width < 10 || newBox.height < 10) return oldBox
          return newBox
        }}
      />
    </Layer>
  )
}
```

### Step 5: Create Shape Style Panel (30 min)

**frontend/src/components/Sidebar/ShapeStylePanel.tsx:**
```typescript
import { ShapeStyle } from '../../types/shapes'

interface ShapeStylePanelProps {
  style: ShapeStyle
  onChange: (style: ShapeStyle) => void
}

export function ShapeStylePanel({ style, onChange }: ShapeStylePanelProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-gray-700">Shape Style</h3>

      {/* Stroke Color */}
      <div>
        <label className="text-xs text-gray-600">Stroke Color</label>
        <input
          type="color"
          value={style.stroke}
          onChange={e => onChange({ ...style, stroke: e.target.value })}
          className="w-full h-8 cursor-pointer"
        />
      </div>

      {/* Stroke Width */}
      <div>
        <label className="text-xs text-gray-600">Stroke Width</label>
        <input
          type="range"
          min={1}
          max={10}
          value={style.strokeWidth}
          onChange={e => onChange({ ...style, strokeWidth: +e.target.value })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{style.strokeWidth}px</span>
      </div>

      {/* Fill Color */}
      <div>
        <label className="text-xs text-gray-600">Fill Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={style.fill !== 'transparent'}
            onChange={e => onChange({
              ...style,
              fill: e.target.checked ? '#ffffff' : 'transparent'
            })}
          />
          {style.fill !== 'transparent' && (
            <input
              type="color"
              value={style.fill}
              onChange={e => onChange({ ...style, fill: e.target.value })}
              className="w-full h-8 cursor-pointer"
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

### Step 6: Integrate with Canvas (30 min)

Update Canvas.tsx:
- Add mouse event handlers for drawing
- Render AnnotationLayer
- Handle keyboard delete

---

## Todo List

- [ ] Create shape type definitions
- [ ] Implement useShapeDrawing hook
- [ ] Create Rectangle component
- [ ] Create Ellipse component
- [ ] Create Arrow component
- [ ] Create Line component
- [ ] Create AnnotationLayer with Transformer
- [ ] Create ShapeStylePanel UI
- [ ] Integrate drawing handlers with Canvas
- [ ] Implement keyboard delete (Delete/Backspace)
- [ ] Test all shape tools
- [ ] Test selection and transformation

---

## Success Criteria

1. All 4 shapes can be drawn via drag
2. Shapes can be selected by clicking
3. Transformer handles appear on selection
4. Shapes can be moved via drag
5. Shapes can be resized via Transformer handles
6. Delete key removes selected shape
7. Color picker updates stroke color in real-time
8. Stroke width slider affects new shapes

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Transformer z-index issues | Low | Medium | Ensure Transformer renders last |
| Shape ID collisions | Low | Low | Use nanoid for guaranteed uniqueness |
| Arrow rotation weird behavior | Medium | Medium | Lock rotation for arrows |

---

## Next Steps

After completing this phase:
1. Proceed to [Phase 06: Text Tool](./phase-06-text-tool.md)
2. Implement text annotation with inline editing
3. Add font size, alignment, border options
