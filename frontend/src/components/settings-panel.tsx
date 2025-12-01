interface SettingsPanelProps {
  padding: number;
  cornerRadius: number;
  shadowSize: number;
  backgroundColor: string;
  onPaddingChange: (value: number) => void;
  onCornerRadiusChange: (value: number) => void;
  onShadowSizeChange: (value: number) => void;
  onBackgroundChange: (value: string) => void;
}

const GRADIENT_PRESETS = [
  { name: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { name: 'Midnight', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { name: 'Peach', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { name: 'Sky', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { name: 'Lavender', value: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)' },
  { name: 'Fire', value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
  { name: 'Cool Blue', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { name: 'Warm', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { name: 'Carbon', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
  { name: 'Clean', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
];

const SOLID_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#e94560',
  '#ffffff', '#f5f5f5', '#1e293b', '#334155',
  '#0ea5e9', '#22c55e', '#eab308', '#ef4444',
];

export function SettingsPanel({
  padding,
  cornerRadius,
  shadowSize,
  backgroundColor,
  onPaddingChange,
  onCornerRadiusChange,
  onShadowSizeChange,
  onBackgroundChange,
}: SettingsPanelProps) {
  return (
    <div className="w-64 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-white mb-4">Settings</h2>

      {/* Padding */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          Padding: {padding}px
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={padding}
          onChange={(e) => onPaddingChange(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Corner Radius */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          Corner Radius: {cornerRadius}px
        </label>
        <input
          type="range"
          min="0"
          max="50"
          value={cornerRadius}
          onChange={(e) => onCornerRadiusChange(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Shadow */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          Shadow: {shadowSize}px
        </label>
        <input
          type="range"
          min="0"
          max="50"
          value={shadowSize}
          onChange={(e) => onShadowSizeChange(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Background Gradients */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          Background
        </label>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {GRADIENT_PRESETS.map((gradient) => (
            <button
              key={gradient.name}
              onClick={() => onBackgroundChange(gradient.value)}
              className={`w-full aspect-square rounded-lg border-2 transition-all
                ${backgroundColor === gradient.value
                  ? 'border-blue-500 scale-110'
                  : 'border-transparent hover:border-slate-500'
                }`}
              style={{ background: gradient.value }}
              title={gradient.name}
            />
          ))}
        </div>

        {/* Solid Colors */}
        <div className="grid grid-cols-4 gap-2">
          {SOLID_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onBackgroundChange(color)}
              className={`w-full aspect-square rounded-lg border-2 transition-all
                ${backgroundColor === color
                  ? 'border-blue-500 scale-110'
                  : 'border-transparent hover:border-slate-500'
                }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Custom Color */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          Custom Color
        </label>
        <input
          type="color"
          value={backgroundColor.startsWith('#') ? backgroundColor : '#1a1a2e'}
          onChange={(e) => onBackgroundChange(e.target.value)}
          className="w-full h-10 rounded-lg cursor-pointer bg-transparent"
        />
      </div>
    </div>
  );
}
