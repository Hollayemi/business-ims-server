const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    startServer: () => ipcRenderer.invoke('start-server'),
    stopServer: () => ipcRenderer.invoke('stop-server'),
    getStatus: () => ipcRenderer.invoke('get-status'),
    openBrowser: (url) => ipcRenderer.invoke('open-browser', url),
    onLog: (callback) => ipcRenderer.on('log', (event, data) => callback(data)),
    onStatus: (callback) => ipcRenderer.on('status', (event, status) => callback(status))
});