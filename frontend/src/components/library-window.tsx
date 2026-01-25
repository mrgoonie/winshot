import { useState, useEffect, useCallback, useRef } from 'react';
import { LibraryImage } from '../types';
import { GetLibraryImages, DeleteScreenshot } from '../../wailsjs/go/main/App';
import { X, Camera, Edit, Trash2, RefreshCw, Image, Calendar } from 'lucide-react';

interface LibraryWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: () => void;
  onEdit: (image: LibraryImage) => void;
}

export function LibraryWindow({ isOpen, onClose, onCapture, onEdit }: LibraryWindowProps) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived state for selected image
  const selectedImage = selectedIndex >= 0 && selectedIndex < images.length
    ? images[selectedIndex]
    : null;

  // Load images when modal opens
  useEffect(() => {
    if (isOpen) {
      loadImages();
      // Focus container for keyboard events
      setTimeout(() => containerRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset selection when images change
  useEffect(() => {
    if (images.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [images]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const cols = 4; // Grid columns

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, images.length - 1));
          break;

        case 'ArrowLeft':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;

        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + cols, images.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - cols, 0));
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedImage) {
            onEdit(selectedImage);
          }
          break;

        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (selectedImage) {
            handleDelete();
          }
          break;

        case 'Escape':
          e.preventDefault();
          onClose();
          break;

        case 'Home':
          e.preventDefault();
          setSelectedIndex(0);
          break;

        case 'End':
          e.preventDefault();
          setSelectedIndex(images.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images, selectedImage, onEdit, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.querySelector(`[data-index="${selectedIndex}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const list = await GetLibraryImages();
      setImages((list as LibraryImage[]) || []);
    } catch (error) {
      console.error('Failed to load library images:', error);
      setImages([]);
    }
    setIsLoading(false);
  };

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleDoubleClick = useCallback((image: LibraryImage) => {
    onEdit(image);
  }, [onEdit]);

  const handleDelete = async () => {
    if (!selectedImage) return;

    const confirmed = window.confirm('Delete this screenshot? This cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await DeleteScreenshot(selectedImage.filepath);
      setImages(prev => {
        const newImages = prev.filter(img => img.filepath !== selectedImage.filepath);
        // Adjust selection index
        if (selectedIndex >= newImages.length) {
          setSelectedIndex(Math.max(newImages.length - 1, 0));
        }
        return newImages;
      });
    } catch (error) {
      console.error('Failed to delete screenshot:', error);
    }
    setIsDeleting(false);
  };

  const handleEdit = () => {
    if (selectedImage) {
      onEdit(selectedImage);
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 outline-none"
    >
      <div className="glass-card rounded-2xl w-[900px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-bold text-gradient">Screenshot Library</h2>
            <span className="text-sm text-slate-400">
              {images.length} {images.length === 1 ? 'image' : 'images'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
                <span>Loading screenshots...</span>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Image className="w-16 h-16 text-slate-600 mb-4" />
              <p className="text-lg font-medium mb-2">No screenshots yet</p>
              <p className="text-sm text-slate-500 mb-6">Capture your first screenshot to see it here</p>
              <button
                onClick={onCapture}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl
                           transition-all duration-200 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture Screenshot
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {images.map((image, index) => (
                <button
                  key={image.filepath}
                  data-index={index}
                  onClick={() => handleSelect(index)}
                  onDoubleClick={() => handleDoubleClick(image)}
                  className={`group relative rounded-xl overflow-hidden transition-all duration-200
                              border-2 ${selectedIndex === index
                                ? 'border-violet-500 ring-2 ring-violet-500/30'
                                : 'border-transparent hover:border-white/20'
                              }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-slate-900/50 flex items-center justify-center">
                    <img
                      src={`data:image/png;base64,${image.thumbnail}`}
                      alt={image.filename}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* Info overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="text-white text-xs truncate font-medium">{image.filename}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(image.modifiedDate)}
                    </div>
                  </div>

                  {/* Dimensions badge */}
                  <div className="absolute top-2 right-2 bg-black/60 text-[10px] text-slate-300 px-1.5 py-0.5 rounded">
                    {image.width}x{image.height}
                  </div>

                  {/* Selection indicator */}
                  {selectedIndex === index && (
                    <div className="absolute top-2 left-2 bg-violet-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {index + 1}/{images.length}
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-violet-500/0 group-hover:bg-violet-500/10 transition-all duration-200 pointer-events-none" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={loadImages}
              disabled={isLoading}
              className="px-3 py-2 text-slate-400 hover:text-violet-400 transition-all duration-200
                         text-sm flex items-center gap-2 rounded-lg hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCapture}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl
                         transition-all duration-200 flex items-center gap-2 border border-white/10"
            >
              <Camera className="w-4 h-4" />
              Capture
            </button>

            <button
              onClick={handleEdit}
              disabled={!selectedImage}
              className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl
                         transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>

            <button
              onClick={handleDelete}
              disabled={!selectedImage || isDeleting}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl
                         transition-all duration-200 flex items-center gap-2 border border-rose-500/30
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl
                         transition-all duration-200 border border-white/10"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
