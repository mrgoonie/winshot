import { useState } from 'react';

interface ExportToolbarProps {
  onSave: (format: 'png' | 'jpeg') => void;
  onQuickSave: (format: 'png' | 'jpeg') => void;
  onCopyToClipboard: () => void;
  isExporting: boolean;
}

export function ExportToolbar({
  onSave,
  onQuickSave,
  onCopyToClipboard,
  isExporting,
}: ExportToolbarProps) {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface-900/95 border-t border-surface-800/50">
      {/* Format Selection */}
      <div className="flex items-center gap-1">
        <span className="text-2xs text-surface-500 uppercase tracking-wider mr-1">Format</span>
        <button
          onClick={() => setFormat('png')}
          className={`px-2.5 py-1 text-xs rounded-md transition-all duration-150 ${
            format === 'png'
              ? 'bg-accent-500/20 text-accent-400 font-medium'
              : 'text-surface-400 hover:text-surface-300 hover:bg-surface-800'
          }`}
        >
          PNG
        </button>
        <button
          onClick={() => setFormat('jpeg')}
          className={`px-2.5 py-1 text-xs rounded-md transition-all duration-150 ${
            format === 'jpeg'
              ? 'bg-accent-500/20 text-accent-400 font-medium'
              : 'text-surface-400 hover:text-surface-300 hover:bg-surface-800'
          }`}
        >
          JPEG
        </button>
      </div>

      <div className="w-px h-5 bg-surface-700/50" />

      {/* Export Actions */}
      <div className="flex items-center gap-1.5">
        {/* Copy to Clipboard */}
        <button
          onClick={onCopyToClipboard}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs
                     bg-surface-800/50 text-surface-300 rounded-lg
                     hover:bg-surface-700/50 hover:text-surface-200
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150"
          title="Copy to Clipboard (Ctrl+C)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy
        </button>

        {/* Quick Save */}
        <button
          onClick={() => onQuickSave(format)}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs
                     bg-surface-800/50 text-surface-300 rounded-lg
                     hover:bg-surface-700/50 hover:text-surface-200
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150"
          title="Quick Save to Pictures/WinShot (Ctrl+S)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Quick
        </button>

        {/* Save As */}
        <button
          onClick={() => onSave(format)}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs
                     bg-accent-500/20 text-accent-400 rounded-lg
                     hover:bg-accent-500/30 hover:text-accent-300
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150"
          title="Save As... (Ctrl+Shift+S)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save As
        </button>
      </div>

      {/* Exporting indicator */}
      {isExporting && (
        <div className="flex items-center gap-2 ml-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse-soft" />
          <span className="text-xs text-surface-400">Exporting...</span>
        </div>
      )}
    </div>
  );
}
