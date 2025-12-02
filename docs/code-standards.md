# WinShot - Code Standards

**Date:** 2025-12-03 | **Version:** 1.0

---

## Overview

This document defines naming conventions, file organization, and architectural patterns used throughout the WinShot codebase.

---

## Go Conventions

### Naming

**Package Names**
- lowercase, single word or compound
- no underscores: `config`, `hotkeys`, `screenshot`, `windows`, `tray`
- reflect main responsibility

**Type Names (PascalCase)**
```go
type App struct {}
type Config struct {}
type HotkeyManager struct {}
type CaptureResult struct {}
type WindowInfo struct {}
```

**Interface Names (PascalCase)**
```go
type Reader interface {}
type Handler interface {}
```

**Function/Method Names (PascalCase for exports, camelCase for private)**
```go
// Exported (called from Wails)
func (a *App) CaptureFullscreen() CaptureResult
func (a *App) SaveImage(data, path, filename string) error

// Private (internal use)
func (a *App) onHotkey(id int)
func (hm *HotkeyManager) registerHotkey(id int, mods uint, vk int) error
```

**Constants (PascalCase for exports, UPPER_CASE convention for magic numbers)**
```go
const (
  HotkeyFullscreen = 1
  HotkeyRegion     = 2
  HotkeyWindow     = 3
)

const (
  ModAlt   uint = 0x0001
  ModCtrl  uint = 0x0002
  VK_SNAPSHOT = 0x2C
)
```

**Struct Fields (PascalCase)**
```go
type Config struct {
  Hotkeys    HotkeyConfig  `json:"hotkeys"`
  Startup    StartupConfig `json:"startup"`
  Window     WindowConfig  `json:"window"`
}
```

### File Organization

**Package Structure**
```
internal/
├── config/
│   ├── config.go      // Config struct + persistence (Load, Save, Default)
│   └── startup.go     // Windows Registry integration
├── hotkeys/
│   └── hotkeys.go     // HotkeyManager + handler
├── screenshot/
│   ├── capture.go     // Fullscreen, region, window capture
│   └── window.go      // Window-specific capture + DPI
├── tray/
│   └── tray.go        // TrayIcon + context menu
└── windows/
    └── enum.go        // Window enumeration
```

**Each package includes:**
- One or two .go files max (keep focused)
- Consistent internal structure
- All exported functions documented

### Go Patterns Used

**Package Initialization Pattern**
```go
// Constructor
func NewHotkeyManager() *HotkeyManager {
  return &HotkeyManager{
    // initialize
  }
}

// Lifecycle methods
func (hm *HotkeyManager) Start() error
func (hm *HotkeyManager) Stop() error
```

**Configuration Pattern**
```go
// Defaults
func Default() *Config { return &Config{...} }

// Persistence
func Load() (*Config, error) { /* read from disk */ }
func (c *Config) Save() error { /* write to disk */ }
```

**Callback Pattern**
```go
type HotkeyManager struct {
  callback func(id int)
}

func (hm *HotkeyManager) SetCallback(f func(id int)) {
  hm.callback = f
}

func (hm *HotkeyManager) onHotkey(id int) {
  if hm.callback != nil {
    hm.callback(id)
  }
}
```

**Windows API Wrapper Pattern**
```go
var (
  user32 = syscall.NewLazyDLL("user32.dll")
  procRegisterHotKey = user32.NewProc("RegisterHotKey")
)

func (hm *HotkeyManager) registerHotkey(...) error {
  ret, _, err := procRegisterHotKey.Call(...)
  if ret == 0 {
    return fmt.Errorf("RegisterHotKey failed: %w", err)
  }
  return nil
}
```

**Error Handling**
```go
// Always check errors
cfg, err := config.Load()
if err != nil {
  cfg = config.Default()
}

// Use fmt.Errorf for wrapping
if ret == 0 {
  return fmt.Errorf("API call failed: %w", syscallErr)
}

// Log internal errors to console/file
println("Error:", err.Error())
```

### Type System

**Config Struct Composition**
```go
type Config struct {
  Hotkeys    HotkeyConfig    `json:"hotkeys"`
  Startup    StartupConfig   `json:"startup"`
  QuickSave  QuickSaveConfig `json:"quickSave"`
  Export     ExportConfig    `json:"export"`
  Window     WindowConfig    `json:"window"`
}
```

**Result Types**
```go
type CaptureResult struct {
  Width  int    `json:"width"`
  Height int    `json:"height"`
  Data   string `json:"data"`  // base64 PNG
}

type WindowInfo struct {
  Handle    int    `json:"handle"`
  Title     string `json:"title"`
  ClassName string `json:"className"`
  X, Y      int    `json:"x,y"`
  Width     int    `json:"width"`
  Height    int    `json:"height"`
}
```

---

## TypeScript/React Conventions

### Naming

**File Names (kebab-case for components)**
```
app.tsx                        # Main component
title-bar.tsx                  # Component file
annotation-shapes.tsx          # Feature file
settings-modal.tsx             # Modal component
hotkey-input.tsx              # Input component
index.ts                       # Barrel exports (types)
```

**Type/Interface Names (PascalCase)**
```typescript
interface CaptureResult { }
interface WindowInfo { }
interface Annotation { }
type CaptureMode = 'fullscreen' | 'region' | 'window'
type AnnotationType = 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text'
type EditorTool = 'select' | 'crop' | AnnotationType
```

**Component Names (PascalCase)**
```typescript
export function App() { }
export function TitleBar() { }
export function AnnotationToolbar() { }
export function EditorCanvas() { }
```

**Hook Names (camelCase, start with "use")**
```typescript
function loadEditorSettings(): EditorSettings { }
function saveEditorSettings(settings: EditorSettings): void { }
```

**Variable/State Names (camelCase)**
```typescript
const [screenshot, setScreenshot] = useState<CaptureResult | null>(null)
const [activeTool, setActiveTool] = useState<EditorTool>('select')
const [strokeColor, setStrokeColor] = useState('#ef4444')
const stageRef = useRef<Konva.Stage>(null)
```

**Event Handlers (camelCase, prefix with "on")**
```typescript
const onFullscreenCapture = useCallback(() => { }, [])
const onAnnotationSelect = useCallback((id: string) => { }, [])
const onExport = useCallback(async () => { }, [])
```

**Constants (UPPER_CASE)**
```typescript
const EDITOR_SETTINGS_KEY = 'winshot-editor-settings'
const DEFAULT_EDITOR_SETTINGS: EditorSettings = { }
```

### File Organization

**App.tsx Structure**
```typescript
// 1. Imports
import { useState, useRef, useCallback, useEffect } from 'react'
import { components } from './components'
import { types } from './types'
import { wailsBindings } from '../wailsjs/go/main/App'

// 2. Local types
interface EditorSettings { }

// 3. Constants
const EDITOR_SETTINGS_KEY = '...'
const DEFAULT_EDITOR_SETTINGS = { }

// 4. Helper functions
function loadEditorSettings(): EditorSettings { }
function saveEditorSettings(settings: EditorSettings): void { }

// 5. Main component
function App() {
  // State declarations
  const [state, setState] = useState(initialValue)

  // Effect hooks
  useEffect(() => { }, [])

  // Event handlers
  const handleEvent = useCallback(() => { }, [])

  // Render
  return <div>{/* JSX */}</div>
}

export default App
```

**Component Structure**
```typescript
// annotations-toolbar.tsx
import { useState, useCallback } from 'react'
import { AnnotationType } from '../types'

interface AnnotationToolbarProps {
  activeTool: AnnotationType | 'select'
  onToolSelect: (tool: AnnotationType) => void
  strokeColor: string
  strokeWidth: number
  onColorChange: (color: string) => void
}

export function AnnotationToolbar({
  activeTool,
  onToolSelect,
  strokeColor,
  strokeWidth,
  onColorChange,
}: AnnotationToolbarProps) {
  const handleRectangle = useCallback(() => {
    onToolSelect('rectangle')
  }, [onToolSelect])

  return (
    <div className="flex gap-2">
      {/* JSX */}
    </div>
  )
}
```

**Type Organization (types/index.ts)**
```typescript
// 1. Result/Response types
export interface CaptureResult { }
export interface WindowInfo { }

// 2. Enum-like unions
export type CaptureMode = 'fullscreen' | 'region' | 'window'
export type AnnotationType = 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text'

// 3. Data model types
export interface Annotation { }
export interface CropArea { }

// 4. Config types
export interface HotkeyConfig { }
export interface StartupConfig { }
export interface AppConfig { }

// 5. Component prop types (optionally in same file or separate)
export interface ToolbarProps { }
```

### React Patterns Used

**Functional Components with Hooks**
```typescript
function App() {
  // State
  const [screenshot, setScreenshot] = useState<CaptureResult | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  // Refs
  const stageRef = useRef<Konva.Stage>(null)

  // Effects
  useEffect(() => {
    EventsOn('hotkey:region', () => {
      setShowRegionSelector(true)
    })

    return () => {
      EventsOff('hotkey:region')
    }
  }, [])

  // Callbacks (memoized)
  const handleCapture = useCallback(async () => {
    const result = await CaptureFullscreen()
    setScreenshot(result)
  }, [])

  return <div>{/* JSX */}</div>
}
```

**localStorage Persistence**
```typescript
const SETTINGS_KEY = 'winshot-editor-settings'

function loadEditorSettings(): EditorSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_EDITOR_SETTINGS, ...parsed }
    }
  } catch {
    // Silent fail, use defaults
  }
  return DEFAULT_EDITOR_SETTINGS
}

function saveEditorSettings(settings: EditorSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// Usage
const [settings, setSettings] = useState<EditorSettings>(() =>
  loadEditorSettings()
)

const handleSettingsChange = (newSettings: EditorSettings) => {
  setSettings(newSettings)
  saveEditorSettings(newSettings)
}
```

**Wails Method Binding**
```typescript
import {
  CaptureFullscreen,
  SaveImage,
  GetWindowText
} from '../wailsjs/go/main/App'

function App() {
  const handleCapture = useCallback(async () => {
    try {
      const result = await CaptureFullscreen()
      setScreenshot(result)
    } catch (error) {
      console.error('Capture failed:', error)
      setStatusMessage('Capture failed')
    }
  }, [])

  return <button onClick={handleCapture}>Capture</button>
}
```

**Event System (Wails EventsOn/Off)**
```typescript
import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime'

function App() {
  useEffect(() => {
    // Subscribe
    const unsubscribeRegion = EventsOn('hotkey:region', () => {
      setShowRegionSelector(true)
    })

    const unsubscribeFullscreen = EventsOn('hotkey:fullscreen', () => {
      handleFullscreenCapture()
    })

    // Cleanup
    return () => {
      unsubscribeRegion()
      unsubscribeFullscreen()
    }
  }, [])
}
```

**Konva Canvas Pattern**
```typescript
import Konva from 'konva'
import { Stage, Layer, Rect, Circle, Image as KonvaImage } from 'react-konva'

function EditorCanvas({
  screenshot,
  annotations,
  selectedAnnotationId,
  onAnnotationSelect,
}) {
  const stageRef = useRef<Konva.Stage>(null)
  const imageRef = useRef<Konva.Image>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new window.Image()
    img.src = `data:image/png;base64,${screenshot.data}`
    img.onload = () => setImage(img)
  }, [screenshot])

  return (
    <Stage width={width} height={height} ref={stageRef}>
      <Layer>
        {image && <KonvaImage image={image} ref={imageRef} />}
        {annotations.map(anno => (
          anno.type === 'rectangle' ? (
            <Rect
              key={anno.id}
              x={anno.x}
              y={anno.y}
              width={anno.width}
              height={anno.height}
              stroke={anno.stroke}
              strokeWidth={anno.strokeWidth}
              onClick={() => onAnnotationSelect(anno.id)}
            />
          ) : null
        ))}
      </Layer>
    </Stage>
  )
}
```

**Type-Safe Component Props**
```typescript
interface SettingsModalProps {
  isOpen: boolean
  config: AppConfig
  onSave: (config: AppConfig) => void
  onCancel: () => void
}

export function SettingsModal({
  isOpen,
  config,
  onSave,
  onCancel,
}: SettingsModalProps) {
  const [formData, setFormData] = useState<AppConfig>(config)

  const handleSave = useCallback(() => {
    onSave(formData)
  }, [formData, onSave])

  if (!isOpen) return null

  return <dialog>{/* JSX */}</dialog>
}
```

### TypeScript Best Practices

**Use Strict Mode**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

**Avoid `any` Type**
```typescript
// BAD
function handleCapture(result: any) { }

// GOOD
function handleCapture(result: CaptureResult) { }
```

**Use Union Types Over Multiple Overloads**
```typescript
// BAD
function setTool(tool: string): void
function setTool(tool: AnnotationType): void

// GOOD
type EditorTool = 'select' | 'crop' | AnnotationType
function setTool(tool: EditorTool): void { }
```

**Explicit Return Types**
```typescript
// BAD
const loadSettings = () => {
  return localStorage.getItem('settings')
}

// GOOD
const loadSettings = (): EditorSettings | null => {
  const stored = localStorage.getItem('settings')
  return stored ? JSON.parse(stored) : null
}
```

---

## Styling Conventions

### Tailwind CSS

**Utility-First Approach**
```tsx
// Prefer utility classes
<div className="flex items-center gap-2 p-4 rounded-lg bg-blue-500">
  {/* content */}
</div>

// Avoid inline styles
<div style={{display: 'flex', gap: '8px'}}>  {/* NO */}
```

**Class Organization**
```
Layout → Spacing → Sizing → Typography → Colors → Effects → Transforms
```

**Responsive Design**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Stacked on mobile, 2 cols on tablet, 3 cols on desktop */}
</div>
```

**Dark Mode (if needed)**
```tsx
<div className="bg-white dark:bg-slate-900 text-black dark:text-white">
  {/* Themed content */}
</div>
```

### Component Styling

**Tailwind Config**
```javascript
// frontend/tailwind.config.js
export default {
  content: ['./src/**/*.{tsx,ts}'],
  theme: {
    extend: {
      colors: {
        // Custom palette
      },
    },
  },
  plugins: [],
}
```

---

## Testing Patterns

*Note: WinShot does not have automated tests at this time. Consider adding:*

**Go Testing Pattern**
```go
func TestCaptureFullscreen(t *testing.T) {
  result, err := CaptureFullscreen()
  if err != nil {
    t.Fatalf("unexpected error: %v", err)
  }

  if result.Width == 0 || result.Height == 0 {
    t.Error("invalid capture dimensions")
  }
}
```

**React Testing Pattern (recommended: vitest + @testing-library)**
```typescript
import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders capture toolbar', () => {
    render(<App />)
    expect(screen.getByText(/capture/i)).toBeInTheDocument()
  })
})
```

---

## Error Handling

### Go Errors

**Pattern 1: Caller Decides**
```go
func (c *Config) Load() (*Config, error) {
  data, err := ioutil.ReadFile(path)
  if err != nil {
    return nil, fmt.Errorf("read config failed: %w", err)
  }
  // ...
}

// Caller:
cfg, err := config.Load()
if err != nil {
  log.Println("Warning: using default config")
  cfg = config.Default()
}
```

**Pattern 2: Explicit Logging**
```go
func (hm *HotkeyManager) registerHotkey(...) error {
  ret, _, err := procRegisterHotKey.Call(...)
  if ret == 0 {
    println("Error: RegisterHotKey failed:", err.Error())
    return fmt.Errorf("RegisterHotKey failed: %w", err)
  }
  return nil
}
```

### TypeScript/React Errors

**Pattern 1: Try/Catch with User Feedback**
```typescript
const handleCapture = async () => {
  try {
    setIsCapturing(true)
    const result = await CaptureFullscreen()
    setScreenshot(result)
    setStatusMessage('Captured successfully')
  } catch (error) {
    console.error('Capture failed:', error)
    setStatusMessage('Capture failed - try again')
  } finally {
    setIsCapturing(false)
  }
}
```

**Pattern 2: Null Safety**
```typescript
if (screenshot === null) {
  return <div>No screenshot captured</div>
}

const { width, height, data } = screenshot
```

**Pattern 3: Type Narrowing**
```typescript
type EditorTool = 'select' | 'crop' | AnnotationType

const tool: EditorTool = 'rectangle'

if (tool === 'crop') {
  // tool is narrowed to 'crop'
  handleCrop()
} else if (tool !== 'select') {
  // tool is narrowed to AnnotationType
  handleAnnotation(tool)
}
```

---

## Comments & Documentation

### Go Comments

**Package-Level (above package declaration)**
```go
// Package config manages application configuration persistence.
package config
```

**Function-Level (above exported functions)**
```go
// Load reads the configuration from disk or returns an error.
// If the file doesn't exist, use Default() instead.
func Load() (*Config, error) {
  // ...
}
```

**Type-Level (above exported types)**
```go
// Config holds all application settings.
type Config struct {
  Hotkeys HotkeyConfig
  // ...
}
```

### TypeScript Comments

**File-Level (top of file)**
```typescript
/**
 * Editor canvas component using Konva for rendering screenshots
 * with annotations (shapes, text, arrows).
 */
```

**Function-Level (for complex logic)**
```typescript
/**
 * Loads editor settings from localStorage with fallback to defaults.
 * Invalid stored data is silently ignored.
 */
function loadEditorSettings(): EditorSettings {
  // ...
}
```

**Inline Comments (sparingly, for "why" not "what")**
```typescript
// Store scale ratio to handle DPI-scaled captures
setRegionScaleRatio(displayDPI / 96)
```

---

## Summary

| Category | Convention | Example |
|----------|-----------|---------|
| **Go Packages** | lowercase | `config`, `hotkeys`, `screenshot` |
| **Go Types** | PascalCase | `Config`, `HotkeyManager` |
| **Go Functions** | PascalCase (exported), camelCase (private) | `Load()`, `onHotkey()` |
| **Go Constants** | UPPER_CASE or PascalCase | `ModCtrl`, `HotkeyFullscreen` |
| **Files** | kebab-case | `title-bar.tsx`, `config.go` |
| **React Components** | PascalCase | `App`, `AnnotationToolbar` |
| **TypeScript Types** | PascalCase | `CaptureResult`, `Annotation` |
| **Variables** | camelCase | `screenshot`, `activeTool` |
| **Event Handlers** | onEventName | `onCapture`, `onAnnotationSelect` |
| **Constants** | UPPER_CASE | `EDITOR_SETTINGS_KEY` |
| **Styling** | Tailwind Utilities | `flex gap-2 p-4 rounded-lg` |

