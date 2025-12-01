# WinShot Implementation Plan

**Project:** Windows Screenshot Application
**Date:** 2025-12-01 | **Status:** Planning
**Tech Stack:** Wails v2.9.3 + Go 1.21 + React 18 + TypeScript 5 + TailwindCSS 3 + react-konva

---

## Overview

WinShot is a lightweight Windows screenshot tool (~10-15MB) with professional editing capabilities. Captures screenshots via region selection, fullscreen, or specific window. Editor provides background beautification, annotation tools, and export options.

---

## Architecture Summary

```
Go Backend (Wails)              React Frontend
+-----------------------+       +------------------------+
| internal/screenshot/  | <---> | components/Editor/     |
| internal/hotkeys/     |       | components/Toolbar/    |
| internal/windows/     |       | components/Canvas/     |
| internal/tray/        |       | hooks/useKonva         |
+-----------------------+       +------------------------+
```

---

## Phase Overview

| # | Phase | Priority | Est. Time | Status |
|---|-------|----------|-----------|--------|
| 1 | [Project Setup](./phase-01-project-setup.md) | Critical | 2h | Pending |
| 2 | [Screenshot Capture](./phase-02-screenshot-capture.md) | Critical | 4h | Pending |
| 3 | [Basic Editor UI](./phase-03-basic-editor-ui.md) | Critical | 4h | Pending |
| 4 | [Background Effects](./phase-04-background-effects.md) | High | 3h | Pending |
| 5 | [Annotation Tools](./phase-05-annotation-tools.md) | High | 6h | Pending |
| 6 | [Text Tool](./phase-06-text-tool.md) | High | 3h | Pending |
| 7 | [Crop & Ratio](./phase-07-crop-ratio.md) | Medium | 3h | Pending |
| 8 | [Export & Save](./phase-08-export-save.md) | High | 2h | Pending |
| 9 | [System Integration](./phase-09-system-integration.md) | Medium | 4h | Pending |

**Total Estimated:** ~31 hours

---

## Key Dependencies

### Go
- `github.com/wailsapp/wails/v2` - Desktop framework
- `github.com/kbinani/screenshot` - Multi-monitor capture
- `golang.org/x/sys/windows` - Windows APIs

### Frontend
- `react-konva` + `konva` - Canvas rendering
- `use-image` - Image loading hook
- `tailwindcss` - Styling

---

## Critical Success Factors

1. Sub-200ms capture latency
2. Smooth canvas rendering (60fps with <50 objects)
3. Intuitive drag-to-select region UI
4. Professional-looking exports with shadows/backgrounds

---

## Risk Summary

| Risk | Mitigation |
|------|------------|
| Wails v2 lacks system tray | Use golang.org/x/sys/windows directly |
| Hardware-accelerated app capture | kbinani/screenshot handles this |
| WebView2 not installed | Wails installer bundles WebView2 |

---

## Quick Start (After Implementation)

```bash
wails dev       # Development with hot reload
wails build     # Portable EXE (~10-15MB)
wails build -nsis  # Windows installer
```
