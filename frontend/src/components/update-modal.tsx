import { X, Download, ExternalLink, SkipForward } from 'lucide-react';
import { OpenURL, SetSkippedVersion } from '../../wailsjs/go/main/App';
import { updater } from '../../wailsjs/go/models';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: updater.UpdateInfo | null;
}

export function UpdateModal({ isOpen, onClose, updateInfo }: UpdateModalProps) {
  if (!isOpen || !updateInfo) return null;

  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
      OpenURL(updateInfo.downloadUrl);
    }
    onClose();
  };

  const handleViewRelease = () => {
    if (updateInfo.releaseUrl) {
      OpenURL(updateInfo.releaseUrl);
    }
  };

  const handleSkip = async () => {
    if (updateInfo.latestVersion) {
      await SetSkippedVersion(updateInfo.latestVersion);
    }
    onClose();
  };

  // Parse release notes - take first 500 chars
  const releaseNotes = updateInfo.releaseNotes
    ? updateInfo.releaseNotes.substring(0, 500) + (updateInfo.releaseNotes.length > 500 ? '...' : '')
    : 'No release notes available.';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card rounded-2xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gradient">Update Available</h2>
              <p className="text-xs text-slate-400">A new version is ready to download</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Version info */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="text-xs text-slate-400 mb-1">Current Version</p>
              <p className="text-slate-200 font-mono">{updateInfo.currentVersion}</p>
            </div>
            <div className="text-2xl text-slate-500">→</div>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">New Version</p>
              <p className="text-emerald-400 font-mono font-semibold">{updateInfo.latestVersion}</p>
            </div>
          </div>

          {/* Release notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-300 font-medium">What's New</p>
              <button
                onClick={handleViewRelease}
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on GitHub
              </button>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 max-h-32 overflow-y-auto">
              <p className="text-sm text-slate-400 whitespace-pre-wrap">{releaseNotes}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-5 border-t border-white/10">
          <button
            onClick={handleSkip}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200
                       bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                       text-slate-400 hover:text-slate-200"
          >
            <SkipForward className="w-4 h-4" />
            Skip this version
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium transition-all duration-200
                         bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                         text-slate-300 hover:text-white"
            >
              Later
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200
                         bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500
                         text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
