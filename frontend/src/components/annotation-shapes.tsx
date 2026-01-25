import { useRef, useEffect, useState } from 'react';
import { Rect, Ellipse, Arrow, Line, Transformer, Group, Text, Circle, Shape } from 'react-konva';
import Konva from 'konva';

// Constants for better hit detection on thin shapes
const HIT_STROKE_WIDTH = 28; // Larger clickable area for lines/arrows (increased for easier selection)
const ENDPOINT_RADIUS = 6; // Radius of draggable endpoint handles
const ENDPOINT_HOVER_RADIUS = 8; // Slightly larger on hover

// Tapered arrow shape constants
const ARROW_TAIL_FACTOR = 0.5;   // Tail width = strokeWidth * 0.5
const ARROW_BODY_FACTOR = 2;     // Body-head junction = strokeWidth * 2
const ARROW_HEAD_LENGTH = 6;     // Arrowhead length = strokeWidth * 6
const ARROW_HEAD_WIDTH = 4;      // Arrowhead width = strokeWidth * 4

// Geometry helper: Calculate unit vector from p1 to p2
function unitVector(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

// Geometry helper: Perpendicular vector (90deg CCW rotation)
function perpendicular(ux: number, uy: number) {
  return { x: -uy, y: ux };
}

// Geometry helper: Quadratic Bezier point at parameter t
function quadBezierPoint(
  x0: number, y0: number, // start
  cx: number, cy: number, // control
  x1: number, y1: number, // end
  t: number
) {
  const mt = 1 - t;
  return {
    x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
    y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
  };
}

// Geometry helper: Quadratic Bezier tangent (derivative) at parameter t
function quadBezierTangent(
  x0: number, y0: number,
  cx: number, cy: number,
  x1: number, y1: number,
  t: number
) {
  // B'(t) = 2(1-t)(C-P0) + 2t(P1-C)
  const mt = 1 - t;
  const dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
  const dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

// Calculate 7-point polygon vertices for straight tapered arrow
function calculateStraightArrowVertices(
  x1: number, y1: number, // start (tail)
  x2: number, y2: number, // end (tip)
  strokeWidth: number
) {
  const tailWidth = strokeWidth * ARROW_TAIL_FACTOR;
  const bodyWidth = strokeWidth * ARROW_BODY_FACTOR;
  const headLength = strokeWidth * ARROW_HEAD_LENGTH;
  const headWidth = strokeWidth * ARROW_HEAD_WIDTH;

  const totalLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  // Guard for very short arrows
  const effectiveHeadLength = Math.min(headLength, totalLen * 0.6);

  // Early return for degenerate case
  if (totalLen < 1) {
    return [{ x: x1, y: y1 }];
  }

  // Direction and perpendicular
  const dir = unitVector(x1, y1, x2, y2);
  const perp = perpendicular(dir.x, dir.y);

  // Head junction point (where body meets head)
  const junctionX = x2 - dir.x * effectiveHeadLength;
  const junctionY = y2 - dir.y * effectiveHeadLength;

  // 7 vertices (clockwise from tail-left)
  return [
    // 1. Tail left
    { x: x1 + perp.x * tailWidth, y: y1 + perp.y * tailWidth },
    // 2. Body left (at junction)
    { x: junctionX + perp.x * bodyWidth, y: junctionY + perp.y * bodyWidth },
    // 3. Head left shoulder
    { x: junctionX + perp.x * headWidth, y: junctionY + perp.y * headWidth },
    // 4. Tip
    { x: x2, y: y2 },
    // 5. Head right shoulder
    { x: junctionX - perp.x * headWidth, y: junctionY - perp.y * headWidth },
    // 6. Body right (at junction)
    { x: junctionX - perp.x * bodyWidth, y: junctionY - perp.y * bodyWidth },
    // 7. Tail right
    { x: x1 - perp.x * tailWidth, y: y1 - perp.y * tailWidth },
  ];
}

// Calculate vertices for curved tapered arrow (body follows Bezier, arrowhead at tangent)
function calculateCurvedArrowVertices(
  x1: number, y1: number,    // start (tail)
  cx: number, cy: number,    // control point
  x2: number, y2: number,    // end (tip)
  strokeWidth: number
) {
  const tailWidth = strokeWidth * ARROW_TAIL_FACTOR;
  const bodyWidth = strokeWidth * ARROW_BODY_FACTOR;
  const headLength = strokeWidth * ARROW_HEAD_LENGTH;
  const headWidth = strokeWidth * ARROW_HEAD_WIDTH;

  // Approximate total curve length using straight-line distance
  const totalLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1;

  // Early return for degenerate case
  if (totalLen < 1) {
    return {
      leftEdge: [{ x: x1, y: y1 }],
      rightEdge: [{ x: x1, y: y1 }],
      headLeft: { x: x1, y: y1 },
      tip: { x: x2, y: y2 },
      headRight: { x: x1, y: y1 },
    };
  }

  // Guard for very short arrows
  const effectiveHeadLength = Math.min(headLength, totalLen * 0.6);

  // Calculate tHead (parameter where body meets arrowhead)
  const tHead = Math.max(0.5, 1 - effectiveHeadLength / totalLen);

  // Sample points along curve for smooth body edges (more samples = smoother)
  const samples = [0, 0.033, 0.067, 0.1, 0.133, 0.167, 0.2, 0.233, 0.267, 0.3, 0.333, 0.367, 0.4, 0.433, 0.467, 0.5, 0.533, 0.567, 0.6, 0.633, 0.667, 0.7, 0.733, 0.767, 0.8, 0.833, 0.867, 0.9, 0.933, 0.967, tHead];

  const leftEdge: { x: number; y: number }[] = [];
  const rightEdge: { x: number; y: number }[] = [];

  for (const t of samples) {
    const pt = quadBezierPoint(x1, y1, cx, cy, x2, y2, t);
    const tan = quadBezierTangent(x1, y1, cx, cy, x2, y2, t);
    const perp = perpendicular(tan.x, tan.y);

    // Interpolate width from tail to body junction
    const width = tailWidth + (bodyWidth - tailWidth) * (t / tHead);

    leftEdge.push({
      x: pt.x + perp.x * width,
      y: pt.y + perp.y * width,
    });
    rightEdge.push({
      x: pt.x - perp.x * width,
      y: pt.y - perp.y * width,
    });
  }

  // Arrowhead at endpoint using tangent direction
  const tipTan = quadBezierTangent(x1, y1, cx, cy, x2, y2, 1);
  const tipPerp = perpendicular(tipTan.x, tipTan.y);

  // Head junction point (on the curve at tHead)
  const junctionPt = quadBezierPoint(x1, y1, cx, cy, x2, y2, tHead);

  // Arrowhead vertices
  const headLeftShoulder = {
    x: junctionPt.x + tipPerp.x * headWidth,
    y: junctionPt.y + tipPerp.y * headWidth,
  };
  const headRightShoulder = {
    x: junctionPt.x - tipPerp.x * headWidth,
    y: junctionPt.y - tipPerp.y * headWidth,
  };

  return {
    leftEdge,
    rightEdge: rightEdge.slice().reverse(), // Reversed for clockwise drawing
    headLeft: headLeftShoulder,
    tip: { x: x2, y: y2 },
    headRight: headRightShoulder,
  };
}

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
        cornerRadius={annotation.cornerRadius || 0}
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
  const shapeRef = useRef<Konva.Shape>(null);
  const groupRef = useRef<Konva.Group>(null);
  const startCircleRef = useRef<Konva.Circle>(null);
  const endCircleRef = useRef<Konva.Circle>(null);
  const ctrlCircleRef = useRef<Konva.Circle>(null);
  const [hoveredEndpoint, setHoveredEndpoint] = useState<'start' | 'end' | 'ctrl' | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState<'start' | 'end' | 'ctrl' | null>(null);

  // Refs for temporary positions during drag (for real-time visual updates without React re-render)
  const tempPointsRef = useRef<number[] | null>(null);
  const tempCtrlRef = useRef<{ x: number; y: number } | null>(null);

  // Use annotation points or fallback
  const basePoints = annotation.points || [0, 0, annotation.width, annotation.height];
  const [x1, y1, x2, y2] = basePoints;

  // Calculate midpoint and default perpendicular offset for curved arrows
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;

  // Get control point position (use custom offset or calculate default)
  const getControlPoint = () => {
    if (annotation.curveOffset) {
      return {
        x: midX + annotation.curveOffset.x,
        y: midY + annotation.curveOffset.y,
      };
    }
    // Default: 20% of length perpendicular offset
    const curveAmount = length * 0.2;
    const perpX = (-dy / length) * curveAmount;
    const perpY = (dx / length) * curveAmount;
    return { x: midX + perpX, y: midY + perpY };
  };

  const ctrlPoint = getControlPoint();

  // For curved arrows, add a control point to create the curve
  const points = annotation.curved
    ? [x1, y1, ctrlPoint.x, ctrlPoint.y, x2, y2]
    : basePoints;

  const handleEndpointDragStart = (endpoint: 'start' | 'end' | 'ctrl') => {
    if (groupRef.current) {
      groupRef.current.draggable(false);
    }
    setDraggingEndpoint(endpoint);
  };

  const handleEndpointDragMove = (e: Konva.KonvaEventObject<DragEvent>, endpoint: 'start' | 'end' | 'ctrl') => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    // Update temp refs for real-time visual update (sceneFunc reads these)
    if (endpoint === 'ctrl') {
      tempCtrlRef.current = { x: newX, y: newY };
    } else if (endpoint === 'start') {
      const endX = basePoints[2];
      const endY = basePoints[3];
      tempPointsRef.current = [newX, newY, endX, endY];
    } else {
      const startX = basePoints[0];
      const startY = basePoints[1];
      tempPointsRef.current = [startX, startY, newX, newY];
    }
    // Force redraw using sceneFunc
    shapeRef.current?.getLayer()?.batchDraw();
  };

  const handleEndpointDragEnd = (e: Konva.KonvaEventObject<DragEvent>, endpoint: 'start' | 'end' | 'ctrl') => {
    // Stop event propagation to prevent Group's onDragEnd from firing
    e.cancelBubble = true;

    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    if (groupRef.current) {
      groupRef.current.draggable(true);
    }
    setDraggingEndpoint(null);

    // Clear temp refs after drag ends
    tempPointsRef.current = null;
    tempCtrlRef.current = null;

    if (endpoint === 'ctrl') {
      // When control point is dragged, save the offset from midpoint
      const offsetX = newX - midX;
      const offsetY = newY - midY;
      onUpdate({
        curveOffset: { x: offsetX, y: offsetY },
      });
    } else if (endpoint === 'start') {
      // When start point is dragged:
      // 1. Move the Group to the new start position
      // 2. Recalculate end point relative to new origin
      const endX = basePoints[2];
      const endY = basePoints[3];

      // The new group position is old position + start point offset
      const newGroupX = annotation.x + newX;
      const newGroupY = annotation.y + newY;

      // End point relative to new group origin
      const relativeEndX = endX - newX;
      const relativeEndY = endY - newY;

      // Reset the circle position immediately before React re-render
      node.x(0);
      node.y(0);

      // Clear curve offset when endpoints change (will recalculate default)
      onUpdate({
        x: newGroupX,
        y: newGroupY,
        points: [0, 0, relativeEndX, relativeEndY],
        width: relativeEndX,
        height: relativeEndY,
        curveOffset: undefined,
      });
    } else {
      // When end point is dragged, just update the end point
      // Clear curve offset when endpoints change (will recalculate default)
      onUpdate({
        points: [0, 0, newX, newY],
        width: newX,
        height: newY,
        curveOffset: undefined,
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
      <Shape
        ref={shapeRef}
        sceneFunc={(context, shape) => {
          // Use temp refs during drag, otherwise use annotation values
          const drawPoints = tempPointsRef.current || basePoints;
          const [px1, py1, px2, py2] = drawPoints;

          // For straight arrows (Phase 02), draw tapered polygon
          if (!annotation.curved) {
            const vertices = calculateStraightArrowVertices(
              px1, py1, px2, py2,
              annotation.strokeWidth
            );

            if (vertices.length < 2) {
              // Degenerate case - draw a small point
              context.beginPath();
              context.arc(px1, py1, 2, 0, Math.PI * 2);
              context.fillStrokeShape(shape);
              return;
            }

            context.beginPath();
            context.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
              context.lineTo(vertices[i].x, vertices[i].y);
            }
            context.closePath();
            context.fillStrokeShape(shape);
          } else {
            // Curved arrows - tapered body following Bezier curve
            const drawCtrl = tempCtrlRef.current || ctrlPoint;
            const { leftEdge, rightEdge, headLeft, tip, headRight } =
              calculateCurvedArrowVertices(
                px1, py1, drawCtrl.x, drawCtrl.y, px2, py2,
                annotation.strokeWidth
              );

            if (leftEdge.length < 2) {
              // Degenerate case
              context.beginPath();
              context.arc(px1, py1, 2, 0, Math.PI * 2);
              context.fillStrokeShape(shape);
              return;
            }

            context.beginPath();

            // Left edge (from tail to head junction)
            context.moveTo(leftEdge[0].x, leftEdge[0].y);
            for (let i = 1; i < leftEdge.length; i++) {
              context.lineTo(leftEdge[i].x, leftEdge[i].y);
            }

            // Arrowhead
            context.lineTo(headLeft.x, headLeft.y);
            context.lineTo(tip.x, tip.y);
            context.lineTo(headRight.x, headRight.y);

            // Right edge (from head junction back to tail)
            for (const pt of rightEdge) {
              context.lineTo(pt.x, pt.y);
            }

            context.closePath();
            context.fillStrokeShape(shape);
          }
        }}
        fill={annotation.stroke}
        hitFunc={(context, shape) => {
          // Draw enlarged polygon for generous hit area
          const drawPoints = tempPointsRef.current || basePoints;
          const [px1, py1, px2, py2] = drawPoints;
          const hitWidth = HIT_STROKE_WIDTH / 2;

          if (!annotation.curved) {
            // Straight arrow: simple rectangle
            const dx = px2 - px1;
            const dy = py2 - py1;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = -dy / len * hitWidth;
            const perpY = dx / len * hitWidth;

            context.beginPath();
            context.moveTo(px1 + perpX, py1 + perpY);
            context.lineTo(px2 + perpX, py2 + perpY);
            context.lineTo(px2 - perpX, py2 - perpY);
            context.lineTo(px1 - perpX, py1 - perpY);
            context.closePath();
          } else {
            // Curved arrow: follow the Bezier curve
            const drawCtrl = tempCtrlRef.current || ctrlPoint;
            const hitSamples = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
            const leftHit: {x: number, y: number}[] = [];
            const rightHit: {x: number, y: number}[] = [];

            for (const t of hitSamples) {
              const pt = quadBezierPoint(px1, py1, drawCtrl.x, drawCtrl.y, px2, py2, t);
              const tan = quadBezierTangent(px1, py1, drawCtrl.x, drawCtrl.y, px2, py2, t);
              const perp = perpendicular(tan.x, tan.y);
              leftHit.push({ x: pt.x + perp.x * hitWidth, y: pt.y + perp.y * hitWidth });
              rightHit.push({ x: pt.x - perp.x * hitWidth, y: pt.y - perp.y * hitWidth });
            }

            // Draw polygon following the curve
            context.beginPath();
            context.moveTo(leftHit[0].x, leftHit[0].y);
            for (let i = 1; i < leftHit.length; i++) {
              context.lineTo(leftHit[i].x, leftHit[i].y);
            }
            for (let i = rightHit.length - 1; i >= 0; i--) {
              context.lineTo(rightHit[i].x, rightHit[i].y);
            }
            context.closePath();
          }
          context.fillStrokeShape(shape);
        }}
      />
      {/* Draggable endpoint handles when selected */}
      {isSelected && (
        <>
          {/* Start point handle */}
          <Circle
            ref={startCircleRef}
            x={basePoints[0]}
            y={basePoints[1]}
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
            x={basePoints[2]}
            y={basePoints[3]}
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
          {/* Control point handle for curved arrows */}
          {annotation.curved && (
            <Circle
              ref={ctrlCircleRef}
              x={ctrlPoint.x}
              y={ctrlPoint.y}
              radius={hoveredEndpoint === 'ctrl' ? ENDPOINT_HOVER_RADIUS : ENDPOINT_RADIUS}
              fill="#a855f7"
              stroke="white"
              strokeWidth={2}
              draggable
              onMouseEnter={() => setHoveredEndpoint('ctrl')}
              onMouseLeave={() => setHoveredEndpoint(null)}
              onDragStart={() => handleEndpointDragStart('ctrl')}
              onDragMove={(e) => handleEndpointDragMove(e, 'ctrl')}
              onDragEnd={(e) => handleEndpointDragEnd(e, 'ctrl')}
              shadowColor="black"
              shadowBlur={3}
              shadowOpacity={0.3}
            />
          )}
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
        lineCap="square"
        lineJoin="miter"
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

function SpotlightShape({ annotation, isSelected, onSelect, onUpdate }: ShapeProps) {
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
        stroke={isSelected ? annotation.stroke : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
        dash={isSelected ? [8, 4] : undefined}
        fill="transparent"
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
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

function NumberShape({ annotation, isSelected, onSelect, onUpdate }: ShapeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Calculate circle radius based on the number of digits
  const numberValue = annotation.number || 1;
  const digitCount = numberValue.toString().length;
  const baseRadius = 18;
  const radius = baseRadius + (digitCount - 1) * 6; // Increase radius for multi-digit numbers
  const fontSize = radius * 1.2; // Font size relative to radius

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Group
        ref={groupRef}
        x={annotation.x}
        y={annotation.y}
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
          const node = groupRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          onUpdate({
            x: node.x(),
            y: node.y(),
            // Keep width/height in sync with the visual size
            width: radius * 2 * scaleX,
            height: radius * 2 * scaleX,
          });
        }}
      >
        {/* Circle background */}
        <Circle
          x={0}
          y={0}
          radius={radius}
          fill={annotation.stroke}
          shadowColor="black"
          shadowBlur={4}
          shadowOpacity={0.3}
          shadowOffsetY={2}
        />
        {/* Number text */}
        <Text
          x={-radius}
          y={-fontSize / 2}
          width={radius * 2}
          height={fontSize}
          text={numberValue.toString()}
          fontSize={fontSize}
          fontFamily="Arial"
          fontStyle="bold"
          fill="white"
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          rotateEnabled={false}
          keepRatio={true}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
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
    textarea.style.color = annotation.stroke || '#ef4444';
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
          case 'number':
            return <NumberShape key={annotation.id} {...props} />;
          case 'spotlight':
            return <SpotlightShape key={annotation.id} {...props} />;
          default:
            return null;
        }
      })}
    </Group>
  );
}
