import { useState, useEffect } from 'react';
import { HotkeyInput } from './hotkey-input';
import {
  GetConfig,
  SaveConfig,
  SelectFolder,
  GetR2Config,
  SaveR2Config,
  SaveR2Credentials,
  IsR2Configured,
  TestR2Connection,
  GetGDriveConfig,
  SaveGDriveConfig,
  SaveGDriveCredentials,
  HasGDriveCredentials,
  GetGDriveStatus,
  StartGDriveAuth,
  DisconnectGDrive,
} from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { config } from '../../wailsjs/go/models';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'hotkeys' | 'startup' | 'quicksave' | 'export' | 'updates' | 'cloud';

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
    closeToTray: boolean;
  };
  quickSave: {
    folder: string;
    pattern: string;
  };
  export: {
    defaultFormat: string;
    jpegQuality: number;
    includeBackground: boolean;
    autoCopyToClipboard: boolean;
  };
  update: {
    checkOnStartup: boolean;
  };
}

// Cloud config local state
interface CloudLocalConfig {
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrl: string;
  };
  gdrive: {
    clientId: string;
    clientSecret: string;
    folderId: string;
  };
}

const defaultCloudConfig: CloudLocalConfig = {
  r2: {
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
    publicUrl: '',
  },
  gdrive: {
    clientId: '',
    clientSecret: '',
    folderId: '',
  },
};

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
    closeToTray: true,
  },
  quickSave: {
    folder: '',
    pattern: 'timestamp',
  },
  export: {
    defaultFormat: 'png',
    jpegQuality: 95,
    includeBackground: true,
    autoCopyToClipboard: true,
  },
  update: {
    checkOnStartup: true,
  },
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('hotkeys');
  const [localConfig, setLocalConfig] = useState<LocalConfig>(defaultConfig);
  const [originalConfig, setOriginalConfig] = useState<LocalConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cloud state
  const [cloudConfig, setCloudConfig] = useState<CloudLocalConfig>(defaultCloudConfig);
  const [r2Status, setR2Status] = useState<'unconfigured' | 'testing' | 'connected' | 'error'>('unconfigured');
  const [r2Error, setR2Error] = useState<string | null>(null);
  const [gdriveEmail, setGdriveEmail] = useState<string | null>(null);
  const [gdriveConnecting, setGdriveConnecting] = useState(false);
  const [showR2Instructions, setShowR2Instructions] = useState(false);
  const [showGDriveInstructions, setShowGDriveInstructions] = useState(false);

  // Load config when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadCloudConfig();
    }
  }, [isOpen]);

  // GDrive OAuth event listeners
  useEffect(() => {
    const successHandler = () => {
      setGdriveConnecting(false);
      loadCloudConfig();
    };

    const errorHandler = (err: string) => {
      setGdriveConnecting(false);
      setError(`Google Drive connection failed: ${err}`);
      console.error('GDrive auth error:', err);
    };

    EventsOn('gdrive:auth:success', successHandler);
    EventsOn('gdrive:auth:error', errorHandler);

    return () => {
      EventsOff('gdrive:auth:success');
      EventsOff('gdrive:auth:error');
    };
  }, []);

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
          closeToTray: cfg.startup?.closeToTray ?? true,
        },
        quickSave: {
          folder: cfg.quickSave?.folder || '',
          pattern: cfg.quickSave?.pattern || 'timestamp',
        },
        export: {
          defaultFormat: cfg.export?.defaultFormat || 'png',
          jpegQuality: cfg.export?.jpegQuality || 95,
          includeBackground: cfg.export?.includeBackground ?? true,
          autoCopyToClipboard: cfg.export?.autoCopyToClipboard ?? true,
        },
        update: {
          checkOnStartup: cfg.update?.checkOnStartup ?? true,
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

  const loadCloudConfig = async () => {
    try {
      // R2
      const r2Cfg = await GetR2Config();
      setCloudConfig((prev) => ({
        ...prev,
        r2: {
          ...prev.r2,
          accountId: r2Cfg.accountId || '',
          bucket: r2Cfg.bucket || '',
          publicUrl: r2Cfg.publicUrl || '',
        },
      }));

      const r2Configured = await IsR2Configured();
      setR2Status(r2Configured ? 'connected' : 'unconfigured');
      setR2Error(null);

      // GDrive
      const gdriveCfg = await GetGDriveConfig();
      setCloudConfig((prev) => ({
        ...prev,
        gdrive: {
          ...prev.gdrive,
          folderId: gdriveCfg.folderId || '',
        },
      }));

      const status = await GetGDriveStatus();
      setGdriveEmail(status.connected ? status.email || null : null);
    } catch (err) {
      console.error('Failed to load cloud config:', err);
    }
  };

  // R2 handlers
  const handleR2Test = async () => {
    setR2Status('testing');
    setR2Error(null);
    try {
      // Save config first
      await SaveR2Config(
        cloudConfig.r2.accountId,
        cloudConfig.r2.bucket,
        cloudConfig.r2.publicUrl
      );
      await SaveR2Credentials(
        cloudConfig.r2.accessKeyId,
        cloudConfig.r2.secretAccessKey
      );

      // Test connection
      await TestR2Connection();
      setR2Status('connected');
    } catch (err) {
      setR2Status('error');
      setR2Error(err instanceof Error ? err.message : 'Connection failed');
      console.error('R2 test failed:', err);
    }
  };

  // GDrive handlers
  const handleGDriveConnect = async () => {
    setGdriveConnecting(true);
    try {
      // Save credentials first
      await SaveGDriveCredentials(
        cloudConfig.gdrive.clientId,
        cloudConfig.gdrive.clientSecret
      );

      // Save folder config
      await SaveGDriveConfig(cloudConfig.gdrive.folderId);

      // Start OAuth - opens browser
      await StartGDriveAuth();
      // Auth completion handled by event listener
    } catch (err) {
      setGdriveConnecting(false);
      console.error('GDrive auth failed:', err);
    }
  };

  const handleGDriveDisconnect = async () => {
    try {
      await DisconnectGDrive();
      setGdriveEmail(null);
    } catch (err) {
      console.error('GDrive disconnect failed:', err);
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
        update: new config.UpdateConfig(localConfig.update),
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

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'hotkeys', label: 'Hotkeys' },
    { id: 'startup', label: 'Startup' },
    { id: 'quicksave', label: 'Quick Save' },
    { id: 'export', label: 'Export' },
    { id: 'updates', label: 'Updates' },
    { id: 'cloud', label: 'Cloud' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-gradient">Settings</h2>
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'hotkeys' && (
            <div>
              <p className="text-sm text-slate-400 mb-4 p-3 rounded-lg bg-white/5 border border-white/5">
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
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/5 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={localConfig.startup.launchOnStartup}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      startup: { ...prev.startup, launchOnStartup: e.target.checked },
                    }))
                  }
                />
                <span className="text-slate-200">Launch on Windows startup</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/5 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={localConfig.startup.minimizeToTray}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      startup: { ...prev.startup, minimizeToTray: e.target.checked },
                    }))
                  }
                />
                <span className="text-slate-200">Start minimized to tray</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/5 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={localConfig.startup.showNotification}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      startup: { ...prev.startup, showNotification: e.target.checked },
                    }))
                  }
                />
                <span className="text-slate-200">Show notification on capture</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/5 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={localConfig.startup.closeToTray}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      startup: { ...prev.startup, closeToTray: e.target.checked },
                    }))
                  }
                />
                <div>
                  <span className="text-slate-200">Close to tray instead of quitting</span>
                  <p className="text-xs text-slate-400 mt-0.5">Use "Quit" from tray menu to fully exit</p>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'quicksave' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-slate-300 font-medium mb-2">Save Folder</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localConfig.quickSave.folder}
                    readOnly
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                    placeholder="Default: Pictures/WinShot"
                  />
                  <button
                    onClick={handleSelectFolder}
                    className="px-4 py-2.5 rounded-xl font-medium transition-all duration-200
                               bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                               text-slate-300 hover:text-white"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 font-medium mb-2">Filename Pattern</label>
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
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-violet-500/50"
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
                <label className="block text-sm text-slate-300 font-medium mb-3">Default Format</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-3 rounded-xl font-medium transition-all duration-200 ${
                    localConfig.export.defaultFormat === 'png'
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                  }`}>
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
                      className="sr-only"
                    />
                    <span>PNG</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-3 rounded-xl font-medium transition-all duration-200 ${
                    localConfig.export.defaultFormat === 'jpeg'
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                  }`}>
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
                      className="sr-only"
                    />
                    <span>JPEG</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-slate-300 font-medium">JPEG Quality</label>
                  <span className="text-xs text-violet-400 font-semibold bg-violet-500/10 px-2 py-0.5 rounded-full">{localConfig.export.jpegQuality}%</span>
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

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/5 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={localConfig.export.includeBackground}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      export: { ...prev.export, includeBackground: e.target.checked },
                    }))
                  }
                />
                <span className="text-slate-200">Include styled background</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/5 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={localConfig.export.autoCopyToClipboard}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      export: { ...prev.export, autoCopyToClipboard: e.target.checked },
                    }))
                  }
                />
                <div>
                  <span className="text-slate-200">Auto-copy to clipboard on capture</span>
                  <p className="text-xs text-slate-400 mt-0.5">Uses your default export format (PNG/JPEG)</p>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/5 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={localConfig.update.checkOnStartup}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      update: { ...prev.update, checkOnStartup: e.target.checked },
                    }))
                  }
                />
                <div>
                  <span className="text-slate-200">Check for updates on startup</span>
                  <p className="text-xs text-slate-400 mt-0.5">Automatically check for new versions when the app starts</p>
                </div>
              </label>

              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <p className="text-sm text-slate-400">
                  WinShot will notify you when a new version is available. Updates are downloaded from GitHub Releases as portable executables.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-6">
              {/* Cloudflare R2 Section */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-200">Cloudflare R2</h3>
                  <div className="flex items-center gap-2">
                    {r2Status === 'connected' && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Connected
                      </span>
                    )}
                    {r2Status === 'error' && (
                      <span className="text-xs text-rose-400">Connection failed</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Account ID"
                    value={cloudConfig.r2.accountId}
                    onChange={(e) =>
                      setCloudConfig((prev) => ({
                        ...prev,
                        r2: { ...prev.r2, accountId: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                  />
                  <input
                    type="password"
                    placeholder="Access Key ID"
                    value={cloudConfig.r2.accessKeyId}
                    onChange={(e) =>
                      setCloudConfig((prev) => ({
                        ...prev,
                        r2: { ...prev.r2, accessKeyId: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                  />
                  <input
                    type="password"
                    placeholder="Secret Access Key"
                    value={cloudConfig.r2.secretAccessKey}
                    onChange={(e) =>
                      setCloudConfig((prev) => ({
                        ...prev,
                        r2: { ...prev.r2, secretAccessKey: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Bucket Name"
                    value={cloudConfig.r2.bucket}
                    onChange={(e) =>
                      setCloudConfig((prev) => ({
                        ...prev,
                        r2: { ...prev.r2, bucket: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Public URL (e.g., https://pub-xxx.r2.dev)"
                    value={cloudConfig.r2.publicUrl}
                    onChange={(e) =>
                      setCloudConfig((prev) => ({
                        ...prev,
                        r2: { ...prev.r2, publicUrl: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                  />

                  {r2Error && (
                    <p className="text-xs text-rose-400">{r2Error}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleR2Test}
                      disabled={r2Status === 'testing'}
                      className="px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all duration-200 disabled:opacity-50"
                    >
                      {r2Status === 'testing' ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>

                {/* Instructions toggle */}
                <button
                  onClick={() => setShowR2Instructions(!showR2Instructions)}
                  className="mt-3 text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  {showR2Instructions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showR2Instructions ? 'Hide' : 'Show'} setup instructions
                </button>

                {showR2Instructions && (
                  <div className="mt-2 p-3 text-xs text-slate-400 bg-black/20 rounded-lg">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to Cloudflare Dashboard → R2</li>
                      <li>Create a bucket and enable public access</li>
                      <li>Go to Manage R2 API Tokens</li>
                      <li>Create token with Object Read & Write permission</li>
                      <li>Copy Account ID, Access Key ID, and Secret</li>
                      <li>Enter your public URL (r2.dev or custom domain)</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Google Drive Section */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-200">Google Drive</h3>
                  {gdriveEmail && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {gdriveEmail}
                    </span>
                  )}
                </div>

                {!gdriveEmail ? (
                  <>
                    <div className="space-y-3 mb-3">
                      <input
                        type="text"
                        placeholder="OAuth Client ID"
                        value={cloudConfig.gdrive.clientId}
                        onChange={(e) =>
                          setCloudConfig((prev) => ({
                            ...prev,
                            gdrive: { ...prev.gdrive, clientId: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                      />
                      <input
                        type="password"
                        placeholder="OAuth Client Secret"
                        value={cloudConfig.gdrive.clientSecret}
                        onChange={(e) =>
                          setCloudConfig((prev) => ({
                            ...prev,
                            gdrive: { ...prev.gdrive, clientSecret: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                      />
                      <input
                        type="text"
                        placeholder="Folder ID (optional)"
                        value={cloudConfig.gdrive.folderId}
                        onChange={(e) =>
                          setCloudConfig((prev) => ({
                            ...prev,
                            gdrive: { ...prev.gdrive, folderId: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <button
                      onClick={handleGDriveConnect}
                      disabled={gdriveConnecting || !cloudConfig.gdrive.clientId || !cloudConfig.gdrive.clientSecret}
                      className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {gdriveConnecting ? 'Connecting...' : 'Connect Google Account'}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Folder ID (optional)"
                      value={cloudConfig.gdrive.folderId}
                      onChange={(e) =>
                        setCloudConfig((prev) => ({
                          ...prev,
                          gdrive: { ...prev.gdrive, folderId: e.target.value },
                        }))
                      }
                      onBlur={() => SaveGDriveConfig(cloudConfig.gdrive.folderId)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                    />
                    <p className="text-xs text-slate-500">Folder ID is auto-saved when you leave the field</p>
                    <button
                      onClick={handleGDriveDisconnect}
                      className="px-4 py-2 text-sm rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all duration-200"
                    >
                      Disconnect
                    </button>
                  </div>
                )}

                {/* Instructions toggle */}
                <button
                  onClick={() => setShowGDriveInstructions(!showGDriveInstructions)}
                  className="mt-3 text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  {showGDriveInstructions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showGDriveInstructions ? 'Hide' : 'Show'} setup instructions
                </button>

                {showGDriveInstructions && (
                  <div className="mt-2 p-3 text-xs text-slate-400 bg-black/20 rounded-lg">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to Google Cloud Console</li>
                      <li>Create project and enable Drive API</li>
                      <li>Configure OAuth consent screen (External)</li>
                      <li>Create OAuth 2.0 Client ID (Desktop app)</li>
                      <li>Add http://localhost:8089/callback as redirect URI</li>
                      <li>Copy Client ID and Client Secret</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl font-medium transition-all duration-200
                       bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                       text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl font-medium transition-all duration-200
                       bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500
                       text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
