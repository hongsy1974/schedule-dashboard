const { app, BrowserWindow, ipcMain, Menu, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const SITE_URL = 'https://hongsy1974.github.io/schedule-dashboard/';
const WIDGET_WIDTH = 340;
const WIDGET_HEIGHT = 480;
const COLLAPSED_HEIGHT = 50;
const settingsFile = path.join(app.getPath('userData'), 'window-position.json');

// Only one copy of the widget at a time — a second launch just focuses the first.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let win = null;
let pinned = false; // 항상 위에 표시 — off by default so the widget doesn't block other work.
let collapsed = false;

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsFile, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    // no saved settings yet, or the file is corrupt — fall back to defaults.
    return {};
  }
}

function saveSettings(partial) {
  try {
    const current = loadSettings();
    fs.writeFileSync(settingsFile, JSON.stringify({ ...current, ...partial }));
  } catch (e) {
    // best effort — losing saved settings just means it reopens with the defaults.
  }
}

function defaultPosition() {
  const { workAreaSize } = screen.getPrimaryDisplay();
  return { x: workAreaSize.width - WIDGET_WIDTH - 24, y: 24 };
}

// Locks the window at exactly (width, height) by setting min/max size to the
// same value, then applying it. Plain `resizable: false` interacts badly
// with later setSize() calls on Linux (observed: setSize() was silently
// ignored/clamped to a stale size once resizable was false), so instead the
// window stays technically resizable but pinned so tightly the user can't
// actually drag it to a different size — while our own setSize() calls
// (used for the collapse/expand feature) keep working reliably.
function applySize(win, width, height) {
  win.setMinimumSize(width, height);
  win.setMaximumSize(width, height);
  win.setSize(width, height);
}

function createWindow() {
  const saved = loadSettings();
  const pos = (Number.isFinite(saved.x) && Number.isFinite(saved.y)) ? { x: saved.x, y: saved.y } : defaultPosition();
  pinned = !!saved.pinned;
  collapsed = !!saved.collapsed;
  const startHeight = collapsed ? COLLAPSED_HEIGHT : WIDGET_HEIGHT;

  win = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: startHeight,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: pinned,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  applySize(win, WIDGET_WIDTH, startHeight);
  if (pinned) win.setAlwaysOnTop(true, 'floating');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Debounced save so dragging doesn't hammer the disk with writes.
  let saveTimer = null;
  win.on('moved', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (win) saveSettings(win.getBounds()); }, 400);
  });
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());

ipcMain.on('widget:quit', () => app.quit());
ipcMain.on('widget:open-site', () => shell.openExternal(SITE_URL));

// 항상 위에 표시 토글 — off by default (see `pinned` above); this lets someone
// turn it on only when they actually want the widget to stay above other
// windows, instead of it permanently getting in the way of other work.
ipcMain.handle('widget:toggle-pin', () => {
  if (!win) return false;
  pinned = !pinned;
  win.setAlwaysOnTop(pinned, pinned ? 'floating' : undefined);
  saveSettings({ pinned });
  return pinned;
});
ipcMain.handle('widget:get-state', () => ({ pinned, collapsed }));

// Collapse shrinks the window down to just the header bar so it stays out of
// the way without having to fully quit it; expand restores the full height.
ipcMain.handle('widget:set-collapsed', (event, next) => {
  if (!win) return collapsed;
  collapsed = !!next;
  applySize(win, WIDGET_WIDTH, collapsed ? COLLAPSED_HEIGHT : WIDGET_HEIGHT);
  saveSettings({ collapsed });
  return collapsed;
});

ipcMain.on('widget:context-menu', () => {
  if (!win) return;
  const menu = Menu.buildFromTemplate([
    { label: 'WorkFlow Portal 열기', click: () => shell.openExternal(SITE_URL) },
    { label: pinned ? '항상 위에 표시 끄기' : '항상 위에 표시 켜기', click: () => {
      pinned = !pinned;
      win.setAlwaysOnTop(pinned, pinned ? 'floating' : undefined);
      saveSettings({ pinned });
      win.webContents.send('widget:pin-changed', pinned);
    } },
    { type: 'separator' },
    { label: '위젯 종료', click: () => app.quit() },
  ]);
  menu.popup({ window: win });
});
