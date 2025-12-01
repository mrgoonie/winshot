# Phase 01: Project Setup

**Context:** [plan.md](./plan.md) | [Tech Stack](../../docs/tech-stack.md)
**Date:** 2025-12-01 | **Priority:** Critical | **Status:** Pending
**Estimated Time:** 2 hours

---

## Overview

Initialize Wails v2.9.3 project with React + TypeScript template. Configure TailwindCSS, install dependencies, establish folder structure for Go backend packages and React components.

---

## Key Insights

- Wails CLI generates React+TS template with Vite bundler
- No CGO required on Windows (simpler build)
- WebView2 pre-installed on Windows 11; installer handles Win10
- Frontend bindings auto-generated from Go public methods

---

## Requirements

### Prerequisites
- Go 1.21+ installed
- Node.js 18+ installed
- WebView2 Runtime (Windows 10 users)
- NSIS (for installer builds, optional)

### Deliverables
- Working Wails project with `wails dev` running
- TailwindCSS configured and verified
- react-konva installed and importable
- Go module with screenshot/windows packages stubbed

---

## Architecture

```
winshot/
├── main.go                 # Wails entry point
├── app.go                  # App struct with bound methods
├── wails.json              # Wails configuration
├── go.mod
├── go.sum
├── build/
│   ├── appicon.png         # App icon (1024x1024)
│   └── windows/
│       └── icon.ico
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css       # TailwindCSS imports
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
└── internal/
    ├── screenshot/         # Capture logic (Phase 2)
    ├── hotkeys/            # Global hotkeys (Phase 9)
    ├── windows/            # Window enumeration (Phase 9)
    └── tray/               # System tray (Phase 9)
```

---

## Related Code Files

- `main.go` - Wails app initialization
- `app.go` - Go methods exposed to frontend
- `frontend/src/App.tsx` - Root React component
- `frontend/package.json` - Frontend dependencies
- `wails.json` - Project configuration

---

## Implementation Steps

### Step 1: Install Wails CLI (5 min)
```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails doctor  # Verify setup
```

### Step 2: Create Project (5 min)
```bash
cd D:\www
wails init -n winshot -t react-ts
cd winshot
```

### Step 3: Install Go Dependencies (5 min)
```bash
go get github.com/kbinani/screenshot
go get golang.org/x/sys/windows
```

### Step 4: Install Frontend Dependencies (10 min)
```bash
cd frontend
npm install konva react-konva use-image
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

### Step 5: Configure TailwindCSS (10 min)

**tailwind.config.js:**
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

**src/index.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 6: Create Internal Package Structure (10 min)
```bash
mkdir -p internal/screenshot internal/hotkeys internal/windows internal/tray
```

Create stub files:
- `internal/screenshot/capture.go`
- `internal/hotkeys/hotkeys.go`
- `internal/windows/enum.go`
- `internal/tray/tray.go`

### Step 7: Update wails.json (5 min)
```json
{
  "name": "WinShot",
  "outputfilename": "winshot",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "author": { "name": "Your Name" }
}
```

### Step 8: Verify Setup (10 min)
```bash
wails dev  # Should open app window with React template
```

---

## Todo List

- [ ] Install Wails CLI
- [ ] Create Wails project with react-ts template
- [ ] Install Go dependencies (kbinani/screenshot, x/sys/windows)
- [ ] Install frontend dependencies (konva, react-konva, tailwindcss)
- [ ] Configure TailwindCSS
- [ ] Create internal package structure
- [ ] Update wails.json config
- [ ] Verify `wails dev` runs successfully

---

## Success Criteria

1. `wails doctor` shows all green checks
2. `wails dev` opens window without errors
3. TailwindCSS utility classes work (test with `bg-blue-500`)
4. `import { Stage } from 'react-konva'` compiles without error
5. Go imports (`github.com/kbinani/screenshot`) resolve

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Node version mismatch | Medium | Low | Use Node 18 LTS |
| WebView2 missing (Win10) | Medium | Low | Wails installer bundles it |
| npm install fails | Low | Low | Clear node_modules, retry |

---

## Next Steps

After completing this phase:
1. Proceed to [Phase 02: Screenshot Capture](./phase-02-screenshot-capture.md)
2. Implement Go capture methods
3. Test region/fullscreen capture from CLI
