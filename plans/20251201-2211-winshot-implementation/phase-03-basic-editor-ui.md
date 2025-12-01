# Phase 03: Basic Editor UI

**Context:** [plan.md](./plan.md) | [Phase 02](./phase-02-screenshot-capture.md) | [Editor Research](../reports/251201-image-editor-features.md)
**Date:** 2025-12-01 | **Priority:** Critical | **Status:** Pending
**Estimated Time:** 4 hours

---

## Overview

Build React editor layout with react-konva canvas. Display captured screenshot, implement zoom/pan, create toolbar shell for annotation tools. Establish component architecture for subsequent phases.

---

## Key Insights

- react-konva uses declarative React patterns with automatic memory cleanup
- Layer-based rendering prevents full canvas repaints (performance)
- use-image hook handles async image loading
- Stage container determines canvas bounds; responsive sizing needed

---

## Requirements

### UI Layout
1. **Toolbar:** Top horizontal bar with tool icons
2. **Canvas:** Center area with Konva Stage
3. **Sidebar:** Right panel for tool options (color, size)
4. **Status Bar:** Bottom with zoom level, dimensions

### Core Interactions
- Display captured image on canvas
- Zoom via mouse wheel (10%-400%)
- Pan via middle-click drag or spacebar+drag
- Responsive canvas sizing

---

## Architecture

```
frontend/src/
├── App.tsx                 # Main layout container
├── components/
│   ├── Editor/
│   │   ├── Editor.tsx      # Editor container
│   │   ├── Canvas.tsx      # Konva Stage wrapper
│   │   └── Layers.tsx      # Layer management
│   ├── Toolbar/
│   │   ├── Toolbar.tsx     # Tool selection bar
│   │   └── ToolButton.tsx  # Individual tool button
│   ├── Sidebar/
│   │   └── Sidebar.tsx     # Tool options panel
│   └── StatusBar/
│       └── StatusBar.tsx   # Zoom, dimensions
├── hooks/
│   ├── useCanvas.ts        # Canvas state management
│   └── useImage.ts         # Image loading wrapper
├── types/
│   └── editor.ts           # TypeScript interfaces
└── stores/
    └── editorStore.ts      # Global editor state (optional)
```

---

## Related Code Files

- `frontend/src/components/Editor/Editor.tsx` - Main editor component
- `frontend/src/components/Editor/Canvas.tsx` - Konva canvas
- `frontend/src/hooks/useCanvas.ts` - Canvas state hook
- `frontend/src/types/editor.ts` - Type definitions

---

## Implementation Steps

### Step 1: Create Type Definitions (15 min)

**frontend/src/types/editor.ts:**
```typescript
export interface EditorState {
  imageData: string | null      // Base64 PNG
  zoom: number                  // 0.1 to 4.0
  pan: { x: number; y: number }
  tool: ToolType
  canvasSize: { width: number; height: number }
}

export type ToolType =
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'crop'

export interface ToolOptions {
  strokeColor: string
  fillColor: string
  strokeWidth: number
  fontSize: number
}

export interface CanvasObject {
  id: string
  type: ToolType
  x: number
  y: number
  props: Record<string, unknown>
}
```

### Step 2: Create Canvas Hook (30 min)

**frontend/src/hooks/useCanvas.ts:**
```typescript
import { useState, useCallback } from 'react'
import { EditorState, ToolType, CanvasObject } from '../types/editor'

const initialState: EditorState = {
  imageData: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  tool: 'select',
  canvasSize: { width: 800, height: 600 }
}

export function useCanvas() {
  const [state, setState] = useState<EditorState>(initialState)
  const [objects, setObjects] = useState<CanvasObject[]>([])

  const setImage = useCallback((base64: string, width: number, height: number) => {
    setState(prev => ({
      ...prev,
      imageData: `data:image/png;base64,${base64}`,
      canvasSize: { width, height }
    }))
  }, [])

  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(4, zoom))
    }))
  }, [])

  const setPan = useCallback((x: number, y: number) => {
    setState(prev => ({ ...prev, pan: { x, y } }))
  }, [])

  const setTool = useCallback((tool: ToolType) => {
    setState(prev => ({ ...prev, tool }))
  }, [])

  const addObject = useCallback((obj: CanvasObject) => {
    setObjects(prev => [...prev, obj])
  }, [])

  return {
    state,
    objects,
    setImage,
    setZoom,
    setPan,
    setTool,
    addObject,
    setObjects
  }
}
```

### Step 3: Create Canvas Component (45 min)

**frontend/src/components/Editor/Canvas.tsx:**
```typescript
import { useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import Konva from 'konva'
import { EditorState, CanvasObject } from '../../types/editor'

interface CanvasProps {
  state: EditorState
  objects: CanvasObject[]
  onZoom: (zoom: number) => void
  onPan: (x: number, y: number) => void
}

export function Canvas({ state, objects, onZoom, onPan }: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const [image] = useImage(state.imageData || '')

  // Handle wheel zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const scaleBy = 1.1
    const newZoom = e.evt.deltaY < 0
      ? state.zoom * scaleBy
      : state.zoom / scaleBy
    onZoom(newZoom)
  }

  // Handle pan (middle mouse or spacebar+drag)
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage()
    if (stage) {
      onPan(stage.x(), stage.y())
    }
  }

  return (
    <div className="flex-1 overflow-hidden bg-gray-100">
      <Stage
        ref={stageRef}
        width={state.canvasSize.width}
        height={state.canvasSize.height}
        scaleX={state.zoom}
        scaleY={state.zoom}
        x={state.pan.x}
        y={state.pan.y}
        draggable={state.tool === 'select'}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
      >
        {/* Base image layer */}
        <Layer>
          {image && <KonvaImage image={image} />}
        </Layer>

        {/* Annotations layer */}
        <Layer>
          {/* Render objects here (Phase 5) */}
        </Layer>
      </Stage>
    </div>
  )
}
```

### Step 4: Create Toolbar Component (30 min)

**frontend/src/components/Toolbar/Toolbar.tsx:**
```typescript
import { ToolType } from '../../types/editor'
import { ToolButton } from './ToolButton'

interface ToolbarProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
}

const tools: { type: ToolType; icon: string; label: string }[] = [
  { type: 'select', icon: 'cursor', label: 'Select' },
  { type: 'rectangle', icon: 'square', label: 'Rectangle' },
  { type: 'ellipse', icon: 'circle', label: 'Ellipse' },
  { type: 'arrow', icon: 'arrow-right', label: 'Arrow' },
  { type: 'line', icon: 'minus', label: 'Line' },
  { type: 'text', icon: 'type', label: 'Text' },
  { type: 'crop', icon: 'crop', label: 'Crop' },
]

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-gray-200">
      {tools.map(tool => (
        <ToolButton
          key={tool.type}
          icon={tool.icon}
          label={tool.label}
          active={activeTool === tool.type}
          onClick={() => onToolChange(tool.type)}
        />
      ))}
    </div>
  )
}
```

### Step 5: Create Editor Container (30 min)

**frontend/src/components/Editor/Editor.tsx:**
```typescript
import { useCanvas } from '../../hooks/useCanvas'
import { Canvas } from './Canvas'
import { Toolbar } from '../Toolbar/Toolbar'
import { Sidebar } from '../Sidebar/Sidebar'
import { StatusBar } from '../StatusBar/StatusBar'

interface EditorProps {
  initialImage?: { base64: string; width: number; height: number }
}

export function Editor({ initialImage }: EditorProps) {
  const {
    state,
    objects,
    setImage,
    setZoom,
    setPan,
    setTool
  } = useCanvas()

  // Load initial image if provided
  useEffect(() => {
    if (initialImage) {
      setImage(initialImage.base64, initialImage.width, initialImage.height)
    }
  }, [initialImage])

  return (
    <div className="flex flex-col h-screen">
      <Toolbar activeTool={state.tool} onToolChange={setTool} />

      <div className="flex flex-1 overflow-hidden">
        <Canvas
          state={state}
          objects={objects}
          onZoom={setZoom}
          onPan={setPan}
        />
        <Sidebar tool={state.tool} />
      </div>

      <StatusBar zoom={state.zoom} size={state.canvasSize} />
    </div>
  )
}
```

### Step 6: Update App.tsx (15 min)

**frontend/src/App.tsx:**
```typescript
import { useState, useEffect } from 'react'
import { Editor } from './components/Editor/Editor'
import { CaptureFullscreen } from '../wailsjs/go/main/App'

function App() {
  const [imageData, setImageData] = useState<{
    base64: string
    width: number
    height: number
  } | null>(null)

  const handleCapture = async () => {
    const result = await CaptureFullscreen(0)
    setImageData({
      base64: result.base64,
      width: result.width,
      height: result.height
    })
  }

  return (
    <div className="h-screen">
      {imageData ? (
        <Editor initialImage={imageData} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <button
            onClick={handleCapture}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Capture Screenshot
          </button>
        </div>
      )}
    </div>
  )
}

export default App
```

---

## Todo List

- [ ] Create type definitions (editor.ts)
- [ ] Implement useCanvas hook
- [ ] Create Canvas component with Konva Stage
- [ ] Implement wheel zoom (10%-400%)
- [ ] Implement pan with draggable stage
- [ ] Create Toolbar with tool buttons
- [ ] Create Sidebar shell (options panel)
- [ ] Create StatusBar with zoom/dimensions
- [ ] Create Editor container component
- [ ] Integrate with capture API
- [ ] Test responsive canvas sizing

---

## Success Criteria

1. Captured image displays in Konva canvas
2. Zoom works via mouse wheel (10%-400% range)
3. Pan works via drag when select tool active
4. Toolbar shows all tool options (inactive)
5. Status bar shows current zoom and image dimensions
6. Canvas resizes responsively with window

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Large image performance | Medium | Medium | Limit zoom range, use image caching |
| Canvas sizing issues | Low | Medium | Use container refs for dimensions |
| use-image loading delay | Low | Low | Show loading spinner |

---

## Next Steps

After completing this phase:
1. Proceed to [Phase 04: Background Effects](./phase-04-background-effects.md)
2. Add gradient backgrounds, padding, shadows
3. Implement rounded corners for screenshot
