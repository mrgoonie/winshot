import { WindowMinimise, WindowToggleMaximise, Quit, WindowHide } from '../../wailsjs/runtime/runtime';
import { Minus, Square, X, Camera } from 'lucide-react';
import { GetConfig } from '../../wailsjs/go/main/App';

interface TitleBarProps {
  title?: string;
  onMinimize?: () => void;
}

export function TitleBar({ title = 'WinShot', onMinimize }: TitleBarProps) {
  const handleClose = async () => {
    try {
      const cfg = await GetConfig();
      if (cfg.startup?.closeToTray) {
        // Use onMinimize callback if provided, otherwise use WindowHide directly
        if (onMinimize) {
          onMinimize();
        } else {
          WindowHide();
        }
      } else {
        Quit();
      }
    } catch {
      // If config fetch fails, just quit
      Quit();
    }
  };

  return (
    <div
      className="flex items-center h-10 glass select-none border-b-0"
      style={{ '--wails-draggable': 'drag' } as React.CSSProperties}
    >
      {/* App icon and title - draggable area */}
      <div className="flex items-center gap-2.5 px-4 flex-1 h-full">
        {/* Vibrant gradient icon */}
        <div className="relative">
          <Camera className="w-5 h-5 text-violet-400" />
        </div>
        <span className="text-sm font-semibold text-gradient">{title}</span>
      </div>

      {/* Window controls - not draggable */}
      <div
        className="flex h-full"
        style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize button */}
        <button
          onClick={() => WindowMinimise()}
          className="w-11 h-full flex items-center justify-center text-slate-400
                     hover:bg-white/10 hover:text-white transition-all duration-200"
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Maximize/Restore button */}
        <button
          onClick={() => WindowToggleMaximise()}
          className="w-11 h-full flex items-center justify-center text-slate-400
                     hover:bg-white/10 hover:text-white transition-all duration-200"
          title="Maximize"
        >
          <Square className="w-3.5 h-3.5" />
        </button>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center text-slate-400
                     hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500 hover:text-white transition-all duration-200"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
