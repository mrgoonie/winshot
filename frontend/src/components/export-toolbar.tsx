import { useState } from 'react';
import { ClipboardCopy, Download, Save, Link } from 'lucide-react';

interface ExportToolbarProps {
  onSave: (format: 'png' | 'jpeg') => void;
  onQuickSave: (format: 'png' | 'jpeg') => void;
  onCopyToClipboard: () => void;
  onCopyPath: () => void;
  lastSavedPath: string | null;
  isExporting: boolean;
}

export function ExportToolbar({
  onSave,
  onQuickSave,
  onCopyToClipboard,
  onCopyPath,
  lastSavedPath,
  isExporting,
}: ExportToolbarProps) {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 glass">
      {/* Format Selection */}
      <div className="flex items-center gap-2 pr-3 border-r border-white/10">
        <span className="text-xs text-slate-400 font-medium">Format</span>
        <div className="flex gap-1">
          <button
            onClick={() => setFormat('png')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all duration-200 ${
              format === 'png'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            PNG
          </button>
          <button
            onClick={() => setFormat('jpeg')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all duration-200 ${
              format === 'jpeg'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            JPEG
          </button>
        </div>
      </div>

      {/* Export Actions */}
      <div className="flex items-center gap-2">
        {/* Copy to Clipboard */}
        <button
          onClick={onCopyToClipboard}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200
                     bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                     text-slate-300 hover:text-white
                     disabled:opacity-50 disabled:cursor-not-allowed"
          title="Copy to Clipboard (Ctrl+C)"
        >
          <ClipboardCopy className="w-4 h-4" />
          Copy
        </button>

        {/* Copy Path - only show after save */}
        {lastSavedPath && (
          <button
            onClick={onCopyPath}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200
                       bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                       text-slate-300 hover:text-white
                       disabled:opacity-50 disabled:cursor-not-allowed"
            title={lastSavedPath}
          >
            <Link className="w-4 h-4" />
            Copy Path
          </button>
        )}

        {/* Quick Save */}
        <button
          onClick={() => onQuickSave(format)}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200
                     bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30
                     border border-cyan-500/30 hover:border-cyan-500/50
                     text-cyan-300 hover:text-cyan-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
          title="Quick Save to Pictures/WinShot (Ctrl+S)"
        >
          <Download className="w-4 h-4" />
          Quick Save
        </button>

        {/* Save As */}
        <button
          onClick={() => onSave(format)}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg font-medium transition-all duration-200
                     bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500
                     text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40
                     hover:-translate-y-0.5 active:translate-y-0
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          title="Save As... (Ctrl+Shift+S)"
        >
          <Save className="w-4 h-4" />
          Save As...
        </button>
      </div>

      {/* Exporting indicator */}
      {isExporting && (
        <div className="flex items-center gap-2 ml-2">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-sm text-violet-300 animate-pulse font-medium">Exporting...</span>
        </div>
      )}
    </div>
  );
}
