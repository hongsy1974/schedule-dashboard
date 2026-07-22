const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
  quit: () => ipcRenderer.send('widget:quit'),
  openSite: () => ipcRenderer.send('widget:open-site'),
  showContextMenu: () => ipcRenderer.send('widget:context-menu'),
  togglePin: () => ipcRenderer.invoke('widget:toggle-pin'),
  setCollapsed: (next) => ipcRenderer.invoke('widget:set-collapsed', next),
  setViewMode: (mode) => ipcRenderer.invoke('widget:set-view-mode', mode),
  getState: () => ipcRenderer.invoke('widget:get-state'),
  onPinChanged: (cb) => ipcRenderer.on('widget:pin-changed', (_event, pinned) => cb(pinned)),
});
