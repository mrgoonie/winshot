package hotkeys

import (
	"sync"
	"syscall"
	"time"
	"unsafe"
)

var (
	user32              = syscall.NewLazyDLL("user32.dll")
	procRegisterHotKey  = user32.NewProc("RegisterHotKey")
	procUnregisterHotKey = user32.NewProc("UnregisterHotKey")
	procGetMessageW     = user32.NewProc("GetMessageW")
	procPeekMessageW    = user32.NewProc("PeekMessageW")
)

// Key modifier constants
const (
	ModAlt   uint = 0x0001
	ModCtrl  uint = 0x0002
	ModShift uint = 0x0004
	ModWin   uint = 0x0008
)

// Virtual key codes
const (
	VK_SNAPSHOT = 0x2C // Print Screen
	VK_F1       = 0x70
	VK_F2       = 0x71
	VK_F3       = 0x72
	VK_F4       = 0x73
	VK_F5       = 0x74
	VK_F6       = 0x75
	VK_F7       = 0x76
	VK_F8       = 0x77
	VK_F9       = 0x78
	VK_F10      = 0x79
	VK_F11      = 0x7A
	VK_F12      = 0x7B
)

// Windows message constants
const (
	WM_HOTKEY = 0x0312
	PM_REMOVE = 0x0001
)

// Hotkey ID constants
const (
	HotkeyFullscreen = 1
	HotkeyRegion     = 2
	HotkeyWindow     = 3
)

// MSG structure for Windows messages
type MSG struct {
	HWND    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      struct{ X, Y int32 }
}

// Hotkey represents a registered global hotkey
type Hotkey struct {
	ID        int
	Modifiers uint
	KeyCode   uint
}

// HotkeyCallback is called when a hotkey is pressed
type HotkeyCallback func(id int)

// HotkeyManager manages global hotkeys
type HotkeyManager struct {
	hotkeys  map[int]*Hotkey
	callback HotkeyCallback
	running  bool
	stopCh   chan struct{}
	mu       sync.Mutex
}

// NewHotkeyManager creates a new hotkey manager
func NewHotkeyManager() *HotkeyManager {
	return &HotkeyManager{
		hotkeys: make(map[int]*Hotkey),
		stopCh:  make(chan struct{}),
	}
}

// SetCallback sets the callback function for hotkey events
func (m *HotkeyManager) SetCallback(cb HotkeyCallback) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.callback = cb
}

// Register registers a new global hotkey
func (m *HotkeyManager) Register(id int, modifiers, keyCode uint) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	ret, _, err := procRegisterHotKey.Call(
		0,
		uintptr(id),
		uintptr(modifiers),
		uintptr(keyCode),
	)

	if ret == 0 {
		return err
	}

	m.hotkeys[id] = &Hotkey{
		ID:        id,
		Modifiers: modifiers,
		KeyCode:   keyCode,
	}

	return nil
}

// Unregister removes a registered hotkey
func (m *HotkeyManager) Unregister(id int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.hotkeys[id]; !exists {
		return nil
	}

	ret, _, err := procUnregisterHotKey.Call(
		0,
		uintptr(id),
	)

	if ret == 0 {
		return err
	}

	delete(m.hotkeys, id)
	return nil
}

// UnregisterAll removes all registered hotkeys
func (m *HotkeyManager) UnregisterAll() {
	m.mu.Lock()
	ids := make([]int, 0, len(m.hotkeys))
	for id := range m.hotkeys {
		ids = append(ids, id)
	}
	m.mu.Unlock()

	for _, id := range ids {
		m.Unregister(id)
	}
}

// Start begins listening for hotkey events
func (m *HotkeyManager) Start() {
	m.mu.Lock()
	if m.running {
		m.mu.Unlock()
		return
	}
	m.running = true
	m.stopCh = make(chan struct{})
	m.mu.Unlock()

	go m.messageLoop()
}

// Stop stops listening for hotkey events
func (m *HotkeyManager) Stop() {
	m.mu.Lock()
	if !m.running {
		m.mu.Unlock()
		return
	}
	m.running = false
	close(m.stopCh)
	m.mu.Unlock()
}

func (m *HotkeyManager) messageLoop() {
	var msg MSG
	for {
		select {
		case <-m.stopCh:
			return
		default:
			// Non-blocking message peek
			ret, _, _ := procPeekMessageW.Call(
				uintptr(unsafe.Pointer(&msg)),
				0,
				WM_HOTKEY,
				WM_HOTKEY,
				PM_REMOVE,
			)

			if ret != 0 {
				if msg.Message == WM_HOTKEY {
					m.mu.Lock()
					cb := m.callback
					m.mu.Unlock()

					if cb != nil {
						hotkeyID := int(msg.WParam)
						cb(hotkeyID)
					}
				}
			}

			// Small sleep to prevent busy loop
			time.Sleep(10 * time.Millisecond)
		}
	}
}

// RegisterDefaults registers the default hotkeys for WinShot
func (m *HotkeyManager) RegisterDefaults() error {
	// Print Screen - Fullscreen capture
	if err := m.Register(HotkeyFullscreen, 0, VK_SNAPSHOT); err != nil {
		// Try Alt+Print Screen if regular Print Screen fails
		m.Register(HotkeyFullscreen, ModAlt, VK_SNAPSHOT)
	}

	// Ctrl+Print Screen - Region capture
	if err := m.Register(HotkeyRegion, ModCtrl, VK_SNAPSHOT); err != nil {
		return err
	}

	// Ctrl+Shift+Print Screen - Window capture
	if err := m.Register(HotkeyWindow, ModCtrl|ModShift, VK_SNAPSHOT); err != nil {
		return err
	}

	return nil
}
