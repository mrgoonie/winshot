import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { CaptureResult, Annotation, AnnotationType, EditorTool, CropArea, AspectRatio, OutputRatio } from '../types';
import { AnnotationShapes } from './annotation-shapes';
import { CropOverlay } from './crop-overlay';

interface EditorCanvasProps {
  screenshot: CaptureResult | null;
  padding: number;
  cornerRadius: number;
  shadowSize: number;
  backgroundColor: string;
  outputRatio: OutputRatio;
  stageRef?: React.RefObject<Konva.Stage>;
  // Annotation props
  activeTool: EditorTool;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  strokeColor: string;
  strokeWidth: number;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationSelect: (id: string | null) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  // Crop props
  cropArea: CropArea | null;
  aspectRatio: AspectRatio;
  onCropChange: (area: CropArea) => void;
}

// Helper to parse ratio string into numeric ratio
function parseRatio(ratio: OutputRatio): number | null {
  if (ratio === 'auto') return null;
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
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
    // Auto mode: output size same as screenshot dimensions
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

export function EditorCanvas({
  screenshot,
  padding,
  cornerRadius,
  shadowSize,
  backgroundColor,
  outputRatio,
  stageRef,
  activeTool,
  annotations,
  selectedAnnotationId,
  strokeColor,
  strokeWidth,
  onAnnotationAdd,
  onAnnotationSelect,
  onAnnotationUpdate,
  cropArea,
  aspectRatio,
  onCropChange,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalStageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [tempAnnotation, setTempAnnotation] = useState<Annotation | null>(null);

  const activeStageRef = stageRef || internalStageRef;

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate scale to fit output in container
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
      setScale(Math.min(scaleX, scaleY, 1));
    }
  }, [screenshot, containerSize, padding, outputRatio]);

  // Generate unique ID for annotations
  const generateId = useCallback(() => {
    return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Handle mouse down for drawing
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'select') {
      // Check if we clicked on empty space
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.getClassName() === 'Rect';
      if (clickedOnEmpty) {
        onAnnotationSelect(null);
      }
      return;
    }

    // Crop tool is handled separately by CropOverlay
    if (activeTool === 'crop') {
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Convert to unscaled coordinates
    const x = pos.x / scale;
    const y = pos.y / scale;

    // For text tool, create text immediately on click
    if (activeTool === 'text') {
      const textAnnotation: Annotation = {
        id: generateId(),
        type: 'text',
        x,
        y,
        width: 200,
        height: 60,
        stroke: strokeColor,
        strokeWidth,
        text: 'Text',
        fontSize: 48,
        fontFamily: 'Arial',
        fontStyle: 'normal',
        textAlign: 'left',
      };
      onAnnotationAdd(textAnnotation);
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
      stroke: strokeColor,
      strokeWidth,
      points: annotationType === 'arrow' || annotationType === 'line' ? [0, 0, 0, 0] : undefined,
    };
    setTempAnnotation(newAnnotation);
  }, [activeTool, scale, strokeColor, strokeWidth, generateId, onAnnotationSelect, onAnnotationAdd]);

  // Handle mouse move for drawing
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawStart || !tempAnnotation) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const x = pos.x / scale;
    const y = pos.y / scale;

    const width = x - drawStart.x;
    const height = y - drawStart.y;

    if (tempAnnotation.type === 'arrow' || tempAnnotation.type === 'line') {
      setTempAnnotation({
        ...tempAnnotation,
        points: [0, 0, width, height],
        width: Math.abs(width),
        height: Math.abs(height),
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
  }, [isDrawing, drawStart, tempAnnotation, scale]);

  // Handle mouse up to complete drawing
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !tempAnnotation) {
      setIsDrawing(false);
      return;
    }

    // Only add if the shape has some size
    if (tempAnnotation.width > 5 || tempAnnotation.height > 5) {
      onAnnotationAdd(tempAnnotation);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempAnnotation(null);
  }, [isDrawing, tempAnnotation, onAnnotationAdd]);

  if (!screenshot) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center text-slate-500">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p className="text-lg">No screenshot</p>
          <p className="text-sm mt-1">Capture a screenshot to start editing</p>
        </div>
      </div>
    );
  }

  const imageSrc = `data:image/png;base64,${screenshot.data}`;

  // Calculate output dimensions based on ratio
  const { totalWidth, totalHeight } = calculateOutputDimensions(
    screenshot.width,
    screenshot.height,
    padding,
    outputRatio
  );

  // Calculate image size while preserving aspect ratio
  // The padding value is the MINIMUM padding (applied to the constraining dimension)
  const availableWidth = totalWidth - padding * 2;
  const availableHeight = totalHeight - padding * 2;
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
  const actualPaddingX = (totalWidth - innerWidth) / 2;
  const actualPaddingY = (totalHeight - innerHeight) / 2;

  const stageWidth = totalWidth * scale;
  const stageHeight = totalHeight * scale;

  // Check if background is a gradient or image
  const isGradient = backgroundColor.includes('gradient');
  const isImageBackground = backgroundColor.startsWith('url(');

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-10 flex items-center justify-center">
      <div
        className="rounded-lg overflow-hidden"
        style={{
          width: stageWidth,
          height: stageHeight,
          background: backgroundColor,
        }}
      >
        <Stage
          ref={activeStageRef}
          width={stageWidth}
          height={stageHeight}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        >
          <Layer>
            {/* Background (for export - only if solid color) */}
            {!isGradient && !isImageBackground && (
              <Rect
                x={0}
                y={0}
                width={totalWidth}
                height={totalHeight}
                fill={backgroundColor}
              />
            )}

            {/* Background image (for export) */}
            {isImageBackground && (
              <Group
                clipFunc={(ctx) => {
                  ctx.beginPath();
                  ctx.rect(0, 0, totalWidth, totalHeight);
                  ctx.closePath();
                }}
              >
                <BackgroundImage
                  src={backgroundColor.slice(4, -1)}
                  width={totalWidth}
                  height={totalHeight}
                />
              </Group>
            )}

            {/* Screenshot with shadow */}
            <Group x={actualPaddingX} y={actualPaddingY}>
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
            </Group>

            {/* Annotations */}
            <AnnotationShapes
              annotations={tempAnnotation ? [...annotations, tempAnnotation] : annotations}
              selectedId={selectedAnnotationId}
              onSelect={onAnnotationSelect}
              onUpdate={onAnnotationUpdate}
              scale={scale}
            />

            {/* Crop overlay */}
            {activeTool === 'crop' && cropArea && (
              <CropOverlay
                cropArea={cropArea}
                imageWidth={innerWidth}
                imageHeight={innerHeight}
                paddingX={actualPaddingX}
                paddingY={actualPaddingY}
                aspectRatio={aspectRatio}
                onCropChange={onCropChange}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
