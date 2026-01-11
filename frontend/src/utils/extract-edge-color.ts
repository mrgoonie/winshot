/**
 * Extracts dominant color from image edges (4 borders).
 * Used for auto background color feature.
 */

const DEFAULT_COLOR = '#1a1a2e';
const ALPHA_THRESHOLD = 128;
const QUANTIZE_STEP = 32;
const MAX_CANVAS_DIM = 1920; // Downscale large images for performance

/**
 * Quantize RGB values to reduce color variance
 * Groups similar colors by rounding to step intervals
 */
function quantize(r: number, g: number, b: number, step: number): string {
  const qr = Math.round(r / step) * step;
  const qg = Math.round(g / step) * step;
  const qb = Math.round(b / step) * step;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `#${clamp(qr).toString(16).padStart(2, '0')}${clamp(qg).toString(16).padStart(2, '0')}${clamp(qb).toString(16).padStart(2, '0')}`;
}

/**
 * Extract dominant color from image edges
 * @param imageElement - Loaded HTMLImageElement
 * @param sampleRate - Sample every Nth pixel (default: 10)
 * @returns Hex color string (e.g., "#1a1a2e")
 */
export function extractDominantEdgeColor(
  imageElement: HTMLImageElement,
  sampleRate: number = 10
): string {
  // Validate input
  if (!imageElement || imageElement.width === 0 || imageElement.height === 0) {
    return DEFAULT_COLOR;
  }

  // Ensure valid sample rate
  const rate = Math.max(1, Math.floor(sampleRate));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return DEFAULT_COLOR;

  try {
    const { width, height } = imageElement;

    // Downscale large images for performance (<100ms on 4K)
    const scale = Math.min(1, MAX_CANVAS_DIM / Math.max(width, height));
    const canvasW = Math.floor(width * scale);
    const canvasH = Math.floor(height * scale);

    canvas.width = canvasW;
    canvas.height = canvasH;
    ctx.drawImage(imageElement, 0, 0, canvasW, canvasH);

    const colors: Map<string, number> = new Map();

    // Define edge regions to sample (4 borders, avoid corner overlap)
    const edges = [
      { x: 0, y: 0, w: canvasW, h: 1 },                // top
      { x: 0, y: canvasH - 1, w: canvasW, h: 1 },      // bottom
      { x: 0, y: 1, w: 1, h: Math.max(1, canvasH - 2) },          // left (exclude corners)
      { x: canvasW - 1, y: 1, w: 1, h: Math.max(1, canvasH - 2) }, // right (exclude corners)
    ];

    for (const edge of edges) {
      const data = ctx.getImageData(edge.x, edge.y, edge.w, edge.h).data;
      // Sample every rate pixels (4 bytes per pixel: RGBA)
      for (let i = 0; i < data.length; i += 4 * rate) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent pixels
        if (a < ALPHA_THRESHOLD) continue;

        const key = quantize(r, g, b, QUANTIZE_STEP);
        colors.set(key, (colors.get(key) || 0) + 1);
      }
    }

    // Find most frequent color
    let maxCount = 0;
    let dominantColor = DEFAULT_COLOR;
    colors.forEach((count, color) => {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    });

    return dominantColor;
  } catch {
    // Handle CORS errors or corrupted images
    return DEFAULT_COLOR;
  } finally {
    // Cleanup canvas to prevent memory leaks
    canvas.width = 0;
    canvas.height = 0;
  }
}
