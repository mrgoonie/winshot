import { CaptureMode } from '../types';
import { Monitor, Scan, AppWindow, Settings, ChevronDown, FolderOpen } from 'lucide-react';

interface CaptureToolbarProps {
  onCapture: (mode: CaptureMode) => void;
  isCapturing: boolean;
  hasScreenshot: boolean;
  onClear: () => void;
  onMinimize?: () => void;
  onOpenSettings?: () => void;
  onImportImage?: () => void;
}

export function CaptureToolbar({ onCapture, isCapturing, hasScreenshot, onClear, onMinimize, onOpenSettings, onImportImage }: CaptureToolbarProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 glass">
      <div className="flex gap-2">
        {/* Fullscreen - Primary gradient button */}
        <button
          onClick={() => onCapture('fullscreen')}
          disabled={isCapturing}
          className="px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2
                     bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500
                     disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50
                     text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40
                     hover:-translate-y-0.5 active:translate-y-0"
          title="Capture entire screen (PrintScreen)"
        >
          <Monitor className="w-4 h-4" />
          Fullscreen
        </button>

        {/* Region - Cyan/teal gradient */}
        <button
          onClick={() => onCapture('region')}
          disabled={isCapturing}
          className="px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2
                     bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400
                     disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50
                     text-white font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40
                     hover:-translate-y-0.5 active:translate-y-0"
          title="Select region to capture (Ctrl+PrintScreen)"
        >
          <Scan className="w-4 h-4" />
          Region
        </button>

        {/* Window - Pink/rose gradient */}
        <button
          onClick={() => onCapture('window')}
          disabled={isCapturing}
          className="px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2
                     bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400
                     disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50
                     text-white font-medium shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40
                     hover:-translate-y-0.5 active:translate-y-0"
          title="Capture specific window (Ctrl+Shift+PrintScreen)"
        >
          <AppWindow className="w-4 h-4" />
          Window
        </button>

        {/* Import - Amber/orange gradient */}
        {onImportImage && (
          <button
            onClick={onImportImage}
            disabled={isCapturing}
            className="px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2
                       bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400
                       disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50
                       text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40
                       hover:-translate-y-0.5 active:translate-y-0"
            title="Import image from file (Ctrl+O)"
          >
            <FolderOpen className="w-4 h-4" />
            Import
          </button>
        )}
      </div>

      {hasScreenshot && (
        <>
          <div className="h-6 w-px bg-white/10" />
          <button
            onClick={onClear}
            className="px-4 py-2.5 rounded-xl transition-all duration-200
                       bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                       text-slate-300 hover:text-white font-medium"
          >
            Clear
          </button>
        </>
      )}

      {isCapturing && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300 animate-pulse font-medium">Capturing...</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings button */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl text-slate-400 hover:text-white
                     bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15
                     transition-all duration-200"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      {/* Minimize to tray button */}
      {onMinimize && (
        <button
          onClick={onMinimize}
          className="p-2.5 rounded-xl text-slate-400 hover:text-white
                     bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15
                     transition-all duration-200"
          title="Minimize to tray"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
