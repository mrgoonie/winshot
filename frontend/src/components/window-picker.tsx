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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Select Window</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <input
            type="text"
            placeholder="Search windows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg
                       placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Window List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              Loading windows...
            </div>
          ) : filteredWindows.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              No windows found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredWindows.map((window) => (
                <button
                  key={window.handle}
                  onClick={() => onSelect(window)}
                  className="w-full p-3 text-left rounded-lg hover:bg-slate-700
                             transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-600 rounded flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2"/>
                        <path strokeLinecap="round" strokeWidth="2" d="M3 8h18"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white truncate">{window.title}</div>
                      <div className="text-xs text-slate-400">
                        {window.width} x {window.height}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between items-center">
          <button
            onClick={loadWindows}
            className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
          <span className="text-sm text-slate-400">{filteredWindows.length} windows</span>
        </div>
      </div>
    </div>
  );
}
