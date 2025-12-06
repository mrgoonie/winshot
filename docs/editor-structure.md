# WinShot Editor Structure Analysis

**Date:** 2025-12-06 | **Last Updated:** 2025-12-06T22:40 | **Purpose:** Debug crop tool issues

---

## Table of Contents
1. [Coordinate Systems](#coordinate-systems)
2. [Konva Layer Structure](#konva-layer-structure)
3. [Component Hierarchy](#component-hierarchy)
4. [State Management](#state-management)
5. [Event Flow](#event-flow)
6. [Crop Tool Workflow](#crop-tool-workflow)
7. [Known Issues](#known-issues)
8. [Resolved Issues](#resolved-issues)

---

## Coordinate Systems

### Three Coordinate Spaces

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SCREEN/PIXEL COORDINATES                                     │
│    - Raw mouse position from browser events                     │
│    - stage.getPointerPosition() returns these                   │
│    - Affected by: window position, scroll, DPI                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Transform: (pos - stage.position) / scale
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. CANVAS COORDINATES (Unscaled)                                │
│    - The "true" canvas space where shapes are defined           │
│    - Origin: (0, 0) at top-left of canvas                       │
│    - Size: totalWidth x totalHeight                             │
│    - cropArea, imageX, imageY use these coordinates             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Transform: * scale + stage.position
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. STAGE COORDINATES (Scaled/Displayed)                         │
│    - What user sees on screen                                   │
│    - Applied transforms: scaleX, scaleY, x, y                   │
│    - Konva draggable nodes work in PARENT coordinates           │
└─────────────────────────────────────────────────────────────────┘
```

### Coordinate Conversion Formula

```typescript
// EditorCanvas uses manual conversion for annotations:
function pointerToCanvasCoords(stage, pointer, scale) {
  const stageX = stage.x();  // Pan offset + centering
  const stageY = stage.y();
  return {
    x: (pointer.x - stageX) / scale,
    y: (pointer.y - stageY) / scale,
  };
}

// CropOverlay uses Konva's built-in method (preferred):
// stage.getRelativePointerPosition() - automatically accounts for all transforms
function getPointerCanvasPosition(stage: Konva.Stage): { x: number; y: number } | null {
  return stage.getRelativePointerPosition();
}

// Scale calculation
const scale = baseScale * userZoom;  // baseScale auto-fits to container
```

### Key Variables

| Variable | Coordinate Space | Description |
|----------|-----------------|-------------|
| `totalWidth/Height` | Canvas | Full canvas size including background |
| `actualPaddingX/Y` | Canvas | Offset from canvas origin to image |
| `innerWidth/Height` | Canvas | Displayed image size (may differ from original) |
| `imageX/Y` | Canvas | Same as actualPaddingX/Y - image position |
| `cropArea.x/y` | Canvas | Crop region position |
| `scale` | Multiplier | baseScale * userZoom |

---

## Konva Layer Structure

```
Stage (containerWidth x containerHeight)
├── scaleX={scale}, scaleY={scale}
├── x={panOffset.x + centering}, y={panOffset.y + centering}
│
└── Layer
    │
    ├── [1] Background Rect (0, 0, totalWidth, totalHeight)
    │       └── Solid color OR gradient fill
    │
    ├── [2] Background Image Group (if url() background)
    │       └── clipFunc: clips to totalWidth x totalHeight
    │       └── BackgroundImage: scaled to cover
    │
    ├── [3] Screenshot Group (actualPaddingX, actualPaddingY)
    │       │
    │       ├── Shadow Rect (0, 0, innerWidth, innerHeight)
    │       │   └── shadowBlur, shadowOffset for drop shadow
    │       │
    │       └── ScreenshotImage Group
    │           └── clipFunc: roundRect for corner radius
    │           └── KonvaImage: actual screenshot
    │
    ├── [4] AnnotationShapes
    │       └── Renders all annotation shapes + Transformer
    │
    ├── [5] SpotlightOverlay
    │       └── Dims areas outside spotlight regions
    │
    └── [6] CropOverlay (CONDITIONAL: only when cropMode=true)
            │
            ├── [A] When cropArea=null: Drawing Mode (standalone Rect)
            │       └── Transparent Rect (imageX, imageY, imageWidth, imageHeight)
            │           └── Captures: onMouseDown, onMouseMove, onMouseUp, onMouseLeave
            │           └── NOT inside a Group - direct return from component
            │
            └── [B] When cropArea exists: Manipulation Mode (Manual Drag Handling)
                    └── Group (captures onMouseMove, onMouseUp, onMouseLeave)
                        │
                        ├── Full Image Area Rect (transparent, listening=true)
                        │   └── Captures mouse events across entire image area
                        │
                        ├── DarkenedOverlay (4 Rects with listening=false)
                        │   └── Top, Bottom, Left, Right dark overlays (opacity=0.5)
                        │
                        ├── CropFrame (NON-draggable Rect)
                        │   └── White border (strokeWidth=2), fill=transparent
                        │   └── onMouseDown → handleFrameMouseDown (manual drag)
                        │   └── NO dragBoundFunc - constraints applied in handleMouseMove
                        │
                        └── ResizeHandles (8 NON-draggable Rects, 14x14px)
                            └── Positions: tl, tr, bl, br, t, b, l, r
                            └── White fill, blue stroke (#0066ff), cornerRadius=2
                            └── onMouseDown → handleHandleMouseDown (manual drag)
```

---

## Component Hierarchy

```
App.tsx
├── State: cropMode, cropArea, cropAspectRatio, isDrawingCrop, appliedCrop
├── Handlers: handleCropToolSelect, handleCropChange, handleCropApply, etc.
│
└── editor-canvas.tsx (kebab-case filename)
    ├── Props: cropMode, cropArea, cropAspectRatio, isDrawingCrop, appliedCrop
    ├── Props: onCropChange, onCropStart, onDrawingCropChange
    ├── Local State: scale, panOffset, isPanning, isDrawing (for annotations)
    ├── Local State: baseScale, userZoom, spacePressed
    │
    ├── Calculated Values:
    │   ├── totalWidth/Height (canvas dimensions via calculateOutputDimensions)
    │   ├── actualPaddingX/Y (image offset - centered)
    │   └── innerWidth/Height (displayed image size preserving aspect ratio)
    │
    └── crop-overlay.tsx (kebab-case filename, rendered when cropMode=true)
        ├── Props: imageX, imageY, imageWidth, imageHeight (= actualPadding, inner)
        ├── Props: cropArea, aspectRatio, isDrawing (NOTE: scale NOT passed)
        ├── Props: onCropChange, onCropStart, onDrawingChange
        ├── Uses: stage.getRelativePointerPosition() for coordinate conversion
        │
        ├── Local State: dragMode ('none' | 'drawing' | 'moving' | HandlePosition)
        ├── Refs: dragStartRef, drawStartRef (for manual drag tracking)
        │
        ├── DarkenedOverlay (inline sub-component)
        │   └── 4 Rects covering area outside crop region (listening=false)
        │
        ├── CropFrame (inline Rect - NOT draggable)
        │   └── Border rect for moving crop region (manual drag via refs)
        │
        └── ResizeHandles (inline Rects - NOT draggable)
            └── 8 handle rects for resizing (manual drag via refs)
```

---

## State Management

### Crop-Related State in App.tsx

```typescript
// Crop state
const [cropMode, setCropMode] = useState(false);           // Tool active?
const [cropArea, setCropArea] = useState<CropArea | null>(null);  // Current region
const [cropAspectRatio, setCropAspectRatio] = useState<CropAspectRatio>('free');
const [isDrawingCrop, setIsDrawingCrop] = useState(false); // Drawing new region?
const [appliedCrop, setAppliedCrop] = useState<CropArea | null>(null); // For export

// CropArea interface
interface CropArea {
  x: number;      // Canvas coordinates
  y: number;      // Canvas coordinates
  width: number;  // Canvas units
  height: number; // Canvas units
}

// Crop callbacks passed to EditorCanvas/CropOverlay
// NOTE: onCropStart and onCropChange both map to handleCropChange!
onCropChange={handleCropChange}       // Updates cropArea state
onCropStart={handleCropChange}        // SAME callback - no distinction
onDrawingCropChange={setIsDrawingCrop}
```

### State Flow

```
User clicks Crop Tool
       ↓
handleCropToolSelect()
  ├── setActiveTool('crop')
  ├── setCropMode(true)
  └── if (appliedCrop) setCropArea(appliedCrop)
       ↓
EditorCanvas renders CropOverlay
       ↓
cropArea=null → Drawing Mode Rect rendered
       ↓
User drags to draw
  ├── onMouseDown → onDrawingChange(true) + save drawStartRef
  ├── onMouseMove → onCropStart(newArea) → setCropArea(newArea)
  └── onMouseUp → onDrawingChange(false)
       ↓
cropArea exists → Manipulation Mode (Group with Frame + Handles)
       ↓
User drags CropFrame
  └── onDragMove → onCropChange({...cropArea, x, y}) → setCropArea()
       ↓
User drags Handle
  └── onDragMove → handleDrag → onResize(newArea) → setCropArea()
       ↓
User clicks Apply
  └── handleCropApply()
      ├── setAppliedCrop(cropArea)
      ├── setCropMode(false)
      ├── setCropArea(null)
      └── setActiveTool('select')
```

---

## Event Flow

### Stage-Level Events (EditorCanvas)

```
Stage.onMouseDown
  ├── Check: middle mouse or space+click → Pan mode
  ├── Check: activeTool === 'crop' → RETURN (skip annotation handling) ← NEW FIX
  ├── Check: activeTool === 'select' → Deselection logic
  ├── Check: activeTool === 'text' → Create text annotation
  └── Else: Start drawing annotation (setIsDrawing, etc.)

Stage.onMouseMove
  ├── Check: isPanning → Update pan offset
  └── Check: isDrawing → Update tempAnnotation

Stage.onMouseUp
  ├── Check: isPanning → End pan
  └── Check: isDrawing → Finalize annotation
```

### CropOverlay Events (Unified Manual Drag Handling)

**Drag Mode State:** `dragMode: 'none' | 'drawing' | 'moving' | HandlePosition`

**Drawing Mode (cropArea=null):**
```
NOTE: Drawing mode renders standalone Rect (NOT inside Group)

Transparent Rect.onMouseDown (handleDrawingStart)
  ├── if (cropArea) return; ← Guards against multiple regions
  ├── e.cancelBubble = true;
  ├── Get pointer position → getCanvasPos() → stage.getRelativePointerPosition()
  ├── Check bounds (within image)
  ├── Save to drawStartRef
  ├── setDragMode('drawing')
  └── onDrawingChange(true)

Rect.onMouseMove (handleMouseMove - same Rect captures events)
  ├── if (dragMode === 'drawing' && drawStartRef)
  │   ├── Calculate new area: min/max of start & current positions
  │   ├── constrainToBounds()
  │   └── onCropStart(newArea)

Rect.onMouseUp/onMouseLeave (handleMouseUp)
  ├── if (dragMode === 'drawing')
  │   ├── onDrawingChange(false)
  │   └── drawStartRef.current = null
  ├── dragStartRef.current = null
  └── setDragMode('none')
```

**Manipulation Mode (cropArea exists) - NO Konva draggable:**
```
CropFrame.onMouseDown (handleFrameMouseDown)
  ├── if (!cropArea) return;
  ├── e.cancelBubble = true;
  ├── Save to dragStartRef: { mouseX, mouseY, cropArea: {...cropArea} }
  └── setDragMode('moving')

ResizeHandle.onMouseDown (handleHandleMouseDown(pos))
  ├── if (!cropArea) return;
  ├── e.cancelBubble = true;
  ├── Save to dragStartRef: { mouseX, mouseY, cropArea: {...cropArea} }
  └── setDragMode(pos) // 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'

Group.onMouseMove (handleMouseMove - shared handler)
  ├── if (dragMode === 'moving' && dragStartRef)
  │   ├── Calculate delta from drag start position
  │   ├── Apply delta to original cropArea position
  │   ├── Constrain to image bounds
  │   └── onCropChange({ ...startArea, x: newX, y: newY })
  ├── else if (dragMode is HandlePosition && dragStartRef)
  │   ├── calculateResizedArea(handlePos, currentPos, startArea)
  │   ├── applyConstraints(newArea, bounds, aspectRatio, handlePos)
  │   └── onCropChange(newArea)
```

---

## Crop Tool Workflow

### Visual State Diagram

```
┌─────────────────┐     Click Crop Tool      ┌─────────────────┐
│   Normal Mode   │ ───────────────────────→ │   Crop Mode     │
│ cropMode=false  │                          │ cropMode=true   │
│ cropArea=null   │                          │ cropArea=null   │
└─────────────────┘                          └────────┬────────┘
        ↑                                             │
        │                                    Drag to draw region
        │                                             ↓
        │                                    ┌─────────────────┐
        │                                    │   Crop Mode     │
        │                                    │ cropMode=true   │
        │ ← ─ ─ Cancel/Esc ─ ─ ─ ─ ─ ─ ─ ─ ─│ cropArea={...}  │
        │                                    └────────┬────────┘
        │                                             │
        │                              Drag frame/handles to adjust
        │                                             │
        │                                             ↓
        │                                    ┌─────────────────┐
        │                     Apply          │   Crop Applied  │
        └─────────────────────────────────── │ cropMode=false  │
                                             │ appliedCrop={} │
                                             └─────────────────┘
```

### Export with Crop

```typescript
// In getCanvasDataUrl() - App.tsx:
const getCanvasDataUrl = useCallback((format: 'png' | 'jpeg'): string | null => {
  const stage = stageRef.current;
  if (!stage) return null;

  // Save current stage properties
  const oldScaleX = stage.scaleX();
  const oldScaleY = stage.scaleY();
  const oldX = stage.x();
  const oldY = stage.y();
  const oldWidth = stage.width();
  const oldHeight = stage.height();

  // Reset stage transform for accurate export at 1:1 scale
  stage.scaleX(1);
  stage.scaleY(1);
  stage.x(0);
  stage.y(0);

  let dataUrl: string;

  // If crop is applied, clip to crop region
  if (appliedCrop) {
    // Ensure stage is large enough to contain crop region
    const neededWidth = appliedCrop.x + appliedCrop.width;
    const neededHeight = appliedCrop.y + appliedCrop.height;
    stage.width(Math.max(oldWidth, neededWidth));
    stage.height(Math.max(oldHeight, neededHeight));

    dataUrl = stage.toDataURL({
      mimeType,
      quality: 0.95,
      pixelRatio: 1,
      x: appliedCrop.x,        // Canvas coordinates
      y: appliedCrop.y,
      width: appliedCrop.width,
      height: appliedCrop.height,
    });
  } else {
    dataUrl = stage.toDataURL({ mimeType, quality: 0.95, pixelRatio: 1 });
  }

  // Restore stage properties
  stage.scaleX(oldScaleX);
  // ... restore all other properties
  return dataUrl;
}, [appliedCrop]);
```

**CRITICAL:** Stage dimensions must be enlarged to contain crop region before export. Without this, the crop coordinates may reference pixels outside the current stage bounds.

---

## Known Issues

### Issue 1: Resize Handles Visibility at Small Scales

**Status:** Potential concern

**Symptom:** Handles may appear tiny at low zoom levels.

**Analysis:**
- Handle size: 14x14 pixels in canvas coordinates
- At small scales, handles shrink proportionally
- No scale compensation currently implemented

**Potential fix:** Scale handle size inversely with stage scale

---

## Critical Observations

### 1. Manual Drag Handling Pattern (Current Implementation)

The CropOverlay no longer uses Konva's `draggable` prop. Instead:

```typescript
// Drag state managed via refs to avoid stale closures
const dragStartRef = useRef<{
  mouseX: number;      // Start mouse position in canvas coords
  mouseY: number;
  cropArea: CropArea;  // Snapshot of cropArea at drag start
} | null>(null);

// Coordinate conversion using Konva's built-in method
function getPointerCanvasPosition(stage: Konva.Stage): { x: number; y: number } | null {
  return stage.getRelativePointerPosition();  // Handles all transforms automatically
}

// On mouse down, snapshot the state
dragStartRef.current = {
  mouseX: pos.x,
  mouseY: pos.y,
  cropArea: { ...cropArea },  // Clone current state
};

// On mouse move, calculate delta from original position
const deltaX = pos.x - dragStartRef.current.mouseX;
const deltaY = pos.y - dragStartRef.current.mouseY;
const startArea = dragStartRef.current.cropArea;
let newX = startArea.x + deltaX;  // Apply delta to original position
```

**Benefits:**
- No Konva internal state conflicts
- No stale closure issues (refs hold snapshot)
- Predictable behavior
- `getRelativePointerPosition()` handles scale/pan transforms automatically

### 2. Constraint Application Flow

```
calculateResizedArea(handlePos, currentPos, startArea)
    ↓
applyConstraints(newArea, imageX, imageY, imageWidth, imageHeight, aspectRatio, handlePos)
    ├── constrainToBounds() - First pass
    ├── enforceAspectRatio() - If not 'free'
    ├── Scale down if exceeds bounds - Preserve ratio
    └── Final position adjustment
```

### 3. Event Propagation (Fixed)

Stage.onMouseDown now checks `activeTool === 'crop'` and returns early:

```typescript
// In editor-canvas.tsx handleMouseDown:
if (activeTool === 'crop') {
  return;  // Let CropOverlay handle all crop events
}
```

CropOverlay handlers set `e.cancelBubble = true` as additional protection.

---

## Recommendations for Debugging

1. **Add console logs** to track:
   - Mouse positions (pixel vs canvas)
   - `dragMode` state transitions
   - `dragStartRef.current` values
   - `cropArea` state changes via `onCropChange`

2. **Test coordinate conversion**:
   - Click at known screen position
   - Log `pointerToCanvasCoords()` output
   - Verify matches expected image bounds

3. **Test crop export**:
   - Apply crop, then export
   - Compare exported dimensions with `appliedCrop`
   - Check stage transform is reset correctly before export

4. **Test aspect ratio constraints**:
   - Set 16:9 ratio, resize from different handles
   - Verify ratio is maintained
   - Check bounds aren't exceeded

---

## Resolved Issues

### ✅ Issue: Drag Behavior - "Snapping to Drag Start"

**Original symptom:** When dragging CropFrame, it snapped to cursor position instead of moving smoothly.

**Resolution:** Replaced Konva's `draggable` prop with manual drag handling:
- Store original `cropArea` in `dragStartRef` at drag start
- Calculate delta from original mouse position
- Apply delta to original `cropArea` position
- No Konva internal state to conflict with React state

### ✅ Issue: Stale Closure in dragBoundFunc

**Original symptom:** Boundary constraints used stale `cropArea` values from closures.

**Resolution:** Eliminated `dragBoundFunc` entirely:
- Constraints now applied in `handleMouseMove`
- Uses `dragStartRef.current.cropArea` (snapshot at drag start)
- Fresh constraint calculation on every mouse move

### ✅ Issue: Event Propagation / Stage Interference

**Original symptom:** Stage.onMouseDown fired before node handlers could set `cancelBubble`.

**Resolution:** Two-pronged fix:
1. `editor-canvas.tsx` checks `activeTool === 'crop'` and returns early
2. CropOverlay handlers set `e.cancelBubble = true` as backup

### ✅ Issue: Apply Button Crop Coordinates

**Original symptom:** Clicking Apply may not correctly crop the exported image.

**Resolution:** Export now properly handles crop:
1. Stage is reset to scale=1, x=0, y=0 before export
2. Stage dimensions are enlarged to contain full crop region
3. `stage.toDataURL()` uses `appliedCrop` coordinates (canvas space)
4. Stage properties are restored after export
