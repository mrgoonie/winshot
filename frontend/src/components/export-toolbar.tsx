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
    <div className="flex items-center gap-2 p-2 bg-slate-800 border-t border-slate-700">
      {/* Format Selection */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-600">
        <span className="text-xs text-slate-400 mr-1">Format:</span>
        <button
          onClick={() => setFormat('png')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            format === 'png'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          PNG
        </button>
        <button
          onClick={() => setFormat('jpeg')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            format === 'jpeg'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          JPEG
        </button>
      </div>

      {/* Export Actions */}
      <div className="flex items-center gap-2">
        {/* Copy to Clipboard */}
        <button
          onClick={onCopyToClipboard}
          disabled={isExporting}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Copy to Clipboard (Ctrl+C)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy
        </button>

        {/* Quick Save */}
        <button
          onClick={() => onQuickSave(format)}
          disabled={isExporting}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Quick Save to Pictures/WinShot (Ctrl+S)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Quick Save
        </button>

        {/* Save As */}
        <button
          onClick={() => onSave(format)}
          disabled={isExporting}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save As... (Ctrl+Shift+S)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save As...
        </button>
      </div>

      {/* Exporting indicator */}
      {isExporting && (
        <span className="text-sm text-slate-400 animate-pulse">Exporting...</span>
      )}
    </div>
  );
}
