import { EditorTool } from '../types';

interface AnnotationToolbarProps {
  activeTool: EditorTool;
  strokeColor: string;
  strokeWidth: number;
  onToolChange: (tool: EditorTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899',
  '#ffffff', '#000000', '#64748b', '#1e293b',
];

const STROKE_WIDTHS = [2, 4, 6, 8, 10];

export function AnnotationToolbar({
  activeTool,
  strokeColor,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onDeleteSelected,
  hasSelection,
}: AnnotationToolbarProps) {
  const tools: { id: EditorTool; icon: JSX.Element; label: string; shortcut: string }[] = [
    {
      id: 'select',
      label: 'Select',
      shortcut: 'V',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
    },
    {
      id: 'rectangle',
      label: 'Rectangle',
      shortcut: 'R',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      id: 'ellipse',
      label: 'Ellipse',
      shortcut: 'E',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <ellipse cx="12" cy="12" rx="9" ry="7" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      id: 'arrow',
      label: 'Arrow',
      shortcut: 'A',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      ),
    },
    {
      id: 'line',
      label: 'Line',
      shortcut: 'L',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth="1.5" d="M4 20L20 4" />
        </svg>
      ),
    },
    {
      id: 'text',
      label: 'Text',
      shortcut: 'T',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M12 6v14M8 6V4m8 2V4" />
        </svg>
      ),
    },
    {
      id: 'crop',
      label: 'Crop',
      shortcut: 'C',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-surface-900/95 border-b border-surface-800/50">
      {/* Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`relative p-2 rounded-lg transition-all duration-150 ${
              activeTool === tool.id
                ? 'bg-accent-500/20 text-accent-400'
                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
            {activeTool === tool.id && (
              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-400" />
            )}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-surface-700/50 mx-1" />

      {/* Color Picker */}
      <div className="flex items-center gap-1.5">
        <span className="text-2xs text-surface-500 uppercase tracking-wider">Color</span>
        <div className="flex gap-0.5">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-5 h-5 rounded-md transition-all duration-150 ${
                strokeColor === color
                  ? 'ring-2 ring-accent-400 ring-offset-1 ring-offset-surface-900 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="w-px h-5 bg-surface-700/50 mx-1" />

      {/* Stroke Width */}
      <div className="flex items-center gap-1.5">
        <span className="text-2xs text-surface-500 uppercase tracking-wider">Size</span>
        <div className="flex gap-0.5">
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              onClick={() => onStrokeWidthChange(width)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                strokeWidth === width
                  ? 'bg-accent-500/20 text-accent-400'
                  : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800'
              }`}
              title={`${width}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: width + 1, height: width + 1 }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Delete Button */}
      <button
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        className={`p-2 rounded-lg transition-all duration-150 ${
          hasSelection
            ? 'text-danger-400 hover:text-danger-400 hover:bg-danger-500/10'
            : 'text-surface-600 cursor-not-allowed'
        }`}
        title="Delete Selected (Del)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
