import { useState, useCallback, useEffect } from 'react';

interface RegionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (x: number, y: number, width: number, height: number) => void;
  screenWidth: number;
  screenHeight: number;
  screenshotData?: string; // Base64 encoded screenshot to display as background
}

export function RegionSelector({
  isOpen,
  onClose,
  onSelect,
  screenWidth,
  screenHeight,
  screenshotData,
}: RegionSelectorProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Start drawing a new selection
    setIsDrawing(true);
    setIsDragging(false);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return;

      // If space is pressed while drawing, move the entire selection
      if (spacePressed) {
        // Initialize drag start position if not set yet
        if (!isDragging) {
          setIsDragging(true);
          setDragStartPos({ x: e.clientX, y: e.clientY });
          return;
        }

        const deltaX = e.clientX - dragStartPos.x;
        const deltaY = e.clientY - dragStartPos.y;

        setStartPos(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        setCurrentPos(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        setDragStartPos({ x: e.clientX, y: e.clientY });
        return;
      } else if (isDragging) {
        // Space was released, stop dragging mode
        setIsDragging(false);
      }

      setCurrentPos({ x: e.clientX, y: e.clientY });
    },
    [isDrawing, isDragging, spacePressed, dragStartPos]
  );

  const handleMouseUp = useCallback(() => {
    // If we were dragging, just stop dragging but continue drawing
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    // Calculate selection rectangle
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // Only capture if selection is meaningful (at least 10x10)
    if (width > 10 && height > 10) {
      onSelect(x, y, width, height);
    }

    // Reset
    setStartPos({ x: 0, y: 0 });
    setCurrentPos({ x: 0, y: 0 });
  }, [isDrawing, isDragging, startPos, currentPos, onSelect]);

  // Handle keyboard events for Escape and Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsDragging(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate selection box position and size
  const selectionX = Math.min(startPos.x, currentPos.x);
  const selectionY = Math.min(startPos.y, currentPos.y);
  const selectionWidth = Math.abs(currentPos.x - startPos.x);
  const selectionHeight = Math.abs(currentPos.y - startPos.y);

  return (
    <div
      className={`fixed inset-0 z-[9999] select-none ${spacePressed ? 'cursor-move' : 'cursor-crosshair'}`}
      style={{
        // Use viewport units to fill the entire window regardless of DPI scaling
        width: '100vw',
        height: '100vh',
        background: screenshotData
          ? `url(data:image/png;base64,${screenshotData}) no-repeat 0 0`
          : 'rgba(0, 0, 0, 0.3)',
        // Scale the physical screenshot to fit the viewport (handles DPI scaling)
        backgroundSize: '100vw 100vh',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Semi-transparent overlay on top of screenshot */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.3)' }}
      />

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 text-white rounded-lg text-sm z-10">
        {isDrawing && spacePressed
          ? 'Hold Space + Drag to reposition selection'
          : 'Drag to select region. Hold Space to move. ESC to cancel.'}
      </div>

      {/* Selection rectangle */}
      {isDrawing && (
        <>
          {/* Darkened overlay around selection */}
          <div
            className="absolute bg-black/50"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: selectionY,
            }}
          />
          <div
            className="absolute bg-black/50"
            style={{
              top: selectionY + selectionHeight,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="absolute bg-black/50"
            style={{
              top: selectionY,
              left: 0,
              width: selectionX,
              height: selectionHeight,
            }}
          />
          <div
            className="absolute bg-black/50"
            style={{
              top: selectionY,
              left: selectionX + selectionWidth,
              right: 0,
              height: selectionHeight,
            }}
          />

          {/* Clear area (shows the screenshot) */}
          <div
            className="absolute"
            style={{
              left: selectionX,
              top: selectionY,
              width: selectionWidth,
              height: selectionHeight,
              background: screenshotData
                ? `url(data:image/png;base64,${screenshotData}) no-repeat`
                : 'transparent',
              backgroundPosition: `-${selectionX}px -${selectionY}px`,
              // Use viewport units to match the main background scaling
              backgroundSize: '100vw 100vh',
            }}
          />

          {/* Selection border */}
          <div
            className="absolute border-2 border-blue-500 pointer-events-none"
            style={{
              left: selectionX,
              top: selectionY,
              width: selectionWidth,
              height: selectionHeight,
            }}
          >
            {/* Corner handles */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500" />
          </div>

          {/* Size indicator */}
          <div
            className="absolute px-2 py-1 bg-blue-500 text-white text-xs rounded z-10"
            style={{
              left: selectionX + selectionWidth / 2 - 40,
              top: selectionY + selectionHeight + 8,
            }}
          >
            {selectionWidth} x {selectionHeight}
          </div>
        </>
      )}
    </div>
  );
}
