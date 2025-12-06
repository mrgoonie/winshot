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
}

export type EditorTool = 'select' | 'crop' | AnnotationType;

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatio = 'free' | '16:9' | '4:3' | '1:1' | '9:16' | '3:4';

// Output canvas ratio - determines the final export dimensions
export type OutputRatio = 'auto' | '1:1' | '4:3' | '3:2' | '16:9' | '5:3' | '9:16' | '3:4' | '2:3';

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
