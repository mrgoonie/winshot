import { useState, useEffect } from 'react';
import { WindowInfo } from '../types';
import { GetWindowList } from '../../wailsjs/go/main/App';

interface WindowPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (window: WindowInfo) => void;
}

export function WindowPicker({ isOpen, onClose, onSelect }: WindowPickerProps) {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadWindows();
    }
  }, [isOpen]);

  const loadWindows = async () => {
    setIsLoading(true);
    try {
      const list = await GetWindowList();
      // Filter out our own window and sort by title
      const filtered = (list as WindowInfo[])
        .filter(w => !w.title.includes('WinShot'))
        .sort((a, b) => a.title.localeCompare(b.title));
      setWindows(filtered);
    } catch (error) {
      console.error('Failed to get window list:', error);
    }
    setIsLoading(false);
  };

  const filteredWindows = windows.filter(w =>
    w.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-float w-[560px] max-h-[70vh] flex flex-col animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800/50">
          <h2 className="text-sm font-semibold text-surface-200">Select Window</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300
                       hover:bg-surface-800 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-surface-800/50">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Search windows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-800/50 border border-surface-700/50
                         text-surface-200 text-sm rounded-lg placeholder-surface-500
                         focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20
                         transition-all duration-150"
            />
          </div>
        </div>

        {/* Window List */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-surface-500">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse-soft" />
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          ) : filteredWindows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-surface-500">
              <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.5"/>
                <path strokeLinecap="round" strokeWidth="1.5" d="M3 8h18"/>
              </svg>
              <span className="text-sm">No windows found</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredWindows.map((window) => (
                <button
                  key={window.handle}
                  onClick={() => onSelect(window)}
                  className="w-full p-3 text-left rounded-xl
                             hover:bg-surface-800/50 transition-all duration-150 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-surface-800 rounded-lg flex items-center justify-center
                                    group-hover:bg-surface-700 transition-colors duration-150">
                      <svg className="w-4 h-4 text-surface-500 group-hover:text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.5"/>
                        <path strokeLinecap="round" strokeWidth="1.5" d="M3 8h18"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-surface-200 truncate group-hover:text-white transition-colors">
                        {window.title}
                      </div>
                      <div className="text-2xs text-surface-500">
                        {window.width} × {window.height}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-surface-600 group-hover:text-accent-400 transition-colors"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-surface-800/50">
          <button
            onClick={loadWindows}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300
                       transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
          <span className="text-2xs text-surface-600">{filteredWindows.length} windows</span>
        </div>
      </div>
    </div>
  );
}
