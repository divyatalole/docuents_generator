// Tells TypeScript about window.electronAPI injected by preload.js
interface Window {
  electronAPI: {
    getQuotes: () => Promise<any[]>
    saveQuotes: (quotes: any[]) => Promise<boolean>
    getSettings: () => Promise<any>
    saveSettings: (settings: any) => Promise<boolean>
    exportPDF: (payload: { html: string; filename?: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>
    getDataFolder: () => Promise<{ current: string; isCustom: boolean; isDefault: boolean }>
    chooseDataFolder: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>
    resetDataFolder: () => Promise<{ success: boolean; path?: string; error?: string }>
  }
}
