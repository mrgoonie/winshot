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
    <div className="flex items-center gap-2 p-2 bg-slate-700 border-b border-slate-600">
      <span className="text-sm text-slate-300 mr-2">Aspect Ratio:</span>

      <div className="flex gap-1">
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio.id}
            onClick={() => onAspectRatioChange(ratio.id)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              aspectRatio === ratio.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
            }`}
          >
            {ratio.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={onCancelCrop}
        className="px-4 py-1 text-sm bg-slate-600 text-slate-300 rounded hover:bg-slate-500 transition-colors"
      >
        Cancel
      </button>

      <button
        onClick={onApplyCrop}
        className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
      >
        Apply Crop
      </button>
    </div>
  );
}
