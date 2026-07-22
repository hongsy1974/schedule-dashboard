const { app, BrowserWindow, ipcMain, Menu, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const SITE_URL = 'https://hongsy1974.github.io/schedule-dashboard/';
const WIDGET_WIDTH = 340;
const WIDGET_HEIGHT = 480;
const positionFile = path.join(app.getPath('userData'), 'window-position.json');

// Only one copy of the widget at a time — a second launch just focuses the first.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let win = null;

function loadSavedPosition() {
  try {
    const raw = fs.readFileSync(positionFile, 'utf8');
    const { x, y } = JSON.parse(raw);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  } catch (e) {
    // no saved position yet, or the file is corrupt — fall back to the default corner.
  }
  return null;
}

function savePosition(bounds) {
  try {
    fs.writeFileSync(positionFile, JSON.stringify({ x: bounds.x, y: bounds.y }));
  } catch (e) {
    // best effort — losing the saved position just means it reopens in the default spot.
  }
}

function defaultPosition() {
  const { workAreaSize } = screen.getPrimaryDisplay();
  return { x: workAreaSize.width - WIDGET_WIDTH - 24, y: 24 };
}

function createWindow() {
  const pos = loadSavedPosition() || defaultPosition();

  win = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'floating');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Debounced save so dragging doesn't hammer the disk with writes.
  let saveTimer = null;
  win.on('moved', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (win) savePosition(win.getBounds()); }, 400);
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

ipcMain.on('widget:context-menu', () => {
  if (!win) return;
  const menu = Menu.buildFromTemplate([
    { label: 'WorkFlow Portal 열기', click: () => shell.openExternal(SITE_URL) },
    { type: 'separator' },
    { label: '위젯 종료', click: () => app.quit() },
  ]);
  menu.popup({ window: win });
});
