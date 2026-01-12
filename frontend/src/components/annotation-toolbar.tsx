import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Hash,
  ChevronDown,
} from 'lucide-react';

interface AnnotationToolbarProps {
  activeTool: EditorTool;
  strokeColor: string | null; // null = no stroke
  fillColor: string | null; // null = transparent
  strokeWidth: number;
  cornerRadius: number; // For rectangles
  fontSize: number;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  onToolChange: (tool: EditorTool) => void;
  onColorChange: (color: string | null) => void;
  onFillColorChange: (color: string | null) => void;
  onStrokeWidthChange: (width: number) => void;
  onCornerRadiusChange: (radius: number) => void;
  onFontSizeChange: (size: number) => void;
  onFontStyleChange: (style: 'normal' | 'bold' | 'italic' | 'bold italic') => void;
  onCurvedChange?: (curved: boolean) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  selectedAnnotation?: Annotation;
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

const CORNER_RADII = [0, 4, 8, 12, 20];

const FONT_SIZES = [16, 24, 32, 48, 64, 80, 96];

// Color picker dropdown component - uses Portal to escape overflow:hidden containers
function ColorPickerDropdown({
  label,
  value,
  onChange,
  allowNone,
  noneLabel = 'None',
}: {
  label: string;
  value: string | null;
  onChange: (color: string | null) => void;
  allowNone: boolean;
  noneLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed p-4 rounded-xl bg-slate-900 border border-white/20 shadow-2xl"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 99999,
        minWidth: '200px',
      }}
    >
      <div className="grid grid-cols-4 gap-3">
        {allowNone && (
          <button
            onClick={() => { onChange(null); setIsOpen(false); }}
            className={`w-10 h-10 rounded-lg transition-all duration-200 flex items-center justify-center border-2 border-white/30 ${
              value === null
                ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900 scale-110'
                : 'hover:scale-110 hover:border-white/50'
            }`}
            style={{ background: 'linear-gradient(135deg, transparent 42%, #ef4444 42%, #ef4444 58%, transparent 58%)' }}
            title={noneLabel}
          />
        )}
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => { onChange(color); setIsOpen(false); }}
            className={`w-10 h-10 rounded-lg transition-all duration-200 border-2 ${
              value === color
                ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900 scale-110 border-white/50'
                : 'border-transparent hover:scale-110 hover:border-white/30'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
        title={label}
      >
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        {value === null ? (
          <div
            className="w-5 h-5 rounded border border-white/20"
            style={{ background: 'linear-gradient(135deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)' }}
          />
        ) : (
          <div
            className="w-5 h-5 rounded border border-white/20"
            style={{ backgroundColor: value }}
          />
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(dropdownContent, document.body)}
    </div>
  );
}

export function AnnotationToolbar({
  activeTool,
  strokeColor,
  fillColor,
  strokeWidth,
  cornerRadius,
  fontSize,
  fontStyle,
  onToolChange,
  onColorChange,
  onFillColorChange,
  onStrokeWidthChange,
  onCornerRadiusChange,
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

  // Show fill controls when shape tool (rectangle/ellipse) is active or selected
  const showFillControls = activeTool === 'rectangle' || activeTool === 'ellipse' ||
    selectedAnnotation?.type === 'rectangle' || selectedAnnotation?.type === 'ellipse';

  // Show rectangle controls (corner radius) when rectangle tool is active or selected
  const showRectangleControls = activeTool === 'rectangle' || selectedAnnotation?.type === 'rectangle';

  // Get current fill value (from selected annotation or default)
  const currentFillColor = (selectedAnnotation?.type === 'rectangle' || selectedAnnotation?.type === 'ellipse')
    ? selectedAnnotation?.fill || null
    : fillColor;

  // Get current stroke value (from selected annotation or default)
  const currentStrokeColor = selectedAnnotation?.stroke ?? strokeColor;

  // Get current corner radius (from selected annotation or default)
  const currentCornerRadius = selectedAnnotation?.type === 'rectangle'
    ? selectedAnnotation?.cornerRadius ?? cornerRadius
    : cornerRadius;

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
    { id: 'select', label: 'Select', shortcut: 'V', icon: <MousePointer2 className="w-5 h-5" /> },
    { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: <Square className="w-5 h-5" /> },
    { id: 'ellipse', label: 'Ellipse', shortcut: 'E', icon: <Circle className="w-5 h-5" /> },
    { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: <MoveRight className="w-5 h-5" /> },
    { id: 'line', label: 'Line', shortcut: 'L', icon: <Minus className="w-5 h-5 -rotate-45" /> },
    { id: 'text', label: 'Text', shortcut: 'T', icon: <Type className="w-5 h-5" /> },
    { id: 'number', label: 'Number', shortcut: 'N', icon: <Hash className="w-5 h-5" /> },
    { id: 'spotlight', label: 'Spotlight', shortcut: 'S', icon: <Lightbulb className="w-5 h-5" /> },
    { id: 'crop', label: 'Crop', shortcut: 'C', icon: <Crop className="w-5 h-5" /> },
  ];

  return (
    <div className="flex items-center gap-2 px-3 py-2 glass-light">
      {/* Tools */}
      <div className="flex items-center gap-1 pr-2 border-r border-white/10">
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

      {/* Stroke Color Dropdown */}
      <ColorPickerDropdown
        label="Stroke"
        value={currentStrokeColor}
        onChange={onColorChange}
        allowNone={showFillControls}
        noneLabel="No stroke"
      />

      {/* Fill Color Dropdown - only for rectangle/ellipse */}
      {showFillControls && (
        <ColorPickerDropdown
          label="Fill"
          value={currentFillColor}
          onChange={onFillColorChange}
          allowNone={true}
          noneLabel="No fill"
        />
      )}

      {/* Stroke Width - hide when text tool active */}
      {!showTextControls && (
        <div className="flex items-center gap-1 px-2 border-l border-white/10">
          <span className="text-xs text-slate-400 font-medium mr-1">Width</span>
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              onClick={() => onStrokeWidthChange(width)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
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
      )}

      {/* Corner Radius - only for rectangle */}
      {showRectangleControls && (
        <div className="flex items-center gap-1 px-2 border-l border-white/10">
          <span className="text-xs text-slate-400 font-medium mr-1">Radius</span>
          {CORNER_RADII.map((radius) => (
            <button
              key={radius}
              onClick={() => onCornerRadiusChange(radius)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                currentCornerRadius === radius
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={radius === 0 ? 'Sharp corners' : `${radius}px radius`}
            >
              <div
                className="w-4 h-4 border-2 border-current"
                style={{ borderRadius: radius > 0 ? Math.min(radius, 8) : 0 }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Text Controls - Font Size */}
      {showTextControls && (
        <div className="flex items-center gap-2 px-2 border-l border-white/10">
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
        <div className="flex items-center gap-1">
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
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo/Redo Buttons */}
      <div className="flex items-center gap-1 px-2 border-l border-white/10">
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
