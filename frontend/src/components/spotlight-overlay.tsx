import { Shape, Group } from 'react-konva';
import { Annotation } from '../types';

interface SpotlightOverlayProps {
  spotlights: Annotation[];
  totalWidth: number;
  totalHeight: number;
}

// Default dim opacity for spotlights
const DEFAULT_DIM_OPACITY = 0.7;

export function SpotlightOverlay({
  spotlights,
  totalWidth,
  totalHeight,
}: SpotlightOverlayProps) {
  // If no spotlights, don't render anything
  if (spotlights.length === 0) {
    return null;
  }

  // Use the first spotlight's dimOpacity for consistency (or could average them)
  const dimOpacity = spotlights[0].dimOpacity ?? DEFAULT_DIM_OPACITY;

  return (
    <Group listening={false}>
      <Shape
        sceneFunc={(context, shape) => {
          // Draw the full overlay rectangle
          context.beginPath();
          context.rect(0, 0, totalWidth, totalHeight);

          // Cut out each spotlight region using the evenodd fill rule
          // This creates "holes" in the overlay where spotlights are
          spotlights.forEach((spotlight) => {
            // Draw rectangle counter-clockwise to create a hole with evenodd
            context.moveTo(spotlight.x, spotlight.y);
            context.lineTo(spotlight.x, spotlight.y + spotlight.height);
            context.lineTo(spotlight.x + spotlight.width, spotlight.y + spotlight.height);
            context.lineTo(spotlight.x + spotlight.width, spotlight.y);
            context.closePath();
          });

          context.fillStyle = `rgba(0,0,0,${dimOpacity})`;
          // Use evenodd fill rule to create holes where spotlights are
          context.fill('evenodd');
        }}
        // Hit function for better performance (no hit detection needed)
        hitFunc={() => {}}
      />
    </Group>
  );
}
