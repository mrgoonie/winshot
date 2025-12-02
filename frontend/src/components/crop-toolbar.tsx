import { AspectRatio } from '../types';

interface CropToolbarProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
  isCropActive: boolean;
}

const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: '16:9', label: '16:9' },
  { id: '4:3', label: '4:3' },
  { id: '1:1', label: '1:1' },
  { id: '9:16', label: '9:16' },
  { id: '3:4', label: '3:4' },
];

export function CropToolbar({
  aspectRatio,
  onAspectRatioChange,
  onApplyCrop,
  onCancelCrop,
  isCropActive,
}: CropToolbarProps) {
  if (!isCropActive) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-800/80 border-b border-surface-700/50 animate-fade-in">
      <span className="text-2xs text-surface-500 uppercase tracking-wider">Ratio</span>

      <div className="flex gap-0.5">
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio.id}
            onClick={() => onAspectRatioChange(ratio.id)}
            className={`px-2.5 py-1 text-xs rounded-md transition-all duration-150 ${
              aspectRatio === ratio.id
                ? 'bg-accent-500/20 text-accent-400 font-medium'
                : 'text-surface-400 hover:text-surface-300 hover:bg-surface-700/50'
            }`}
          >
            {ratio.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={onCancelCrop}
        className="px-3 py-1 text-xs text-surface-400 hover:text-surface-300
                   hover:bg-surface-700/50 rounded-md transition-all duration-150"
      >
        Cancel
      </button>

      <button
        onClick={onApplyCrop}
        className="px-3 py-1 text-xs bg-accent-500/20 text-accent-400
                   hover:bg-accent-500/30 rounded-md transition-all duration-150"
      >
        Apply
      </button>
    </div>
  );
}
