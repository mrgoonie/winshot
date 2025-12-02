import { useState, useRef, useCallback, useEffect } from 'react';
import Konva from 'konva';
import { TitleBar } from './components/title-bar';
import { CaptureToolbar } from './components/capture-toolbar';
import { WindowPicker } from './components/window-picker';
import { RegionSelector } from './components/region-selector';
import { EditorCanvas } from './components/editor-canvas';
import { SettingsPanel } from './components/settings-panel';
import { SettingsModal } from './components/settings-modal';
import { StatusBar } from './components/status-bar';
import { AnnotationToolbar } from './components/annotation-toolbar';
import { CropToolbar } from './components/crop-toolbar';
import { ExportToolbar } from './components/export-toolbar';
import { CaptureResult, CaptureMode, WindowInfo, Annotation, EditorTool, CropArea, AspectRatio, OutputRatio } from './types';
import {
  CaptureFullscreen,
  CaptureWindow,
  GetDisplayBounds,
  SaveImage,
  QuickSave,
  MinimizeToTray,
  PrepareRegionCapture,
  FinishRegionCapture,
  UpdateWindowSize,
} from '../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime';

// Storage key for persistent editor settings
const EDITOR_SETTINGS_KEY = 'winshot-editor-settings';

interface EditorSettings {
  padding: number;
  cornerRadius: number;
  shadowSize: number;
  backgroundColor: string;
  outputRatio: OutputRatio;
}

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  padding: 40,
  cornerRadius: 12,
  shadowSize: 20,
  backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  outputRatio: 'auto',
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

function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const [screenshot, setScreenshot] = useState<CaptureResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showWindowPicker, setShowWindowPicker] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [displayBounds, setDisplayBounds] = useState({ width: 1920, height: 1080 });
  const [regionScreenshot, setRegionScreenshot] = useState<string | undefined>();
  const [regionScaleRatio, setRegionScaleRatio] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();

  // Editor settings (loaded from localStorage with lazy initialization)
  const [padding, setPadding] = useState(() => loadEditorSettings().padding);
  const [cornerRadius, setCornerRadius] = useState(() => loadEditorSettings().cornerRadius);
  const [shadowSize, setShadowSize] = useState(() => loadEditorSettings().shadowSize);
  const [backgroundColor, setBackgroundColor] = useState(() => loadEditorSettings().backgroundColor);
  const [outputRatio, setOutputRatio] = useState<OutputRatio>(() => loadEditorSettings().outputRatio);

  // Annotation state
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [strokeColor, setStrokeColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);

  // Crop state
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);

  // Persist editor settings to localStorage when they change
  useEffect(() => {
    saveEditorSettings({ padding, cornerRadius, shadowSize, backgroundColor, outputRatio });
  }, [padding, cornerRadius, shadowSize, backgroundColor, outputRatio]);

  // Track window size for persistence on close
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        UpdateWindowSize(window.outerWidth, window.outerHeight);
      }, 200);
    };
    window.addEventListener('resize', handleResize);
    // Initial size report
    UpdateWindowSize(window.outerWidth, window.outerHeight);
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
      // Prepare region capture - this will hide window, take screenshot, and make window fullscreen
      try {
        const data = await PrepareRegionCapture();
        if (!data.screenshot) {
          throw new Error('No screenshot data received');
        }
        setDisplayBounds({ width: data.width, height: data.height });
        setRegionScreenshot(data.screenshot.data);
        setRegionScaleRatio(data.scaleRatio || 1);
        setShowRegionSelector(true);
      } catch (error) {
        console.error('Failed to prepare region capture:', error);
        setStatusMessage('Failed to prepare region capture');
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
      setStatusMessage(undefined);
    } catch (error) {
      console.error('Capture failed:', error);
      setStatusMessage('Capture failed');
      setTimeout(() => setStatusMessage(undefined), 3000);
    }

    setIsCapturing(false);
  }, []);

  const handleWindowSelect = async (window: WindowInfo) => {
    setShowWindowPicker(false);
    setIsCapturing(true);
    setStatusMessage(`Capturing: ${window.title}`);

    try {
      const result = await CaptureWindow(window.handle) as CaptureResult;
      setScreenshot(result);
      setStatusMessage(undefined);
    } catch (error) {
      console.error('Window capture failed:', error);
      setStatusMessage('Capture failed');
      setTimeout(() => setStatusMessage(undefined), 3000);
    }

    setIsCapturing(false);
  };

  const handleRegionSelect = async (x: number, y: number, width: number, height: number) => {
    setShowRegionSelector(false);
    setIsCapturing(true);
    setStatusMessage('Capturing region...');

    try {
      // Crop the selected region from the fullscreen screenshot (client-side)
      if (!regionScreenshot) {
        throw new Error('No screenshot data available');
      }

      // Create an image from the fullscreen screenshot
      const img = new Image();
      img.onload = () => {
        // Apply DPI scale ratio to get actual pixel coordinates in the screenshot
        const scale = regionScaleRatio;
        const scaledX = Math.round(x * scale);
        const scaledY = Math.round(y * scale);
        const scaledWidth = Math.round(width * scale);
        const scaledHeight = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setStatusMessage('Failed to create canvas context');
          setIsCapturing(false);
          return;
        }

        // Crop the selected region from the high-DPI screenshot
        ctx.drawImage(img, scaledX, scaledY, scaledWidth, scaledHeight, 0, 0, scaledWidth, scaledHeight);

        // Get the cropped image as base64
        const croppedData = canvas.toDataURL('image/png').split(',')[1];
        setScreenshot({
          width: scaledWidth,
          height: scaledHeight,
          data: croppedData,
        });
        setStatusMessage(undefined);
        setIsCapturing(false);

        // Restore window to normal state
        FinishRegionCapture();
        setRegionScreenshot(undefined);
        setRegionScaleRatio(1);
      };
      img.onerror = () => {
        setStatusMessage('Failed to load screenshot');
        setIsCapturing(false);
        FinishRegionCapture();
        setRegionScreenshot(undefined);
        setRegionScaleRatio(1);
      };
      img.src = `data:image/png;base64,${regionScreenshot}`;
    } catch (error) {
      console.error('Region capture failed:', error);
      setStatusMessage('Capture failed');
      setTimeout(() => setStatusMessage(undefined), 3000);
      setIsCapturing(false);
      FinishRegionCapture();
      setRegionScreenshot(undefined);
      setRegionScaleRatio(1);
    }
  };

  const handleClear = () => {
    setScreenshot(null);
    setAnnotations([]);
    setSelectedAnnotationId(null);
    setStatusMessage(undefined);
  };

  // Listen for global hotkey events from backend
  useEffect(() => {
    const handleFullscreen = () => {
      handleCapture('fullscreen');
    };
    const handleRegion = async () => {
      // Prepare region capture - this will hide window, take screenshot, and make window fullscreen
      try {
        const data = await PrepareRegionCapture();
        if (!data.screenshot) {
          throw new Error('No screenshot data received');
        }
        setDisplayBounds({ width: data.width, height: data.height });
        setRegionScreenshot(data.screenshot.data);
        setRegionScaleRatio(data.scaleRatio || 1);
        setShowRegionSelector(true);
      } catch (error) {
        console.error('Failed to prepare region capture:', error);
        setStatusMessage('Failed to prepare region capture');
        setTimeout(() => setStatusMessage(undefined), 3000);
      }
    };
    const handleWindow = () => {
      setShowWindowPicker(true);
    };

    EventsOn('hotkey:fullscreen', handleFullscreen);
    EventsOn('hotkey:region', handleRegion);
    EventsOn('hotkey:window', handleWindow);

    return () => {
      EventsOff('hotkey:fullscreen');
      EventsOff('hotkey:region');
      EventsOff('hotkey:window');
    };
  }, [handleCapture]);

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

  const handleDeleteSelected = useCallback(() => {
    if (selectedAnnotationId) {
      setAnnotations((prev) => prev.filter((ann) => ann.id !== selectedAnnotationId));
      setSelectedAnnotationId(null);
    }
  }, [selectedAnnotationId]);

  // Helper to calculate inner dimensions preserving aspect ratio
  const calculateInnerDimensions = useCallback((imgWidth: number, imgHeight: number, pad: number) => {
    const availableWidth = imgWidth - pad * 2;
    const availableHeight = imgHeight - pad * 2;
    const imageAspectRatio = imgWidth / imgHeight;
    const availableAspectRatio = availableWidth / availableHeight;

    let innerWidth: number;
    let innerHeight: number;

    if (imageAspectRatio > availableAspectRatio) {
      innerWidth = availableWidth;
      innerHeight = availableWidth / imageAspectRatio;
    } else {
      innerHeight = availableHeight;
      innerWidth = availableHeight * imageAspectRatio;
    }

    const actualPaddingX = (imgWidth - innerWidth) / 2;
    const actualPaddingY = (imgHeight - innerHeight) / 2;

    return { innerWidth, innerHeight, actualPaddingX, actualPaddingY };
  }, []);

  // Initialize crop area when crop tool is selected
  const handleToolChange = useCallback((tool: EditorTool) => {
    setActiveTool(tool);
    if (tool === 'crop' && screenshot) {
      // Calculate inner dimensions preserving aspect ratio
      const { innerWidth, innerHeight, actualPaddingX, actualPaddingY } =
        calculateInnerDimensions(screenshot.width, screenshot.height, padding);
      setCropArea({
        x: actualPaddingX,
        y: actualPaddingY,
        width: innerWidth,
        height: innerHeight,
      });
    } else if (tool !== 'crop') {
      setCropArea(null);
    }
  }, [screenshot, padding, calculateInnerDimensions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId) {
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedAnnotationId(null);
        setActiveTool('select');
        setCropArea(null);
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
            handleToolChange('crop');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, handleDeleteSelected, handleToolChange]);

  // Crop handlers
  const handleCropChange = useCallback((area: CropArea) => {
    setCropArea(area);
  }, []);

  const handleApplyCrop = useCallback(() => {
    if (!cropArea || !screenshot) return;

    // Calculate inner dimensions preserving aspect ratio
    const { innerWidth, innerHeight, actualPaddingX, actualPaddingY } =
      calculateInnerDimensions(screenshot.width, screenshot.height, padding);

    // Scale factor to map back to original image coordinates
    const scaleX = screenshot.width / innerWidth;
    const scaleY = screenshot.height / innerHeight;

    // Calculate crop coordinates relative to the original image
    const cropX = Math.max(0, (cropArea.x - actualPaddingX) * scaleX);
    const cropY = Math.max(0, (cropArea.y - actualPaddingY) * scaleY);
    const cropWidth = Math.min(cropArea.width * scaleX, screenshot.width - cropX);
    const cropHeight = Math.min(cropArea.height * scaleY, screenshot.height - cropY);

    // Create a canvas to crop the image
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      // Get the cropped image as base64
      const croppedData = canvas.toDataURL('image/png').split(',')[1];
      setScreenshot({
        width: cropWidth,
        height: cropHeight,
        data: croppedData,
      });

      // Reset crop state
      setCropArea(null);
      setActiveTool('select');
    };
    img.src = `data:image/png;base64,${screenshot.data}`;
  }, [cropArea, screenshot, padding, calculateInnerDimensions]);

  const handleCancelCrop = useCallback(() => {
    setCropArea(null);
    setActiveTool('select');
  }, []);

  // Export helpers
  const getCanvasDataUrl = useCallback((format: 'png' | 'jpeg'): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = stage.toDataURL({ mimeType, quality: 0.95 });
    return dataUrl;
  }, []);

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

  const handleCopyToClipboard = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) {
      setStatusMessage('Copy failed: No canvas available');
      return;
    }

    setIsExporting(true);
    setStatusMessage('Copying to clipboard...');

    try {
      const canvas = stage.toCanvas();
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);

      setStatusMessage('Copied to clipboard!');
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      setStatusMessage('Copy to clipboard failed');
    }

    setIsExporting(false);
    setTimeout(() => setStatusMessage(undefined), 2000);
  }, []);

  // Keyboard shortcuts for export
  useEffect(() => {
    const handleExportKeyDown = (e: KeyboardEvent) => {
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
  }, [screenshot, handleSave, handleQuickSave, handleCopyToClipboard]);

  return (
    <div className="flex flex-col h-screen bg-surface-950">
      <TitleBar />
      <CaptureToolbar
        onCapture={handleCapture}
        isCapturing={isCapturing}
        hasScreenshot={!!screenshot}
        onClear={handleClear}
        onMinimize={handleMinimizeToTray}
        onOpenSettings={() => setShowSettings(true)}
      />

      {screenshot && (
        <>
          <AnnotationToolbar
            activeTool={activeTool}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            onToolChange={handleToolChange}
            onColorChange={handleStrokeColorChange}
            onStrokeWidthChange={handleStrokeWidthChange}
            onDeleteSelected={handleDeleteSelected}
            hasSelection={!!selectedAnnotationId}
          />
          <CropToolbar
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            onApplyCrop={handleApplyCrop}
            onCancelCrop={handleCancelCrop}
            isCropActive={activeTool === 'crop'}
          />
        </>
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
          onAnnotationAdd={handleAnnotationAdd}
          onAnnotationSelect={handleAnnotationSelect}
          onAnnotationUpdate={handleAnnotationUpdate}
          cropArea={cropArea}
          aspectRatio={aspectRatio}
          onCropChange={handleCropChange}
        />

        {screenshot && (
          <SettingsPanel
            padding={padding}
            cornerRadius={cornerRadius}
            shadowSize={shadowSize}
            backgroundColor={backgroundColor}
            outputRatio={outputRatio}
            imageWidth={screenshot.width}
            imageHeight={screenshot.height}
            onPaddingChange={setPadding}
            onCornerRadiusChange={setCornerRadius}
            onShadowSizeChange={setShadowSize}
            onBackgroundChange={setBackgroundColor}
            onOutputRatioChange={setOutputRatio}
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

      <RegionSelector
        isOpen={showRegionSelector}
        onClose={() => {
          setShowRegionSelector(false);
          FinishRegionCapture();
          setRegionScreenshot(undefined);
          setRegionScaleRatio(1);
        }}
        onSelect={handleRegionSelect}
        screenWidth={displayBounds.width}
        screenHeight={displayBounds.height}
        screenshotData={regionScreenshot}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default App;
