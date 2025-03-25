const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readCsv: (filePath) => ipcRenderer.invoke('read-csv', filePath),
  readParquet: (filePath) => ipcRenderer.invoke('read-parquet', filePath),
  runQuery: (query, filePath, format) => ipcRenderer.invoke('run-query', { query, filePath, format, shouldRun: 1}),
  rewriteQuery: (query, filePath, format) => ipcRenderer.invoke('run-query', { query, filePath, format, shouldRun: 0}),
  virtualize: (filePath, type) => ipcRenderer.invoke('virtualize', { filePath, type }),
  receive: (channel, func) => {
    const validChannels = ['virtualize-log', 'show-plot']; // Allowed channels
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});