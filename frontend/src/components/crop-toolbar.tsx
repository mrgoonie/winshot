import React from 'react';
import { CropAspectRatio } from '../types';

interface CropToolbarProps {
  aspectRatio: CropAspectRatio;
  onAspectRatioChange: (ratio: CropAspectRatio) => void;
  onApply: () => void;
  onCancel: () => void;
  onReset: () => void;
  canApply: boolean;
  canReset: boolean;
}

const ASPECT_RATIOS: { value: CropAspectRatio; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: '9:16', label: '9:16' },
  { value: '3:4', label: '3:4' },
];

export function CropToolbar({
  aspectRatio,
  onAspectRatioChange,
  onApply,
  onCancel,
  onReset,
  canApply,
  canReset,
}: CropToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-lg">
      {/* Aspect Ratio Buttons */}
      <div className="flex items-center gap-1">
        <span className="text-white/60 text-xs mr-2">Ratio:</span>
        {ASPECT_RATIOS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onAspectRatioChange(value)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              aspectRatio === value
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/20 mx-2" />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          disabled={!canReset}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            canReset
              ? 'bg-red-500/80 text-white hover:bg-red-600'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          Reset
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs bg-white/10 text-white/80 rounded hover:bg-white/20 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={!canApply}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            canApply
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          Apply
        </button>
      </div>

      {/* Hint */}
      <span className="text-white/40 text-xs ml-2">Press Esc to cancel</span>
    </div>
  );
}

export default CropToolbar;
