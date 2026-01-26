import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { CaptureResult, Annotation, AnnotationType, EditorTool, OutputRatio, CropArea, CropAspectRatio, BorderType } from '../types';
import { AnnotationShapes } from './annotation-shapes';
import { SpotlightOverlay } from './spotlight-overlay';
import { CropOverlay } from './crop-overlay';
import { ImageIcon } from 'lucide-react';

interface EditorCanvasProps {
  screenshot: CaptureResult | null;
  padding: number;
  cornerRadius: number;
  shadowSize: number;
  backgroundColor: string;
  outputRatio: OutputRatio;
  inset: number; // 0-50 percentage for screenshot scaling
  insetBackgroundColor?: string; // Background color revealed when inset > 0 (extracted from screenshot)
  borderEnabled: boolean;
  borderWeight: number;
  borderColor: string;
  borderOpacity: number;
  borderType: BorderType;
  stageRef?: React.RefObject<Konva.Stage>;
  // Annotation props
  activeTool: EditorTool;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  strokeColor: string | null; // null = no stroke
  fillColor: string | null; // null = transparent
  strokeWidth: number;
  shapeCornerRadius: number; // For rectangle annotations
  fontSize: number;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  nextNumber: number; // Next number for number annotations
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationSelect: (id: string | null) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onToolChange?: (tool: EditorTool) => void;
  // Crop props
  cropMode: boolean;
  cropArea: CropArea | null;
  cropAspectRatio: CropAspectRatio;
  isDrawingCrop: boolean;
  onCropChange: (area: CropArea) => void;
  onCropStart: (area: CropArea) => void;
  onDrawingCropChange: (isDrawing: boolean) => void;
}

// Helper to parse ratio string into numeric ratio
function parseRatio(ratio: OutputRatio): number | null {
  if (ratio === 'auto') return null;
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
}

// Helper to parse CSS gradient to Konva gradient color stops
function parseGradient(gradient: string): (number | string)[] {
  // Parse linear-gradient(135deg, #667eea 0%, #764ba2 100%)
  const colorStopRegex = /(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\([^)]+\))\s*(\d+)?%?/g;
  const stops: (number | string)[] = [];
  let match;

  while ((match = colorStopRegex.exec(gradient)) !== null) {
    const color = match[1];
    const position = match[2] ? parseInt(match[2]) / 100 : stops.length === 0 ? 0 : 1;
    stops.push(position, color);
  }

  // Default fallback
  if (stops.length === 0) {
    return [0, '#667eea', 1, '#764ba2'];
  }

  return stops;
}

// Calculate output dimensions based on ratio, screenshot, and padding
function calculateOutputDimensions(
  screenshotWidth: number,
  screenshotHeight: number,
  padding: number,
  outputRatio: OutputRatio
): { totalWidth: number; totalHeight: number } {
  const targetRatio = parseRatio(outputRatio);

  if (targetRatio === null) {
    // Auto mode: include padding if set, otherwise raw screenshot size
    if (padding > 0) {
      return {
        totalWidth: screenshotWidth + padding * 2,
        totalHeight: screenshotHeight + padding * 2
      };
    }
    return { totalWidth: screenshotWidth, totalHeight: screenshotHeight };
  }

  // Calculate dimensions to fit the screenshot with padding while maintaining target ratio
  const minWidth = screenshotWidth + padding * 2;
  const minHeight = screenshotHeight + padding * 2;
  const minAspect = minWidth / minHeight;

  if (targetRatio > minAspect) {
    // Target is wider - expand width to match ratio
    return {
      totalWidth: Math.round(minHeight * targetRatio),
      totalHeight: minHeight,
    };
  } else {
    // Target is taller - expand height to match ratio
    return {
      totalWidth: minWidth,
      totalHeight: Math.round(minWidth / targetRatio),
    };
  }
}

function ScreenshotImage({
  src,
  cornerRadius,
  displayWidth,
  displayHeight,
}: {
  src: string;
  cornerRadius: number;
  displayWidth: number;
  displayHeight: number;
}) {
  const [image] = useImage(src);

  if (!image) return null;

  return (
    <Group
      clipFunc={(ctx) => {
        ctx.beginPath();
        ctx.roundRect(0, 0, displayWidth, displayHeight, cornerRadius);
        ctx.closePath();
      }}
    >
      <KonvaImage image={image} x={0} y={0} width={displayWidth} height={displayHeight} />
    </Group>
  );
}

function BackgroundImage({ src, width, height }: { src: string; width: number; height: number }) {
  const [image] = useImage(src);

  if (!image) return null;

  // Calculate scale to cover the area
  const scaleX = width / image.width;
  const scaleY = height / image.height;
  const scale = Math.max(scaleX, scaleY);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;

  return (
    <KonvaImage
      image={image}
      x={offsetX}
      y={offsetY}
      width={scaledWidth}
      height={scaledHeight}
    />
  );
}

// Zoom constraints
const MIN_ZOOM = 0.1; // 10%
const MAX_ZOOM = 5.0; // 500%
const ZOOM_STEP = 0.1;

export function EditorCanvas({
  screenshot,
  padding,
  cornerRadius,
  shadowSize,
  backgroundColor,
  outputRatio,
  inset,
  insetBackgroundColor,
  borderEnabled,
  borderWeight,
  borderColor,
  borderOpacity,
  borderType,
  stageRef,
  activeTool,
  annotations,
  selectedAnnotationId,
  strokeColor,
  fillColor,
  strokeWidth,
  shapeCornerRadius,
  fontSize,
  fontStyle,
  nextNumber,
  onAnnotationAdd,
  onAnnotationSelect,
  onAnnotationUpdate,
  onToolChange,
  // Crop props
  cropMode,
  cropArea,
  cropAspectRatio,
  isDrawingCrop,
  onCropChange,
  onCropStart,
  onDrawingCropChange,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalStageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [baseScale, setBaseScale] = useState(1); // Auto-fit scale
  const [userZoom, setUserZoom] = useState(1); // User zoom multiplier
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Pan offset
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [tempAnnotation, setTempAnnotation] = useState<Annotation | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  const activeStageRef = stageRef || internalStageRef;
  const scale = baseScale * userZoom;

  // Update container size on resize or when screenshot changes
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    // Use RAF to ensure DOM has rendered
    requestAnimationFrame(updateSize);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [screenshot]);

  // Calculate base scale to fit output in container
  useEffect(() => {
    if (screenshot) {
      const { totalWidth, totalHeight } = calculateOutputDimensions(
        screenshot.width,
        screenshot.height,
        padding,
        outputRatio
      );
      const scaleX = (containerSize.width - 80) / totalWidth;
      const scaleY = (containerSize.height - 80) / totalHeight;
      setBaseScale(Math.min(scaleX, scaleY, 1));
    }
  }, [screenshot, containerSize, padding, outputRatio]);

  // Reset zoom and pan when screenshot changes
  useEffect(() => {
    setUserZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [screenshot]);

  // Handle keyboard events for pan (space) and zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      }

      // Zoom shortcuts: Ctrl+Plus, Ctrl+Minus, Ctrl+0
      if (e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setUserZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
        } else if (e.key === '-') {
          e.preventDefault();
          setUserZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
        } else if (e.key === '0') {
          e.preventDefault();
          setUserZoom(1);
          setPanOffset({ x: 0, y: 0 });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = activeStageRef.current;
    if (!stage) return;

    // Get mouse position relative to the stage container
    const container = stage.container();
    const rect = container.getBoundingClientRect();
    const mouseX = e.evt.clientX - rect.left;
    const mouseY = e.evt.clientY - rect.top;

    // Calculate zoom direction
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, userZoom + direction * ZOOM_STEP));

    if (newZoom === userZoom) return;

    // Get current stage position (includes centering offset)
    const oldStageX = stage.x();
    const oldStageY = stage.y();
    const oldScale = baseScale * userZoom;
    const newScale = baseScale * newZoom;

    // Calculate the point under the mouse in canvas coordinates
    const mousePointTo = {
      x: (mouseX - oldStageX) / oldScale,
      y: (mouseY - oldStageY) / oldScale,
    };

    // Calculate new position to keep mouse point fixed
    const newStageX = mouseX - mousePointTo.x * newScale;
    const newStageY = mouseY - mousePointTo.y * newScale;

    // Calculate centering offset for new zoom
    const containerWidth = containerSize.width - 80;
    const containerHeight = containerSize.height - 80;
    const newStageWidth = stage.width() / oldScale * newScale;
    const newStageHeight = stage.height() / oldScale * newScale;
    const newCenterOffsetX = (containerWidth - newStageWidth) / 2;
    const newCenterOffsetY = (containerHeight - newStageHeight) / 2;

    // New pan offset is the difference from centering
    const newPanOffset = {
      x: newStageX - newCenterOffsetX,
      y: newStageY - newCenterOffsetY,
    };

    setUserZoom(newZoom);
    setPanOffset(newPanOffset);
  }, [userZoom, baseScale, panOffset, activeStageRef, containerSize]);

  // Handle pan start (middle mouse or space+drag)
  const handlePanStart = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Middle mouse button or space+left click
    if (e.evt.button === 1 || (spacePressed && e.evt.button === 0)) {
      e.evt.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX - panOffset.x, y: e.evt.clientY - panOffset.y });
    }
  }, [spacePressed, panOffset]);

  // Handle pan move
  const handlePanMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning) return;
    e.evt.preventDefault();
    setPanOffset({
      x: e.evt.clientX - panStart.x,
      y: e.evt.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Generate unique ID for annotations
  const generateId = useCallback(() => {
    return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Helper to check if a node is part of a Transformer
  const isTransformerNode = useCallback((node: Konva.Node): boolean => {
    let current: Konva.Node | null = node;
    while (current) {
      if (current.getClassName() === 'Transformer') {
        return true;
      }
      current = current.getParent();
    }
    return false;
  }, []);

  // Handle mouse down for drawing
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Handle pan start first
    if (e.evt.button === 1 || (spacePressed && e.evt.button === 0)) {
      handlePanStart(e);
      return;
    }

    // Skip annotation handling when crop tool is active - CropOverlay handles its own events
    if (activeTool === 'crop') {
      return;
    }

    if (activeTool === 'select') {
      // Don't deselect if clicking on Transformer handles (resize/rotate anchors)
      if (isTransformerNode(e.target)) {
        return;
      }
      // Check if we clicked directly on an annotation shape
      // Annotations have their own onClick handlers that will fire and select them
      // So we only need to deselect when clicking on non-annotation elements
      const className = e.target.getClassName();

      // These are annotation shape types that have their own onClick handlers
      const annotationShapeTypes = ['Arrow', 'Line', 'Rect', 'Ellipse', 'Text', 'Circle'];

      // Check if clicking on an annotation element (Circle is for endpoint handles)
      const isAnnotationShape = annotationShapeTypes.includes(className);

      // If clicking on a shape, let its onClick handler deal with selection
      // The shape's onClick will fire after this and select itself
      if (isAnnotationShape) {
        // Check if it's a background Rect (not an annotation)
        // Background Rect is direct child of Layer, annotation Rects are inside Groups
        const parent = e.target.parent;
        const isBackgroundRect = className === 'Rect' && parent?.getClassName() === 'Layer';
        const isBackgroundImage = className === 'Image';

        if (isBackgroundRect || isBackgroundImage) {
          // Clicked on background - deselect
          onAnnotationSelect(null);
        }
        // Otherwise it's an annotation shape - let its onClick handle it
        return;
      }

      // Clicked on Stage, Layer, Group (background), or other non-shape element - deselect
      onAnnotationSelect(null);
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Convert to unscaled coordinates (accounting for stage position including pan offset and centering)
    const stageX = stage.x();
    const stageY = stage.y();
    const x = (pos.x - stageX) / scale;
    const y = (pos.y - stageY) / scale;

    // For text tool, create text immediately on click with empty text to trigger edit mode
    if (activeTool === 'text') {
      const textAnnotation: Annotation = {
        id: generateId(),
        type: 'text',
        x,
        y,
        width: 200,
        height: 60,
        stroke: strokeColor || '#ef4444', // Text always needs a color
        strokeWidth,
        text: '', // Empty text triggers immediate edit mode
        fontSize,
        fontFamily: 'Arial',
        fontStyle,
        textAlign: 'left',
      };
      onAnnotationAdd(textAnnotation);
      onAnnotationSelect(textAnnotation.id);
      return;
    }

    // For number tool, create number annotation on click
    if (activeTool === 'number') {
      const numberAnnotation: Annotation = {
        id: generateId(),
        type: 'number',
        x,
        y,
        width: 36, // Default circle diameter
        height: 36,
        stroke: strokeColor || '#ef4444', // Number always needs a color
        strokeWidth,
        number: nextNumber,
      };
      onAnnotationAdd(numberAnnotation);
      onAnnotationSelect(numberAnnotation.id);
      return;
    }

    setIsDrawing(true);
    setDrawStart({ x, y });

    // At this point, activeTool is one of: 'rectangle', 'ellipse', 'arrow', 'line'
    const annotationType = activeTool as AnnotationType;

    const newAnnotation: Annotation = {
      id: generateId(),
      type: annotationType,
      x,
      y,
      width: 0,
      height: 0,
      // Apply stroke color (null/undefined = no stroke for shapes, default to red for lines/arrows)
      stroke: strokeColor || ((annotationType === 'rectangle' || annotationType === 'ellipse') ? undefined : '#ef4444'),
      strokeWidth,
      // Apply fill color for rectangle and ellipse shapes
      fill: (annotationType === 'rectangle' || annotationType === 'ellipse') && fillColor ? fillColor : undefined,
      // Apply corner radius for rectangles
      cornerRadius: annotationType === 'rectangle' ? shapeCornerRadius : undefined,
      points: annotationType === 'arrow' || annotationType === 'line' ? [0, 0, 0, 0] : undefined,
    };
    setTempAnnotation(newAnnotation);
  }, [activeTool, scale, strokeColor, fillColor, strokeWidth, shapeCornerRadius, fontSize, fontStyle, nextNumber, generateId, onAnnotationSelect, onAnnotationAdd, isTransformerNode, spacePressed, handlePanStart]);

  // Handle mouse move for drawing
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Handle pan move
    if (isPanning) {
      handlePanMove(e);
      return;
    }

    if (!isDrawing || !drawStart || !tempAnnotation) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Convert to unscaled coordinates (accounting for stage position including pan offset and centering)
    const stageX = stage.x();
    const stageY = stage.y();
    const x = (pos.x - stageX) / scale;
    const y = (pos.y - stageY) / scale;

    const width = x - drawStart.x;
    const height = y - drawStart.y;

    if (tempAnnotation.type === 'arrow' || tempAnnotation.type === 'line') {
      setTempAnnotation({
        ...tempAnnotation,
        points: [0, 0, width, height],
        width: width,
        height: height,
      });
    } else {
      // For rectangle and ellipse, handle negative dimensions
      const newX = width < 0 ? x : drawStart.x;
      const newY = height < 0 ? y : drawStart.y;
      setTempAnnotation({
        ...tempAnnotation,
        x: newX,
        y: newY,
        width: Math.abs(width),
        height: Math.abs(height),
      });
    }
  }, [isDrawing, drawStart, tempAnnotation, scale, isPanning, handlePanMove]);

  // Handle mouse up to complete drawing
  const handleMouseUp = useCallback(() => {
    // Handle pan end
    if (isPanning) {
      handlePanEnd();
      return;
    }

    if (!isDrawing || !tempAnnotation) {
      setIsDrawing(false);
      return;
    }

    // Only add if the shape has some size (use Math.abs for arrows/lines with signed dimensions)
    if (Math.abs(tempAnnotation.width) > 5 || Math.abs(tempAnnotation.height) > 5) {
      onAnnotationAdd(tempAnnotation);

      // Auto-switch to select tool after drawing arrow or line for easier selection
      if ((tempAnnotation.type === 'arrow' || tempAnnotation.type === 'line') && onToolChange) {
        onToolChange('select');
        // Auto-select the newly drawn shape
        onAnnotationSelect(tempAnnotation.id);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempAnnotation(null);
  }, [isDrawing, tempAnnotation, onAnnotationAdd, isPanning, handlePanEnd, onToolChange, onAnnotationSelect]);

  if (!screenshot) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center text-slate-500">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" strokeWidth={1} />
          <p className="text-lg">No screenshot</p>
          <p className="text-sm mt-1">Capture a screenshot to start editing</p>
        </div>
      </div>
    );
  }

  const imageSrc = `data:image/png;base64,${screenshot.data}`;

  // Calculate output dimensions based on ratio
  const { totalWidth: baseTotalWidth, totalHeight: baseTotalHeight } = calculateOutputDimensions(
    screenshot.width,
    screenshot.height,
    padding,
    outputRatio
  );

  // Calculate image size while preserving aspect ratio
  // The padding value is the MINIMUM padding (applied to the constraining dimension)
  const availableWidth = baseTotalWidth - padding * 2;
  const availableHeight = baseTotalHeight - padding * 2;
  const imageAspectRatio = screenshot.width / screenshot.height;
  const availableAspectRatio = availableWidth / availableHeight;

  let innerWidth: number;
  let innerHeight: number;

  if (imageAspectRatio > availableAspectRatio) {
    // Image is wider than available space - width is the constraint
    innerWidth = availableWidth;
    innerHeight = availableWidth / imageAspectRatio;
  } else {
    // Image is taller than available space - height is the constraint
    innerHeight = availableHeight;
    innerWidth = availableHeight * imageAspectRatio;
  }

  // Calculate actual padding (centered)
  const actualPaddingX = (baseTotalWidth - innerWidth) / 2;
  const actualPaddingY = (baseTotalHeight - innerHeight) / 2;

  // Calculate inset scale (0% = 1.0, 50% = 0.5)
  const insetScale = 1 - inset / 100;
  // Calculate offset to keep screenshot centered after scale
  const insetOffsetX = innerWidth * (1 - insetScale) / 2;
  const insetOffsetY = innerHeight * (1 - insetScale) / 2;

  // With snapshot-based crop, the screenshot is already cropped, so we use full dimensions
  const totalWidth = baseTotalWidth;
  const totalHeight = baseTotalHeight;

  const stageWidth = totalWidth * scale;
  const stageHeight = totalHeight * scale;

  // Check if background is a gradient or image
  const isGradient = backgroundColor.includes('gradient');
  const isImageBackground = backgroundColor.startsWith('url(');

  // Determine cursor based on state
  const getCursor = () => {
    if (spacePressed || isPanning) return 'grab';
    if (activeTool === 'select') return 'default';
    return 'crosshair';
  };

  // Check if content is larger than container (show scrollbars)
  const contentWidth = totalWidth * scale;
  const contentHeight = totalHeight * scale;
  const containerWidth = containerSize.width - 80;
  const containerHeight = containerSize.height - 80;
  const needsScroll = contentWidth > containerWidth || contentHeight > containerHeight;

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden p-10 flex items-center justify-center relative">
      {/* Zoom indicator */}
      {userZoom !== 1 && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded z-10">
          {Math.round(userZoom * 100)}%
        </div>
      )}
      <div
        className={`rounded-lg ${needsScroll ? 'overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800' : 'overflow-hidden'}`}
        style={{
          width: containerWidth,
          height: containerHeight,
          background: '#1e293b',
        }}
      >
        <div
          style={{
            width: needsScroll ? Math.max(contentWidth, containerWidth) : containerWidth,
            height: needsScroll ? Math.max(contentHeight, containerHeight) : containerHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Stage
            ref={activeStageRef}
            width={needsScroll ? contentWidth : containerWidth}
            height={needsScroll ? contentHeight : containerHeight}
            scaleX={scale}
            scaleY={scale}
            x={needsScroll ? 0 : panOffset.x + (containerWidth - stageWidth) / 2}
            y={needsScroll ? 0 : panOffset.y + (containerHeight - stageHeight) / 2}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            // onWheel={handleWheel} // Disabled: scroll wheel zoom
            style={{ cursor: getCursor() }}
          >
          <Layer>
            {/* Background (for export) */}
            {!isImageBackground && (
              <Rect
                x={0}
                y={0}
                width={baseTotalWidth}
                height={baseTotalHeight}
                fill={isGradient ? undefined : backgroundColor}
                fillLinearGradientStartPoint={isGradient ? { x: 0, y: 0 } : undefined}
                fillLinearGradientEndPoint={isGradient ? { x: baseTotalWidth, y: baseTotalHeight } : undefined}
                fillLinearGradientColorStops={isGradient ? parseGradient(backgroundColor) : undefined}
              />
            )}

            {/* Background image (for export) */}
            {isImageBackground && (
              <Group
                clipFunc={(ctx) => {
                  ctx.beginPath();
                  ctx.rect(0, 0, baseTotalWidth, baseTotalHeight);
                  ctx.closePath();
                }}
              >
                <BackgroundImage
                  src={backgroundColor.slice(4, -1)}
                  width={baseTotalWidth}
                  height={baseTotalHeight}
                />
              </Group>
            )}

            {/* Inset background - revealed when screenshot is scaled down */}
            {inset > 0 && insetBackgroundColor && (
              <Rect
                x={actualPaddingX}
                y={actualPaddingY}
                width={innerWidth}
                height={innerHeight}
                fill={insetBackgroundColor}
                cornerRadius={cornerRadius}
                listening={false}
              />
            )}

            {/* Screenshot with shadow (inset scales the entire group) */}
            <Group
              x={actualPaddingX + insetOffsetX}
              y={actualPaddingY + insetOffsetY}
              scaleX={insetScale}
              scaleY={insetScale}
            >
              {/* Shadow rect - same size as image, with blur shadow */}
              <Rect
                x={0}
                y={0}
                width={innerWidth}
                height={innerHeight}
                fill="#000"
                cornerRadius={cornerRadius}
                shadowColor="rgba(0,0,0,0.5)"
                shadowBlur={shadowSize}
                shadowOffset={{ x: 0, y: shadowSize / 4 }}
                shadowEnabled={shadowSize > 0}
              />

              {/* Screenshot image (scaled down to fit within padding) */}
              <ScreenshotImage
                src={imageSrc}
                cornerRadius={cornerRadius}
                displayWidth={innerWidth}
                displayHeight={innerHeight}
              />

              {/* Border rect - rendered above image */}
              {borderEnabled && borderWeight > 0 && (() => {
                // Calculate border offset based on type: outside (-0.5), center (0), inside (+0.5)
                const offsetMultiplier = borderType === 'outside' ? -1 : borderType === 'inside' ? 1 : 0;
                const offset = (borderWeight / 2) * offsetMultiplier;
                // Adjust corner radius to match image's curve when border is offset
                const borderCornerRadius = Math.max(0, cornerRadius - offset);
                return (
                  <Rect
                    x={offset}
                    y={offset}
                    width={innerWidth - offset * 2}
                    height={innerHeight - offset * 2}
                    stroke={borderColor}
                    strokeWidth={borderWeight}
                    cornerRadius={borderCornerRadius}
                    opacity={borderOpacity / 100}
                    listening={false}
                  />
                );
              })()}
            </Group>

            {/* Annotations */}
            <AnnotationShapes
              annotations={tempAnnotation ? [...annotations, tempAnnotation] : annotations}
              selectedId={selectedAnnotationId}
              onSelect={onAnnotationSelect}
              onUpdate={onAnnotationUpdate}
              scale={scale}
            />

            {/* Spotlight overlays - dim areas outside spotlight regions */}
            <SpotlightOverlay
              spotlights={(tempAnnotation ? [...annotations, tempAnnotation] : annotations).filter(a => a.type === 'spotlight')}
              totalWidth={baseTotalWidth}
              totalHeight={baseTotalHeight}
            />

            {/* Crop overlay - visible when crop tool is active */}
            {cropMode && (
              <CropOverlay
                imageX={actualPaddingX}
                imageY={actualPaddingY}
                imageWidth={innerWidth}
                imageHeight={innerHeight}
                cropArea={cropArea}
                aspectRatio={cropAspectRatio}
                isDrawing={isDrawingCrop}
                onCropChange={onCropChange}
                onCropStart={onCropStart}
                onDrawingChange={onDrawingCropChange}
              />
            )}
          </Layer>
        </Stage>
        </div>
      </div>
    </div>
  );
}
