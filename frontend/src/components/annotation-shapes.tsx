import { useRef, useEffect, useState } from 'react';
import { Rect, Ellipse, Arrow, Line, Transformer, Group, Text, Circle } from 'react-konva';
import Konva from 'konva';

// Constants for better hit detection on thin shapes
const HIT_STROKE_WIDTH = 20; // Larger clickable area for lines/arrows
const ENDPOINT_RADIUS = 6; // Radius of draggable endpoint handles
const ENDPOINT_HOVER_RADIUS = 8; // Slightly larger on hover

import { Annotation } from '../types';

interface AnnotationShapesProps {
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  scale: number;
}

interface ShapeProps {
  annotation: Annotation;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Annotation>) => void;
}

function RectangleShape({ annotation, isSelected, onSelect, onUpdate }: ShapeProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={annotation.x}
        y={annotation.y}
        width={annotation.width}
        height={annotation.height}
        stroke={annotation.stroke}
        strokeWidth={annotation.strokeWidth}
        fill={annotation.fill}
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
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onUpdate({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

function EllipseShape({ annotation, isSelected, onSelect, onUpdate }: ShapeProps) {
  const shapeRef = useRef<Konva.Ellipse>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Ellipse
        ref={shapeRef}
        x={annotation.x + annotation.width / 2}
        y={annotation.y + annotation.height / 2}
        radiusX={annotation.width / 2}
        radiusY={annotation.height / 2}
        stroke={annotation.stroke}
        strokeWidth={annotation.strokeWidth}
        fill={annotation.fill}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onUpdate({
            x: e.target.x() - annotation.width / 2,
            y: e.target.y() - annotation.height / 2,
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onUpdate({
            x: node.x() - node.radiusX() * scaleX,
            y: node.y() - node.radiusY() * scaleY,
            width: Math.max(5, node.radiusX() * 2 * scaleX),
            height: Math.max(5, node.radiusY() * 2 * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

function ArrowShape({ annotation, isSelected, onSelect, onUpdate }: ShapeProps) {
  const shapeRef = useRef<Konva.Arrow>(null);
  const groupRef = useRef<Konva.Group>(null);
  const startCircleRef = useRef<Konva.Circle>(null);
  const endCircleRef = useRef<Konva.Circle>(null);
  const [hoveredEndpoint, setHoveredEndpoint] = useState<'start' | 'end' | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState<'start' | 'end' | null>(null);

  // Use annotation points or fallback
  const points = annotation.points || [0, 0, annotation.width, annotation.height];

  const handleEndpointDragStart = (endpoint: 'start' | 'end') => {
    if (groupRef.current) {
      groupRef.current.draggable(false);
    }
    setDraggingEndpoint(endpoint);
  };

  const handleEndpointDragMove = (e: Konva.KonvaEventObject<DragEvent>, endpoint: 'start' | 'end') => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    // Update arrow visually in real-time
    if (shapeRef.current) {
      if (endpoint === 'start') {
        const endX = points[2];
        const endY = points[3];
        shapeRef.current.points([newX, newY, endX, endY]);
      } else {
        const startX = points[0];
        const startY = points[1];
        shapeRef.current.points([startX, startY, newX, newY]);
      }
      shapeRef.current.getLayer()?.batchDraw();
    }
  };

  const handleEndpointDragEnd = (e: Konva.KonvaEventObject<DragEvent>, endpoint: 'start' | 'end') => {
    // Stop event propagation to prevent Group's onDragEnd from firing
    e.cancelBubble = true;

    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    if (groupRef.current) {
      groupRef.current.draggable(true);
    }
    setDraggingEndpoint(null);

    if (endpoint === 'start') {
      // When start point is dragged:
      // 1. Move the Group to the new start position
      // 2. Recalculate end point relative to new origin
      const endX = points[2];
      const endY = points[3];

      // The new group position is old position + start point offset
      const newGroupX = annotation.x + newX;
      const newGroupY = annotation.y + newY;

      // End point relative to new group origin
      const relativeEndX = endX - newX;
      const relativeEndY = endY - newY;

      // Reset the circle position immediately before React re-render
      node.x(0);
      node.y(0);

      onUpdate({
        x: newGroupX,
        y: newGroupY,
        points: [0, 0, relativeEndX, relativeEndY],
        width: relativeEndX,
        height: relativeEndY,
      });
    } else {
      // When end point is dragged, just update the end point
      // Keep the circle at its new position
      onUpdate({
        points: [0, 0, newX, newY],
        width: newX,
        height: newY,
      });
    }
  };

  return (
    <Group
      ref={groupRef}
      x={annotation.x}
      y={annotation.y}
      draggable={draggingEndpoint === null}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onUpdate({
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
    >
      <Arrow
        ref={shapeRef}
        points={points}
        stroke={annotation.stroke}
        strokeWidth={annotation.strokeWidth}
        fill={annotation.stroke}
        pointerLength={annotation.strokeWidth * 3}
        pointerWidth={annotation.strokeWidth * 3}
        hitStrokeWidth={HIT_STROKE_WIDTH}
      />
      {/* Draggable endpoint handles when selected */}
      {isSelected && (
        <>
          {/* Start point handle */}
          <Circle
            ref={startCircleRef}
            x={points[0]}
            y={points[1]}
            radius={hoveredEndpoint === 'start' ? ENDPOINT_HOVER_RADIUS : ENDPOINT_RADIUS}
            fill="white"
            stroke={annotation.stroke}
            strokeWidth={2}
            draggable
            onMouseEnter={() => setHoveredEndpoint('start')}
            onMouseLeave={() => setHoveredEndpoint(null)}
            onDragStart={() => handleEndpointDragStart('start')}
            onDragMove={(e) => handleEndpointDragMove(e, 'start')}
            onDragEnd={(e) => handleEndpointDragEnd(e, 'start')}
            shadowColor="black"
            shadowBlur={3}
            shadowOpacity={0.3}
          />
          {/* End point handle */}
          <Circle
            ref={endCircleRef}
            x={points[2]}
            y={points[3]}
            radius={hoveredEndpoint === 'end' ? ENDPOINT_HOVER_RADIUS : ENDPOINT_RADIUS}
            fill="white"
            stroke={annotation.stroke}
            strokeWidth={2}
            draggable
            onMouseEnter={() => setHoveredEndpoint('end')}
            onMouseLeave={() => setHoveredEndpoint(null)}
            onDragStart={() => handleEndpointDragStart('end')}
            onDragMove={(e) => handleEndpointDragMove(e, 'end')}
            onDragEnd={(e) => handleEndpointDragEnd(e, 'end')}
            shadowColor="black"
            shadowBlur={3}
            shadowOpacity={0.3}
          />
        </>
      )}
    </Group>
  );
}

function LineShape({ annotation, isSelected, onSelect, onUpdate }: ShapeProps) {
  const shapeRef = useRef<Konva.Line>(null);
  const groupRef = useRef<Konva.Group>(null);
  const startCircleRef = useRef<Konva.Circle>(null);
  const endCircleRef = useRef<Konva.Circle>(null);
  const [hoveredEndpoint, setHoveredEndpoint] = useState<'start' | 'end' | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState<'start' | 'end' | null>(null);

  // Use annotation points or fallback
  const points = annotation.points || [0, 0, annotation.width, annotation.height];

  const handleEndpointDragStart = (endpoint: 'start' | 'end') => {
    if (groupRef.current) {
      groupRef.current.draggable(false);
    }
    setDraggingEndpoint(endpoint);
  };

  const handleEndpointDragMove = (e: Konva.KonvaEventObject<DragEvent>, endpoint: 'start' | 'end') => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    // Update line visually in real-time
    if (shapeRef.current) {
      if (endpoint === 'start') {
        const endX = points[2];
        const endY = points[3];
        shapeRef.current.points([newX, newY, endX, endY]);
      } else {
        const startX = points[0];
        const startY = points[1];
        shapeRef.current.points([startX, startY, newX, newY]);
      }
      shapeRef.current.getLayer()?.batchDraw();
    }
  };

  const handleEndpointDragEnd = (e: Konva.KonvaEventObject<DragEvent>, endpoint: 'start' | 'end') => {
    // Stop event propagation to prevent Group's onDragEnd from firing
    e.cancelBubble = true;

    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    if (groupRef.current) {
      groupRef.current.draggable(true);
    }
    setDraggingEndpoint(null);

    if (endpoint === 'start') {
      // When start point is dragged:
      // 1. Move the Group to the new start position
      // 2. Recalculate end point relative to new origin
      const endX = points[2];
      const endY = points[3];

      // The new group position is old position + start point offset
      const newGroupX = annotation.x + newX;
      const newGroupY = annotation.y + newY;

      // End point relative to new group origin
      const relativeEndX = endX - newX;
      const relativeEndY = endY - newY;

      // Reset the circle position immediately before React re-render
      node.x(0);
      node.y(0);

      onUpdate({
        x: newGroupX,
        y: newGroupY,
        points: [0, 0, relativeEndX, relativeEndY],
        width: relativeEndX,
        height: relativeEndY,
      });
    } else {
      // When end point is dragged, just update the end point
      // Keep the circle at its new position
      onUpdate({
        points: [0, 0, newX, newY],
        width: newX,
        height: newY,
      });
    }
  };

  return (
    <Group
      ref={groupRef}
      x={annotation.x}
      y={annotation.y}
      draggable={draggingEndpoint === null}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onUpdate({
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
    >
      <Line
        ref={shapeRef}
        points={points}
        stroke={annotation.stroke}
        strokeWidth={annotation.strokeWidth}
        lineCap="round"
        hitStrokeWidth={HIT_STROKE_WIDTH}
      />
      {/* Draggable endpoint handles when selected */}
      {isSelected && (
        <>
          {/* Start point handle */}
          <Circle
            ref={startCircleRef}
            x={points[0]}
            y={points[1]}
            radius={hoveredEndpoint === 'start' ? ENDPOINT_HOVER_RADIUS : ENDPOINT_RADIUS}
            fill="white"
            stroke={annotation.stroke}
            strokeWidth={2}
            draggable
            onMouseEnter={() => setHoveredEndpoint('start')}
            onMouseLeave={() => setHoveredEndpoint(null)}
            onDragStart={() => handleEndpointDragStart('start')}
            onDragMove={(e) => handleEndpointDragMove(e, 'start')}
            onDragEnd={(e) => handleEndpointDragEnd(e, 'start')}
            shadowColor="black"
            shadowBlur={3}
            shadowOpacity={0.3}
          />
          {/* End point handle */}
          <Circle
            ref={endCircleRef}
            x={points[2]}
            y={points[3]}
            radius={hoveredEndpoint === 'end' ? ENDPOINT_HOVER_RADIUS : ENDPOINT_RADIUS}
            fill="white"
            stroke={annotation.stroke}
            strokeWidth={2}
            draggable
            onMouseEnter={() => setHoveredEndpoint('end')}
            onMouseLeave={() => setHoveredEndpoint(null)}
            onDragStart={() => handleEndpointDragStart('end')}
            onDragMove={(e) => handleEndpointDragMove(e, 'end')}
            onDragEnd={(e) => handleEndpointDragEnd(e, 'end')}
            shadowColor="black"
            shadowBlur={3}
            shadowOpacity={0.3}
          />
        </>
      )}
    </Group>
  );
}

function TextShape({ annotation, isSelected, onSelect, onUpdate }: ShapeProps) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [isEditing, setIsEditing] = useState(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current && !isEditing) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isEditing]);

  // Auto-enter edit mode for new text annotations (empty text)
  useEffect(() => {
    if (!hasInitializedRef.current && isSelected && (!annotation.text || annotation.text === '')) {
      hasInitializedRef.current = true;
      // Small delay to ensure the shape is fully rendered
      setTimeout(() => {
        startEditing();
      }, 50);
    }
  }, [isSelected, annotation.text]);

  const startEditing = () => {
    setIsEditing(true);
    const textNode = shapeRef.current;
    if (!textNode) return;

    const stage = textNode.getStage();
    if (!stage) return;

    const textPosition = textNode.absolutePosition();
    const stageBox = stage.container().getBoundingClientRect();
    const stageScale = stage.scaleX(); // Get stage scale
    const areaPosition = {
      x: stageBox.left + textPosition.x * stageScale,
      y: stageBox.top + textPosition.y * stageScale,
    };

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const currentFontSize = annotation.fontSize || 48;
    const scaledFontSize = currentFontSize * stageScale;

    // Calculate font weight and style for CSS
    const fontStyle = annotation.fontStyle || 'normal';
    const fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal';
    const fontStyleCss = fontStyle.includes('italic') ? 'italic' : 'normal';

    textarea.value = annotation.text || '';
    textarea.placeholder = 'Type here...';
    textarea.style.position = 'absolute';
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.minWidth = `${200 * stageScale}px`;
    textarea.style.minHeight = `${scaledFontSize + 16}px`;
    textarea.style.fontSize = `${scaledFontSize}px`;
    textarea.style.lineHeight = '1.2';
    textarea.style.fontWeight = fontWeight;
    textarea.style.fontStyle = fontStyleCss;
    textarea.style.border = '2px solid #8b5cf6';
    textarea.style.padding = '8px 12px';
    textarea.style.margin = '0';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'rgba(15, 23, 42, 0.95)';
    textarea.style.color = annotation.stroke;
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.fontFamily = annotation.fontFamily || 'Arial';
    textarea.style.zIndex = '10000';
    textarea.style.borderRadius = '8px';
    textarea.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.3)';
    textarea.style.backdropFilter = 'blur(8px)';

    // Auto-resize function
    const autoResize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      // Also update width for long single lines
      const textWidth = Math.max(200 * stageScale, textarea.scrollWidth);
      textarea.style.width = `${textWidth}px`;
    };

    textarea.addEventListener('input', autoResize);

    // Initial resize
    requestAnimationFrame(autoResize);

    textarea.focus();
    textarea.select();

    const removeTextarea = () => {
      if (textarea.parentNode) {
        textarea.removeEventListener('input', autoResize);
        document.body.removeChild(textarea);
      }
      setIsEditing(false);
    };

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const newText = textarea.value || 'Text';
        onUpdate({ text: newText });
        removeTextarea();
      }
      if (e.key === 'Escape') {
        // On escape, keep existing text or set default
        const newText = textarea.value || annotation.text || 'Text';
        onUpdate({ text: newText });
        removeTextarea();
      }
    });

    textarea.addEventListener('blur', () => {
      const newText = textarea.value || 'Text';
      onUpdate({ text: newText });
      removeTextarea();
    });
  };

  const handleDblClick = () => {
    startEditing();
  };

  // Display text or placeholder
  const displayText = annotation.text || 'Text';

  return (
    <>
      <Text
        ref={shapeRef}
        x={annotation.x}
        y={annotation.y}
        text={displayText}
        fontSize={annotation.fontSize || 48}
        fontFamily={annotation.fontFamily || 'Arial'}
        fontStyle={annotation.fontStyle || 'normal'}
        fill={annotation.stroke}
        align={annotation.textAlign || 'left'}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        visible={!isEditing}
        onDragEnd={(e) => {
          onUpdate({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          onUpdate({
            x: node.x(),
            y: node.y(),
            fontSize: Math.max(8, (annotation.fontSize || 48) * scaleX),
          });
        }}
      />
      {isSelected && !isEditing && (
        <Transformer
          ref={trRef}
          enabledAnchors={['middle-left', 'middle-right']}
          boundBoxFunc={(oldBox, newBox) => {
            newBox.width = Math.max(30, newBox.width);
            return newBox;
          }}
        />
      )}
    </>
  );
}

export function AnnotationShapes({
  annotations,
  selectedId,
  onSelect,
  onUpdate,
}: AnnotationShapesProps) {
  return (
    <Group>
      {annotations.map((annotation) => {
        const isSelected = annotation.id === selectedId;
        const props = {
          annotation,
          isSelected,
          onSelect: () => onSelect(annotation.id),
          onUpdate: (updates: Partial<Annotation>) => onUpdate(annotation.id, updates),
        };

        switch (annotation.type) {
          case 'rectangle':
            return <RectangleShape key={annotation.id} {...props} />;
          case 'ellipse':
            return <EllipseShape key={annotation.id} {...props} />;
          case 'arrow':
            return <ArrowShape key={annotation.id} {...props} />;
          case 'line':
            return <LineShape key={annotation.id} {...props} />;
          case 'text':
            return <TextShape key={annotation.id} {...props} />;
          default:
            return null;
        }
      })}
    </Group>
  );
}
