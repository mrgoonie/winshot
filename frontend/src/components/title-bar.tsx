import { WindowMinimise, WindowToggleMaximise, Quit } from '../../wailsjs/runtime/runtime';

interface TitleBarProps {
  title?: string;
}

export function TitleBar({ title = 'WinShot' }: TitleBarProps) {
  return (
    <div
      className="flex items-center h-8 bg-slate-900 border-b border-slate-800 select-none"
      style={{ '--wails-draggable': 'drag' } as React.CSSProperties}
    >
      {/* App icon and title - draggable area */}
      <div className="flex items-center gap-2 px-3 flex-1 h-full">
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M21 15l-5-5L5 21"/>
        </svg>
        <span className="text-sm text-slate-300 font-medium">{title}</span>
      </div>

      {/* Window controls - not draggable */}
      <div
        className="flex h-full"
        style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize button */}
        <button
          onClick={() => WindowMinimise()}
          className="w-12 h-full flex items-center justify-center text-slate-400
                     hover:bg-slate-700 hover:text-white transition-colors"
          title="Minimize"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth="2" d="M5 12h14" />
          </svg>
        </button>

        {/* Maximize/Restore button */}
        <button
          onClick={() => WindowToggleMaximise()}
          className="w-12 h-full flex items-center justify-center text-slate-400
                     hover:bg-slate-700 hover:text-white transition-colors"
          title="Maximize"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="1" strokeWidth="2" />
          </svg>
        </button>

        {/* Close button */}
        <button
          onClick={() => Quit()}
          className="w-12 h-full flex items-center justify-center text-slate-400
                     hover:bg-red-600 hover:text-white transition-colors"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
