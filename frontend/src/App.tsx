import { useState, useRef, useCallback, useEffect } from 'react';
import { useUndoRedo } from './hooks/use-undo-redo';
import Konva from 'konva';
import { TitleBar } from './components/title-bar';
import { CaptureToolbar } from './components/capture-toolbar';
import { WindowPicker } from './components/window-picker';
import { EditorCanvas } from './components/editor-canvas';
import { SettingsPanel } from './components/settings-panel';
import { SettingsModal } from './components/settings-modal';
import { UpdateModal } from './components/update-modal';
import { StatusBar } from './components/status-bar';
import { AnnotationToolbar } from './components/annotation-toolbar';
import { ExportToolbar } from './components/export-toolbar';
import { CropToolbar } from './components/crop-toolbar';
import { CaptureResult, CaptureMode, WindowInfo, Annotation, EditorTool, OutputRatio, CropArea, CropAspectRatio, CropState } from './types';
import {
  CaptureFullscreen,
  CaptureWindow,
  SaveImage,
  QuickSave,
  MinimizeToTray,
  PrepareRegionCapture,
  FinishRegionCapture,
  UpdateWindowSize,
  GetConfig,
  OpenImage,
  GetClipboardImage,
  CheckForUpdate,
  GetSkippedVersion,
} from '../wailsjs/go/main/App';
import { updater } from '../wailsjs/go/models';
import { EventsOn, EventsOff, WindowGetSize } from '../wailsjs/runtime/runtime';

// Storage key for persistent editor settings
const EDITOR_SETTINGS_KEY = 'winshot-editor-settings';

interface EditorSettings {
  padding: number;
  cornerRadius: number;
  shadowSize: number;
  backgroundColor: string;
  outputRatio: OutputRatio;
  showBackground: boolean;
}

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  padding: 40,
  cornerRadius: 12,
  shadowSize: 20,
  backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  outputRatio: 'auto',
  showBackground: true,
};

// Load settings from localStorage
function loadEditorSettings(): EditorSettings {
  try {
    const stored = localStorage.getItem(EDITOR_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_EDITOR_SETTINGS, ...parsed };
    }
  } catch {
    // Invalid stored data, use defaults
  }
  return DEFAULT_EDITOR_SETTINGS;
}

// Save settings to localStorage
function saveEditorSettings(settings: EditorSettings): void {
  localStorage.setItem(EDITOR_SETTINGS_KEY, JSON.stringify(settings));
}

// Helper to parse ratio string into numeric ratio
function parseRatio(ratio: OutputRatio): number | null {
  if (ratio === 'auto') return null;
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
}

// Calculate output dimensions based on ratio, screenshot, and padding
function calculateOutputDimensions(
  screenshotWidth: number,
  screenshotHeight: number,
  padding: number,
  outputRatio: OutputRatio
): { totalWidth: number; totalHeight: number } {
  const targetRatio = parseRatio(outputRatio);

  if (targetRatio === null) {
    // Auto mode: include padding if set, otherwise raw screenshot size
    if (padding > 0) {
      return {
        totalWidth: screenshotWidth + padding * 2,
        totalHeight: screenshotHeight + padding * 2
      };
    }
    return { totalWidth: screenshotWidth, totalHeight: screenshotHeight };
  }

  // Calculate dimensions to fit the screenshot with padding while maintaining target ratio
  const minWidth = screenshotWidth + padding * 2;
  const minHeight = screenshotHeight + padding * 2;
  const minAspect = minWidth / minHeight;

  if (targetRatio > minAspect) {
    // Target is wider - expand width to match ratio
    return {
      totalWidth: Math.round(minHeight * targetRatio),
      totalHeight: minHeight,
    };
  } else {
    // Target is taller - expand height to match ratio
    return {
      totalWidth: minWidth,
      totalHeight: Math.round(minWidth / targetRatio),
    };
  }
}

// Helper to constrain crop area to aspect ratio
function constrainToAspectRatio(area: CropArea, ratio: CropAspectRatio): CropArea {
  if (ratio === 'free') return area;
  // Guard against zero dimensions
  if (area.width <= 0 || area.height <= 0) return area;

  const ratios: Record<CropAspectRatio, number> = {
    'free': 0,
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '1:1': 1,
    '9:16': 9 / 16,
    '3:4': 3 / 4,
  };

  const targetRatio = ratios[ratio];
  const currentRatio = area.width / area.height;

  if (currentRatio > targetRatio) {
    // Too wide, adjust width
    return { ...area, width: area.height * targetRatio };
  } else {
    // Too tall, adjust height
    return { ...area, height: area.width / targetRatio };
  }
}

function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const [screenshot, setScreenshot] = useState<CaptureResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showWindowPicker, setShowWindowPicker] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();

  // Editor settings (loaded from localStorage with lazy initialization)
  const [padding, setPadding] = useState(() => loadEditorSettings().padding);
  const [cornerRadius, setCornerRadius] = useState(() => loadEditorSettings().cornerRadius);
  const [shadowSize, setShadowSize] = useState(() => loadEditorSettings().shadowSize);
  const [backgroundColor, setBackgroundColor] = useState(() => loadEditorSettings().backgroundColor);
  const [outputRatio, setOutputRatio] = useState<OutputRatio>(() => loadEditorSettings().outputRatio);
  const [showBackground, setShowBackground] = useState(() => loadEditorSettings().showBackground);
  // Stores settings when background is hidden, so they can be restored
  const [savedBackgroundSettings, setSavedBackgroundSettings] = useState<{
    padding: number;
    cornerRadius: number;
    outputRatio: OutputRatio;
  } | null>(null);

  // Annotation state with undo/redo support
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const {
    state: annotations,
    set: setAnnotations,
    undo: undoAnnotations,
    redo: redoAnnotations,
    reset: resetAnnotations,
    canUndo,
    canRedo,
  } = useUndoRedo<Annotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [strokeColor, setStrokeColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize, setFontSize] = useState(48);
  const [fontStyle, setFontStyle] = useState<'normal' | 'bold' | 'italic' | 'bold italic'>('normal');

  // Crop state - snapshot-based workflow
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [cropAspectRatio, setCropAspectRatio] = useState<CropAspectRatio>('free');
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  // Snapshot-based crop state
  const [cropState, setCropState] = useState<CropState>({
    originalImage: null,
    croppedImage: null,
    originalAnnotations: [],
    lastCropArea: null,
    isCropApplied: false,
  });

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Auto-copy state: tracks when a fresh capture needs auto-copy after canvas renders
  const [pendingAutoCopy, setPendingAutoCopy] = useState(false);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);

  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<updater.UpdateInfo | null>(null);

  // Persist editor settings to localStorage when they change
  useEffect(() => {
    saveEditorSettings({ padding, cornerRadius, shadowSize, backgroundColor, outputRatio, showBackground });
  }, [padding, cornerRadius, shadowSize, backgroundColor, outputRatio, showBackground]);

  // Check for updates on startup
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const cfg = await GetConfig();
        if (!cfg.update?.checkOnStartup) return;

        const currentVersion = __APP_VERSION__;
        const info = await CheckForUpdate(currentVersion);

        if (info && info.available) {
          // Check if user skipped this version
          const skippedVersion = await GetSkippedVersion();
          if (skippedVersion === info.latestVersion) return;

          setUpdateInfo(info);
          setShowUpdateModal(true);
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    };

    // Delay check to not slow down app startup
    const timer = setTimeout(checkForUpdates, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Handle background visibility toggle
  const handleShowBackgroundChange = useCallback((show: boolean) => {
    if (show) {
      // Restore previous settings when showing background
      if (savedBackgroundSettings !== null) {
        setPadding(savedBackgroundSettings.padding);
        setCornerRadius(savedBackgroundSettings.cornerRadius);
        setOutputRatio(savedBackgroundSettings.outputRatio);
        setSavedBackgroundSettings(null);
      }
    } else {
      // Save current settings and reset when hiding background
      setSavedBackgroundSettings({ padding, cornerRadius, outputRatio });
      setPadding(0);
      setCornerRadius(0);
      setOutputRatio('auto');
    }
    setShowBackground(show);
  }, [padding, cornerRadius, outputRatio, savedBackgroundSettings]);

  // Track window size for persistence on close
  // Use Wails WindowGetSize API for accurate DPI-aware dimensions
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const updateSize = async () => {
      try {
        const size = await WindowGetSize();
        UpdateWindowSize(size.w, size.h);
      } catch {
        // Fallback to window dimensions if Wails API fails
        UpdateWindowSize(window.outerWidth, window.outerHeight);
      }
    };
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateSize, 200);
    };
    window.addEventListener('resize', handleResize);
    // Initial size report
    updateSize();
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleCapture = useCallback(async (mode: CaptureMode) => {
    if (mode === 'window') {
      setShowWindowPicker(true);
      return;
    }

    if (mode === 'region') {
      // Native overlay handles region capture - just trigger it
      try {
        await PrepareRegionCapture();
        // Selection result comes via 'region:selected' event
      } catch (error) {
        console.error('Failed to start region capture:', error);
        setStatusMessage('Failed to start region capture');
        setTimeout(() => setStatusMessage(undefined), 3000);
      }
      return;
    }

    setIsCapturing(true);
    setStatusMessage('Capturing...');

    try {
      let result: CaptureResult;

      if (mode === 'fullscreen') {
        result = await CaptureFullscreen() as CaptureResult;
      } else {
        throw new Error('Invalid capture mode');
      }

      setScreenshot(result);
      // Reset annotations for new capture (clears history)
      resetAnnotations([]);
      setSelectedAnnotationId(null);
      setActiveTool('select');
      setStatusMessage(undefined);

      // Trigger auto-copy of styled canvas (handled by useEffect)
      setPendingAutoCopy(true);
    } catch (error) {
      console.error('Capture failed:', error);
      setStatusMessage('Capture failed');
      setTimeout(() => setStatusMessage(undefined), 3000);
    }

    setIsCapturing(false);
  }, [resetAnnotations]);

  const handleWindowSelect = async (window: WindowInfo) => {
    setShowWindowPicker(false);
    setIsCapturing(true);
    setStatusMessage(`Capturing: ${window.title}`);

    try {
      const result = await CaptureWindow(window.handle) as CaptureResult;
      setScreenshot(result);
      // Reset annotations for new capture (clears history)
      resetAnnotations([]);
      setSelectedAnnotationId(null);
      setActiveTool('select');
      setStatusMessage(undefined);

      // Trigger auto-copy of styled canvas (handled by useEffect)
      setPendingAutoCopy(true);
    } catch (error) {
      console.error('Window capture failed:', error);
      setStatusMessage('Capture failed');
      setTimeout(() => setStatusMessage(undefined), 3000);
    }

    setIsCapturing(false);
  };

  // Handle native overlay selection result (already cropped by backend)
  const handleNativeRegionSelect = useCallback((width: number, height: number, screenshotData: string) => {
    // Set screenshot directly - already cropped by Go backend
    setScreenshot({ width, height, data: screenshotData });

    // Reset annotations for new capture (clears history)
    resetAnnotations([]);
    setSelectedAnnotationId(null);
    setActiveTool('select');
    setStatusMessage(undefined);

    // Restore window to normal state
    FinishRegionCapture();

    // Trigger auto-copy of styled canvas (handled by useEffect)
    setPendingAutoCopy(true);
  }, [resetAnnotations]);

  const handleClear = useCallback(() => {
    setScreenshot(null);
    resetAnnotations([]);
    setSelectedAnnotationId(null);
    setStatusMessage(undefined);
    // Reset crop state
    setCropState({
      originalImage: null,
      croppedImage: null,
      originalAnnotations: [],
      lastCropArea: null,
      isCropApplied: false,
    });
    setCropArea(null);
    setCropMode(false);
  }, [resetAnnotations]);

  const handleImportImage = useCallback(async () => {
    setStatusMessage('Opening file dialog...');

    try {
      const result = await OpenImage();

      if (!result) {
        // User cancelled
        setStatusMessage(undefined);
        return;
      }

      setScreenshot(result as CaptureResult);
      // Reset annotations and crop state for imported image (clears history)
      resetAnnotations([]);
      setSelectedAnnotationId(null);
      setActiveTool('select');
      setCropState({
        originalImage: null,
        croppedImage: null,
        originalAnnotations: [],
        lastCropArea: null,
        isCropApplied: false,
      });
      setCropArea(null);
      setCropMode(false);
      setStatusMessage('Image imported successfully');
      setTimeout(() => setStatusMessage(undefined), 2000);
    } catch (error) {
      console.error('Import failed:', error);
      setStatusMessage('Failed to import image');
      setTimeout(() => setStatusMessage(undefined), 3000);
    }
  }, [resetAnnotations]);

  const handleClipboardCapture = useCallback(async () => {
    try {
      const result = await GetClipboardImage();

      if (!result) {
        setStatusMessage('No image in clipboard');
        setTimeout(() => setStatusMessage(undefined), 3000);
        return;
      }

      setScreenshot(result as CaptureResult);
      // Reset annotations and crop state for clipboard image (clears history)
      resetAnnotations([]);
      setSelectedAnnotationId(null);
      setActiveTool('select');
      setCropState({
        originalImage: null,
        croppedImage: null,
        originalAnnotations: [],
        lastCropArea: null,
        isCropApplied: false,
      });
      setCropArea(null);
      setCropMode(false);
      setStatusMessage('Image pasted from clipboard');
      setTimeout(() => setStatusMessage(undefined), 2000);
    } catch (error) {
      console.error('Clipboard paste failed:', error);
      setStatusMessage('No image in clipboard');
      setTimeout(() => setStatusMessage(undefined), 3000);
    }
  }, [resetAnnotations]);

  // Listen for global hotkey events and native overlay events from backend
  useEffect(() => {
    const handleFullscreen = () => {
      handleCapture('fullscreen');
    };
    const handleRegion = async () => {
      // Native overlay handles region capture - just trigger it
      try {
        await PrepareRegionCapture();
        // Selection result comes via 'region:selected' event
      } catch (error) {
        console.error('Failed to start region capture:', error);
        setStatusMessage('Failed to start region capture');
        setTimeout(() => setStatusMessage(undefined), 3000);
      }
    };
    const handleWindow = () => {
      setShowWindowPicker(true);
    };

    // Handle native overlay selection result (already cropped)
    const handleRegionSelected = (data: {
      width: number;
      height: number;
      screenshot: string;
    }) => {
      handleNativeRegionSelect(data.width, data.height, data.screenshot);
    };

    EventsOn('hotkey:fullscreen', handleFullscreen);
    EventsOn('hotkey:region', handleRegion);
    EventsOn('hotkey:window', handleWindow);
    EventsOn('region:selected', handleRegionSelected);

    return () => {
      EventsOff('hotkey:fullscreen');
      EventsOff('hotkey:region');
      EventsOff('hotkey:window');
      EventsOff('region:selected');
    };
  }, [handleCapture, handleNativeRegionSelect]);

  // Handle minimize to tray
  const handleMinimizeToTray = useCallback(() => {
    MinimizeToTray();
  }, []);

  // Annotation handlers
  const handleAnnotationAdd = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation]);
  }, []);

  const handleAnnotationSelect = useCallback((id: string | null) => {
    setSelectedAnnotationId(id);
  }, []);

  const handleAnnotationUpdate = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === id ? { ...ann, ...updates } : ann))
    );
  }, []);

  // Update selected annotation color when stroke color changes
  const handleStrokeColorChange = useCallback((color: string) => {
    setStrokeColor(color);
    if (selectedAnnotationId) {
      handleAnnotationUpdate(selectedAnnotationId, { stroke: color });
    }
  }, [selectedAnnotationId, handleAnnotationUpdate]);

  // Update selected annotation stroke width when it changes
  const handleStrokeWidthChange = useCallback((width: number) => {
    setStrokeWidth(width);
    if (selectedAnnotationId) {
      handleAnnotationUpdate(selectedAnnotationId, { strokeWidth: width });
    }
  }, [selectedAnnotationId, handleAnnotationUpdate]);

  // Update selected text annotation font size when it changes
  const handleFontSizeChange = useCallback((size: number) => {
    setFontSize(size);
    if (selectedAnnotationId) {
      const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);
      if (selectedAnnotation?.type === 'text') {
        handleAnnotationUpdate(selectedAnnotationId, { fontSize: size });
      }
    }
  }, [selectedAnnotationId, annotations, handleAnnotationUpdate]);

  // Update selected text annotation font style when it changes
  const handleFontStyleChange = useCallback((style: 'normal' | 'bold' | 'italic' | 'bold italic') => {
    setFontStyle(style);
    if (selectedAnnotationId) {
      const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);
      if (selectedAnnotation?.type === 'text') {
        handleAnnotationUpdate(selectedAnnotationId, { fontStyle: style });
      }
    }
  }, [selectedAnnotationId, annotations, handleAnnotationUpdate]);

  // Update selected arrow annotation curved property
  const handleCurvedChange = useCallback((curved: boolean) => {
    if (selectedAnnotationId) {
      const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);
      if (selectedAnnotation?.type === 'arrow') {
        handleAnnotationUpdate(selectedAnnotationId, { curved });
      }
    }
  }, [selectedAnnotationId, annotations, handleAnnotationUpdate]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedAnnotationId) {
      setAnnotations((prev) => prev.filter((ann) => ann.id !== selectedAnnotationId));
      setSelectedAnnotationId(null);
    }
  }, [selectedAnnotationId]);

  // Crop handlers - snapshot-based workflow
  const handleCropToolSelect = useCallback(() => {
    setActiveTool('crop');
    setCropMode(true);

    // If crop was previously applied, restore original for editing
    if (cropState.isCropApplied && cropState.originalImage) {
      // Restore original image and annotations for editing
      setScreenshot(cropState.originalImage);
      setAnnotations(cropState.originalAnnotations);
      // Show previous crop area as starting point
      if (cropState.lastCropArea) {
        setCropArea(cropState.lastCropArea);
      }
    }
  }, [cropState]);

  const handleCropChange = useCallback((area: CropArea) => {
    setCropArea(area);
  }, []);

  // Apply crop by capturing the crop region as a new image
  const handleCropApply = useCallback(() => {
    if (!cropArea || !screenshot) return;

    const stage = stageRef.current;
    if (!stage) return;

    // Save original state if not already saved
    const originalImage = cropState.originalImage || screenshot;
    const originalAnnotations = cropState.originalAnnotations.length > 0
      ? cropState.originalAnnotations
      : [...annotations];

    // Save current stage properties
    const oldScaleX = stage.scaleX();
    const oldScaleY = stage.scaleY();
    const oldX = stage.x();
    const oldY = stage.y();
    const oldWidth = stage.width();
    const oldHeight = stage.height();

    // Hide crop overlay group before capturing (named 'crop-overlay' in CropOverlay component)
    const cropOverlay = stage.findOne('.crop-overlay');
    if (cropOverlay) {
      cropOverlay.hide();
    }

    // Reset stage for accurate export at 1:1 scale
    stage.scaleX(1);
    stage.scaleY(1);
    stage.x(0);
    stage.y(0);

    // Ensure stage is large enough to contain crop region
    const neededWidth = cropArea.x + cropArea.width;
    const neededHeight = cropArea.y + cropArea.height;
    stage.width(Math.max(oldWidth, neededWidth));
    stage.height(Math.max(oldHeight, neededHeight));

    // Capture the crop region as base64
    const dataUrl = stage.toDataURL({
      mimeType: 'image/png',
      quality: 1,
      pixelRatio: 1,
      x: cropArea.x,
      y: cropArea.y,
      width: cropArea.width,
      height: cropArea.height,
    });

    // Restore crop overlay visibility
    if (cropOverlay) {
      cropOverlay.show();
    }

    // Restore stage properties
    stage.scaleX(oldScaleX);
    stage.scaleY(oldScaleY);
    stage.x(oldX);
    stage.y(oldY);
    stage.width(oldWidth);
    stage.height(oldHeight);

    // Extract base64 data from data URL
    const base64Data = dataUrl.split(',')[1];

    // Create new cropped screenshot
    const croppedImage: CaptureResult = {
      width: Math.round(cropArea.width),
      height: Math.round(cropArea.height),
      data: base64Data,
    };

    // Adjust annotations: reposition relative to crop origin and filter out-of-bounds
    const adjustedAnnotations = annotations
      .map(ann => ({
        ...ann,
        x: ann.x - cropArea.x,
        y: ann.y - cropArea.y,
        // Adjust points for arrows/lines
        points: ann.points ? [...ann.points] : undefined,
      }))
      .filter(ann => {
        // Keep annotation if it's at least partially visible in crop region
        const annRight = ann.x + ann.width;
        const annBottom = ann.y + ann.height;
        return annRight > 0 && ann.x < cropArea.width && annBottom > 0 && ann.y < cropArea.height;
      });

    // Update crop state
    setCropState({
      originalImage,
      croppedImage,
      originalAnnotations,
      lastCropArea: cropArea,
      isCropApplied: true,
    });

    // Set cropped image as current screenshot
    setScreenshot(croppedImage);
    // Reset annotations with new positions (clears undo history since canvas context changed)
    resetAnnotations(adjustedAnnotations);

    // Exit crop mode
    setCropMode(false);
    setCropArea(null);
    setActiveTool('select');
  }, [cropArea, screenshot, annotations, cropState, stageRef, resetAnnotations]);

  const handleCropCancel = useCallback(() => {
    // If crop was applied, restore the cropped view
    if (cropState.isCropApplied && cropState.croppedImage) {
      setScreenshot(cropState.croppedImage);
      // Recalculate annotations for cropped view
      const lastCrop = cropState.lastCropArea;
      if (lastCrop) {
        const adjustedAnnotations = cropState.originalAnnotations
          .map(ann => ({
            ...ann,
            x: ann.x - lastCrop.x,
            y: ann.y - lastCrop.y,
          }))
          .filter(ann => {
            const annRight = ann.x + ann.width;
            const annBottom = ann.y + ann.height;
            return annRight > 0 && ann.x < lastCrop.width && annBottom > 0 && ann.y < lastCrop.height;
          });
        setAnnotations(adjustedAnnotations);
      }
    }
    setCropMode(false);
    setCropArea(null);
    setIsDrawingCrop(false);
    setActiveTool('select');
  }, [cropState]);

  const handleCropAspectRatioChange = useCallback((ratio: CropAspectRatio) => {
    setCropAspectRatio(ratio);
    // If cropArea exists, constrain to new ratio
    if (cropArea) {
      const constrained = constrainToAspectRatio(cropArea, ratio);
      setCropArea(constrained);
    }
  }, [cropArea]);

  // Reset crop - restore original image
  const handleCropReset = useCallback(() => {
    if (cropState.originalImage) {
      setScreenshot(cropState.originalImage);
      // Reset annotations to original (clears undo history since canvas context changed)
      resetAnnotations(cropState.originalAnnotations);
    }
    setCropState({
      originalImage: null,
      croppedImage: null,
      originalAnnotations: [],
      lastCropArea: null,
      isCropApplied: false,
    });
    setCropArea(null);
    setCropMode(false);
    setActiveTool('select');
  }, [cropState, resetAnnotations]);

  // Tool change handler
  const handleToolChange = useCallback((tool: EditorTool) => {
    if (tool === 'crop') {
      handleCropToolSelect();
    } else {
      setActiveTool(tool);
      // Exit crop mode if switching to another tool
      if (cropMode) {
        setCropMode(false);
        setCropArea(null);
        setIsDrawingCrop(false);
      }
    }
  }, [cropMode, handleCropToolSelect]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo/Redo shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            redoAnnotations();
          } else {
            undoAnnotations();
          }
          return;
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redoAnnotations();
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId) {
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        // Cancel crop mode if active
        if (cropMode) {
          handleCropCancel();
        } else {
          setSelectedAnnotationId(null);
          setActiveTool('select');
        }
      } else if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        // Tool shortcuts (single keys without modifiers)
        const key = e.key.toLowerCase();
        switch (key) {
          case 'v':
            handleToolChange('select');
            break;
          case 'r':
            handleToolChange('rectangle');
            break;
          case 'e':
            handleToolChange('ellipse');
            break;
          case 'a':
            handleToolChange('arrow');
            break;
          case 'l':
            handleToolChange('line');
            break;
          case 't':
            handleToolChange('text');
            break;
          case 'c':
            handleCropToolSelect();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, handleDeleteSelected, handleToolChange, cropMode, handleCropCancel, handleCropToolSelect, undoAnnotations, redoAnnotations]);

  // Export helpers - simplified since cropped image is now the current screenshot
  const getCanvasDataUrl = useCallback((format: 'png' | 'jpeg'): string | null => {
    const stage = stageRef.current;
    if (!stage || !screenshot) return null;

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

    // Calculate the actual output dimensions
    const { totalWidth, totalHeight } = calculateOutputDimensions(
      screenshot.width,
      screenshot.height,
      padding,
      outputRatio
    );

    // Save current stage properties
    const oldScaleX = stage.scaleX();
    const oldScaleY = stage.scaleY();
    const oldX = stage.x();
    const oldY = stage.y();

    // Reset stage transform for accurate export at 1:1 scale
    stage.scaleX(1);
    stage.scaleY(1);
    stage.x(0);
    stage.y(0);

    // Export only the canvas content area (not the full stage which may be larger)
    const dataUrl = stage.toDataURL({
      mimeType,
      quality: 0.95,
      pixelRatio: 1,
      x: 0,
      y: 0,
      width: totalWidth,
      height: totalHeight,
    });

    // Restore stage properties
    stage.scaleX(oldScaleX);
    stage.scaleY(oldScaleY);
    stage.x(oldX);
    stage.y(oldY);

    return dataUrl;
  }, [screenshot, padding, outputRatio]);

  const getBase64FromDataUrl = (dataUrl: string): string => {
    return dataUrl.split(',')[1];
  };

  // Export handlers
  const handleSave = useCallback(async (format: 'png' | 'jpeg') => {
    const dataUrl = getCanvasDataUrl(format);
    if (!dataUrl) {
      setStatusMessage('Export failed: No canvas available');
      return;
    }

    setIsExporting(true);
    setStatusMessage('Saving...');

    try {
      const base64Data = getBase64FromDataUrl(dataUrl);
      const result = await SaveImage(base64Data, format);

      if (result.success) {
        setStatusMessage(`Saved to ${result.filePath}`);
      } else {
        setStatusMessage(result.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save failed:', error);
      setStatusMessage('Save failed');
    }

    setIsExporting(false);
    setTimeout(() => setStatusMessage(undefined), 3000);
  }, [getCanvasDataUrl]);

  const handleQuickSave = useCallback(async (format: 'png' | 'jpeg') => {
    const dataUrl = getCanvasDataUrl(format);
    if (!dataUrl) {
      setStatusMessage('Export failed: No canvas available');
      return;
    }

    setIsExporting(true);
    setStatusMessage('Saving...');

    try {
      const base64Data = getBase64FromDataUrl(dataUrl);
      const result = await QuickSave(base64Data, format);

      if (result.success) {
        setStatusMessage(`Saved to ${result.filePath}`);
      } else {
        setStatusMessage(result.error || 'Quick save failed');
      }
    } catch (error) {
      console.error('Quick save failed:', error);
      setStatusMessage('Quick save failed');
    }

    setIsExporting(false);
    setTimeout(() => setStatusMessage(undefined), 3000);
  }, [getCanvasDataUrl]);

  // Helper to copy styled canvas to clipboard (used by auto-copy and manual copy)
  const copyStyledCanvasToClipboard = useCallback(async (): Promise<boolean> => {
    const stage = stageRef.current;
    if (!stage || !screenshot) return false;

    try {
      // Calculate the actual output dimensions
      const { totalWidth, totalHeight } = calculateOutputDimensions(
        screenshot.width,
        screenshot.height,
        padding,
        outputRatio
      );

      // Save current stage properties
      const oldScaleX = stage.scaleX();
      const oldScaleY = stage.scaleY();
      const oldX = stage.x();
      const oldY = stage.y();

      // Reset stage transform for accurate export at 1:1 scale
      stage.scaleX(1);
      stage.scaleY(1);
      stage.x(0);
      stage.y(0);

      // Export only the canvas content area (not the full stage which may be larger)
      const canvas = stage.toCanvas({
        pixelRatio: 1,
        x: 0,
        y: 0,
        width: totalWidth,
        height: totalHeight,
      });

      // Restore stage properties
      stage.scaleX(oldScaleX);
      stage.scaleY(oldScaleY);
      stage.x(oldX);
      stage.y(oldY);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) return false;

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    } catch (error) {
      console.error('Failed to copy styled canvas:', error);
      return false;
    }
  }, [screenshot, padding, outputRatio]);

  // Manual copy to clipboard handler (uses helper)
  const handleCopyToClipboard = useCallback(async () => {
    if (!stageRef.current || !screenshot) {
      setStatusMessage('Copy failed: No canvas available');
      return;
    }

    setIsExporting(true);
    setStatusMessage('Copying to clipboard...');

    const success = await copyStyledCanvasToClipboard();

    if (success) {
      setStatusMessage('Copied to clipboard!');
    } else {
      setStatusMessage('Copy to clipboard failed');
    }

    setIsExporting(false);
    setTimeout(() => setStatusMessage(undefined), 2000);
  }, [screenshot, copyStyledCanvasToClipboard]);

  // Auto-copy styled canvas to clipboard after capture completes
  useEffect(() => {
    if (!pendingAutoCopy || !screenshot) return;

    let cancelled = false;

    const performAutoCopy = async () => {
      try {
        const cfg = await GetConfig();
        if (cancelled) return;

        if (!cfg.export?.autoCopyToClipboard) {
          setPendingAutoCopy(false);
          return;
        }

        // Wait for canvas to render with new screenshot
        // 300ms accounts for: React re-render + Konva image load
        await new Promise(resolve => setTimeout(resolve, 300));
        if (cancelled) return;

        const success = await copyStyledCanvasToClipboard();
        if (cancelled) return;

        if (success) {
          setStatusMessage('Copied to clipboard!');
          setTimeout(() => setStatusMessage(undefined), 2000);
        }
      } catch (err) {
        console.error('Auto-copy failed:', err);
      }

      if (!cancelled) {
        setPendingAutoCopy(false);
      }
    };

    performAutoCopy();

    return () => {
      cancelled = true;
    };
  }, [pendingAutoCopy, screenshot, copyStyledCanvasToClipboard]);

  // Keyboard shortcuts for export and import
  useEffect(() => {
    const handleExportKeyDown = (e: KeyboardEvent) => {
      // Ctrl+O for import (works anytime)
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        handleImportImage();
        return;
      }

      if (!screenshot) return;

      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleSave('png');
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleQuickSave('png');
      } else if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        handleCopyToClipboard();
      }
    };

    window.addEventListener('keydown', handleExportKeyDown);
    return () => window.removeEventListener('keydown', handleExportKeyDown);
  }, [screenshot, handleSave, handleQuickSave, handleCopyToClipboard, handleImportImage]);

  return (
    <div className="flex flex-col h-screen bg-transparent">
      <TitleBar onMinimize={handleMinimizeToTray} />
      <CaptureToolbar
        onCapture={handleCapture}
        isCapturing={isCapturing}
        hasScreenshot={!!screenshot}
        onClear={handleClear}
        onMinimize={handleMinimizeToTray}
        onOpenSettings={() => setShowSettings(true)}
        onImportImage={handleImportImage}
        onClipboardCapture={handleClipboardCapture}
      />

      {screenshot && !cropMode && (
        <>
          <AnnotationToolbar
            activeTool={activeTool}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            fontSize={fontSize}
            fontStyle={fontStyle}
            onToolChange={handleToolChange}
            onColorChange={handleStrokeColorChange}
            onStrokeWidthChange={handleStrokeWidthChange}
            onFontSizeChange={handleFontSizeChange}
            onFontStyleChange={handleFontStyleChange}
            onCurvedChange={handleCurvedChange}
            onDeleteSelected={handleDeleteSelected}
            hasSelection={!!selectedAnnotationId}
            selectedAnnotation={selectedAnnotationId ? annotations.find(a => a.id === selectedAnnotationId) : undefined}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undoAnnotations}
            onRedo={redoAnnotations}
          />
        </>
      )}

      {screenshot && cropMode && (
        <div className="flex justify-center py-2">
          <CropToolbar
            aspectRatio={cropAspectRatio}
            onAspectRatioChange={handleCropAspectRatioChange}
            onApply={handleCropApply}
            onCancel={handleCropCancel}
            onReset={handleCropReset}
            canApply={!!cropArea && cropArea.width >= 20 && cropArea.height >= 20}
            canReset={cropState.isCropApplied}
          />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <EditorCanvas
          screenshot={screenshot}
          padding={padding}
          cornerRadius={cornerRadius}
          shadowSize={shadowSize}
          backgroundColor={backgroundColor}
          outputRatio={outputRatio}
          stageRef={stageRef}
          activeTool={activeTool}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          fontSize={fontSize}
          fontStyle={fontStyle}
          onAnnotationAdd={handleAnnotationAdd}
          onAnnotationSelect={handleAnnotationSelect}
          onAnnotationUpdate={handleAnnotationUpdate}
          onToolChange={handleToolChange}
          // Crop props
          cropMode={cropMode}
          cropArea={cropArea}
          cropAspectRatio={cropAspectRatio}
          isDrawingCrop={isDrawingCrop}
          onCropChange={handleCropChange}
          onCropStart={handleCropChange}
          onDrawingCropChange={setIsDrawingCrop}
        />

        {screenshot && (
          <SettingsPanel
            padding={padding}
            cornerRadius={cornerRadius}
            shadowSize={shadowSize}
            backgroundColor={backgroundColor}
            outputRatio={outputRatio}
            showBackground={showBackground}
            imageWidth={screenshot.width}
            imageHeight={screenshot.height}
            onPaddingChange={setPadding}
            onCornerRadiusChange={setCornerRadius}
            onShadowSizeChange={setShadowSize}
            onBackgroundChange={setBackgroundColor}
            onOutputRatioChange={setOutputRatio}
            onShowBackgroundChange={handleShowBackgroundChange}
          />
        )}
      </div>

      {screenshot && (
        <ExportToolbar
          onSave={handleSave}
          onQuickSave={handleQuickSave}
          onCopyToClipboard={handleCopyToClipboard}
          isExporting={isExporting}
        />
      )}

      <StatusBar screenshot={screenshot} message={statusMessage} />

      <WindowPicker
        isOpen={showWindowPicker}
        onClose={() => setShowWindowPicker(false)}
        onSelect={handleWindowSelect}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        updateInfo={updateInfo}
      />
    </div>
  );
}

export default App;
