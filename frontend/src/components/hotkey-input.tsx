import { useState, useCallback, useRef, useEffect } from 'react';

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
    <div className="mb-3">
      <label className="block text-xs text-surface-400 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <button
          ref={inputRef}
          onClick={startRecording}
          onBlur={cancelRecording}
          disabled={disabled}
          className={`flex-1 px-3 py-2 rounded-lg text-left text-sm transition-all duration-150 ${
            isRecording
              ? 'bg-accent-500/20 text-accent-400 ring-2 ring-accent-500/50'
              : 'bg-surface-800/50 text-surface-300 hover:bg-surface-700/50'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
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
            className="px-3 py-2 bg-surface-800/50 hover:bg-surface-700/50
                       text-surface-500 hover:text-surface-300 rounded-lg
                       transition-all duration-150"
            title="Clear hotkey"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
