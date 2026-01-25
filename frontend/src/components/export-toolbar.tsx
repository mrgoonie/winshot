import { useState, useEffect } from 'react';
import { ClipboardCopy, Download, Save, Link, Cloud, ChevronUp, Image } from 'lucide-react';

interface ExportToolbarProps {
  onSave: (format: 'png' | 'jpeg') => void;
  onQuickSave: (format: 'png' | 'jpeg') => void;
  onCopyToClipboard: () => void;
  onCopyPath: () => void;
  onOpenLibrary: () => void;
  onCloudUpload: (provider: 'r2' | 'gdrive') => void;
  lastSavedPath: string | null;
  isExporting: boolean;
  isR2Configured: boolean;
  isGDriveConnected: boolean;
  isUploading: boolean;
}

export function ExportToolbar({
  onSave,
  onQuickSave,
  onCopyToClipboard,
  onCopyPath,
  onOpenLibrary,
  onCloudUpload,
  lastSavedPath,
  isExporting,
  isR2Configured,
  isGDriveConnected,
  isUploading,
}: ExportToolbarProps) {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowUploadMenu(false);
    if (showUploadMenu) {
      // Use setTimeout to avoid immediate closing when clicking the button
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showUploadMenu]);

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

        {/* Library */}
        <button
          onClick={onOpenLibrary}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200
                     bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30
                     border border-amber-500/30 hover:border-amber-500/50
                     text-amber-300 hover:text-amber-200"
          title="Open Screenshot Library"
        >
          <Image className="w-4 h-4" />
          Library
        </button>

        {/* Cloud Upload */}
        <div className="relative">
          <button
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            disabled={isExporting || isUploading || (!isR2Configured && !isGDriveConnected)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200
                       bg-gradient-to-r from-sky-500/20 to-cyan-500/20 hover:from-sky-500/30 hover:to-cyan-500/30
                       border border-sky-500/30 hover:border-sky-500/50
                       text-sky-300 hover:text-sky-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isR2Configured && !isGDriveConnected ? 'Configure cloud providers in Settings > Cloud' : 'Upload to Cloud'}
          >
            <Cloud className="w-4 h-4" />
            Cloud
            <ChevronUp className="w-3 h-3" />
          </button>

          {showUploadMenu && (
            <div className="absolute bottom-full left-0 mb-1 py-1 min-w-[160px] rounded-lg bg-slate-800/95 border border-white/10 shadow-xl z-50">
              <button
                onClick={() => {
                  onCloudUpload('r2');
                  setShowUploadMenu(false);
                }}
                disabled={!isR2Configured || isUploading}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 text-slate-200
                           hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isR2Configured ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                Cloudflare R2
              </button>
              <button
                onClick={() => {
                  onCloudUpload('gdrive');
                  setShowUploadMenu(false);
                }}
                disabled={!isGDriveConnected || isUploading}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 text-slate-200
                           hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isGDriveConnected ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                Google Drive
              </button>
            </div>
          )}
        </div>

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

      {/* Uploading indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 ml-2">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-sm text-sky-300 animate-pulse font-medium">Uploading...</span>
        </div>
      )}
    </div>
  );
}
