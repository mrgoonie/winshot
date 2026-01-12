package tray

import (
	"os"
	"syscall"
	"unsafe"
)

var (
	shell32                 = syscall.NewLazyDLL("shell32.dll")
	user32                  = syscall.NewLazyDLL("user32.dll")
	kernel32                = syscall.NewLazyDLL("kernel32.dll")
	procShell_NotifyIconW   = shell32.NewProc("Shell_NotifyIconW")
	procExtractIconW        = shell32.NewProc("ExtractIconW")
	procCreatePopupMenu     = user32.NewProc("CreatePopupMenu")
	procAppendMenuW         = user32.NewProc("AppendMenuW")
	procTrackPopupMenu      = user32.NewProc("TrackPopupMenu")
	procDestroyMenu         = user32.NewProc("DestroyMenu")
	procGetCursorPos        = user32.NewProc("GetCursorPos")
	procSetForegroundWindow = user32.NewProc("SetForegroundWindow")
	procPostMessageW        = user32.NewProc("PostMessageW")
	procCreateWindowExW     = user32.NewProc("CreateWindowExW")
	procDefWindowProcW      = user32.NewProc("DefWindowProcW")
	procRegisterClassExW    = user32.NewProc("RegisterClassExW")
	procGetModuleHandleW    = kernel32.NewProc("GetModuleHandleW")
	procLoadIconW           = user32.NewProc("LoadIconW")
	procLoadImageW          = user32.NewProc("LoadImageW")
	procGetMessageW         = user32.NewProc("GetMessageW")
	procPeekMessageW        = user32.NewProc("PeekMessageW")
	procTranslateMessage    = user32.NewProc("TranslateMessage")
	procDispatchMessageW    = user32.NewProc("DispatchMessageW")
	procDestroyIcon         = user32.NewProc("DestroyIcon")
)

// Notify icon constants
const (
	NIM_ADD    = 0x00000000
	NIM_MODIFY = 0x00000001
	NIM_DELETE = 0x00000002

	NIF_MESSAGE = 0x00000001
	NIF_ICON    = 0x00000002
	NIF_TIP     = 0x00000004
	NIF_INFO    = 0x00000010

	WM_USER          = 0x0400
	WM_TRAYICON      = WM_USER + 1
	WM_LBUTTONUP     = 0x0202
	WM_RBUTTONUP     = 0x0205
	WM_LBUTTONDBLCLK = 0x0203
	WM_COMMAND       = 0x0111
	WM_QUIT          = 0x0012

	MF_STRING    = 0x00000000
	MF_SEPARATOR = 0x00000800

	TPM_LEFTALIGN   = 0x0000
	TPM_RIGHTALIGN  = 0x0008
	TPM_BOTTOMALIGN = 0x0020
	TPM_LEFTBUTTON  = 0x0000
	TPM_RIGHTBUTTON = 0x0002
	TPM_RETURNCMD   = 0x0100
	TPM_NONOTIFY    = 0x0080

	IDI_APPLICATION = 32512

	IMAGE_ICON      = 1
	LR_LOADFROMFILE = 0x00000010
	LR_DEFAULTSIZE  = 0x00000040

	PM_REMOVE = 0x0001
)

// Menu item IDs
const (
	MenuShow       = 1001
	MenuFullscreen = 1002
	MenuRegion     = 1003
	MenuWindow     = 1004
	MenuSettings   = 1005
	MenuQuit       = 1006
	MenuLibrary    = 1007 // Library window trigger (left-click on tray)
)

// NOTIFYICONDATAW structure
type NOTIFYICONDATAW struct {
	CbSize           uint32
	HWnd             uintptr
	UID              uint32
	UFlags           uint32
	UCallbackMessage uint32
	HIcon            uintptr
	SzTip            [128]uint16
	DwState          uint32
	DwStateMask      uint32
	SzInfo           [256]uint16
	UVersion         uint32
	SzInfoTitle      [64]uint16
	DwInfoFlags      uint32
	GuidItem         [16]byte
	HBalloonIcon     uintptr
}

// POINT structure
type POINT struct {
	X, Y int32
}

// MSG structure
type MSG struct {
	HWnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      POINT
}

// WNDCLASSEXW structure
type WNDCLASSEXW struct {
	CbSize        uint32
	Style         uint32
	LpfnWndProc   uintptr
	CbClsExtra    int32
	CbWndExtra    int32
	HInstance     uintptr
	HIcon         uintptr
	HCursor       uintptr
	HbrBackground uintptr
	LpszMenuName  *uint16
	LpszClassName *uint16
	HIconSm       uintptr
}

// TrayMenuCallback is called when a menu item is selected
type TrayMenuCallback func(menuID int)

// TrayIcon represents the system tray icon
type TrayIcon struct {
	hwnd     uintptr
	nid      NOTIFYICONDATAW
	hIcon    uintptr
	tooltip  string
	visible  bool
	callback TrayMenuCallback
	onShow   func()
	running  bool
	stopCh   chan struct{}
}

// Global tray instance for window proc callback
var globalTray *TrayIcon

// NewTrayIcon creates a new system tray icon
func NewTrayIcon(tooltip string) *TrayIcon {
	t := &TrayIcon{
		tooltip: tooltip,
		visible: false,
		stopCh:  make(chan struct{}),
	}
	globalTray = t
	return t
}

// SetCallback sets the callback for menu selections
func (t *TrayIcon) SetCallback(cb TrayMenuCallback) {
	t.callback = cb
}

// SetOnShow sets the callback for when "Show" is selected or icon is double-clicked
func (t *TrayIcon) SetOnShow(cb func()) {
	t.onShow = cb
}

// Start initializes and shows the tray icon
func (t *TrayIcon) Start() error {
	go t.run()
	return nil
}

// loadIcon tries to load the application icon from the executable
func loadIcon(hInstance uintptr) uintptr {
	// Try to get executable path and extract icon from it
	exePath, err := os.Executable()
	if err == nil {
		exePathPtr, _ := syscall.UTF16PtrFromString(exePath)
		// ExtractIconW returns the icon handle, 0 index for first icon
		hIcon, _, _ := procExtractIconW.Call(
			hInstance,
			uintptr(unsafe.Pointer(exePathPtr)),
			0,
		)
		if hIcon > 1 { // Returns >1 on success, 0 or 1 means failure
			return hIcon
		}
	}

	// Fallback to default application icon
	hIcon, _, _ := procLoadIconW.Call(0, uintptr(IDI_APPLICATION))
	return hIcon
}

func (t *TrayIcon) run() {
	// Get module handle
	hInstance, _, _ := procGetModuleHandleW.Call(0)

	// Load icon (try exe icon first, fallback to default)
	t.hIcon = loadIcon(hInstance)

	// Register window class
	className := syscall.StringToUTF16Ptr("WinShotTrayClass")
	wndClass := WNDCLASSEXW{
		CbSize:        uint32(unsafe.Sizeof(WNDCLASSEXW{})),
		LpfnWndProc:   syscall.NewCallback(trayWndProc),
		HInstance:     hInstance,
		LpszClassName: className,
	}
	procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wndClass)))

	// Create hidden window for message handling
	t.hwnd, _, _ = procCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(className)),
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr("WinShotTray"))),
		0,
		0, 0, 0, 0,
		0, 0,
		hInstance,
		0,
	)

	if t.hwnd == 0 {
		return
	}

	// Initialize NOTIFYICONDATAW
	t.nid = NOTIFYICONDATAW{
		CbSize:           uint32(unsafe.Sizeof(NOTIFYICONDATAW{})),
		HWnd:             t.hwnd,
		UID:              1,
		UFlags:           NIF_MESSAGE | NIF_ICON | NIF_TIP,
		UCallbackMessage: WM_TRAYICON,
		HIcon:            t.hIcon,
	}

	// Set tooltip
	tip := syscall.StringToUTF16(t.tooltip)
	for i := 0; i < len(tip) && i < 127; i++ {
		t.nid.SzTip[i] = tip[i]
	}

	// Add tray icon
	ret, _, _ := procShell_NotifyIconW.Call(NIM_ADD, uintptr(unsafe.Pointer(&t.nid)))
	if ret == 0 {
		return
	}
	t.visible = true
	t.running = true

	// Message loop - simple blocking loop without select
	var msg MSG
	for t.running {
		// Use PeekMessage with timeout behavior via GetMessage
		// GetMessage blocks until a message is available
		ret, _, _ := procGetMessageW.Call(
			uintptr(unsafe.Pointer(&msg)),
			0, 0, 0,
		)

		// ret == 0 means WM_QUIT, ret == -1 means error
		if ret == 0 || int32(ret) == -1 {
			break
		}

		// Check if we should stop
		select {
		case <-t.stopCh:
			t.running = false
			return
		default:
		}

		procTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		procDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
	}
}

func trayWndProc(hwnd uintptr, msg uint32, wParam, lParam uintptr) uintptr {
	switch msg {
	case WM_TRAYICON:
		switch lParam {
		case WM_LBUTTONUP:
			// Single left-click - open library window
			if globalTray != nil && globalTray.callback != nil {
				globalTray.callback(MenuLibrary)
			}
			return 0
		case WM_RBUTTONUP:
			// Right-click - show context menu
			if globalTray != nil {
				globalTray.showMenu()
			}
		case WM_LBUTTONDBLCLK:
			// Double-click to show window
			if globalTray != nil && globalTray.onShow != nil {
				globalTray.onShow()
			}
		}
		return 0
	}

	ret, _, _ := procDefWindowProcW.Call(hwnd, uintptr(msg), wParam, lParam)
	return ret
}

func (t *TrayIcon) showMenu() {
	// Create popup menu
	hMenu, _, _ := procCreatePopupMenu.Call()
	if hMenu == 0 {
		return
	}

	// Add menu items
	appendMenu(hMenu, MF_STRING, MenuShow, "Show WinShot")
	appendMenu(hMenu, MF_SEPARATOR, 0, "")
	appendMenu(hMenu, MF_STRING, MenuFullscreen, "Capture Fullscreen")
	appendMenu(hMenu, MF_STRING, MenuRegion, "Capture Region")
	appendMenu(hMenu, MF_STRING, MenuWindow, "Capture Window")
	appendMenu(hMenu, MF_SEPARATOR, 0, "")
	appendMenu(hMenu, MF_STRING, MenuQuit, "Quit")

	// Get cursor position
	var pt POINT
	procGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))

	// Set foreground window (required for menu to work properly)
	procSetForegroundWindow.Call(t.hwnd)

	// Show menu and get selection
	cmd, _, _ := procTrackPopupMenu.Call(
		hMenu,
		TPM_RETURNCMD|TPM_RIGHTBUTTON,
		uintptr(pt.X),
		uintptr(pt.Y),
		0,
		t.hwnd,
		0,
	)

	// Handle menu selection
	if cmd != 0 {
		switch int(cmd) {
		case MenuShow:
			if t.onShow != nil {
				t.onShow()
			}
		case MenuQuit:
			if t.callback != nil {
				t.callback(MenuQuit)
			}
		default:
			if t.callback != nil {
				t.callback(int(cmd))
			}
		}
	}

	// Destroy menu
	procDestroyMenu.Call(hMenu)
}

func appendMenu(hMenu uintptr, flags, id int, text string) {
	textPtr := syscall.StringToUTF16Ptr(text)
	procAppendMenuW.Call(hMenu, uintptr(flags), uintptr(id), uintptr(unsafe.Pointer(textPtr)))
}

// Hide hides the tray icon
func (t *TrayIcon) Hide() error {
	if !t.visible {
		return nil
	}
	procShell_NotifyIconW.Call(NIM_DELETE, uintptr(unsafe.Pointer(&t.nid)))
	t.visible = false
	return nil
}

// Show shows the tray icon
func (t *TrayIcon) Show() error {
	if t.visible {
		return nil
	}
	procShell_NotifyIconW.Call(NIM_ADD, uintptr(unsafe.Pointer(&t.nid)))
	t.visible = true
	return nil
}

// SetTooltip updates the tooltip text
func (t *TrayIcon) SetTooltip(tooltip string) {
	t.tooltip = tooltip
	tip := syscall.StringToUTF16(tooltip)
	for i := 0; i < len(tip) && i < 127; i++ {
		t.nid.SzTip[i] = tip[i]
	}
	if t.visible {
		procShell_NotifyIconW.Call(NIM_MODIFY, uintptr(unsafe.Pointer(&t.nid)))
	}
}

// Stop removes the tray icon and stops the message loop
func (t *TrayIcon) Stop() error {
	if t.running {
		t.Hide()
		t.running = false
		// Signal stop - non-blocking send
		select {
		case t.stopCh <- struct{}{}:
		default:
		}
		// Post quit message to exit the message loop
		if t.hwnd != 0 {
			procPostMessageW.Call(t.hwnd, WM_QUIT, 0, 0)
		}
	}
	return nil
}

// Destroy is an alias for Stop
func (t *TrayIcon) Destroy() error {
	return t.Stop()
}
