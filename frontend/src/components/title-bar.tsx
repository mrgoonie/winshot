import { WindowMinimise, WindowToggleMaximise, Quit } from '../../wailsjs/runtime/runtime';

interface TitleBarProps {
  title?: string;
}

export function TitleBar({ title = 'WinShot' }: TitleBarProps) {
  return (
    <div
      className="flex items-center h-9 bg-surface-950 select-none"
      style={{ '--wails-draggable': 'drag' } as React.CSSProperties}
    >
      {/* App icon and title - draggable area */}
      <div className="flex items-center gap-2.5 px-4 flex-1 h-full">
        {/* Modern gradient icon */}
        <div className="relative">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="url(#iconGradient)" strokeWidth="1.5" fill="none"/>
            <circle cx="8" cy="8" r="1.5" fill="url(#iconGradient)"/>
            <path d="M21 15l-5-5L5 21" stroke="url(#iconGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-xs font-medium text-surface-400 tracking-wide">{title}</span>
      </div>

      {/* Window controls - not draggable */}
      <div
        className="flex h-full"
        style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize button */}
        <button
          onClick={() => WindowMinimise()}
          className="w-11 h-full flex items-center justify-center text-surface-500
                     hover:bg-surface-800 hover:text-surface-300 transition-colors"
          title="Minimize"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 12h14" />
          </svg>
        </button>

        {/* Maximize/Restore button */}
        <button
          onClick={() => WindowToggleMaximise()}
          className="w-11 h-full flex items-center justify-center text-surface-500
                     hover:bg-surface-800 hover:text-surface-300 transition-colors"
          title="Maximize"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="1.5" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        {/* Close button */}
        <button
          onClick={() => Quit()}
          className="w-11 h-full flex items-center justify-center text-surface-500
                     hover:bg-danger-500 hover:text-white transition-colors"
          title="Close"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
