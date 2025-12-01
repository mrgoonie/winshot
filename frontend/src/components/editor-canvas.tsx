import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { CaptureResult, Annotation, AnnotationType, EditorTool, CropArea, AspectRatio } from '../types';
import { AnnotationShapes } from './annotation-shapes';
import { CropOverlay } from './crop-overlay';

interface EditorCanvasProps {
  screenshot: CaptureResult | null;
  padding: number;
  cornerRadius: number;
  shadowSize: number;
  backgroundColor: string;
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

function ScreenshotImage({ src, cornerRadius }: { src: string; cornerRadius: number }) {
  const [image] = useImage(src);

  if (!image) return null;

  return (
    <Group
      clipFunc={(ctx) => {
        ctx.beginPath();
        ctx.roundRect(0, 0, image.width, image.height, cornerRadius);
        ctx.closePath();
      }}
    >
      <KonvaImage image={image} x={0} y={0} />
    </Group>
  );
}

export function EditorCanvas({
  screenshot,
  padding,
  cornerRadius,
  shadowSize,
  backgroundColor,
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

  // Calculate scale to fit screenshot in container
  useEffect(() => {
    if (screenshot) {
      const totalWidth = screenshot.width + padding * 2;
      const totalHeight = screenshot.height + padding * 2;
      const scaleX = (containerSize.width - 80) / totalWidth;
      const scaleY = (containerSize.height - 80) / totalHeight;
      setScale(Math.min(scaleX, scaleY, 1));
    }
  }, [screenshot, containerSize, padding]);

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
        width: 100,
        height: 24,
        stroke: strokeColor,
        strokeWidth,
        text: 'Text',
        fontSize: 16,
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
  const totalWidth = screenshot.width + padding * 2;
  const totalHeight = screenshot.height + padding * 2;
  const stageWidth = totalWidth * scale;
  const stageHeight = totalHeight * scale;

  // Check if background is a gradient
  const isGradient = backgroundColor.includes('gradient');

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-10">
      <div
        className="mx-auto rounded-lg overflow-hidden"
        style={{
          width: stageWidth,
          height: stageHeight,
          background: backgroundColor,
          boxShadow: shadowSize > 0 ? `0 ${shadowSize}px ${shadowSize * 2}px rgba(0,0,0,0.3)` : 'none',
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
            {!isGradient && (
              <Rect
                x={0}
                y={0}
                width={totalWidth}
                height={totalHeight}
                fill={backgroundColor}
              />
            )}

            {/* Screenshot with shadow */}
            <Group x={padding} y={padding}>
              {/* Shadow behind image */}
              {shadowSize > 0 && (
                <Rect
                  x={shadowSize / 2}
                  y={shadowSize / 2}
                  width={screenshot.width}
                  height={screenshot.height}
                  fill="rgba(0,0,0,0.3)"
                  cornerRadius={cornerRadius}
                  filters={[Konva.Filters.Blur]}
                  blurRadius={shadowSize}
                />
              )}

              {/* Screenshot image */}
              <ScreenshotImage src={imageSrc} cornerRadius={cornerRadius} />
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
                imageWidth={screenshot.width}
                imageHeight={screenshot.height}
                padding={padding}
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
