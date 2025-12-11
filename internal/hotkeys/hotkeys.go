package hotkeys

import (
	"runtime"
	"strings"
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

// hotkeyCmd represents a registration/unregistration command
type hotkeyCmd struct {
	action    string // "register", "unregister", "unregisterAll"
	id        int
	modifiers uint
	keyCode   uint
	resultCh  chan error
}

// HotkeyManager manages global hotkeys
type HotkeyManager struct {
	hotkeys  map[int]*Hotkey
	callback HotkeyCallback
	running  bool
	stopCh   chan struct{}
	cmdCh    chan hotkeyCmd // Channel for registration commands
	readyCh  chan struct{}  // Signals message loop is ready
	mu       sync.Mutex
}

// NewHotkeyManager creates a new hotkey manager
func NewHotkeyManager() *HotkeyManager {
	return &HotkeyManager{
		hotkeys: make(map[int]*Hotkey),
		stopCh:  make(chan struct{}),
		cmdCh:   make(chan hotkeyCmd, 10),
		readyCh: make(chan struct{}),
	}
}

// SetCallback sets the callback function for hotkey events
func (m *HotkeyManager) SetCallback(cb HotkeyCallback) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.callback = cb
}

// Register registers a new global hotkey
// Must be called after Start() to ensure registration happens on message loop thread
func (m *HotkeyManager) Register(id int, modifiers, keyCode uint) error {
	m.mu.Lock()
	running := m.running
	m.mu.Unlock()

	if !running {
		// If not running yet, store for later registration
		m.mu.Lock()
		m.hotkeys[id] = &Hotkey{
			ID:        id,
			Modifiers: modifiers,
			KeyCode:   keyCode,
		}
		m.mu.Unlock()
		return nil
	}

	// Send registration command to message loop thread
	resultCh := make(chan error, 1)
	m.cmdCh <- hotkeyCmd{
		action:    "register",
		id:        id,
		modifiers: modifiers,
		keyCode:   keyCode,
		resultCh:  resultCh,
	}

	return <-resultCh
}

// registerOnThread performs actual registration on the message loop thread
func (m *HotkeyManager) registerOnThread(id int, modifiers, keyCode uint) error {
	ret, _, err := procRegisterHotKey.Call(
		0,
		uintptr(id),
		uintptr(modifiers),
		uintptr(keyCode),
	)

	if ret == 0 {
		return err
	}

	m.mu.Lock()
	m.hotkeys[id] = &Hotkey{
		ID:        id,
		Modifiers: modifiers,
		KeyCode:   keyCode,
	}
	m.mu.Unlock()

	return nil
}

// Unregister removes a registered hotkey
func (m *HotkeyManager) Unregister(id int) error {
	m.mu.Lock()
	if _, exists := m.hotkeys[id]; !exists {
		m.mu.Unlock()
		return nil
	}
	running := m.running
	m.mu.Unlock()

	if !running {
		// If not running, just remove from map
		m.mu.Lock()
		delete(m.hotkeys, id)
		m.mu.Unlock()
		return nil
	}

	// Send unregister command to message loop thread
	resultCh := make(chan error, 1)
	m.cmdCh <- hotkeyCmd{
		action:   "unregister",
		id:       id,
		resultCh: resultCh,
	}

	return <-resultCh
}

// unregisterOnThread performs actual unregistration on the message loop thread
func (m *HotkeyManager) unregisterOnThread(id int) error {
	ret, _, err := procUnregisterHotKey.Call(
		0,
		uintptr(id),
	)

	if ret == 0 {
		return err
	}

	m.mu.Lock()
	delete(m.hotkeys, id)
	m.mu.Unlock()

	return nil
}

// UnregisterAll removes all registered hotkeys
func (m *HotkeyManager) UnregisterAll() {
	m.mu.Lock()
	running := m.running
	ids := make([]int, 0, len(m.hotkeys))
	for id := range m.hotkeys {
		ids = append(ids, id)
	}
	m.mu.Unlock()

	if !running {
		// If not running, just clear the map
		m.mu.Lock()
		m.hotkeys = make(map[int]*Hotkey)
		m.mu.Unlock()
		return
	}

	// Send unregisterAll command to message loop thread
	resultCh := make(chan error, 1)
	m.cmdCh <- hotkeyCmd{
		action:   "unregisterAll",
		resultCh: resultCh,
	}

	<-resultCh
}

// unregisterAllOnThread unregisters all hotkeys on the message loop thread
func (m *HotkeyManager) unregisterAllOnThread() {
	m.mu.Lock()
	ids := make([]int, 0, len(m.hotkeys))
	for id := range m.hotkeys {
		ids = append(ids, id)
	}
	m.mu.Unlock()

	for _, id := range ids {
		procUnregisterHotKey.Call(0, uintptr(id))
	}

	m.mu.Lock()
	m.hotkeys = make(map[int]*Hotkey)
	m.mu.Unlock()
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
	m.cmdCh = make(chan hotkeyCmd, 10)
	m.readyCh = make(chan struct{})

	// Copy pending hotkeys to register on the message loop thread
	pendingHotkeys := make([]*Hotkey, 0, len(m.hotkeys))
	for _, hk := range m.hotkeys {
		pendingHotkeys = append(pendingHotkeys, hk)
	}
	// Clear the map - will be repopulated after registration
	m.hotkeys = make(map[int]*Hotkey)
	m.mu.Unlock()

	go m.messageLoop(pendingHotkeys)

	// Wait for message loop to be ready
	<-m.readyCh
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

func (m *HotkeyManager) messageLoop(pendingHotkeys []*Hotkey) {
	// CRITICAL: Lock this goroutine to the current OS thread
	// RegisterHotKey binds to the calling thread's message queue
	// Without this, Go's runtime may migrate this goroutine to a different thread
	// causing hotkey messages to be lost
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	// Register any pending hotkeys on THIS thread
	for _, hk := range pendingHotkeys {
		m.registerOnThread(hk.ID, hk.Modifiers, hk.KeyCode)
	}

	// Signal that we're ready
	close(m.readyCh)

	var msg MSG
	for {
		select {
		case <-m.stopCh:
			// Unregister all hotkeys on this thread before exiting
			m.unregisterAllOnThread()
			return
		case cmd := <-m.cmdCh:
			// Process registration commands on this thread
			var err error
			switch cmd.action {
			case "register":
				err = m.registerOnThread(cmd.id, cmd.modifiers, cmd.keyCode)
			case "unregister":
				err = m.unregisterOnThread(cmd.id)
			case "unregisterAll":
				m.unregisterAllOnThread()
			}
			if cmd.resultCh != nil {
				cmd.resultCh <- err
			}
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

// UpdateHotkey updates a single hotkey registration
func (m *HotkeyManager) UpdateHotkey(id int, modifiers, keyCode uint) error {
	// Unregister existing hotkey if present
	m.Unregister(id)
	// Register new hotkey
	return m.Register(id, modifiers, keyCode)
}

// keyNameToCode maps key names to virtual key codes
var keyNameToCode = map[string]uint{
	"PRINTSCREEN": VK_SNAPSHOT,
	"PRTSC":       VK_SNAPSHOT,
	"SNAPSHOT":    VK_SNAPSHOT,
	"F1":          VK_F1,
	"F2":          VK_F2,
	"F3":          VK_F3,
	"F4":          VK_F4,
	"F5":          VK_F5,
	"F6":          VK_F6,
	"F7":          VK_F7,
	"F8":          VK_F8,
	"F9":          VK_F9,
	"F10":         VK_F10,
	"F11":         VK_F11,
	"F12":         VK_F12,
	// Letters A-Z (0x41-0x5A)
	"A": 0x41, "B": 0x42, "C": 0x43, "D": 0x44, "E": 0x45,
	"F": 0x46, "G": 0x47, "H": 0x48, "I": 0x49, "J": 0x4A,
	"K": 0x4B, "L": 0x4C, "M": 0x4D, "N": 0x4E, "O": 0x4F,
	"P": 0x50, "Q": 0x51, "R": 0x52, "S": 0x53, "T": 0x54,
	"U": 0x55, "V": 0x56, "W": 0x57, "X": 0x58, "Y": 0x59, "Z": 0x5A,
	// Numbers 0-9 (0x30-0x39)
	"0": 0x30, "1": 0x31, "2": 0x32, "3": 0x33, "4": 0x34,
	"5": 0x35, "6": 0x36, "7": 0x37, "8": 0x38, "9": 0x39,
	// Common keys
	"SPACE":     0x20,
	"ENTER":     0x0D,
	"TAB":       0x09,
	"ESCAPE":    0x1B,
	"ESC":       0x1B,
	"BACKSPACE": 0x08,
	"DELETE":    0x2E,
	"INSERT":    0x2D,
	"HOME":      0x24,
	"END":       0x23,
	"PAGEUP":    0x21,
	"PAGEDOWN":  0x22,
	"UP":        0x26,
	"DOWN":      0x28,
	"LEFT":      0x25,
	"RIGHT":     0x27,
}

// ParseHotkeyString parses a hotkey string like "Ctrl+Shift+PrintScreen" into modifiers and key code
func ParseHotkeyString(hotkeyStr string) (modifiers uint, keyCode uint, ok bool) {
	if hotkeyStr == "" {
		return 0, 0, false
	}

	// Normalize separators and case
	normalized := strings.ToUpper(strings.ReplaceAll(hotkeyStr, " ", ""))
	parts := strings.Split(normalized, "+")

	modifiers = 0
	keyCode = 0

	for _, part := range parts {
		switch part {
		case "CTRL", "CONTROL":
			modifiers |= ModCtrl
		case "ALT":
			modifiers |= ModAlt
		case "SHIFT":
			modifiers |= ModShift
		case "WIN", "WINDOWS", "META", "SUPER":
			modifiers |= ModWin
		default:
			// This should be the main key
			if code, found := keyNameToCode[part]; found {
				keyCode = code
			} else {
				// Unknown key
				return 0, 0, false
			}
		}
	}

	if keyCode == 0 {
		return 0, 0, false
	}

	return modifiers, keyCode, true
}

// FormatHotkey formats modifiers and key code back to a readable string
func FormatHotkey(modifiers, keyCode uint) string {
	var parts []string

	if modifiers&ModCtrl != 0 {
		parts = append(parts, "Ctrl")
	}
	if modifiers&ModAlt != 0 {
		parts = append(parts, "Alt")
	}
	if modifiers&ModShift != 0 {
		parts = append(parts, "Shift")
	}
	if modifiers&ModWin != 0 {
		parts = append(parts, "Win")
	}

	// Find key name
	keyName := ""
	for name, code := range keyNameToCode {
		if code == keyCode {
			keyName = name
			break
		}
	}

	if keyName != "" {
		parts = append(parts, keyName)
	}

	return strings.Join(parts, "+")
}
