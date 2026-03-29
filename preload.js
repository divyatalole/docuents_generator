const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Local storage
  getQuotes: () => ipcRenderer.invoke('store:getQuotes'),
  saveQuotes: (quotes) => ipcRenderer.invoke('store:saveQuotes', quotes),
  getSettings: () => ipcRenderer.invoke('store:getSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('store:saveSettings', settings),

  // PDF export
  exportPDF: (payload) => ipcRenderer.invoke('pdf:export', payload),

  // Data folder (for Google Drive / shared folder sync)
  getDataFolder: () => ipcRenderer.invoke('folder:getPath'),
  chooseDataFolder: () => ipcRenderer.invoke('folder:choose'),
  resetDataFolder: () => ipcRenderer.invoke('folder:reset')
})
