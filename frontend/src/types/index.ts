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

export interface WindowInfoWithThumbnail extends WindowInfo {
  thumbnail: string; // Base64 encoded PNG thumbnail
}

export type CaptureMode = 'fullscreen' | 'region' | 'window';

export interface EditorState {
  screenshot: CaptureResult | null;
  isCapturing: boolean;
  captureMode: CaptureMode | null;
}

// Annotation types
export type AnnotationType = 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text' | 'spotlight' | 'number';

// Crop types
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CropAspectRatio = 'free' | '16:9' | '4:3' | '1:1' | '9:16' | '3:4';

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke?: string; // Optional: undefined = no stroke for shapes
  strokeWidth: number;
  fill?: string; // Optional: undefined = no fill
  cornerRadius?: number; // For rectangles: rounded corners (0-50)
  // For arrows and lines
  points?: number[];
  // For arrows - curved style
  curved?: boolean;
  // Control point offset for curved arrows (relative to midpoint, perpendicular direction)
  curveOffset?: { x: number; y: number };
  // For text annotations
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic';
  textAlign?: 'left' | 'center' | 'right';
  // For spotlight annotations
  dimOpacity?: number; // Opacity of the dimmed area (0-1, default 0.7)
  // For number annotations
  number?: number; // The numeric value displayed in the circle
}

export type EditorTool = 'select' | 'crop' | AnnotationType;

// Crop state for snapshot-based crop workflow
export interface CropState {
  // Original image data (always preserved for re-crop)
  originalImage: CaptureResult | null;
  // Cropped image result (displayed when crop is applied)
  croppedImage: CaptureResult | null;
  // Original annotations before crop (for restore)
  originalAnnotations: Annotation[];
  // Last applied crop area (for showing previous selection on re-crop)
  lastCropArea: CropArea | null;
  // Whether crop is currently applied (showing cropped view)
  isCropApplied: boolean;
}

// Output canvas ratio - determines the final export dimensions
export type OutputRatio = 'auto' | '1:1' | '4:3' | '3:2' | '16:9' | '5:3' | '9:16' | '3:4' | '2:3';

// Border position type - determines where border stroke is rendered relative to edge
export type BorderType = 'outside' | 'center' | 'inside';

// App configuration types
export interface HotkeyConfig {
  fullscreen: string;
  region: string;
  window: string;
}

export interface StartupConfig {
  launchOnStartup: boolean;
  minimizeToTray: boolean;
  showNotification: boolean;
}

export interface QuickSaveConfig {
  folder: string;
  pattern: 'timestamp' | 'date' | 'increment';
}

export interface ExportConfig {
  defaultFormat: 'png' | 'jpeg';
  jpegQuality: number;
  includeBackground: boolean;
}

export interface AppConfig {
  hotkeys: HotkeyConfig;
  startup: StartupConfig;
  quickSave: QuickSaveConfig;
  export: ExportConfig;
}

// Library types - for screenshot history
export interface LibraryImage {
  filepath: string;
  filename: string;
  modifiedDate: string;
  thumbnail: string; // Base64 PNG
  width: number;
  height: number;
}
