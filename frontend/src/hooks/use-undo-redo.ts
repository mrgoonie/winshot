import { useState, useCallback } from 'react';

interface UseUndoRedoOptions {
  maxHistory?: number;
}

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoResult<T> {
  state: T;
  set: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  reset: (newState: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Custom hook for state management with undo/redo capability.
 * Uses a snapshot-based approach where each state change creates a new history entry.
 *
 * @param initialState - Initial state value
 * @param options - Configuration options (maxHistory defaults to 50)
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoResult<T> {
  const { maxHistory = 50 } = options;

  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const set = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((current) => {
        const resolvedState =
          typeof newState === 'function'
            ? (newState as (prev: T) => T)(current.present)
            : newState;

        return {
          past: [...current.past, current.present].slice(-maxHistory),
          present: resolvedState,
          future: [], // Clear future on new action
        };
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) return current;

      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) return current;

      const next = current.future[0];
      const newFuture = current.future.slice(1);

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
