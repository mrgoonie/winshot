import { useRef, useEffect, useState, useCallback } from 'react';
import { Rect, Transformer, Group } from 'react-konva';
import Konva from 'konva';
import { CropArea, AspectRatio } from '../types';

interface CropOverlayProps {
  cropArea: CropArea;
  imageWidth: number;
  imageHeight: number;
  padding: number;
  aspectRatio: AspectRatio;
  onCropChange: (area: CropArea) => void;
}

const ASPECT_RATIO_VALUES: Record<AspectRatio, number | null> = {
  'free': null,
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '9:16': 9 / 16,
  '3:4': 3 / 4,
};

export function CropOverlay({
  cropArea,
  imageWidth,
  imageHeight,
  padding,
  aspectRatio,
  onCropChange,
}: CropOverlayProps) {
  const cropRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (trRef.current && cropRef.current) {
      trRef.current.nodes([cropRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, []);

  const constrainCrop = useCallback((newArea: CropArea): CropArea => {
    let { x, y, width, height } = newArea;

    // Ensure minimum size
    width = Math.max(20, width);
    height = Math.max(20, height);

    // Apply aspect ratio if set
    const ratio = ASPECT_RATIO_VALUES[aspectRatio];
    if (ratio !== null) {
      // Maintain aspect ratio based on width
      height = width / ratio;
    }

    // Constrain to image bounds (with padding offset)
    x = Math.max(padding, Math.min(x, padding + imageWidth - width));
    y = Math.max(padding, Math.min(y, padding + imageHeight - height));

    // Ensure we don't exceed bounds
    if (x + width > padding + imageWidth) {
      width = padding + imageWidth - x;
      if (ratio !== null) {
        height = width / ratio;
      }
    }
    if (y + height > padding + imageHeight) {
      height = padding + imageHeight - y;
      if (ratio !== null) {
        width = height * ratio;
      }
    }

    return { x, y, width, height };
  }, [aspectRatio, imageWidth, imageHeight, padding]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const constrained = constrainCrop({
      x: e.target.x(),
      y: e.target.y(),
      width: cropArea.width,
      height: cropArea.height,
    });
    onCropChange(constrained);
  };

  const handleTransformEnd = () => {
    const node = cropRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const constrained = constrainCrop({
      x: node.x(),
      y: node.y(),
      width: Math.max(20, node.width() * scaleX),
      height: Math.max(20, node.height() * scaleY),
    });

    onCropChange(constrained);
  };

  const totalWidth = imageWidth + padding * 2;
  const totalHeight = imageHeight + padding * 2;

  return (
    <Group>
      {/* Dark overlay outside crop area */}
      {/* Top */}
      <Rect
        x={0}
        y={0}
        width={totalWidth}
        height={cropArea.y}
        fill="rgba(0,0,0,0.6)"
        listening={false}
      />
      {/* Bottom */}
      <Rect
        x={0}
        y={cropArea.y + cropArea.height}
        width={totalWidth}
        height={totalHeight - (cropArea.y + cropArea.height)}
        fill="rgba(0,0,0,0.6)"
        listening={false}
      />
      {/* Left */}
      <Rect
        x={0}
        y={cropArea.y}
        width={cropArea.x}
        height={cropArea.height}
        fill="rgba(0,0,0,0.6)"
        listening={false}
      />
      {/* Right */}
      <Rect
        x={cropArea.x + cropArea.width}
        y={cropArea.y}
        width={totalWidth - (cropArea.x + cropArea.width)}
        height={cropArea.height}
        fill="rgba(0,0,0,0.6)"
        listening={false}
      />

      {/* Crop selection rectangle */}
      <Rect
        ref={cropRef}
        x={cropArea.x}
        y={cropArea.y}
        width={cropArea.width}
        height={cropArea.height}
        stroke="#3b82f6"
        strokeWidth={2}
        dash={[5, 5]}
        draggable
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />

      {/* Grid lines (rule of thirds) */}
      <Rect
        x={cropArea.x + cropArea.width / 3}
        y={cropArea.y}
        width={1}
        height={cropArea.height}
        fill="rgba(255,255,255,0.3)"
        listening={false}
      />
      <Rect
        x={cropArea.x + (cropArea.width * 2) / 3}
        y={cropArea.y}
        width={1}
        height={cropArea.height}
        fill="rgba(255,255,255,0.3)"
        listening={false}
      />
      <Rect
        x={cropArea.x}
        y={cropArea.y + cropArea.height / 3}
        width={cropArea.width}
        height={1}
        fill="rgba(255,255,255,0.3)"
        listening={false}
      />
      <Rect
        x={cropArea.x}
        y={cropArea.y + (cropArea.height * 2) / 3}
        width={cropArea.width}
        height={1}
        fill="rgba(255,255,255,0.3)"
        listening={false}
      />

      <Transformer
        ref={trRef}
        keepRatio={aspectRatio !== 'free'}
        enabledAnchors={
          aspectRatio === 'free'
            ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
            : ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        }
        boundBoxFunc={(oldBox, newBox) => {
          if (newBox.width < 20 || newBox.height < 20) {
            return oldBox;
          }
          return newBox;
        }}
      />
    </Group>
  );
}
