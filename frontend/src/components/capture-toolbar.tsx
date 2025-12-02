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
    <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-900 border-b border-surface-800/50">
      {/* Capture buttons group */}
      <div className="flex items-center gap-1.5">
        {/* Fullscreen capture */}
        <button
          onClick={() => onCapture('fullscreen')}
          disabled={isCapturing}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg
                     bg-accent-500/10 text-accent-400
                     hover:bg-accent-500/20 hover:text-accent-300
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150"
          title="Capture entire screen (PrintScreen)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5"/>
          </svg>
          <span className="text-xs font-medium">Full</span>
        </button>

        {/* Region capture */}
        <button
          onClick={() => onCapture('region')}
          disabled={isCapturing}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg
                     bg-success-500/10 text-success-400
                     hover:bg-success-500/20 hover:text-success-400
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150"
          title="Select region to capture (Ctrl+PrintScreen)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v3a1 1 0 01-2 0V5zM4 19a1 1 0 001 1h4a1 1 0 000-2H6v-3a1 1 0 00-2 0v4zM20 5a1 1 0 00-1-1h-4a1 1 0 000 2h3v3a1 1 0 002 0V5zM20 19a1 1 0 01-1 1h-4a1 1 0 010-2h3v-3a1 1 0 012 0v4z"/>
          </svg>
          <span className="text-xs font-medium">Region</span>
        </button>

        {/* Window capture */}
        <button
          onClick={() => onCapture('window')}
          disabled={isCapturing}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg
                     bg-purple-500/10 text-purple-400
                     hover:bg-purple-500/20 hover:text-purple-300
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150"
          title="Capture specific window (Ctrl+Shift+PrintScreen)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.5"/>
            <path strokeLinecap="round" strokeWidth="1.5" d="M3 8h18"/>
          </svg>
          <span className="text-xs font-medium">Window</span>
        </button>
      </div>

      {/* Clear button */}
      {hasScreenshot && (
        <>
          <div className="w-px h-5 bg-surface-700/50" />
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                       text-surface-400 hover:text-surface-200 hover:bg-surface-800
                       transition-all duration-150"
            title="Clear screenshot"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-xs">Clear</span>
          </button>
        </>
      )}

      {/* Capturing indicator */}
      {isCapturing && (
        <div className="flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse-soft" />
          <span className="text-xs text-surface-400">Capturing...</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-surface-500 hover:text-surface-300
                       hover:bg-surface-800 transition-all duration-150"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}

        {/* Minimize to tray button */}
        {onMinimize && (
          <button
            onClick={onMinimize}
            className="p-2 rounded-lg text-surface-500 hover:text-surface-300
                       hover:bg-surface-800 transition-all duration-150"
            title="Minimize to tray"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
