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
  getDataFolder:   () => ipcRenderer.invoke('folder:getPath'),
  chooseDataFolder: () => ipcRenderer.invoke('folder:choose'),
  resetDataFolder:  () => ipcRenderer.invoke('folder:reset'),

  // Sale bills
  getBills:   ()       => ipcRenderer.invoke('bill:getAll'),
  saveBill:   (bill)   => ipcRenderer.invoke('bill:save',   bill),
  deleteBill: (id)     => ipcRenderer.invoke('bill:delete', id),

  // Purchase bills
  getPurchaseBills:       ()         => ipcRenderer.invoke('purchase:getAll'),
  savePurchaseBill:       (bill)     => ipcRenderer.invoke('purchase:save',           bill),
  deletePurchaseBill:     (id)       => ipcRenderer.invoke('purchase:delete',         id),
  addPurchaseAttachment:  (billId)   => ipcRenderer.invoke('purchase:addAttachment',  billId),
  openPurchaseAttachment: (filePath) => ipcRenderer.invoke('purchase:openAttachment', filePath),
  parsePurchasePDF:       ()         => ipcRenderer.invoke('purchase:parseFromPDF')
})
