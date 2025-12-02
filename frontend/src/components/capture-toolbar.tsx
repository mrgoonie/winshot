import { CaptureMode } from '../types';

interface CaptureToolbarProps {
  onCapture: (mode: CaptureMode) => void;
  isCapturing: boolean;
  hasScreenshot: boolean;
  onClear: () => void;
  onMinimize?: () => void;
  onOpenSettings?: () => void;
}

export function CaptureToolbar({ onCapture, isCapturing, hasScreenshot, onClear, onMinimize, onOpenSettings }: CaptureToolbarProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-slate-800 border-b border-slate-700">
      <div className="flex gap-2">
        <button
          onClick={() => onCapture('fullscreen')}
          disabled={isCapturing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600
                     text-white rounded-lg transition-colors flex items-center gap-2"
          title="Capture entire screen (PrintScreen)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
          </svg>
          Fullscreen
        </button>

        <button
          onClick={() => onCapture('region')}
          disabled={isCapturing}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600
                     text-white rounded-lg transition-colors flex items-center gap-2"
          title="Select region to capture (Ctrl+PrintScreen)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v3a1 1 0 01-2 0V5zM4 19a1 1 0 001 1h4a1 1 0 000-2H6v-3a1 1 0 00-2 0v4zM20 5a1 1 0 00-1-1h-4a1 1 0 000 2h3v3a1 1 0 002 0V5zM20 19a1 1 0 01-1 1h-4a1 1 0 010-2h3v-3a1 1 0 012 0v4z"/>
          </svg>
          Region
        </button>

        <button
          onClick={() => onCapture('window')}
          disabled={isCapturing}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600
                     text-white rounded-lg transition-colors flex items-center gap-2"
          title="Capture specific window (Ctrl+Shift+PrintScreen)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2"/>
            <path strokeLinecap="round" strokeWidth="2" d="M3 8h18"/>
          </svg>
          Window
        </button>
      </div>

      {hasScreenshot && (
        <>
          <div className="h-6 w-px bg-slate-600" />
          <button
            onClick={onClear}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500
                       text-white rounded-lg transition-colors"
          >
            Clear
          </button>
        </>
      )}

      {isCapturing && (
        <span className="text-slate-400 animate-pulse">Capturing...</span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings button */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* Minimize to tray button */}
      {onMinimize && (
        <button
          onClick={onMinimize}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          title="Minimize to tray"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}
