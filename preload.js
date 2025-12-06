const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Send messages to main process
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  showWindow: () => ipcRenderer.send('show-window'),

  // Screen capture for Electron (via main process IPC)
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // Clipboard access (via main process IPC)
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),

  // File logging
  logToFile: (message) => ipcRenderer.send('log-to-file', message),

  // Open external URL in default browser
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Receive messages from main process
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
  },
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, data) => callback(data));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, data) => callback(data));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, message) => callback(message));
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
