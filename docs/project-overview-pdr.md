# WinShot - Project Overview & Product Development Requirements

**Date:** 2025-12-03 | **Last Updated:** 2026-01-12 | **Version:** 1.5.0 | **Status:** Active Development (Phase 4 Complete)

---

## Executive Summary

WinShot is a **Windows-native screenshot application** designed to be a lightweight, feature-rich alternative to built-in screen capture tools. Built with Wails (Go + React), it combines native performance with modern UI/UX.

**Key Value Proposition:**
- **90% smaller** than Electron alternatives (~10MB vs 100MB+)
- **Fast & responsive** - native system operations via Go
- **Modern UI** - Vibrant Glassmorphism design system
- **Rich annotation tools** - Shape drawing, text, arrows
- **Smart export** - Multiple output ratios, gradient backgrounds

---

## Project Vision & Goals

### Vision
Enable Windows users to capture, annotate, and export screenshots with minimal friction and maximum visual quality.

### Primary Goals
1. **Performance** - Sub-second capture and export
2. **Usability** - Intuitive UI requiring minimal learning
3. **Quality** - Professional-grade annotations and output
4. **Portability** - Single EXE, no installation required (optional)

### Success Metrics
- Sub-100ms capture time (any mode)
- Export time < 500ms
- Application size < 20MB
- User preference over built-in Snipping Tool
- Zero external dependencies at runtime

---

## Target Users & Use Cases

### Primary Users
1. **Content Creators** - Screenshots for blogs, tutorials, documentation
2. **Developers** - Bug reports, code screenshots, documentation
3. **Designers** - UI mockups, design feedback, presentations
4. **Support Teams** - Issue documentation, troubleshooting

### Use Cases

**Use Case 1: Quick Screenshot with Annotation**
```
User: Content creator preparing blog post
Flow: Press Ctrl+PrintScreen → Select region → Add text annotation →
      Export as PNG → Use in blog
Time: < 30 seconds
Value: Professional annotated image without Photoshop
```

**Use Case 2: Window Capture with Background**
```
User: Developer reporting application bug
Flow: Open WinShot → Select "Window Capture" → Pick dialog box →
      Add arrow annotation → Add text explanation → Export → Send to team
Time: < 1 minute
Value: Clear context without screenshot background
```

**Use Case 3: Batch Annotated Screenshots**
```
User: Support team documenting process
Flow: Capture multiple screenshots → Annotate with shapes/text →
      Export all with custom naming → Compile into documentation
Time: 5 minutes per scenario
Value: Consistent, professional documentation
```

**Use Case 4: Presentation Slides**
```
User: Technical presenter
Flow: Capture application screenshot → Apply gradient background →
      Add callout arrows → Export at specific aspect ratio (16:9) →
      Insert in PowerPoint
Time: < 2 minutes per slide
Value: Polished, branded screenshots
```

---

## Core Features

### 1. Capture Modes (Implemented)
- **Fullscreen** - Single or multi-display
- **Region** - Drag to select rectangle
- **Window** - Automatically detect and capture active window
- **Hotkey Triggered** - Global hotkeys for each mode (configurable)

### 2. Annotations (Implemented)
- **Rectangle** - Draw bordered boxes with fill/no-fill
- **Ellipse** - Draw circles/ovals
- **Arrow** - Draw directional arrows (configurable endpoints)
- **Line** - Draw freeform lines
- **Text** - Add text with font, size, color, alignment

**Common Properties:**
- Stroke color (picker)
- Stroke width (1-20px)
- Fill color (optional)
- Transform support (move, resize, rotate)

### 3. Editor Features (Implemented)
- **Non-destructive cropping** - Adjust bounds without losing data
- **Aspect ratio constraints** - Free, 16:9, 4:3, 1:1, 9:16, 3:4
- **Editor settings persistence** - Padding, corner radius, shadow, background
- **24 Gradient backgrounds** - Vibrant Glassmorphism presets
- **Real-time preview** - See changes instantly

### 4. Export Options (Implemented)
- **Formats:** PNG (lossless), JPEG (with quality slider)
- **Output Ratios:** 9 presets (auto, 1:1, 4:3, 3:2, 16:9, 5:3, 9:16, 3:4, 2:3)
- **Background Integration** - Option to include/exclude gradient
- **Quick Save** - Save to configured folder with auto-naming
- **Manual Save** - User-selected location and filename

### 5. Configuration (Implemented)
- **Hotkey Customization** - Map to any key combination
- **Startup Behavior** - Launch on boot, minimize to tray
- **Quick-Save Settings** - Default folder, filename pattern
- **Export Defaults** - Format, quality, background preference
- **Window Size Memory** - Restore last used dimensions

### 6. System Integration (Implemented)
- **System Tray** - Icon in taskbar tray area
- **Tray Context Menu** - Quick access to capture modes
- **Global Hotkeys** - Work even when WinShot is unfocused
- **Native Windowing** - Frameless custom title bar

---

## Technical Requirements

### Functional Requirements

| ID | Requirement | Status | Priority |
|----|----|--------|----------|
| FR-1 | Capture fullscreen with multi-display support | ✓ Implemented | P0 |
| FR-2 | Capture user-selected region via drag-select | ✓ Implemented | P0 |
| FR-3 | Capture specific window from enumerated list | ✓ Implemented | P0 |
| FR-4 | Register and respond to global hotkeys | ✓ Implemented | P0 |
| FR-5 | Display captured screenshot in editable canvas | ✓ Implemented | P0 |
| FR-6 | Draw rectangle, ellipse, arrow, line, text annotations | ✓ Implemented | P1 |
| FR-7 | Select, move, resize, rotate annotations | ✓ Implemented | P1 |
| FR-8 | Non-destructive crop with aspect ratio presets | ✓ Implemented | P1 |
| FR-9 | Apply gradient backgrounds (24 presets) | ✓ Implemented | P1 |
| FR-10 | Export to PNG/JPEG with quality control | ✓ Implemented | P1 |
| FR-11 | Save to user-selected or quick-save location | ✓ Implemented | P1 |
| FR-12 | Persist editor settings (padding, radius, shadow) | ✓ Implemented | P2 |
| FR-13 | Customize hotkeys via UI dialog | ✓ Implemented | P2 |
| FR-14 | Configure startup behavior and quick-save defaults | ✓ Implemented | P2 |
| FR-15 | System tray icon with context menu | ✓ Implemented | P2 |

### Non-Functional Requirements

| ID | Requirement | Target | Status |
|----|----|--------|--------|
| NFR-1 | Application size | < 20MB | ✓ ~10-15MB |
| NFR-2 | Fullscreen capture latency | < 100ms | ✓ Achieved |
| NFR-3 | Region capture + render time | < 200ms | ✓ Achieved |
| NFR-4 | Export time (full quality PNG) | < 500ms | ✓ Achieved |
| NFR-5 | Memory usage (idle) | < 100MB | ✓ ~60MB |
| NFR-6 | Startup time | < 2 seconds | ✓ Achieved |
| NFR-7 | Responsiveness (UI interaction) | < 16ms per frame | ✓ 60 FPS |
| NFR-8 | Multi-display support | 2-4 displays | ✓ Unlimited |
| NFR-9 | Windows version support | Windows 10/11 | ✓ Both |
| NFR-10 | DPI scaling support | 100%-200% | ✓ Full support |

### Technical Stack

**Backend:**
- Go 1.24.0
- Wails v2.10.2
- kbinani/screenshot (multi-display capture)
- golang.org/x/sys/windows (Win32 APIs)

**Frontend:**
- React 18.2.0
- TypeScript 5.3.0
- react-konva 18.2.10 (canvas drawing)
- Tailwind CSS 3.4.0
- Vite 3.0.7

**Deployment:**
- Portable EXE (no installer)
- Optional NSIS installer

---

## Architecture & Design Decisions

### Backend: Go + Wails
**Why?**
- Native system API access (screenshots, hotkeys, tray)
- 90% smaller binary than Electron
- Compiled performance
- Type-safe, garbage-collected

**Why not Python/C#?**
- Python: Slower, adds runtime dependency
- C#: .NET Framework adds 100MB+ overhead

### Frontend: React + TypeScript
**Why?**
- Modern, component-based UI
- TypeScript for type safety
- Rich ecosystem (Konva for canvas)
- Fast development iteration

### Canvas: react-konva
**Why?**
- Declarative React patterns
- Layer-based rendering (efficient)
- Native shape types (Rectangle, Ellipse, etc.)
- Transform support (move, resize, rotate)

**Why not fabric.js?**
- Imperative API (non-React)
- 300KB+ bundle
- Larger memory footprint

### Styling: Tailwind CSS + Vibrant Glassmorphism
**Why?**
- Utility-first, rapid prototyping
- Consistent design system
- Small bundle (~3KB minified)
- Modern aesthetic (glass effect)

### State Management: React hooks only
**Why?**
- Simple, single-window app
- No shared state across tabs
- localStorage for persistence
- Sufficient for current complexity

---

## Non-Functional Attributes

### Reliability
- **Error Recovery:** Graceful fallbacks (e.g., use default config if load fails)
- **Crash Handling:** Unhandled exceptions logged, app continues
- **Data Loss Prevention:** Auto-save editor settings to localStorage
- **Uptime:** Expected 99.9% (single-machine app, no network)

### Maintainability
- **Code Organization:** Clear package structure (config, hotkeys, screenshot, tray, windows)
- **Documentation:** API docs, code standards, architecture guide
- **Testing:** Unit tests for config, screenshot; integration tests for Wails bindings (TODO)
- **Dependency Updates:** Regular Go/npm updates, vendor security patches

### Extensibility
- **New Annotation Types:** Add to AnnotationType union, implement shape in annotation-shapes.tsx
- **New Export Formats:** Extend export logic to support WEBP, GIF, etc.
- **New Capture Modes:** Add method to app.go, bind to frontend
- **Plugin Architecture:** Future consideration (not planned for v1)

### Security
- **File Access:** Only user-writable directories
- **No Network:** Completely offline, no telemetry
- **Admin Privileges:** Not required (except some hotkey combinations)
- **Credentials:** None stored; config is plaintext JSON
- **Code Review:** Community contributions welcome, review process TBD

### Usability
- **Learning Curve:** < 5 minutes for new user
- **Accessibility:** Keyboard shortcuts, proper contrast, legible fonts
- **Localization:** English only (v1), extensible for future languages
- **Help System:** Inline tooltips, context-sensitive help in settings

---

## Project Roadmap

### Phase 1: MVP (Completed)
- Basic capture (fullscreen, region, window)
- Simple annotations (rectangle, ellipse)
- Export to PNG
- Configuration dialog
- System tray integration
- **Release:** v1.0

### Phase 2: Enhancement (In Progress)
- Advanced annotations (arrow, line, text)
- Non-destructive cropping
- Gradient backgrounds (24 presets)
- Output aspect ratio control
- JPEG export with quality control
- **Target:** v1.1 (Dec 2025)

### Phase 3: Polish (In Progress)
- ✅ Keyboard shortcuts reference
- ✅ Undo/redo for annotations
- ✅ Clipboard image import (Ctrl+V)
- ✅ Configurable JPEG compression quality
- ✅ Comprehensive keyboard shortcuts
- Dark/light theme toggle (Pending)
- **Status:** 80% Complete | **Target:** v1.2 (Jan 2026)

### Phase 4: Canvas Integration (Completed)
- ✅ Screenshot inset/scale slider (0-50%)
- ✅ Auto-background mode (color extraction)
- ✅ Manual background control
- ✅ Cloud upload (R2 + Google Drive)
- ✅ Hotkey customization with presets
- **Release:** v1.3-1.5 (Complete)

### Phase 5: Advanced (Future)
- Screen recording (video capture)
- Built-in editor for post-export editing
- OCR (extract text from screenshots)
- Plugin system for custom annotation types
- macOS/Linux port (using Wails cross-platform support)
- **Target:** v2.0 (2026+)

---

## Risk Analysis

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Windows API breakage (future updates) | High | Low | Monitor Win32 API deprecations; use stable APIs |
| Multi-display edge cases | Medium | Medium | Extensive testing with 2-4 monitor setups |
| DPI scaling issues | Medium | Medium | Unit tests for DPI calculations; manual testing on 125%, 150% |
| Memory leaks in Konva | Low | Low | Monitor with DevTools; periodic memory profiling |
| Hotkey conflicts with other apps | Medium | High | Educate users on common conflicts; fallback hotkeys |
| Wails framework updates breaking changes | Low | Low | Pin versions; maintain compatibility layer |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Competition from built-in Snipping Tool | High | High | Focus on annotation quality & ease of use |
| Low adoption rate | High | Medium | Strong feature set, community marketing |
| Feature creep delaying releases | Medium | Medium | Scope management, prioritized roadmap |
| Maintenance burden | Medium | Medium | Modular code, clear documentation |

### User Adoption Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Difficult learning curve | High | Low | Intuitive UI, clear tooltips, onboarding flow |
| Unexpected behavior with new Windows versions | Medium | Low | Early testing with Windows Insider builds |
| Performance degradation with very large images (4K+) | Low | Medium | Optimize canvas rendering; document limitations |

---

## Success Criteria

### User Metrics
- [ ] 10,000+ downloads (6 months)
- [ ] 4.5+ star rating (GitHub releases)
- [ ] Positive community feedback on Reddit/HN
- [ ] Feature request backlog > 20 items

### Technical Metrics
- [ ] 95%+ test coverage (unit + integration)
- [ ] Zero critical bugs in v1.1+
- [ ] Performance maintained < 15MB memory usage
- [ ] < 2% crash rate (telemetry TBD)

### Business Metrics
- [ ] Zero critical security vulnerabilities
- [ ] Response time to issues < 48 hours
- [ ] Community contributor count > 5
- [ ] Sustainable maintenance (< 5 hours/week)

---

## Development Workflow

### Team Structure (Current)
- **1 Founder/Lead Developer** - Architecture, core features, releases
- **Community Contributors** - Bug fixes, documentation, translations

### Development Cycle
1. **Planning** - Quarterly roadmap review, prioritize features
2. **Implementation** - Feature branches, PR reviews, integration testing
3. **Testing** - Manual QA on Windows 10/11, 1-4 monitors, DPI 100-200%
4. **Release** - Version bump, build EXE+NSIS, publish GitHub release
5. **Support** - Issue triage, community engagement

### Contribution Guidelines
- Fork and PR for features/fixes
- Code review required before merge
- Follow Go/TypeScript standards (see code-standards.md)
- Update docs with breaking changes

---

## Open Questions & Decisions Pending

1. **Telemetry?** Anonymous crash/usage data for improvements?
   - Current: No telemetry
   - Concern: User privacy
   - Decision needed: User opt-in consent model?

2. **Licensing?** MIT, GPL, or proprietary?
   - Current: No license specified
   - Decision needed: Choose before v1.0 release

3. **macOS/Linux?** Priority for cross-platform support?
   - Current: Windows-only
   - Decision needed: Timeline and effort estimate

4. **Cloud Sync?** Server-based settings sync?
   - Current: Local-only config
   - Decision needed: Infrastructure cost vs user value

5. **Plugin System?** Allow third-party annotation types?
   - Current: Not planned
   - Decision needed: Complexity vs benefit tradeoff

---

## Glossary

| Term | Definition |
|------|-----------|
| **Wails** | Desktop app framework combining Go backend + Web frontend |
| **IPC** | Inter-Process Communication (Go ↔ React) |
| **DPI** | Dots Per Inch (screen scaling factor) |
| **GDI** | Graphics Device Interface (Windows API) |
| **Hotkey** | Global keyboard shortcut (works even when app unfocused) |
| **Konva** | Canvas library for drawing shapes, text, images |
| **Base64** | Text encoding for binary image data (for JSON transmission) |
| **Aspect Ratio** | Width:Height proportion (e.g., 16:9 for widescreen) |

---

## Contact & Support

**Project Repository:** https://github.com/[owner]/winshot

**Issue Tracking:** GitHub Issues

**Discussions:** GitHub Discussions / Reddit /r/[community]

**Email:** contact@[domain] (TBD)

**Discord:** [Link] (TBD)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-03 | Dev Team | Initial document |

