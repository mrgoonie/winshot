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
import { CaptureResult, CaptureMode, WindowInfo, Annotation, EditorTool, CropArea, AspectRatio } from './types';
import {
  CaptureFullscreen,
  CaptureWindow,
  GetDisplayBounds,
  SaveImage,
  QuickSave,
  MinimizeToTray,
  PrepareRegionCapture,
  FinishRegionCapture,
} from '../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime';

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

  // Editor settings
  const [padding, setPadding] = useState(40);
  const [cornerRadius, setCornerRadius] = useState(12);
  const [shadowSize, setShadowSize] = useState(20);
  const [backgroundColor, setBackgroundColor] = useState('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');

  // Annotation state
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [strokeColor, setStrokeColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);

  // Crop state
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId) {
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedAnnotationId(null);
        setActiveTool('select');
        setCropArea(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, handleDeleteSelected]);

  // Initialize crop area when crop tool is selected
  const handleToolChange = useCallback((tool: EditorTool) => {
    setActiveTool(tool);
    if (tool === 'crop' && screenshot) {
      // Initialize crop area to full image
      setCropArea({
        x: padding,
        y: padding,
        width: screenshot.width,
        height: screenshot.height,
      });
    } else if (tool !== 'crop') {
      setCropArea(null);
    }
  }, [screenshot, padding]);

  // Crop handlers
  const handleCropChange = useCallback((area: CropArea) => {
    setCropArea(area);
  }, []);

  const handleApplyCrop = useCallback(() => {
    if (!cropArea || !screenshot) return;

    // Calculate crop coordinates relative to the image (not including padding)
    const cropX = Math.max(0, cropArea.x - padding);
    const cropY = Math.max(0, cropArea.y - padding);
    const cropWidth = Math.min(cropArea.width, screenshot.width - cropX);
    const cropHeight = Math.min(cropArea.height, screenshot.height - cropY);

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
  }, [cropArea, screenshot, padding]);

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
    <div className="flex flex-col h-screen bg-slate-900">
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
            onPaddingChange={setPadding}
            onCornerRadiusChange={setCornerRadius}
            onShadowSizeChange={setShadowSize}
            onBackgroundChange={setBackgroundColor}
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
