# Screenshot Apps Research Report
**Date:** 2025-12-01 | **Target:** Windows Screenshot Application (winshot)

---

## Executive Summary
Analyzed 5 industry-leading screenshot apps (CleanShot X, ShareX, Greenshot, Snagit, Flameshot) to extract proven patterns, essential features, and UI/UX best practices for winshot development.

---

## Feature Comparison Matrix

| Feature | CleanShot X | ShareX | Greenshot | Snagit | Flameshot |
|---------|-------------|--------|-----------|--------|-----------|
| **Capture Modes** | Full, Window, Region, Scrolling | 13+ modes + OCR | Full, Window, Region, Scrolling | Full, Window, Region, Steps | Full, Window, Region |
| **Annotation Tools** | Built-in editor | Markup, shapes, blur | Shapes, text, arrows, blur | Arrows, callouts, blur, redact | Pencil, line, circle, blur |
| **Background Beautification** | Yes (padding, alignment, aspect ratio) | Limited | No | No | No |
| **Screen Freeze** | Yes | No | No | No | No |
| **OCR/Text Extract** | Yes (on-device) | Yes | No | Auto text detection | No |
| **Cloud Storage** | Built-in (CleanShot Cloud) | 80+ destinations | Plugins (Dropbox, JIRA) | Cloud integrations | Imgur (disabled by default v13) |
| **Keyboard Shortcuts** | All-In-One mode | Highly customizable | Yes | Yes | Yes |
| **System Tray** | Implicit | Yes | Yes | Yes | Yes |
| **Screen Recording** | Yes (with camera overlay) | Yes (GIF support) | No | Yes | No |
| **Open Source** | No | Yes (GPLv3) | Yes | No | Yes (Qt6-based) |

---

## Core Workflow Patterns

### Capture → Edit → Share Loop
All apps follow: **Capture** → **Quick Preview** → **Annotate** → **Export/Share**

**Best Practice (CleanShot X):**
- Quick Access Overlay appears immediately post-capture
- Instant access to editor without file dialog
- One-click upload to cloud (eliminates "save where?" friction)

**Recommendation for winshot:** Implement floating toolbar post-capture with edit/save/delete options.

### Keyboard Shortcut Strategies
- **Global hotkeys:** Capture modes (region, window, full-screen)
- **Context hotkeys:** F2 = freeze, Esc = cancel, Space = confirm selection
- **ShareX advantage:** 20+ customizable shortcuts via config file

**Recommendation:** Map default: Ctrl+PrintScreen (region), Win+Shift+S (full-screen)

---

## UI/UX Patterns for Annotation Tools

### Toolbar Design
**Greenshot/Flameshot pattern:**
- Vertical toolbar on left/bottom of editor
- Icon-based tools: pencil, line, rectangle, circle, text, blur, eraser
- Color picker integrated
- Undo/redo buttons (5+ action buffer)

**Snagit enhancement:**
- Custom styles/templates for consistent branding
- Smart redact for automatic blur of sensitive areas
- Step numbering for process documentation

**Recommendation for winshot:**
- Floating toolbar (resizable, pin-able)
- 8 core tools: pencil, line, rectangle, circle, arrow, text, blur, highlight
- Color palette + opacity slider
- Undo/redo with action history

---

## Background Beautification (CleanShot X Unique)

**Why it matters:** Creating shareable, polished visuals without external tools.

**Features to implement:**
1. **Padding control:** Adjustable margin around screenshot
2. **Alignment options:** Center, left, right, top, bottom
3. **Aspect ratio presets:** 16:9, 4:3, 1:1 (for social media)
4. **Background fill:** Solid color, gradient, blur
5. **Auto-balance:** Intelligent spacing adjustment
6. **Shadow/border effects:** Depth perception

**Value proposition:** Users can share screenshots directly without Figma/Photoshop prep.

---

## Implementation Priorities (Windows-First)

### Must-Have (MVP - 2-3 weeks)
1. Region capture with selection UI
2. Quick preview overlay post-capture
3. Basic annotation: pencil, line, rectangle, text
4. Save to disk + clipboard copy
5. Global hotkey binding (Ctrl+PrintScreen)

### High-Impact (Phase 2 - 3-4 weeks)
1. Fullscreen + window capture modes
2. Color picker + palette customization
3. Background beautification (padding, color fill)
4. OCR text extraction
5. System tray integration

### Nice-To-Have (Phase 3+)
1. Screen recording (GIF/MP4)
2. Cloud integration (Imgur, Dropbox, custom webhook)
3. Scrolling capture (complex; lower priority)
4. Pin/paste annotations as templates
5. History panel (last 10 captures)

---

## Technology Stack Insights

| App | Tech Stack | Relevant to winshot |
|-----|-----------|---------------------|
| ShareX | C#/.NET 4.5+ | Native Windows API for hotkeys, screen capture |
| Greenshot | C#, Windows Forms | Lightweight, proven Windows integration |
| Flameshot | Qt6, C++ | Cross-platform, but overkill for Windows-only |
| CleanShot X | Swift/SwiftUI | Mac-specific; not applicable |

**Recommendation:** Use Electron/Tauri (for UI) + Node.js (for system APIs) or C#/.NET for native integration.

---

## Unresolved Questions
1. Should winshot support cloud uploads initially, or file-only?
2. What's the target for clipboard performance (sub-100ms required)?
3. Will OCR be local (offline) or cloud-based?
4. Multi-monitor support: priority or later phase?
5. Should scrolling capture be in MVP or Phase 2?

---

## Sources
- [CleanShot X Features](https://cleanshot.com/features)
- [ShareX GitHub](https://github.com/ShareX/ShareX)
- [Greenshot Documentation](https://getgreenshot.org/)
- [Snagit Professional Features](https://www.techsmith.com/snagit/features/)
- [Flameshot Open Source](https://flameshot.org/)
