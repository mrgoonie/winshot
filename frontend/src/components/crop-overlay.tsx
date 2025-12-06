import { useCallback, useRef, useState } from 'react';
import { Group, Rect } from 'react-konva';
import Konva from 'konva';
import { CropArea, CropAspectRatio } from '../types';

// Constants
const MIN_CROP_SIZE = 20;
const HANDLE_SIZE = 14;
const OVERLAY_OPACITY = 0.5;

// Props interface
interface CropOverlayProps {
  // Screenshot dimensions (bounds)
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  // Current crop state
  cropArea: CropArea | null;
  aspectRatio: CropAspectRatio;
  isDrawing: boolean;
  // Callbacks
  onCropChange: (area: CropArea) => void;
  onCropStart: (area: CropArea) => void;
  onDrawingChange: (isDrawing: boolean) => void;
}

// Handle position type
type HandlePosition = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

// Drag mode type
type DragMode = 'none' | 'drawing' | 'moving' | HandlePosition;

// Helper: Constrain crop area to image bounds while maintaining min size
function constrainToBounds(
  area: CropArea,
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number
): CropArea {
  const result = { ...area };

  // 1. Ensure minimum size
  result.width = Math.max(MIN_CROP_SIZE, result.width);
  result.height = Math.max(MIN_CROP_SIZE, result.height);

  // 2. Clamp dimensions to not exceed image bounds
  result.width = Math.min(result.width, imageWidth);
  result.height = Math.min(result.height, imageHeight);

  // 3. Clamp position - left/top boundary
  result.x = Math.max(imageX, result.x);
  result.y = Math.max(imageY, result.y);

  // 4. Clamp position - right/bottom boundary
  if (result.x + result.width > imageX + imageWidth) {
    result.x = imageX + imageWidth - result.width;
  }
  if (result.y + result.height > imageY + imageHeight) {
    result.y = imageY + imageHeight - result.height;
  }

  return result;
}

// Aspect ratio numeric values
const RATIO_VALUES: Record<CropAspectRatio, number> = {
  'free': 0,
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '9:16': 9 / 16,
  '3:4': 3 / 4,
};

// Helper: Enforce aspect ratio during resize
function enforceAspectRatio(
  area: CropArea,
  ratio: CropAspectRatio,
  dragHandle: HandlePosition
): CropArea {
  const targetRatio = RATIO_VALUES[ratio];
  if (targetRatio === 0) return area;

  const result = { ...area };
  const isHorizontalDrag = ['l', 'r'].includes(dragHandle);
  const isVerticalDrag = ['t', 'b'].includes(dragHandle);

  if (isHorizontalDrag) {
    result.height = result.width / targetRatio;
  } else if (isVerticalDrag) {
    result.width = result.height * targetRatio;
  } else {
    // Corner: use width as primary
    result.height = result.width / targetRatio;
  }

  return result;
}

// Helper: Apply all constraints (bounds + aspect ratio)
function applyConstraints(
  area: CropArea,
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number,
  aspectRatio: CropAspectRatio,
  dragHandle: HandlePosition
): CropArea {
  let result = { ...area };

  // First pass: enforce bounds
  result = constrainToBounds(result, imageX, imageY, imageWidth, imageHeight);

  // If no aspect ratio constraint, we're done
  if (aspectRatio === 'free') return result;

  // Apply aspect ratio
  result = enforceAspectRatio(result, aspectRatio, dragHandle);

  // Second pass: check if aspect ratio adjustment broke bounds
  const targetRatio = RATIO_VALUES[aspectRatio];
  const maxWidth = imageX + imageWidth - result.x;
  const maxHeight = imageY + imageHeight - result.y;

  // If dimensions exceed bounds, scale down while preserving ratio
  if (result.width > maxWidth || result.height > maxHeight) {
    const scaleW = maxWidth / result.width;
    const scaleH = maxHeight / result.height;
    const scaleFactor = Math.min(scaleW, scaleH);

    result.width = Math.max(MIN_CROP_SIZE, result.width * scaleFactor);
    result.height = result.width / targetRatio;

    if (result.width < MIN_CROP_SIZE) {
      result.width = MIN_CROP_SIZE;
      result.height = result.width / targetRatio;
    }
    if (result.height < MIN_CROP_SIZE) {
      result.height = MIN_CROP_SIZE;
      result.width = result.height * targetRatio;
    }
  }

  // Final position adjustment
  if (result.x + result.width > imageX + imageWidth) {
    result.x = imageX + imageWidth - result.width;
  }
  if (result.y + result.height > imageY + imageHeight) {
    result.y = imageY + imageHeight - result.height;
  }
  result.x = Math.max(imageX, result.x);
  result.y = Math.max(imageY, result.y);

  return result;
}

// Helper: Get pointer position in canvas coordinates
// Uses Konva's getRelativePointerPosition() which correctly accounts for
// stage position, scale, and any other transformations
function getPointerCanvasPosition(stage: Konva.Stage): { x: number; y: number } | null {
  const pos = stage.getRelativePointerPosition();
  return pos;
}

// Sub-component: Darkened overlay (4 rects around crop area)
function DarkenedOverlay({
  imageX,
  imageY,
  imageWidth,
  imageHeight,
  cropArea,
}: {
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  cropArea: CropArea;
}) {
  const { x, y, width, height } = cropArea;

  return (
    <>
      {/* Top */}
      <Rect
        x={imageX}
        y={imageY}
        width={imageWidth}
        height={Math.max(0, y - imageY)}
        fill="black"
        opacity={OVERLAY_OPACITY}
        listening={false}
      />
      {/* Bottom */}
      <Rect
        x={imageX}
        y={y + height}
        width={imageWidth}
        height={Math.max(0, imageY + imageHeight - (y + height))}
        fill="black"
        opacity={OVERLAY_OPACITY}
        listening={false}
      />
      {/* Left */}
      <Rect
        x={imageX}
        y={y}
        width={Math.max(0, x - imageX)}
        height={height}
        fill="black"
        opacity={OVERLAY_OPACITY}
        listening={false}
      />
      {/* Right */}
      <Rect
        x={x + width}
        y={y}
        width={Math.max(0, imageX + imageWidth - (x + width))}
        height={height}
        fill="black"
        opacity={OVERLAY_OPACITY}
        listening={false}
      />
    </>
  );
}

// Main component: CropOverlay with unified drag handling
export function CropOverlay({
  imageX,
  imageY,
  imageWidth,
  imageHeight,
  cropArea,
  aspectRatio,
  isDrawing: _isDrawing,
  onCropChange,
  onCropStart,
  onDrawingChange,
}: CropOverlayProps) {
  // Drag state
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    cropArea: CropArea;
  } | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);

  // Get mouse position in canvas coordinates
  const getCanvasPos = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): { x: number; y: number } | null => {
      const stage = e.target.getStage();
      if (!stage) return null;
      return getPointerCanvasPosition(stage);
    },
    []
  );

  // Calculate handle positions
  const getHandlePositions = useCallback((area: CropArea) => ({
    tl: { x: area.x - HANDLE_SIZE / 2, y: area.y - HANDLE_SIZE / 2 },
    tr: { x: area.x + area.width - HANDLE_SIZE / 2, y: area.y - HANDLE_SIZE / 2 },
    bl: { x: area.x - HANDLE_SIZE / 2, y: area.y + area.height - HANDLE_SIZE / 2 },
    br: { x: area.x + area.width - HANDLE_SIZE / 2, y: area.y + area.height - HANDLE_SIZE / 2 },
    t: { x: area.x + area.width / 2 - HANDLE_SIZE / 2, y: area.y - HANDLE_SIZE / 2 },
    b: { x: area.x + area.width / 2 - HANDLE_SIZE / 2, y: area.y + area.height - HANDLE_SIZE / 2 },
    l: { x: area.x - HANDLE_SIZE / 2, y: area.y + area.height / 2 - HANDLE_SIZE / 2 },
    r: { x: area.x + area.width - HANDLE_SIZE / 2, y: area.y + area.height / 2 - HANDLE_SIZE / 2 },
  }), []);

  // Handle resize based on which handle is being dragged
  const calculateResizedArea = useCallback(
    (handlePos: HandlePosition, currentPos: { x: number; y: number }, startArea: CropArea): CropArea => {
      const { x, y, width, height } = startArea;
      let newArea = { ...startArea };

      switch (handlePos) {
        case 'br':
          newArea.width = Math.max(MIN_CROP_SIZE, currentPos.x - x);
          newArea.height = Math.max(MIN_CROP_SIZE, currentPos.y - y);
          break;
        case 'bl':
          newArea.x = Math.min(currentPos.x, x + width - MIN_CROP_SIZE);
          newArea.width = x + width - newArea.x;
          newArea.height = Math.max(MIN_CROP_SIZE, currentPos.y - y);
          break;
        case 'tr':
          newArea.y = Math.min(currentPos.y, y + height - MIN_CROP_SIZE);
          newArea.width = Math.max(MIN_CROP_SIZE, currentPos.x - x);
          newArea.height = y + height - newArea.y;
          break;
        case 'tl':
          newArea.x = Math.min(currentPos.x, x + width - MIN_CROP_SIZE);
          newArea.y = Math.min(currentPos.y, y + height - MIN_CROP_SIZE);
          newArea.width = x + width - newArea.x;
          newArea.height = y + height - newArea.y;
          break;
        case 't':
          newArea.y = Math.min(currentPos.y, y + height - MIN_CROP_SIZE);
          newArea.height = y + height - newArea.y;
          break;
        case 'b':
          newArea.height = Math.max(MIN_CROP_SIZE, currentPos.y - y);
          break;
        case 'l':
          newArea.x = Math.min(currentPos.x, x + width - MIN_CROP_SIZE);
          newArea.width = x + width - newArea.x;
          break;
        case 'r':
          newArea.width = Math.max(MIN_CROP_SIZE, currentPos.x - x);
          break;
      }

      return applyConstraints(newArea, imageX, imageY, imageWidth, imageHeight, aspectRatio, handlePos);
    },
    [imageX, imageY, imageWidth, imageHeight, aspectRatio]
  );

  // Start drawing a new crop region
  const handleDrawingStart = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (cropArea) return; // Already have a crop area
      e.cancelBubble = true;

      const pos = getCanvasPos(e);
      if (!pos) return;

      // Check if click is within image bounds
      if (
        pos.x < imageX ||
        pos.x > imageX + imageWidth ||
        pos.y < imageY ||
        pos.y > imageY + imageHeight
      ) {
        return;
      }

      drawStartRef.current = pos;
      setDragMode('drawing');
      onDrawingChange(true);
    },
    [cropArea, getCanvasPos, imageX, imageY, imageWidth, imageHeight, onDrawingChange]
  );

  // Start moving the crop frame
  const handleFrameMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!cropArea) return;
      e.cancelBubble = true;

      const pos = getCanvasPos(e);
      if (!pos) return;

      dragStartRef.current = {
        mouseX: pos.x,
        mouseY: pos.y,
        cropArea: { ...cropArea },
      };
      setDragMode('moving');
    },
    [cropArea, getCanvasPos]
  );

  // Start resizing via a handle
  const handleHandleMouseDown = useCallback(
    (handlePos: HandlePosition) => (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!cropArea) return;
      e.cancelBubble = true;

      const pos = getCanvasPos(e);
      if (!pos) return;

      dragStartRef.current = {
        mouseX: pos.x,
        mouseY: pos.y,
        cropArea: { ...cropArea },
      };
      setDragMode(handlePos);
    },
    [cropArea, getCanvasPos]
  );

  // Handle mouse move for all drag operations
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getCanvasPos(e);
      if (!pos) return;

      if (dragMode === 'drawing' && drawStartRef.current) {
        // Drawing new crop region
        const startX = Math.min(drawStartRef.current.x, pos.x);
        const startY = Math.min(drawStartRef.current.y, pos.y);
        const width = Math.abs(pos.x - drawStartRef.current.x);
        const height = Math.abs(pos.y - drawStartRef.current.y);

        let newArea: CropArea = { x: startX, y: startY, width, height };
        newArea = constrainToBounds(newArea, imageX, imageY, imageWidth, imageHeight);
        onCropStart(newArea);
      } else if (dragMode === 'moving' && dragStartRef.current) {
        // Moving crop frame - calculate delta from drag start
        const deltaX = pos.x - dragStartRef.current.mouseX;
        const deltaY = pos.y - dragStartRef.current.mouseY;

        const startArea = dragStartRef.current.cropArea;
        let newX = startArea.x + deltaX;
        let newY = startArea.y + deltaY;

        // Constrain to image bounds
        newX = Math.max(imageX, Math.min(newX, imageX + imageWidth - startArea.width));
        newY = Math.max(imageY, Math.min(newY, imageY + imageHeight - startArea.height));

        onCropChange({ ...startArea, x: newX, y: newY });
      } else if (dragMode !== 'none' && dragStartRef.current) {
        // Resizing via handle
        const handlePos = dragMode as HandlePosition;
        const newArea = calculateResizedArea(handlePos, pos, dragStartRef.current.cropArea);
        onCropChange(newArea);
      }
    },
    [dragMode, getCanvasPos, imageX, imageY, imageWidth, imageHeight, onCropStart, onCropChange, calculateResizedArea]
  );

  // Handle mouse up to end all drag operations
  const handleMouseUp = useCallback(() => {
    if (dragMode === 'drawing') {
      onDrawingChange(false);
      drawStartRef.current = null;
    }
    dragStartRef.current = null;
    setDragMode('none');
  }, [dragMode, onDrawingChange]);

  // No crop area yet - render drawing area
  if (!cropArea) {
    return (
      <Rect
        x={imageX}
        y={imageY}
        width={imageWidth}
        height={imageHeight}
        fill="transparent"
        onMouseDown={handleDrawingStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    );
  }

  const handlePositions = getHandlePositions(cropArea);

  // Render crop overlay with frame and handles
  return (
    <Group
      name="crop-overlay"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Full image area rect to capture events everywhere */}
      <Rect
        x={imageX}
        y={imageY}
        width={imageWidth}
        height={imageHeight}
        fill="transparent"
        listening={true}
      />

      {/* Darkened overlay */}
      <DarkenedOverlay
        imageX={imageX}
        imageY={imageY}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        cropArea={cropArea}
      />

      {/* Crop frame - NO draggable prop, we handle drag manually */}
      <Rect
        x={cropArea.x}
        y={cropArea.y}
        width={cropArea.width}
        height={cropArea.height}
        stroke="white"
        strokeWidth={2}
        fill="transparent"
        onMouseDown={handleFrameMouseDown}
      />

      {/* Resize handles - NO draggable prop, we handle drag manually */}
      {(Object.entries(handlePositions) as [HandlePosition, { x: number; y: number }][]).map(
        ([pos, { x, y }]) => (
          <Rect
            key={pos}
            x={x}
            y={y}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="white"
            stroke="#0066ff"
            strokeWidth={2}
            cornerRadius={2}
            onMouseDown={handleHandleMouseDown(pos)}
          />
        )
      )}
    </Group>
  );
}

export default CropOverlay;
