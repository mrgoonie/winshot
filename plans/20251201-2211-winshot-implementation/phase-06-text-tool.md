# Phase 06: Text Tool

**Context:** [plan.md](./plan.md) | [Phase 05](./phase-05-annotation-tools.md)
**Date:** 2025-12-01 | **Priority:** High | **Status:** Pending
**Estimated Time:** 3 hours

---

## Overview

Implement text annotation tool with inline editing, font customization, and styling options. Users click to place text, double-click to edit, and configure color, size, alignment, and optional border/background.

---

## Key Insights

- Konva Text supports most styling but no inline editing
- Solution: Overlay HTML textarea for editing, sync to Konva Text
- Text bounding box changes with content; recalculate on edit
- Font loading: use web-safe fonts initially (Arial, Georgia, etc.)

---

## Requirements

### Text Features
1. **Add:** Click to place text at cursor position
2. **Edit:** Double-click to enter edit mode (HTML textarea overlay)
3. **Move:** Drag text when not editing
4. **Delete:** Delete key removes selected text

### Text Styling
1. **Font Size:** 12-72px slider
2. **Font Family:** Web-safe fonts dropdown
3. **Text Color:** Color picker
4. **Text Alignment:** Left, center, right
5. **Background:** Optional fill color
6. **Border:** Optional stroke around text box

---

## Architecture

```
frontend/src/
├── components/
│   ├── Shapes/
│   │   └── TextAnnotation.tsx    # Konva Text + editing logic
│   ├── Editor/
│   │   └── TextEditOverlay.tsx   # HTML textarea for inline edit
│   └── Sidebar/
│       └── TextStylePanel.tsx    # Font/color/alignment controls
├── hooks/
│   └── useTextEditing.ts         # Text edit state management
└── types/
    └── shapes.ts                 # Add TextShape type
```

---

## Related Code Files

- `frontend/src/components/Shapes/TextAnnotation.tsx` - Text rendering
- `frontend/src/components/Editor/TextEditOverlay.tsx` - Edit overlay
- `frontend/src/components/Sidebar/TextStylePanel.tsx` - Style controls
- `frontend/src/hooks/useTextEditing.ts` - Edit state

---

## Implementation Steps

### Step 1: Extend Shape Types (10 min)

**frontend/src/types/shapes.ts (add):**
```typescript
export interface TextShape extends BaseShape {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  fill: string           // Text color
  align: 'left' | 'center' | 'right'
  width: number          // Text box width (auto or fixed)
  padding: number
  background?: string    // Optional background fill
  stroke?: string        // Optional border
  strokeWidth?: number
}

export const defaultTextStyle: Partial<TextShape> = {
  fontSize: 18,
  fontFamily: 'Arial',
  fill: '#000000',
  align: 'left',
  padding: 8,
  width: 200
}
```

### Step 2: Create Text Annotation Component (45 min)

**frontend/src/components/Shapes/TextAnnotation.tsx:**
```typescript
import { Group, Text, Rect } from 'react-konva'
import { TextShape } from '../../types/shapes'

interface TextAnnotationProps {
  shape: TextShape
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onChange: (updates: Partial<TextShape>) => void
  onStartEdit: () => void
}

export function TextAnnotation({
  shape,
  isSelected,
  isEditing,
  onSelect,
  onChange,
  onStartEdit
}: TextAnnotationProps) {
  const handleDblClick = () => {
    onStartEdit()
  }

  // Calculate text dimensions
  const textWidth = shape.width || 200
  const estimatedHeight = Math.ceil(shape.text.length / 20) * shape.fontSize * 1.2

  return (
    <Group
      x={shape.x}
      y={shape.y}
      draggable={!isEditing}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragEnd={(e) => {
        onChange({ x: e.target.x(), y: e.target.y() })
      }}
    >
      {/* Background rect (optional) */}
      {shape.background && (
        <Rect
          width={textWidth + shape.padding * 2}
          height={estimatedHeight + shape.padding * 2}
          fill={shape.background}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth || 0}
          cornerRadius={4}
        />
      )}

      {/* Text element */}
      <Text
        text={shape.text}
        fontSize={shape.fontSize}
        fontFamily={shape.fontFamily}
        fill={shape.fill}
        align={shape.align}
        width={textWidth}
        padding={shape.padding}
        visible={!isEditing}  // Hide when editing
      />
    </Group>
  )
}
```

### Step 3: Create Text Edit Overlay (45 min)

**frontend/src/components/Editor/TextEditOverlay.tsx:**
```typescript
import { useEffect, useRef } from 'react'
import { TextShape } from '../../types/shapes'

interface TextEditOverlayProps {
  shape: TextShape
  stagePosition: { x: number; y: number }
  zoom: number
  onSave: (text: string) => void
  onCancel: () => void
}

export function TextEditOverlay({
  shape,
  stagePosition,
  zoom,
  onSave,
  onCancel
}: TextEditOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSave(textareaRef.current?.value || '')
    }
  }

  const handleBlur = () => {
    onSave(textareaRef.current?.value || '')
  }

  // Calculate position relative to canvas
  const left = stagePosition.x + shape.x * zoom
  const top = stagePosition.y + shape.y * zoom

  return (
    <textarea
      ref={textareaRef}
      defaultValue={shape.text}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${(shape.width || 200) * zoom}px`,
        minHeight: `${shape.fontSize * zoom * 2}px`,
        fontSize: `${shape.fontSize * zoom}px`,
        fontFamily: shape.fontFamily,
        color: shape.fill,
        textAlign: shape.align,
        padding: `${shape.padding * zoom}px`,
        border: '2px solid #3b82f6',
        borderRadius: '4px',
        background: shape.background || 'white',
        resize: 'both',
        overflow: 'hidden',
        outline: 'none',
        zIndex: 100
      }}
    />
  )
}
```

### Step 4: Create Text Style Panel (30 min)

**frontend/src/components/Sidebar/TextStylePanel.tsx:**
```typescript
import { TextShape } from '../../types/shapes'

const fontFamilies = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana']

interface TextStylePanelProps {
  style: Partial<TextShape>
  onChange: (style: Partial<TextShape>) => void
}

export function TextStylePanel({ style, onChange }: TextStylePanelProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-gray-700">Text Style</h3>

      {/* Font Family */}
      <div>
        <label className="text-xs text-gray-600">Font</label>
        <select
          value={style.fontFamily}
          onChange={e => onChange({ ...style, fontFamily: e.target.value })}
          className="w-full p-2 border rounded text-sm"
        >
          {fontFamilies.map(font => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div>
        <label className="text-xs text-gray-600">Size</label>
        <input
          type="range"
          min={12}
          max={72}
          value={style.fontSize}
          onChange={e => onChange({ ...style, fontSize: +e.target.value })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{style.fontSize}px</span>
      </div>

      {/* Text Color */}
      <div>
        <label className="text-xs text-gray-600">Color</label>
        <input
          type="color"
          value={style.fill}
          onChange={e => onChange({ ...style, fill: e.target.value })}
          className="w-full h-8 cursor-pointer"
        />
      </div>

      {/* Alignment */}
      <div>
        <label className="text-xs text-gray-600">Alignment</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(align => (
            <button
              key={align}
              onClick={() => onChange({ ...style, align })}
              className={`flex-1 py-1.5 text-xs rounded ${
                style.align === align ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Background Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!style.background}
          onChange={e => onChange({
            ...style,
            background: e.target.checked ? '#ffffff' : undefined
          })}
        />
        <label className="text-xs text-gray-600">Background</label>
        {style.background && (
          <input
            type="color"
            value={style.background}
            onChange={e => onChange({ ...style, background: e.target.value })}
            className="w-8 h-6 cursor-pointer"
          />
        )}
      </div>

      {/* Border Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!style.stroke}
          onChange={e => onChange({
            ...style,
            stroke: e.target.checked ? '#000000' : undefined,
            strokeWidth: e.target.checked ? 1 : 0
          })}
        />
        <label className="text-xs text-gray-600">Border</label>
        {style.stroke && (
          <input
            type="color"
            value={style.stroke}
            onChange={e => onChange({ ...style, stroke: e.target.value })}
            className="w-8 h-6 cursor-pointer"
          />
        )}
      </div>
    </div>
  )
}
```

### Step 5: Create Text Editing Hook (30 min)

**frontend/src/hooks/useTextEditing.ts:**
```typescript
import { useState, useCallback } from 'react'
import { TextShape } from '../types/shapes'
import { nanoid } from 'nanoid'

export function useTextEditing(defaultStyle: Partial<TextShape>) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const createText = useCallback((x: number, y: number): TextShape => ({
    id: nanoid(),
    type: 'text',
    x,
    y,
    text: 'Double-click to edit',
    fontSize: defaultStyle.fontSize || 18,
    fontFamily: defaultStyle.fontFamily || 'Arial',
    fill: defaultStyle.fill || '#000000',
    align: defaultStyle.align || 'left',
    width: defaultStyle.width || 200,
    padding: defaultStyle.padding || 8,
    background: defaultStyle.background,
    stroke: defaultStyle.stroke,
    strokeWidth: defaultStyle.strokeWidth,
    draggable: true
  }), [defaultStyle])

  const startEditing = useCallback((id: string) => {
    setEditingId(id)
  }, [])

  const stopEditing = useCallback(() => {
    setEditingId(null)
  }, [])

  return {
    editingId,
    createText,
    startEditing,
    stopEditing
  }
}
```

### Step 6: Integrate with Editor (30 min)

- Update AnnotationLayer to render TextAnnotation
- Add TextEditOverlay to Editor when editingId is set
- Handle click-to-place when text tool is active
- Connect TextStylePanel in Sidebar

---

## Todo List

- [ ] Extend shape types with TextShape
- [ ] Create TextAnnotation component
- [ ] Create TextEditOverlay for inline editing
- [ ] Create TextStylePanel UI
- [ ] Create useTextEditing hook
- [ ] Integrate text tool with canvas click handler
- [ ] Handle text placement on click
- [ ] Handle double-click to edit
- [ ] Sync textarea position with zoom/pan
- [ ] Test text creation and editing
- [ ] Test all style options

---

## Success Criteria

1. Click on canvas places new text annotation
2. Double-click opens inline edit textarea
3. Enter saves text, Escape cancels
4. Text can be dragged when not editing
5. Font family dropdown works
6. Font size slider updates text
7. Color picker changes text color
8. Alignment buttons work (left/center/right)
9. Background toggle adds fill behind text
10. Border toggle adds stroke around text box

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Textarea position drift on zoom | Medium | Medium | Recalculate position from stage transform |
| Font loading issues | Low | Low | Use web-safe fonts only |
| Text wrapping complexity | Medium | Medium | Use fixed-width text box initially |

---

## Next Steps

After completing this phase:
1. Proceed to [Phase 07: Crop & Ratio](./phase-07-crop-ratio.md)
2. Implement crop tool with aspect ratio presets
3. Handle padding-aware cropping
