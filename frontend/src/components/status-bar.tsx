import { CaptureResult } from '../types';

interface StatusBarProps {
  screenshot: CaptureResult | null;
  message?: string;
}

export function StatusBar({ screenshot, message }: StatusBarProps) {
  return (
    <div className="p-2 bg-slate-800 border-t border-slate-700 text-sm text-slate-400 flex justify-between">
      <span>
        {message || (screenshot
          ? `Image: ${screenshot.width} x ${screenshot.height}`
          : 'Ready'
        )}
      </span>
      <span>WinShot v1.0</span>
    </div>
  );
}
