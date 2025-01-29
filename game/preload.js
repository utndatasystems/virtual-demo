const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readCsv: (filePath) => ipcRenderer.invoke('read-csv', filePath),
  runQuery: (query, filePath) => ipcRenderer.invoke('run-query', { query, filePath })
});