const { app, BrowserWindow, ipcMain, Menu, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const SITE_URL = 'https://hongsy1974.github.io/schedule-dashboard/';
// 리스트 보기는 작은 위젯 크기, 달력 보기는 사이트의 월간 일정처럼 실제 업무명이
// 보이도록 훨씬 넓게 — 두 모드는 폭이 크게 다르므로 뷰 전환 시 창 자체를 다시 그림.
const SIZES = {
  list: { width: 340, height: 480 },
  week: { width: 1049, height: 269 },
  month: { width: 1049, height: 642 },
};
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
let viewMode = 'list';

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

function defaultPosition(width) {
  const { workAreaSize } = screen.getPrimaryDisplay();
  return { x: workAreaSize.width - width - 24, y: 24 };
}

// Locks the window at exactly (width, height) by setting min/max size to the
// same value, then applying it. Plain `resizable: false` interacts badly
// with later setSize() calls on Linux (observed: setSize() was silently
// ignored/clamped to a stale size once resizable was false), so instead the
// window stays technically resizable but pinned so tightly the user can't
// actually drag it to a different size — while our own setSize() calls
// (used for view-switching and collapse/expand) keep working reliably.
//
// 뷰 전환 시 기준점은 오른쪽 위 — setSize() 자체는 왼쪽 위를 고정한 채 오른쪽/
// 아래로만 커지므로, 폭이 바뀐 만큼 x를 보정해서 오른쪽 가장자리(및 위쪽 y)는
// 그대로 두고 왼쪽으로만 넓어지거나 좁아지게 만든다.
function applySize(width, height) {
  if (!win) return;
  const [oldX, oldY] = win.getPosition();
  const [oldWidth] = win.getSize();
  win.setMinimumSize(width, height);
  win.setMaximumSize(width, height);
  win.setSize(width, height);
  win.setPosition(oldX + (oldWidth - width), oldY);
  keepOnScreen(width, height);
}

// The 달력 view is much wider than the 리스트 view — if the widget is parked
// near a screen edge, switching views could otherwise push part of it off
// the visible desktop. Nudges the position back on-screen when that'd happen.
function keepOnScreen(width, height) {
  if (!win) return;
  const { workArea } = screen.getDisplayMatching(win.getBounds());
  const [x, y] = win.getPosition();
  const clampedX = Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - width);
  const clampedY = Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - height);
  if (clampedX !== x || clampedY !== y) win.setPosition(clampedX, clampedY);
}

function normalizeViewMode(mode) {
  return (mode === 'month' || mode === 'week') ? mode : 'list';
}

function currentSize() {
  const base = SIZES[viewMode] || SIZES.list;
  return { width: base.width, height: collapsed ? COLLAPSED_HEIGHT : base.height };
}

function createWindow() {
  const saved = loadSettings();
  pinned = !!saved.pinned;
  collapsed = !!saved.collapsed;
  viewMode = normalizeViewMode(saved.viewMode);

  const { width, height } = currentSize();
  const pos = (Number.isFinite(saved.x) && Number.isFinite(saved.y)) ? { x: saved.x, y: saved.y } : defaultPosition(width);

  win = new BrowserWindow({
    width,
    height,
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

  applySize(width, height);
  if (pinned) win.setAlwaysOnTop(true, 'floating');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Debounced save so dragging doesn't hammer the disk with writes.
  let saveTimer = null;
  win.on('moved', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (win) saveSettings({ x: win.getPosition()[0], y: win.getPosition()[1] }); }, 400);
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
ipcMain.handle('widget:get-state', () => ({ pinned, collapsed, viewMode }));

// Collapse shrinks the window down to just the header bar so it stays out of
// the way without having to fully quit it; expand restores the view's full height.
ipcMain.handle('widget:set-collapsed', (event, next) => {
  collapsed = !!next;
  const { width, height } = currentSize();
  applySize(width, height);
  saveSettings({ collapsed });
  return collapsed;
});

// 리스트 ↔ 주간 ↔ 달력 전환 — 주간/달력은 사이트의 일정처럼 업무명이 보이도록 폭이
// 훨씬 넓어서, 뷰가 바뀔 때마다 창 크기 자체를 그 모드에 맞게 다시 잡아준다.
ipcMain.handle('widget:set-view-mode', (event, mode) => {
  viewMode = normalizeViewMode(mode);
  const { width, height } = currentSize();
  applySize(width, height);
  saveSettings({ viewMode });
  return viewMode;
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
