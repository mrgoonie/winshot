import { EditorTool, Annotation } from '../types';
import {
  MousePointer2,
  Square,
  Circle,
  MoveRight,
  Minus,
  Type,
  Trash2,
  Bold,
  Italic,
  Spline,
  Lightbulb,
  Crop,
  Undo2,
  Redo2,
} from 'lucide-react';

interface AnnotationToolbarProps {
  activeTool: EditorTool;
  strokeColor: string;
  strokeWidth: number;
  fontSize: number;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  onToolChange: (tool: EditorTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onFontSizeChange: (size: number) => void;
  onFontStyleChange: (style: 'normal' | 'bold' | 'italic' | 'bold italic') => void;
  onCurvedChange?: (curved: boolean) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  selectedAnnotation?: Annotation;
  // Undo/Redo props
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899',
  '#ffffff', '#000000', '#64748b', '#1e293b',
];

const STROKE_WIDTHS = [2, 4, 6, 8, 10];

const FONT_SIZES = [16, 24, 32, 48, 64, 80, 96];

export function AnnotationToolbar({
  activeTool,
  strokeColor,
  strokeWidth,
  fontSize,
  fontStyle,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onFontSizeChange,
  onFontStyleChange,
  onCurvedChange,
  onDeleteSelected,
  hasSelection,
  selectedAnnotation,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: AnnotationToolbarProps) {
  // Show text controls when text tool is active or a text annotation is selected
  const showTextControls = activeTool === 'text' || selectedAnnotation?.type === 'text';

  // Show arrow controls when an arrow annotation is selected
  const showArrowControls = selectedAnnotation?.type === 'arrow';
  const isArrowCurved = selectedAnnotation?.type === 'arrow' && selectedAnnotation?.curved;

  // Get current font values (from selected annotation or defaults)
  const currentFontSize = selectedAnnotation?.type === 'text' ? selectedAnnotation.fontSize || 48 : fontSize;
  const currentFontStyle = selectedAnnotation?.type === 'text' ? selectedAnnotation.fontStyle || 'normal' : fontStyle;

  // Helper to toggle bold
  const toggleBold = () => {
    const isBold = currentFontStyle === 'bold' || currentFontStyle === 'bold italic';
    const isItalic = currentFontStyle === 'italic' || currentFontStyle === 'bold italic';

    if (isBold) {
      onFontStyleChange(isItalic ? 'italic' : 'normal');
    } else {
      onFontStyleChange(isItalic ? 'bold italic' : 'bold');
    }
  };

  // Helper to toggle italic
  const toggleItalic = () => {
    const isBold = currentFontStyle === 'bold' || currentFontStyle === 'bold italic';
    const isItalic = currentFontStyle === 'italic' || currentFontStyle === 'bold italic';

    if (isItalic) {
      onFontStyleChange(isBold ? 'bold' : 'normal');
    } else {
      onFontStyleChange(isBold ? 'bold italic' : 'italic');
    }
  };

  const isBoldActive = currentFontStyle === 'bold' || currentFontStyle === 'bold italic';
  const isItalicActive = currentFontStyle === 'italic' || currentFontStyle === 'bold italic';
  const tools: { id: EditorTool; icon: JSX.Element; label: string; shortcut: string }[] = [
    {
      id: 'select',
      label: 'Select',
      shortcut: 'V',
      icon: <MousePointer2 className="w-5 h-5" />,
    },
    {
      id: 'rectangle',
      label: 'Rectangle',
      shortcut: 'R',
      icon: <Square className="w-5 h-5" />,
    },
    {
      id: 'ellipse',
      label: 'Ellipse',
      shortcut: 'E',
      icon: <Circle className="w-5 h-5" />,
    },
    {
      id: 'arrow',
      label: 'Arrow',
      shortcut: 'A',
      icon: <MoveRight className="w-5 h-5" />,
    },
    {
      id: 'line',
      label: 'Line',
      shortcut: 'L',
      icon: <Minus className="w-5 h-5 -rotate-45" />,
    },
    {
      id: 'text',
      label: 'Text',
      shortcut: 'T',
      icon: <Type className="w-5 h-5" />,
    },
    {
      id: 'spotlight',
      label: 'Spotlight',
      shortcut: 'S',
      icon: <Lightbulb className="w-5 h-5" />,
    },
    {
      id: 'crop',
      label: 'Crop',
      shortcut: 'C',
      icon: <Crop className="w-5 h-5" />,
    },
  ];

  return (
    <div className="flex items-center gap-3 px-3 py-2 glass-light">
      {/* Tools */}
      <div className="flex items-center gap-1 pr-3 border-r border-white/10">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              activeTool === tool.id
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-2 px-3 border-r border-white/10">
        <span className="text-xs text-slate-400 font-medium">Color</span>
        <div className="flex gap-1">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-6 h-6 rounded-md transition-all duration-200 ${
                strokeColor === color
                  ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900 scale-110'
                  : 'hover:scale-110 hover:ring-1 hover:ring-white/30'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width - hide when text tool active */}
      {!showTextControls && (
        <div className="flex items-center gap-2 px-3 border-r border-white/10">
          <span className="text-xs text-slate-400 font-medium">Width</span>
          <div className="flex gap-1">
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                onClick={() => onStrokeWidthChange(width)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  strokeWidth === width
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
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
      )}

      {/* Text Controls - Font Size */}
      {showTextControls && (
        <div className="flex items-center gap-2 px-3 border-r border-white/10">
          <span className="text-xs text-slate-400 font-medium">Size</span>
          <select
            value={currentFontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded-lg bg-white/10 text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size} className="bg-slate-800">
                {size}px
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Text Controls - Bold & Italic */}
      {showTextControls && (
        <div className="flex items-center gap-1 px-3 border-r border-white/10">
          <button
            onClick={toggleBold}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isBoldActive
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={toggleItalic}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isItalicActive
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Arrow Controls - Curved Toggle */}
      {showArrowControls && onCurvedChange && (
        <div className="flex items-center gap-1 px-3 border-r border-white/10">
          <button
            onClick={() => onCurvedChange(!isArrowCurved)}
            className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
              isArrowCurved
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Curved Arrow"
          >
            <Spline className="w-4 h-4" />
            <span className="text-xs font-medium">Curve</span>
          </button>
        </div>
      )}

      {/* Undo/Redo Buttons */}
      <div className="flex items-center gap-1 px-3 border-r border-white/10">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-all duration-200 ${
            canUndo
              ? 'text-slate-400 hover:text-white hover:bg-white/10'
              : 'text-slate-600 cursor-not-allowed opacity-50'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-all duration-200 ${
            canRedo
              ? 'text-slate-400 hover:text-white hover:bg-white/10'
              : 'text-slate-600 cursor-not-allowed opacity-50'
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-5 h-5" />
        </button>
      </div>

      {/* Delete Button */}
      <button
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        className={`p-2 rounded-lg transition-all duration-200 ${
          hasSelection
            ? 'text-rose-400 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-pink-500 hover:shadow-lg hover:shadow-rose-500/30'
            : 'text-slate-600 cursor-not-allowed opacity-50'
        }`}
        title="Delete Selected (Del)"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
