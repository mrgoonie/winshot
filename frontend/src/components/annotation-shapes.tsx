import { useRef, useEffect, useState } from 'react';
import { Rect, Ellipse, Arrow, Line, Transformer, Group, Text } from 'react-konva';
import Konva from 'konva';
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
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const points = annotation.points || [0, 0, annotation.width, annotation.height];

  return (
    <>
      <Arrow
        ref={shapeRef}
        x={annotation.x}
        y={annotation.y}
        points={points}
        stroke={annotation.stroke}
        strokeWidth={annotation.strokeWidth}
        fill={annotation.stroke}
        pointerLength={annotation.strokeWidth * 3}
        pointerWidth={annotation.strokeWidth * 3}
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
          const newPoints = points.map((p, i) => (i % 2 === 0 ? p * scaleX : p * scaleY));
          onUpdate({
            x: node.x(),
            y: node.y(),
            points: newPoints,
            width: Math.abs(newPoints[2] - newPoints[0]),
            height: Math.abs(newPoints[3] - newPoints[1]),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        />
      )}
    </>
  );
}

function LineShape({ annotation, isSelected, onSelect, onUpdate }: ShapeProps) {
  const shapeRef = useRef<Konva.Line>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const points = annotation.points || [0, 0, annotation.width, annotation.height];

  return (
    <>
      <Line
        ref={shapeRef}
        x={annotation.x}
        y={annotation.y}
        points={points}
        stroke={annotation.stroke}
        strokeWidth={annotation.strokeWidth}
        lineCap="round"
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
          const newPoints = points.map((p, i) => (i % 2 === 0 ? p * scaleX : p * scaleY));
          onUpdate({
            x: node.x(),
            y: node.y(),
            points: newPoints,
            width: Math.abs(newPoints[2] - newPoints[0]),
            height: Math.abs(newPoints[3] - newPoints[1]),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        />
      )}
    </>
  );
}

function TextShape({ annotation, isSelected, onSelect, onUpdate }: ShapeProps) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current && !isEditing) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isEditing]);

  const handleDblClick = () => {
    setIsEditing(true);
    const textNode = shapeRef.current;
    if (!textNode) return;

    const stage = textNode.getStage();
    if (!stage) return;

    const textPosition = textNode.absolutePosition();
    const stageBox = stage.container().getBoundingClientRect();
    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y,
    };

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    textarea.value = annotation.text || 'Text';
    textarea.style.position = 'absolute';
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${textNode.width() * textNode.scaleX() + 20}px`;
    textarea.style.height = `${textNode.height() * textNode.scaleY() + 20}px`;
    textarea.style.fontSize = `${(annotation.fontSize || 16) * textNode.scaleX()}px`;
    textarea.style.border = '2px solid #3b82f6';
    textarea.style.padding = '4px';
    textarea.style.margin = '0';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'rgba(30, 41, 59, 0.95)';
    textarea.style.color = annotation.stroke;
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.fontFamily = annotation.fontFamily || 'Arial';
    textarea.style.zIndex = '10000';
    textarea.style.borderRadius = '4px';

    textarea.focus();

    const removeTextarea = () => {
      if (textarea.parentNode) {
        document.body.removeChild(textarea);
      }
      setIsEditing(false);
    };

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        onUpdate({ text: textarea.value });
        removeTextarea();
      }
      if (e.key === 'Escape') {
        removeTextarea();
      }
    });

    textarea.addEventListener('blur', () => {
      onUpdate({ text: textarea.value });
      removeTextarea();
    });
  };

  return (
    <>
      <Text
        ref={shapeRef}
        x={annotation.x}
        y={annotation.y}
        text={annotation.text || 'Text'}
        fontSize={annotation.fontSize || 16}
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
            fontSize: Math.max(8, (annotation.fontSize || 16) * scaleX),
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
