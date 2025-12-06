import { CaptureResult } from '../types';

interface StatusBarProps {
  screenshot: CaptureResult | null;
  message?: string;
}

export function StatusBar({ screenshot, message }: StatusBarProps) {
  return (
    <div className="px-4 py-2 glass text-sm flex justify-between items-center">
      <span className="text-slate-400">
        {message ? (
          <span className="text-cyan-400">{message}</span>
        ) : screenshot ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              Image: <span className="text-violet-400 font-medium">{screenshot.width}</span>
              <span className="text-slate-500"> × </span>
              <span className="text-violet-400 font-medium">{screenshot.height}</span>
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Ready
          </span>
        )}
      </span>
      <span className="flex items-center gap-3">
        <span className="text-gradient font-semibold">WinShot v{__APP_VERSION__}</span>
        <span className="text-slate-500">•</span>
        <a
          href="https://ClaudeKit.cc"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-cyan-400 transition-colors"
        >
          Built with 💖 by ClaudeKit
        </a>
      </span>
    </div>
  );
}
