import { useRef, useEffect } from 'react';
import { Group, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { Annotation, RedactIntensity } from '../types';

// Intensity presets for blur (blurRadius) and pixelate (pixelSize)
const BLUR_INTENSITY: Record<RedactIntensity, number> = { low: 5, medium: 15, high: 30 };
const PIXELATE_INTENSITY: Record<RedactIntensity, number> = { low: 8, medium: 16, high: 32 };

interface RedactShapeProps {
  annotation: Annotation;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Annotation>) => void;
  screenshotSrc: string;
  imageOffsetX: number;
  imageOffsetY: number;
  imageWidth: number;
  imageHeight: number;
}

export function RedactShape({
  annotation,
  isSelected,
  onSelect,
  onUpdate,
  screenshotSrc,
  imageOffsetX,
  imageOffsetY,
  imageWidth,
  imageHeight,
}: RedactShapeProps) {
  const rectRef = useRef<Konva.Rect>(null);
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [image] = useImage(screenshotSrc);

  const mode = annotation.redactMode || 'blur';
  const intensity = annotation.redactIntensity || 'medium';

  // Calculate crop position (region relative to screenshot)
  const cropX = annotation.x - imageOffsetX;
  const cropY = annotation.y - imageOffsetY;

  // Apply filter when image loads or settings change
  useEffect(() => {
    if (!imageRef.current || !image) return;

    const node = imageRef.current;

    if (mode === 'blur') {
      node.filters([Konva.Filters.Blur]);
      node.blurRadius(BLUR_INTENSITY[intensity]);
    } else {
      node.filters([Konva.Filters.Pixelate]);
      node.pixelSize(PIXELATE_INTENSITY[intensity]);
    }

    node.cache();
    node.getLayer()?.batchDraw();
  }, [image, mode, intensity]);

  // Re-cache when dimensions change
  useEffect(() => {
    if (!imageRef.current || !image) return;

    const timer = setTimeout(() => {
      if (imageRef.current) {
        imageRef.current.cache();
        imageRef.current.getLayer()?.batchDraw();
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [annotation.width, annotation.height, annotation.x, annotation.y, image]);

  // Connect transformer to the Rect (not the Group) for correct bounds
  useEffect(() => {
    if (isSelected && trRef.current && rectRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!image) return null;

  return (
    <>
      {/* Clipped filtered image - visual only, not draggable */}
      <Group
        x={annotation.x}
        y={annotation.y}
        clipFunc={(ctx) => {
          ctx.rect(0, 0, annotation.width, annotation.height);
        }}
        listening={false}
      >
        <KonvaImage
          ref={imageRef}
          image={image}
          x={-cropX}
          y={-cropY}
          width={imageWidth}
          height={imageHeight}
        />
      </Group>

      {/* Invisible Rect for interaction and transform - this defines the bounds */}
      <Rect
        ref={rectRef}
        x={annotation.x}
        y={annotation.y}
        width={annotation.width}
        height={annotation.height}
        fill="transparent"
        stroke={isSelected ? '#8b5cf6' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
        dash={isSelected ? [6, 3] : undefined}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onUpdate({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = rectRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onUpdate({
            x: node.x(),
            y: node.y(),
            width: Math.max(10, node.width() * scaleX),
            height: Math.max(10, node.height() * scaleY),
          });
        }}
      />

      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
