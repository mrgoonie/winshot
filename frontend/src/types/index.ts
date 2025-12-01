export interface CaptureResult {
  width: number;
  height: number;
  data: string;
}

export interface WindowInfo {
  handle: number;
  title: string;
  className: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CaptureMode = 'fullscreen' | 'region' | 'window';

export interface EditorState {
  screenshot: CaptureResult | null;
  isCapturing: boolean;
  captureMode: CaptureMode | null;
}

// Annotation types
export type AnnotationType = 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text';

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  // For arrows and lines
  points?: number[];
  // For text annotations
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic';
  textAlign?: 'left' | 'center' | 'right';
}

export type EditorTool = 'select' | 'crop' | AnnotationType;

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatio = 'free' | '16:9' | '4:3' | '1:1' | '9:16' | '3:4';
