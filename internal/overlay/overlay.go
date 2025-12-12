package overlay

import (
	"errors"
	"image"
	"runtime"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

var (
	user32                   = syscall.NewLazyDLL("user32.dll")
	kernel32                 = syscall.NewLazyDLL("kernel32.dll")
	procRegisterClassExW     = user32.NewProc("RegisterClassExW")
	procCreateWindowExW      = user32.NewProc("CreateWindowExW")
	procDestroyWindow        = user32.NewProc("DestroyWindow")
	procShowWindow           = user32.NewProc("ShowWindow")
	procUpdateLayeredWindow  = user32.NewProc("UpdateLayeredWindow")
	procGetDC                = user32.NewProc("GetDC")
	procReleaseDC            = user32.NewProc("ReleaseDC")
	procPeekMessageW         = user32.NewProc("PeekMessageW")
	procTranslateMessage     = user32.NewProc("TranslateMessage")
	procDispatchMessageW     = user32.NewProc("DispatchMessageW")
	procDefWindowProcW       = user32.NewProc("DefWindowProcW")
	procPostQuitMessage      = user32.NewProc("PostQuitMessage")
	procSetCursor            = user32.NewProc("SetCursor")
	procLoadCursorW          = user32.NewProc("LoadCursorW")
	procGetAsyncKeyState     = user32.NewProc("GetAsyncKeyState")
	procSetWindowPos         = user32.NewProc("SetWindowPos")
	procUnregisterClassW     = user32.NewProc("UnregisterClassW")
	procGetModuleHandleW     = kernel32.NewProc("GetModuleHandleW")
	procSetCapture           = user32.NewProc("SetCapture")
	procReleaseCapture       = user32.NewProc("ReleaseCapture")
	procSetForegroundWindow  = user32.NewProc("SetForegroundWindow")
	procSetFocus             = user32.NewProc("SetFocus")
)

// Command types for channel communication
type cmdType int

const (
	cmdShow cmdType = iota
	cmdHide
	cmdStop
)

type overlayCmd struct {
	Type       cmdType
	Screenshot *image.RGBA
	Bounds     image.Rectangle
	ScaleRatio float64
	ResultCh   chan Result
}

// Manager manages the native overlay window
type Manager struct {
	hwnd       uintptr
	className  *uint16
	hInstance  uintptr
	drawCtx    *DrawContext
	screenshot *image.RGBA
	scaleRatio float64
	selection  Selection
	bounds     image.Rectangle
	resultCh   chan Result
	cmdCh      chan overlayCmd
	running    bool
	isShowing  bool
	mu         sync.Mutex
}

// Package-level callback (must survive GC)
var overlayWndProc = syscall.NewCallback(wndProc)
var managerInstance *Manager

// NewManager creates a new overlay manager
func NewManager() *Manager {
	return &Manager{
		cmdCh: make(chan overlayCmd, 10),
	}
}

// Start initializes and starts the overlay message loop
func (m *Manager) Start() error {
	m.mu.Lock()
	if m.running {
		m.mu.Unlock()
		return nil
	}
	m.running = true
	m.mu.Unlock()

	managerInstance = m
	readyCh := make(chan error, 1)

	go m.messageLoop(readyCh)

	return <-readyCh
}

// Show displays the overlay with screenshot
func (m *Manager) Show(screenshot *image.RGBA, bounds image.Rectangle, scaleRatio float64) <-chan Result {
	m.mu.Lock()
	if m.isShowing {
		m.mu.Unlock()
		// Already showing, return cancelled result
		resultCh := make(chan Result, 1)
		resultCh <- Result{Cancelled: true}
		return resultCh
	}
	m.isShowing = true
	m.mu.Unlock()

	resultCh := make(chan Result, 1)
	m.cmdCh <- overlayCmd{
		Type:       cmdShow,
		Screenshot: screenshot,
		Bounds:     bounds,
		ScaleRatio: scaleRatio,
		ResultCh:   resultCh,
	}
	return resultCh
}

// Hide hides the overlay
func (m *Manager) Hide() {
	m.cmdCh <- overlayCmd{Type: cmdHide}
}

// Stop stops the overlay manager
func (m *Manager) Stop() {
	m.mu.Lock()
	if !m.running {
		m.mu.Unlock()
		return
	}
	m.running = false
	m.mu.Unlock()
	m.cmdCh <- overlayCmd{Type: cmdStop}
}

func (m *Manager) messageLoop(readyCh chan<- error) {
	// CRITICAL: Lock this goroutine to the current OS thread
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	// Get module handle
	m.hInstance, _, _ = procGetModuleHandleW.Call(0)

	// Register window class
	className, _ := syscall.UTF16PtrFromString("WinShotOverlay")
	m.className = className

	wc := WNDCLASSEXW{
		CbSize:        uint32(unsafe.Sizeof(WNDCLASSEXW{})),
		Style:         0,
		LpfnWndProc:   overlayWndProc,
		HInstance:     m.hInstance,
		HCursor:       loadCursor(IDC_CROSS),
		LpszClassName: className,
	}

	ret, _, _ := procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))
	if ret == 0 {
		readyCh <- errors.New("failed to register window class")
		return
	}

	// Create the overlay window (hidden initially)
	hwnd, _, _ := procCreateWindowExW.Call(
		WS_EX_LAYERED|WS_EX_TOPMOST|WS_EX_TOOLWINDOW,
		uintptr(unsafe.Pointer(className)),
		0, // No title
		WS_POPUP,
		0, 0, 1, 1, // Will be sized when shown
		0, 0, m.hInstance, 0,
	)

	if hwnd == 0 {
		readyCh <- errors.New("failed to create overlay window")
		return
	}

	m.hwnd = hwnd
	readyCh <- nil

	// Message loop
	var msg MSG
	for {
		select {
		case cmd := <-m.cmdCh:
			switch cmd.Type {
			case cmdShow:
				m.handleShow(cmd)
			case cmdHide:
				m.handleHide()
			case cmdStop:
				m.cleanup()
				return
			}
		default:
			// Process Windows messages (non-blocking)
			ret, _, _ := procPeekMessageW.Call(
				uintptr(unsafe.Pointer(&msg)),
				0, 0, 0, PM_REMOVE,
			)
			if ret != 0 {
				procTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
				procDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
			}
			time.Sleep(5 * time.Millisecond)
		}
	}
}

func (m *Manager) handleShow(cmd overlayCmd) {
	// Hide window first to avoid flash of old content
	procShowWindow.Call(m.hwnd, SW_HIDE)

	// Reset selection state
	m.mu.Lock()
	m.selection = Selection{}
	m.mu.Unlock()

	m.screenshot = cmd.Screenshot
	m.bounds = cmd.Bounds
	m.scaleRatio = cmd.ScaleRatio
	m.resultCh = cmd.ResultCh

	// Get screen DC for creating compatible DC
	hScreenDC, _, _ := procGetDC.Call(0)
	defer procReleaseDC.Call(0, hScreenDC)

	// Create draw context
	if m.drawCtx != nil {
		m.drawCtx.Cleanup()
	}
	var err error
	m.drawCtx, err = NewDrawContext(hScreenDC, m.bounds.Dx(), m.bounds.Dy())
	if err != nil {
		m.resultCh <- Result{Cancelled: true}
		m.mu.Lock()
		m.isShowing = false
		m.mu.Unlock()
		return
	}

	// Position and size window (without showing yet)
	procSetWindowPos.Call(
		m.hwnd,
		HWND_TOPMOST,
		uintptr(m.bounds.Min.X),
		uintptr(m.bounds.Min.Y),
		uintptr(m.bounds.Dx()),
		uintptr(m.bounds.Dy()),
		SWP_NOSIZE|SWP_NOMOVE, // Just set topmost, will reposition below
	)
	procSetWindowPos.Call(
		m.hwnd,
		0,
		uintptr(m.bounds.Min.X),
		uintptr(m.bounds.Min.Y),
		uintptr(m.bounds.Dx()),
		uintptr(m.bounds.Dy()),
		0, // No flags - just position and size
	)

	// Draw fresh content BEFORE showing window
	m.redraw()

	// NOW show window with fresh content
	procShowWindow.Call(m.hwnd, SW_SHOW)

	// Set focus to receive keyboard input (Esc key)
	procSetForegroundWindow.Call(m.hwnd)
	procSetFocus.Call(m.hwnd)
}

func (m *Manager) handleHide() {
	procShowWindow.Call(m.hwnd, SW_HIDE)
	if m.drawCtx != nil {
		m.drawCtx.Cleanup()
		m.drawCtx = nil
	}
	m.mu.Lock()
	m.isShowing = false
	m.mu.Unlock()
}

func (m *Manager) redraw() {
	if m.drawCtx == nil || m.screenshot == nil {
		return
	}

	m.mu.Lock()
	sel := m.selection
	scaleRatio := m.scaleRatio
	m.mu.Unlock()

	m.drawCtx.DrawOverlay(m.screenshot, &sel, scaleRatio)

	// Update layered window
	ptSrc := POINT{0, 0}
	ptDst := POINT{int32(m.bounds.Min.X), int32(m.bounds.Min.Y)}
	size := SIZE{int32(m.bounds.Dx()), int32(m.bounds.Dy())}
	blend := BLENDFUNCTION{AC_SRC_OVER, 0, 255, AC_SRC_ALPHA}

	procUpdateLayeredWindow.Call(
		m.hwnd,
		0,
		uintptr(unsafe.Pointer(&ptDst)),
		uintptr(unsafe.Pointer(&size)),
		m.drawCtx.HMemDC,
		uintptr(unsafe.Pointer(&ptSrc)),
		0,
		uintptr(unsafe.Pointer(&blend)),
		ULW_ALPHA,
	)
}

func (m *Manager) cleanup() {
	if m.hwnd != 0 {
		procDestroyWindow.Call(m.hwnd)
	}
	if m.className != nil {
		procUnregisterClassW.Call(uintptr(unsafe.Pointer(m.className)), m.hInstance)
	}
	if m.drawCtx != nil {
		m.drawCtx.Cleanup()
	}
}

// wndProc handles window messages
func wndProc(hwnd, msg, wParam, lParam uintptr) uintptr {
	m := managerInstance
	if m == nil {
		return defWindowProc(hwnd, msg, wParam, lParam)
	}

	switch msg {
	case WM_NCHITTEST:
		return HTCLIENT // Enable mouse events

	case WM_SETCURSOR:
		// Set crosshair cursor, or move cursor if space held
		m.mu.Lock()
		spaceHeld := m.selection.SpaceHeld
		m.mu.Unlock()

		if spaceHeld {
			procSetCursor.Call(loadCursor(IDC_SIZEALL))
		} else {
			procSetCursor.Call(loadCursor(IDC_CROSS))
		}
		return 1

	case WM_LBUTTONDOWN:
		x := int(int16(lParam & 0xFFFF))
		y := int(int16((lParam >> 16) & 0xFFFF))

		// Clamp to bounds (use Dx() not Dx()-1 to allow edge pixels)
		x = clampInt(x, 0, m.bounds.Dx())
		y = clampInt(y, 0, m.bounds.Dy())

		m.mu.Lock()
		m.selection.StartX = x
		m.selection.StartY = y
		m.selection.EndX = x
		m.selection.EndY = y
		m.selection.IsDragging = true
		m.mu.Unlock()

		// Capture mouse
		procSetCapture.Call(m.hwnd)

		m.redraw()

	case WM_MOUSEMOVE:
		m.mu.Lock()
		isDragging := m.selection.IsDragging
		m.mu.Unlock()

		if isDragging {
			x := int(int16(lParam & 0xFFFF))
			y := int(int16((lParam >> 16) & 0xFFFF))

			// Clamp to bounds (use Dx() not Dx()-1 to allow edge pixels)
			x = clampInt(x, 0, m.bounds.Dx())
			y = clampInt(y, 0, m.bounds.Dy())

			// Check if Space is held for repositioning
			spaceState, _, _ := procGetAsyncKeyState.Call(VK_SPACE)
			spaceHeld := spaceState&0x8000 != 0

			m.mu.Lock()
			if spaceHeld {
				if !m.selection.SpaceHeld {
					m.selection.SpaceHeld = true
				}
				dx := x - m.selection.EndX
				dy := y - m.selection.EndY
				m.selection.StartX += dx
				m.selection.StartY += dy
			} else if m.selection.SpaceHeld {
				m.selection.SpaceHeld = false
			}

			m.selection.EndX = x
			m.selection.EndY = y
			m.mu.Unlock()
			m.redraw()
		}

	case WM_LBUTTONUP:
		// Release mouse capture
		procReleaseCapture.Call()

		m.mu.Lock()
		wasDragging := m.selection.IsDragging
		if wasDragging {
			m.selection.IsDragging = false
			m.selection.SpaceHeld = false
		}
		startX, startY := m.selection.StartX, m.selection.StartY
		endX, endY := m.selection.EndX, m.selection.EndY
		resultCh := m.resultCh
		m.mu.Unlock()

		if wasDragging {
			// Calculate final selection
			x1 := minInt(startX, endX)
			y1 := minInt(startY, endY)
			x2 := maxInt(startX, endX)
			y2 := maxInt(startY, endY)

			w, h := x2-x1, y2-y1
			if w > 10 && h > 10 && resultCh != nil {
				// Non-blocking send to avoid UI freeze
				select {
				case resultCh <- Result{X: x1, Y: y1, Width: w, Height: h}:
				default:
				}
				m.handleHide()
			}
		}

	case WM_KEYDOWN:
		if wParam == VK_ESCAPE {
			m.mu.Lock()
			resultCh := m.resultCh
			m.mu.Unlock()
			if resultCh != nil {
				select {
				case resultCh <- Result{Cancelled: true}:
				default:
				}
			}
			m.handleHide()
		} else if wParam == VK_SPACE {
			m.mu.Lock()
			m.selection.SpaceHeld = true
			m.mu.Unlock()
			procSetCursor.Call(loadCursor(IDC_SIZEALL))
		}

	case WM_KEYUP:
		if wParam == VK_SPACE {
			m.mu.Lock()
			m.selection.SpaceHeld = false
			m.mu.Unlock()
			procSetCursor.Call(loadCursor(IDC_CROSS))
		}

	case WM_DESTROY:
		procPostQuitMessage.Call(0)
	}

	return defWindowProc(hwnd, msg, wParam, lParam)
}

func defWindowProc(hwnd, msg, wParam, lParam uintptr) uintptr {
	ret, _, _ := procDefWindowProcW.Call(hwnd, msg, wParam, lParam)
	return ret
}

func loadCursor(id uintptr) uintptr {
	cursor, _, _ := procLoadCursorW.Call(0, id)
	return cursor
}

func clampInt(val, min, max int) int {
	if val < min {
		return min
	}
	if val > max {
		return max
	}
	return val
}
