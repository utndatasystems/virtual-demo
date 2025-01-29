const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readCsv: (filePath) => ipcRenderer.invoke('read-csv', filePath),
  runQuery: (query, filePath, format) => ipcRenderer.invoke('run-query', { query, filePath, format}),
  virtualize: (filePath, type) => ipcRenderer.invoke('virtualize', { filePath, type })
});