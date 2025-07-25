const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  log: console.log,
});