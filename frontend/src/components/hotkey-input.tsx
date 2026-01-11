import { useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface HotkeyInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}

// Map browser key codes to readable names
const keyCodeToName: Record<string, string> = {
  PrintScreen: 'PrintScreen',
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
  F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Escape: 'Escape',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
};

// Keys that shouldn't be used as main hotkey
const blockedKeys = new Set(['Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock']);

// Preset hotkeys for keys browsers cannot capture (WebView2/Chromium intercepts PrintScreen)
const HOTKEY_PRESETS = [
  { value: 'PrintScreen', label: 'PrtSc' },
  { value: 'Ctrl+PrintScreen', label: 'Ctrl+PrtSc' },
  { value: 'Ctrl+Shift+PrintScreen', label: 'Ctrl+Shift+PrtSc' },
] as const;

export function HotkeyInput({ value, onChange, label, disabled = false }: HotkeyInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);
  const inputRef = useRef<HTMLButtonElement>(null);

  // Format hotkey for display
  const formatHotkey = (hotkey: string): string => {
    if (!hotkey) return 'Click to set';
    return hotkey;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];

    // Add modifiers in standard order
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Win');

    // Get the main key
    let keyName = e.key;

    // Skip if it's just a modifier key
    if (blockedKeys.has(keyName)) {
      setCurrentKeys(parts);
      return;
    }

    // Map special keys
    if (keyCodeToName[e.code]) {
      keyName = keyCodeToName[e.code];
    } else if (e.key.length === 1) {
      // Single character (letter or number)
      keyName = e.key.toUpperCase();
    }

    parts.push(keyName);
    setCurrentKeys(parts);
  }, [isRecording]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    // If we have a valid hotkey (modifier + key or just a function key), save it
    if (currentKeys.length > 0) {
      const lastKey = currentKeys[currentKeys.length - 1];
      // Check if last item is not a modifier
      if (!['Ctrl', 'Alt', 'Shift', 'Win'].includes(lastKey)) {
        const hotkeyStr = currentKeys.join('+');
        onChange(hotkeyStr);
        setIsRecording(false);
        setCurrentKeys([]);
        inputRef.current?.blur();
      }
    }
  }, [isRecording, currentKeys, onChange]);

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('keyup', handleKeyUp, true);
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('keyup', handleKeyUp, true);
      };
    }
  }, [isRecording, handleKeyDown, handleKeyUp]);

  const startRecording = () => {
    if (disabled) return;
    setIsRecording(true);
    setCurrentKeys([]);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setCurrentKeys([]);
  };

  const clearHotkey = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="mb-4">
      <label className="block text-sm text-slate-300 font-medium mb-2">{label}</label>
      <div className="flex gap-2">
        <button
          ref={inputRef}
          onClick={startRecording}
          onBlur={cancelRecording}
          disabled={disabled}
          className={`flex-1 px-4 py-2.5 rounded-xl text-left transition-all duration-200 ${
            isRecording
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white ring-2 ring-violet-400/50'
              : 'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10 hover:border-white/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isRecording
            ? currentKeys.length > 0
              ? currentKeys.join('+')
              : 'Press keys...'
            : formatHotkey(value)}
        </button>
        {value && !isRecording && (
          <button
            onClick={clearHotkey}
            disabled={disabled}
            className="px-3 py-2.5 rounded-xl transition-all duration-200
                       bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30
                       text-slate-400 hover:text-rose-400"
            title="Clear hotkey"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Preset buttons for browser-blocked keys */}
      <div className="mt-2">
        <span className="text-xs text-slate-500 mb-1.5 block">or select preset:</span>
        <div className="flex flex-wrap gap-1.5">
          {HOTKEY_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => !disabled && onChange(preset.value)}
              disabled={disabled}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all duration-200 ${
                value === preset.value
                  ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300 border border-white/10'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
