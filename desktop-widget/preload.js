const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
  quit: () => ipcRenderer.send('widget:quit'),
  openSite: () => ipcRenderer.send('widget:open-site'),
  showContextMenu: () => ipcRenderer.send('widget:context-menu'),
});
