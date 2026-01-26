import { useRef, useState, useEffect } from 'react';
import { OutputRatio, BorderType } from '../types';
import { GetBackgroundImages, SaveBackgroundImages } from '../../wailsjs/go/main/App';
import { X, ImagePlus, Eye, EyeOff } from 'lucide-react';

const MAX_BACKGROUND_IMAGES = 8;
const MAX_BG_IMAGE_SIZE = 2048;  // Max dimension
const BG_IMAGE_QUALITY = 0.85;   // JPEG quality
const LEGACY_STORAGE_KEY = 'winshot-background-images';  // Old localStorage key for migration

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_BG_IMAGE_SIZE || height > MAX_BG_IMAGE_SIZE) {
        const ratio = Math.min(MAX_BG_IMAGE_SIZE / width, MAX_BG_IMAGE_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', BG_IMAGE_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

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
  showBackground: boolean;
  imageWidth: number;
  imageHeight: number;
  inset: number;
  autoBackground: boolean;
  extractedColor: string | null;
  insetBackgroundColor: string | null;
  borderEnabled: boolean;
  borderWeight: number;
  borderColor: string;
  borderOpacity: number;
  borderType: BorderType;
  onPaddingChange: (value: number) => void;
  onCornerRadiusChange: (value: number) => void;
  onShadowSizeChange: (value: number) => void;
  onBackgroundChange: (value: string) => void;
  onOutputRatioChange: (value: OutputRatio) => void;
  onShowBackgroundChange: (value: boolean) => void;
  onInsetChange: (value: number) => void;
  onAutoBackgroundChange: (value: boolean) => void;
  onInsetBackgroundColorChange: (value: string) => void;
  onBorderEnabledChange: (value: boolean) => void;
  onBorderWeightChange: (value: number) => void;
  onBorderColorChange: (value: string) => void;
  onBorderOpacityChange: (value: number) => void;
  onBorderTypeChange: (value: BorderType) => void;
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
  showBackground,
  imageWidth,
  imageHeight,
  inset,
  autoBackground,
  extractedColor,
  insetBackgroundColor,
  borderEnabled,
  borderWeight,
  borderColor,
  borderOpacity,
  borderType,
  onPaddingChange,
  onCornerRadiusChange,
  onShadowSizeChange,
  onBackgroundChange,
  onOutputRatioChange,
  onShowBackgroundChange,
  onInsetChange,
  onAutoBackgroundChange,
  onInsetBackgroundColorChange,
  onBorderEnabledChange,
  onBorderWeightChange,
  onBorderColorChange,
  onBorderOpacityChange,
  onBorderTypeChange,
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Load images from Go backend on mount, with migration from legacy localStorage
  useEffect(() => {
    GetBackgroundImages().then((images) => {
      const backendImages = Array.isArray(images) ? images : [];

      // Check for legacy localStorage images to migrate
      if (backendImages.length === 0) {
        try {
          const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacyData) {
            const legacyImages = JSON.parse(legacyData);
            if (Array.isArray(legacyImages) && legacyImages.length > 0) {
              // Migrate legacy images to backend
              const migratedImages = legacyImages.slice(0, MAX_BACKGROUND_IMAGES);
              setUploadedImages(migratedImages);
              SaveBackgroundImages(migratedImages).then(() => {
                // Clear legacy storage after successful migration
                localStorage.removeItem(LEGACY_STORAGE_KEY);
              }).catch(() => {});
              return;
            }
          }
        } catch {
          // Invalid legacy data, ignore
        }
      }

      setUploadedImages(backendImages.slice(0, MAX_BACKGROUND_IMAGES));
    }).catch(() => {
      // Failed to load from backend, try legacy localStorage as fallback
      try {
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyData) {
          const legacyImages = JSON.parse(legacyData);
          if (Array.isArray(legacyImages)) {
            setUploadedImages(legacyImages.slice(0, MAX_BACKGROUND_IMAGES));
          }
        }
      } catch {
        // Start with empty
      }
    });
  }, []);

  // Max padding is 1/3 of the smaller dimension
  const maxPadding = Math.floor(Math.min(imageWidth, imageHeight) / 3);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadedImages.length >= MAX_BACKGROUND_IMAGES) return;

    // Reset input first for responsiveness
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const dataUrl = await compressImage(file);
      const newImages = [...uploadedImages, dataUrl];
      setUploadedImages(newImages);
      SaveBackgroundImages(newImages).catch(() => {});
      onBackgroundChange(`url(${dataUrl})`);
    } catch (error) {
      console.error('Failed to process image:', error);
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
    <div className="w-72 glass p-4 overflow-y-auto border-l-0">
      <h2 className="text-sm font-bold text-gradient mb-5">Settings</h2>

      {/* Padding */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-slate-300 font-medium">Padding</label>
          <span className="text-xs text-violet-400 font-semibold bg-violet-500/10 px-2 py-0.5 rounded-full">{padding}px</span>
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

      {/* Inset */}
      <div className={`mb-6 transition-opacity duration-200 ${!showBackground ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-slate-300 font-medium">Inset</label>
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">{inset}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          value={inset}
          onChange={(e) => onInsetChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Inset Background Color - only shown when inset > 0 */}
      {inset > 0 && showBackground && (
        <div className="mb-6">
          <label className="block text-sm text-slate-300 font-medium mb-2">
            Inset Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={insetBackgroundColor || extractedColor || '#1a1a2e'}
              onChange={(e) => onInsetBackgroundColorChange(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            />
            <div className="text-xs">
              <div className="text-slate-400">Background Color</div>
              <div className="text-slate-300 font-mono">{insetBackgroundColor || extractedColor || '#1a1a2e'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Corner Radius */}
      <div className={`mb-6 transition-opacity duration-200 ${!showBackground ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-slate-300 font-medium">Corner Radius</label>
          <span className="text-xs text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-full">{cornerRadius}px</span>
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

      {/* Border Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-slate-300 font-medium">Border</label>
          <button
            onClick={() => onBorderEnabledChange(!borderEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200
              ${borderEnabled
                ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
              }`}
          >
            {borderEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{borderEnabled ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>

        {/* Border controls - disabled when border is off */}
        <div className={`space-y-4 transition-opacity duration-200 ${!borderEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Weight */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-slate-300 font-medium">Weight</label>
              <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">{borderWeight}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={borderWeight}
              onChange={(e) => onBorderWeightChange(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Color */}
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={borderColor}
              onChange={(e) => onBorderColorChange(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            />
            <div className="text-xs">
              <div className="text-slate-400">Color</div>
              <div className="text-slate-300 font-mono">{borderColor}</div>
            </div>
          </div>

          {/* Opacity */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-slate-300 font-medium">Opacity</label>
              <span className="text-xs text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full">{borderOpacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={borderOpacity}
              onChange={(e) => onBorderOpacityChange(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm text-slate-300 font-medium mb-2">Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['outside', 'center', 'inside'] as BorderType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => onBorderTypeChange(type)}
                  className={`px-2 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium capitalize
                    ${borderType === type
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shadow/Blur */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-slate-300 font-medium">Shadow Blur</label>
          <span className="text-xs text-pink-400 font-semibold bg-pink-500/10 px-2 py-0.5 rounded-full">{shadowSize}px</span>
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
      <div className={`mb-6 transition-opacity duration-200 ${!showBackground ? 'opacity-50 pointer-events-none' : ''}`}>
        <label className="block text-sm text-slate-300 font-medium mb-3">
          Output Ratio
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {OUTPUT_RATIO_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onOutputRatioChange(preset.value)}
              className={`px-2 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium
                ${outputRatio === preset.value
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-300 font-medium">Background</label>
          <button
            onClick={() => onShowBackgroundChange(!showBackground)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200
              ${showBackground
                ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
              }`}
            title={showBackground ? 'Hide background' : 'Show background'}
          >
            {showBackground ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Visible</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hidden</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Auto/Manual Background Toggle */}
      <div className={`mb-4 transition-opacity duration-200 ${!showBackground ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex gap-2">
          <button
            onClick={() => onAutoBackgroundChange(true)}
            className={`flex-1 px-3 py-2 text-xs rounded-lg transition-all duration-200 font-medium
              ${autoBackground
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
              }`}
          >
            Auto
          </button>
          <button
            onClick={() => onAutoBackgroundChange(false)}
            className={`flex-1 px-3 py-2 text-xs rounded-lg transition-all duration-200 font-medium
              ${!autoBackground
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
              }`}
          >
            Manual
          </button>
        </div>
      </div>

      {/* Extracted Color Preview (shown in Auto mode) */}
      {autoBackground && extractedColor && showBackground && (
        <div className="mb-4 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg border border-white/20 shadow-inner"
            style={{ backgroundColor: extractedColor }}
            title={`Extracted color: ${extractedColor}`}
          />
          <div className="text-xs">
            <div className="text-slate-400">Extracted Color</div>
            <div className="text-slate-300 font-mono">{extractedColor}</div>
          </div>
        </div>
      )}

      {/* Background Gradients */}
      <div className={`mb-6 transition-opacity duration-200 ${!showBackground || autoBackground ? 'opacity-50 pointer-events-none' : ''}`}>
        <label className="block text-sm text-slate-300 font-medium mb-3">
          Gradient Presets
          {autoBackground && <span className="ml-2 text-xs text-slate-500">(Auto mode)</span>}
        </label>
        <div className="grid grid-cols-4 gap-2">
          {GRADIENT_PRESETS.map((gradient) => (
            <button
              key={gradient.name}
              onClick={() => onBackgroundChange(gradient.value)}
              className={`w-full aspect-square rounded-lg transition-all duration-200
                ${backgroundColor === gradient.value
                  ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900 scale-105'
                  : 'hover:scale-105 hover:ring-1 hover:ring-white/30'
                }`}
              style={{ background: gradient.value }}
              title={gradient.name}
            />
          ))}
        </div>
      </div>

      {/* Custom Color */}
      <div className={`mb-6 transition-opacity duration-200 ${!showBackground || autoBackground ? 'opacity-50 pointer-events-none' : ''}`}>
        <label className="block text-sm text-slate-300 font-medium mb-3">
          Custom Color
        </label>
        <div className="relative">
          <input
            type="color"
            value={backgroundColor.startsWith('#') ? backgroundColor : '#1a1a2e'}
            onChange={(e) => onBackgroundChange(e.target.value)}
            className="w-full h-10 rounded-lg cursor-pointer bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Image Background */}
      <div className={`mb-6 transition-opacity duration-200 ${!showBackground || autoBackground ? 'opacity-50 pointer-events-none' : ''}`}>
        <label className="block text-sm text-slate-300 font-medium mb-3">
          Image Background
          <span className="ml-2 text-xs text-slate-500">({uploadedImages.length}/{MAX_BACKGROUND_IMAGES})</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Image Gallery Grid */}
        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {uploadedImages.map((imageUrl, index) => {
              const isSelected = backgroundColor === `url(${imageUrl})`;
              return (
                <div key={index} className="relative group">
                  <button
                    onClick={() => handleSelectImage(imageUrl)}
                    className={`w-full aspect-square rounded-lg transition-all duration-200 bg-cover bg-center
                      ${isSelected
                        ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900 scale-105 z-10'
                        : 'hover:scale-105 hover:ring-1 hover:ring-white/30'
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
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg shadow-rose-500/50"
                    title="Remove image"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
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
            className="w-full px-4 py-2.5 rounded-xl transition-all duration-200
                       bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 border-dashed
                       text-slate-300 hover:text-white font-medium flex items-center justify-center gap-2"
          >
            <ImagePlus className="w-4 h-4" />
            Upload Image
          </button>
        )}
      </div>
    </div>
  );
}
