import { useState, useEffect } from 'react';
import { HotkeyInput } from './hotkey-input';
import { GetConfig, SaveConfig, SelectFolder } from '../../wailsjs/go/main/App';
import { config } from '../../wailsjs/go/models';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'hotkeys' | 'startup' | 'quicksave' | 'export';

// Local interface for easier state management
interface LocalConfig {
  hotkeys: {
    fullscreen: string;
    region: string;
    window: string;
  };
  startup: {
    launchOnStartup: boolean;
    minimizeToTray: boolean;
    showNotification: boolean;
  };
  quickSave: {
    folder: string;
    pattern: string;
  };
  export: {
    defaultFormat: string;
    jpegQuality: number;
    includeBackground: boolean;
  };
}

const defaultConfig: LocalConfig = {
  hotkeys: {
    fullscreen: 'PrintScreen',
    region: 'Ctrl+PrintScreen',
    window: 'Ctrl+Shift+PrintScreen',
  },
  startup: {
    launchOnStartup: false,
    minimizeToTray: false,
    showNotification: true,
  },
  quickSave: {
    folder: '',
    pattern: 'timestamp',
  },
  export: {
    defaultFormat: 'png',
    jpegQuality: 95,
    includeBackground: true,
  },
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('hotkeys');
  const [localConfig, setLocalConfig] = useState<LocalConfig>(defaultConfig);
  const [originalConfig, setOriginalConfig] = useState<LocalConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load config when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const cfg = await GetConfig();
      const local: LocalConfig = {
        hotkeys: {
          fullscreen: cfg.hotkeys?.fullscreen || defaultConfig.hotkeys.fullscreen,
          region: cfg.hotkeys?.region || defaultConfig.hotkeys.region,
          window: cfg.hotkeys?.window || defaultConfig.hotkeys.window,
        },
        startup: {
          launchOnStartup: cfg.startup?.launchOnStartup || false,
          minimizeToTray: cfg.startup?.minimizeToTray || false,
          showNotification: cfg.startup?.showNotification ?? true,
        },
        quickSave: {
          folder: cfg.quickSave?.folder || '',
          pattern: cfg.quickSave?.pattern || 'timestamp',
        },
        export: {
          defaultFormat: cfg.export?.defaultFormat || 'png',
          jpegQuality: cfg.export?.jpegQuality || 95,
          includeBackground: cfg.export?.includeBackground ?? true,
        },
      };
      setLocalConfig(local);
      setOriginalConfig(local);
      setError(null);
    } catch (err) {
      console.error('Failed to load config:', err);
      setError('Failed to load settings');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Convert LocalConfig to config.Config for the backend
      const cfg = new config.Config({
        hotkeys: new config.HotkeyConfig(localConfig.hotkeys),
        startup: new config.StartupConfig(localConfig.startup),
        quickSave: new config.QuickSaveConfig(localConfig.quickSave),
        export: new config.ExportConfig(localConfig.export),
      });
      await SaveConfig(cfg);
      setOriginalConfig(localConfig);
      onClose();
    } catch (err) {
      console.error('Failed to save config:', err);
      setError('Failed to save settings');
    }

    setIsSaving(false);
  };

  const handleCancel = () => {
    setLocalConfig(originalConfig);
    setError(null);
    onClose();
  };

  const handleSelectFolder = async () => {
    try {
      const folder = await SelectFolder();
      if (folder) {
        setLocalConfig((prev) => ({
          ...prev,
          quickSave: { ...prev.quickSave, folder },
        }));
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'hotkeys',
      label: 'Hotkeys',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
        </svg>
      ),
    },
    {
      id: 'startup',
      label: 'Startup',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14M5 12l4-4m-4 4l4 4" />
        </svg>
      ),
    },
    {
      id: 'quicksave',
      label: 'Quick Save',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      id: 'export',
      label: 'Export',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-float w-full max-w-lg max-h-[80vh] flex flex-col animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800/50">
          <h2 className="text-sm font-semibold text-surface-200">Settings</h2>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300
                       hover:bg-surface-800 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-800/50 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all duration-150
                border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-accent-400 border-accent-400'
                  : 'text-surface-500 border-transparent hover:text-surface-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'hotkeys' && (
            <div className="space-y-4">
              <p className="text-xs text-surface-500 mb-4">
                Click on a field and press your desired key combination.
              </p>
              <HotkeyInput
                label="Fullscreen Capture"
                value={localConfig.hotkeys.fullscreen}
                onChange={(value) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    hotkeys: { ...prev.hotkeys, fullscreen: value },
                  }))
                }
              />
              <HotkeyInput
                label="Region Capture"
                value={localConfig.hotkeys.region}
                onChange={(value) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    hotkeys: { ...prev.hotkeys, region: value },
                  }))
                }
              />
              <HotkeyInput
                label="Window Capture"
                value={localConfig.hotkeys.window}
                onChange={(value) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    hotkeys: { ...prev.hotkeys, window: value },
                  }))
                }
              />
            </div>
          )}

          {activeTab === 'startup' && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/30
                               cursor-pointer transition-colors duration-150">
                <input
                  type="checkbox"
                  checked={localConfig.startup.launchOnStartup}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      startup: { ...prev.startup, launchOnStartup: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800
                             text-accent-500 focus:ring-accent-500/30 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm text-surface-200">Launch on Windows startup</span>
                  <p className="text-2xs text-surface-500">Start WinShot automatically when Windows boots</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/30
                               cursor-pointer transition-colors duration-150">
                <input
                  type="checkbox"
                  checked={localConfig.startup.minimizeToTray}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      startup: { ...prev.startup, minimizeToTray: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800
                             text-accent-500 focus:ring-accent-500/30 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm text-surface-200">Start minimized to tray</span>
                  <p className="text-2xs text-surface-500">Hide window and run in background on launch</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/30
                               cursor-pointer transition-colors duration-150">
                <input
                  type="checkbox"
                  checked={localConfig.startup.showNotification}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      startup: { ...prev.startup, showNotification: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800
                             text-accent-500 focus:ring-accent-500/30 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm text-surface-200">Show notification on capture</span>
                  <p className="text-2xs text-surface-500">Display a toast notification after each capture</p>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'quicksave' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-surface-400 mb-2">Save Folder</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localConfig.quickSave.folder}
                    readOnly
                    className="flex-1 px-3 py-2 bg-surface-800/50 border border-surface-700/50
                               rounded-lg text-sm text-surface-300 placeholder-surface-500"
                    placeholder="Default: Pictures/WinShot"
                  />
                  <button
                    onClick={handleSelectFolder}
                    className="px-4 py-2 bg-surface-800/50 hover:bg-surface-700/50
                               text-surface-300 text-sm rounded-lg transition-colors duration-150"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-surface-400 mb-2">Filename Pattern</label>
                <select
                  value={localConfig.quickSave.pattern}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      quickSave: {
                        ...prev.quickSave,
                        pattern: e.target.value as 'timestamp' | 'date' | 'increment',
                      },
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface-800/50 border border-surface-700/50
                             rounded-lg text-sm text-surface-300"
                >
                  <option value="timestamp">winshot_2024-12-01_15-30-45</option>
                  <option value="date">winshot_2024-12-01</option>
                  <option value="increment">winshot_001, winshot_002...</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-surface-400 mb-3">Default Format</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer
                                   bg-surface-800/30 hover:bg-surface-800/50 transition-colors">
                    <input
                      type="radio"
                      name="format"
                      checked={localConfig.export.defaultFormat === 'png'}
                      onChange={() =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          export: { ...prev.export, defaultFormat: 'png' },
                        }))
                      }
                      className="w-3.5 h-3.5 text-accent-500"
                    />
                    <span className="text-sm text-surface-300">PNG</span>
                  </label>
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer
                                   bg-surface-800/30 hover:bg-surface-800/50 transition-colors">
                    <input
                      type="radio"
                      name="format"
                      checked={localConfig.export.defaultFormat === 'jpeg'}
                      onChange={() =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          export: { ...prev.export, defaultFormat: 'jpeg' },
                        }))
                      }
                      className="w-3.5 h-3.5 text-accent-500"
                    />
                    <span className="text-sm text-surface-300">JPEG</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-surface-400">JPEG Quality</label>
                  <span className="text-xs text-surface-500 tabular-nums">{localConfig.export.jpegQuality}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={localConfig.export.jpegQuality}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      export: { ...prev.export, jpegQuality: Number(e.target.value) },
                    }))
                  }
                  className="w-full"
                  disabled={localConfig.export.defaultFormat !== 'jpeg'}
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/30
                               cursor-pointer transition-colors duration-150">
                <input
                  type="checkbox"
                  checked={localConfig.export.includeBackground}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      export: { ...prev.export, includeBackground: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800
                             text-accent-500 focus:ring-accent-500/30 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm text-surface-200">Include styled background</span>
                  <p className="text-2xs text-surface-500">Export with gradient/image background applied</p>
                </div>
              </label>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-danger-500/10 border border-danger-500/30 rounded-lg">
              <span className="text-xs text-danger-400">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-800/50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-surface-400 hover:text-surface-300
                       hover:bg-surface-800 rounded-lg transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-accent-500/20 text-accent-400
                       hover:bg-accent-500/30 rounded-lg
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-150"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
