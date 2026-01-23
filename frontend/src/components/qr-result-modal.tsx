import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface QRResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: string | null;
}

export function QRResultModal({ isOpen, onClose, result }: QRResultModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card rounded-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-gradient">QR Scan Result</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
            <p className="text-slate-200 break-all whitespace-pre-wrap font-mono text-sm">
              {result}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                         ${copied 
                           ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                           : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25'
                         }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Result
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-medium transition-all duration-200
                         bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                         text-slate-300 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
