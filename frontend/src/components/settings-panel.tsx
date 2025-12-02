import { useRef, useState, useEffect } from 'react';
import { OutputRatio } from '../types';
import { GetBackgroundImages, SaveBackgroundImages } from '../../wailsjs/go/main/App';

const MAX_BACKGROUND_IMAGES = 8;

// Output ratio presets with display labels
const OUTPUT_RATIO_PRESETS: { value: OutputRatio; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:2', label: '3:2' },
  { value: '16:9', label: '16:9' },
  { value: '5:3', label: '5:3' },
  { value: '9:16', label: '9:16' },
  { value: '3:4', label: '3:4' },
  { value: '2:3', label: '2:3' },
];

interface SettingsPanelProps {
  padding: number;
  cornerRadius: number;
  shadowSize: number;
  backgroundColor: string;
  outputRatio: OutputRatio;
  imageWidth: number;
  imageHeight: number;
  onPaddingChange: (value: number) => void;
  onCornerRadiusChange: (value: number) => void;
  onShadowSizeChange: (value: number) => void;
  onBackgroundChange: (value: string) => void;
  onOutputRatioChange: (value: OutputRatio) => void;
}

const GRADIENT_PRESETS = [
  // Row 1: Vibrant & Bold
  { name: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { name: 'Fire', value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
  // Row 2: Cool & Calm
  { name: 'Cool Blue', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { name: 'Lavender', value: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)' },
  { name: 'Aqua', value: 'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)' },
  { name: 'Grape', value: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)' },
  // Row 3: Soft & Pastel
  { name: 'Peach', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { name: 'Sky', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { name: 'Warm', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { name: 'Mint', value: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
  // Row 4: Dark & Moody
  { name: 'Midnight', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { name: 'Carbon', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
  { name: 'Deep Space', value: 'linear-gradient(135deg, #000428 0%, #004e92 100%)' },
  { name: 'Noir', value: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
  // Row 5: Premium & Elegant
  { name: 'Royal', value: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)' },
  { name: 'Rose Gold', value: 'linear-gradient(135deg, #f4c4f3 0%, #fc67fa 100%)' },
  { name: 'Emerald', value: 'linear-gradient(135deg, #1d976c 0%, #93f9b9 100%)' },
  { name: 'Amethyst', value: 'linear-gradient(135deg, #9d50bb 0%, #6e48aa 100%)' },
  // Row 6: Modern & Trendy
  { name: 'Neon', value: 'linear-gradient(135deg, #00f260 0%, #0575e6 100%)' },
  { name: 'Aurora', value: 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)' },
  { name: 'Candy', value: 'linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)' },
  { name: 'Clean', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
];

export function SettingsPanel({
  padding,
  cornerRadius,
  shadowSize,
  backgroundColor,
  outputRatio,
  imageWidth,
  imageHeight,
  onPaddingChange,
  onCornerRadiusChange,
  onShadowSizeChange,
  onBackgroundChange,
  onOutputRatioChange,
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Load images from Go backend on mount
  useEffect(() => {
    GetBackgroundImages().then((images) => {
      if (Array.isArray(images)) {
        setUploadedImages(images.slice(0, MAX_BACKGROUND_IMAGES));
      }
    }).catch(() => {
      // Failed to load, start with empty
    });
  }, []);

  // Max padding is 1/3 of the smaller dimension
  const maxPadding = Math.floor(Math.min(imageWidth, imageHeight) / 3);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadedImages.length < MAX_BACKGROUND_IMAGES) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newImages = [...uploadedImages, dataUrl];
        setUploadedImages(newImages);
        // Persist to Go backend
        SaveBackgroundImages(newImages).catch(() => {
          // Silent fail - images still work in current session
        });
        onBackgroundChange(`url(${dataUrl})`);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const imageToRemove = uploadedImages[index];
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    // Persist to Go backend
    SaveBackgroundImages(newImages).catch(() => {
      // Silent fail
    });
    // If the removed image was the active background, reset to first gradient
    if (backgroundColor === `url(${imageToRemove})`) {
      onBackgroundChange(GRADIENT_PRESETS[0].value);
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    onBackgroundChange(`url(${imageUrl})`);
  };

  return (
    <div className="w-72 bg-surface-900/50 border-l border-surface-800/50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-800/50">
        <h2 className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Style</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Padding */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-surface-400">Padding</label>
            <span className="text-xs text-surface-500 tabular-nums">{padding}px</span>
          </div>
          <input
            type="range"
            min="0"
            max={maxPadding}
            value={Math.min(padding, maxPadding)}
            onChange={(e) => onPaddingChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Corner Radius */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-surface-400">Corners</label>
            <span className="text-xs text-surface-500 tabular-nums">{cornerRadius}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={cornerRadius}
            onChange={(e) => onCornerRadiusChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Shadow/Blur */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-surface-400">Shadow</label>
            <span className="text-xs text-surface-500 tabular-nums">{shadowSize}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={shadowSize}
            onChange={(e) => onShadowSizeChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Output Ratio */}
        <div>
          <label className="block text-xs text-surface-400 mb-2">Aspect Ratio</label>
          <div className="grid grid-cols-3 gap-1">
            {OUTPUT_RATIO_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onOutputRatioChange(preset.value)}
                className={`px-2 py-1.5 text-xs rounded-md transition-all duration-150
                  ${outputRatio === preset.value
                    ? 'bg-accent-500/20 text-accent-400 font-medium'
                    : 'bg-surface-800/50 text-surface-400 hover:bg-surface-700/50 hover:text-surface-300'
                  }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Background Gradients */}
        <div>
          <label className="block text-xs text-surface-400 mb-2">Background</label>
          <div className="grid grid-cols-4 gap-1.5">
            {GRADIENT_PRESETS.map((gradient) => (
              <button
                key={gradient.name}
                onClick={() => onBackgroundChange(gradient.value)}
                className={`aspect-square rounded-lg transition-all duration-150
                  ${backgroundColor === gradient.value
                    ? 'ring-2 ring-accent-400 ring-offset-1 ring-offset-surface-900 scale-105'
                    : 'hover:scale-105'
                  }`}
                style={{ background: gradient.value }}
                title={gradient.name}
              />
            ))}
          </div>
        </div>

        {/* Custom Color */}
        <div>
          <label className="block text-xs text-surface-400 mb-2">Custom Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={backgroundColor.startsWith('#') ? backgroundColor : '#1a1a2e'}
              onChange={(e) => onBackgroundChange(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
            />
            <span className="text-xs text-surface-500">
              {backgroundColor.startsWith('#') ? backgroundColor : 'Gradient'}
            </span>
          </div>
        </div>

        {/* Image Background */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-surface-400">Images</label>
            <span className="text-2xs text-surface-500">{uploadedImages.length}/{MAX_BACKGROUND_IMAGES}</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Image Gallery Grid */}
          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {uploadedImages.map((imageUrl, index) => {
                const isSelected = backgroundColor === `url(${imageUrl})`;
                return (
                  <div key={index} className="relative group">
                    <button
                      onClick={() => handleSelectImage(imageUrl)}
                      className={`w-full aspect-square rounded-lg bg-cover bg-center transition-all duration-150
                        ${isSelected
                          ? 'ring-2 ring-accent-400 ring-offset-1 ring-offset-surface-900 scale-105'
                          : 'hover:scale-105'
                        }`}
                      style={{ backgroundImage: `url(${imageUrl})` }}
                      title={`Image ${index + 1}`}
                    />
                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(index);
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 hover:bg-danger-600
                                 rounded-full flex items-center justify-center
                                 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      title="Remove image"
                    >
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload button - only show if under limit */}
          {uploadedImages.length < MAX_BACKGROUND_IMAGES && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 bg-surface-800/50 hover:bg-surface-700/50
                         text-surface-400 hover:text-surface-300
                         rounded-lg transition-all duration-150
                         flex items-center justify-center gap-2 text-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
              </svg>
              Add Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
