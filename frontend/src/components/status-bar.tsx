import { CaptureResult } from '../types';

interface StatusBarProps {
  screenshot: CaptureResult | null;
  message?: string;
}

export function StatusBar({ screenshot, message }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-surface-950 border-t border-surface-800/30">
      <span className="text-2xs text-surface-500">
        {message || (screenshot
          ? `${screenshot.width} × ${screenshot.height}`
          : 'Ready'
        )}
      </span>
      <span className="text-2xs text-surface-600">v1.0</span>
    </div>
  );
}
