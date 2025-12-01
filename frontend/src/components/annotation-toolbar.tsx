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

const STROKE_WIDTHS = [2, 3, 4, 6, 8];

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
  const tools: { id: EditorTool; icon: JSX.Element; label: string }[] = [
    {
      id: 'select',
      label: 'Select',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
    },
    {
      id: 'rectangle',
      label: 'Rectangle',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: 'ellipse',
      label: 'Ellipse',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <ellipse cx="12" cy="12" rx="9" ry="7" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: 'arrow',
      label: 'Arrow',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      ),
    },
    {
      id: 'line',
      label: 'Line',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth="2" d="M4 20L20 4" />
        </svg>
      ),
    },
    {
      id: 'text',
      label: 'Text',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          <text x="6" y="18" fontSize="12" fill="currentColor" fontWeight="bold">T</text>
        </svg>
      ),
    },
    {
      id: 'crop',
      label: 'Crop',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-800 border-b border-slate-700">
      {/* Tools */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-600">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === tool.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-1 px-3 border-r border-slate-600">
        <span className="text-xs text-slate-400 mr-1">Color:</span>
        <div className="flex gap-1">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-6 h-6 rounded border-2 transition-all ${
                strokeColor === color
                  ? 'border-blue-500 scale-110'
                  : 'border-transparent hover:border-slate-500'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="flex items-center gap-1 px-3 border-r border-slate-600">
        <span className="text-xs text-slate-400 mr-1">Width:</span>
        <div className="flex gap-1">
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              onClick={() => onStrokeWidthChange(width)}
              className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                strokeWidth === width
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={`${width}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: width + 2, height: width + 2 }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        className={`p-2 rounded-lg transition-colors ${
          hasSelection
            ? 'text-red-400 hover:text-red-300 hover:bg-slate-700'
            : 'text-slate-600 cursor-not-allowed'
        }`}
        title="Delete Selected (Del)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
