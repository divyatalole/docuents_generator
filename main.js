const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !!process.defaultApp || process.env.NODE_ENV === 'development'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#F8FAFC',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Solar Quotation'
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('[main] Page failed to load:', errorCode, errorDescription)
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── Local Storage ────────────────────────────────────────────────────────────
// folderConfig lives in a fixed AppData location so we can always find it,
// even if the user's custom data folder moves or is unavailable.
let folderConfigFile  // always in AppData — stores the chosen data folder path
let dataDir, quotesFile, settingsFile

function getDefaultDataDir() {
  return path.join(app.getPath('userData'), 'solar-data')
}

function initPaths() {
  const appData = app.getPath('userData')
  folderConfigFile = path.join(appData, 'folder-config.json')

  // Check if user has chosen a custom data folder
  const folderCfg = readJSON(folderConfigFile, null)
  dataDir = (folderCfg && folderCfg.dataDir) ? folderCfg.dataDir : getDefaultDataDir()

  quotesFile = path.join(dataDir, 'quotes.json')
  settingsFile = path.join(dataDir, 'settings.json')
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
}

function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (_) {}
  return fallback
}

function writeJSON(file, data) {
  ensureDataDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

// ─── Default Settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  company: {
    name: 'PV-Enviro Energies Pvt. Ltd.',
    address: 'Plot No.15 Puranik layout Bharat Nagar Opposite Hindustan Colony ,Amravati Road Nagpur-440033',
    gst: '27AEDPT3169E1ZD',
    contact: '9422443003 / 9881263527',
    email: 'pvenviroenergies@gmail.com',
    contactPerson: 'xxxxxxx '
  },
  bank: {
    name: 'xxxxxxxx',
    account: 'xxxxxxxxxx',
    ifsc: 'xxxxxxxx'
  },
  defaults: {
    subsidy: 78000,
    amcYears: 5,
    panelWarranty: 25,
    inverterWarranty: 10,
    gstPercent: 0
  },
  prices: {
    panels: {
      'ADANI 610-620 Wp DCR TOPCON Bifacial (Elan Pride Series)': { wattage: 615, pricePerUnit: 22000 },
      'Premier 600-620 Wp DCR TOPCON Bifacial (Elan Pride Series)': { wattage: 610, pricePerUnit: 21000 },
      'ADANI 540 Wp DCR Poly': { wattage: 540, pricePerUnit: 16000 }
    },
    inverters: {
      'Polycab 3kW On-Grid 1-Phase': { price: 35000, phase: '1-Phase' },
      'Polycab 5kW On-Grid 1-Phase': { price: 55000, phase: '1-Phase' },
      'Ksolare 3kW On-Grid 1-Phase': { price: 30000, phase: '1-Phase' },
      'Ksolare 5kW On-Grid 1-Phase': { price: 50000, phase: '1-Phase' },
      'Ksolare 10kW On-Grid 3-Phase': { price: 95000, phase: '3-Phase' }
    },
    structures: {
      'GI Structure (Standard)': 8000,
      'GI Structure (Heavy Duty)': 12000,
      'Aluminium Structure': 15000
    },
    wiringKits: {
      'Standard Wiring & LA Kit': 5000,
      'Premium Wiring & LA Kit': 8000
    }
  }
}

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE_QUOTES = [
  {
    id: 'AE/SOLAR/2603/001',
    customerName: 'Mr. Shrikant Patil',
    contactNumber: '9876543210',
    address: 'Nagpur',
    date: '2026-03-04',
    status: 'Pending',
    notes: '',
    phase: '1-Phase',
    panel: 'ADANI 610-620 Wp DCR TOPCON Bifacial (Elan Pride Series)',
    panelCount: 7,
    panelWattage: 615,
    systemCapacity: 4.31,
    inverter: 'Polycab 3kW On-Grid 1-Phase',
    mountingStructure: 'GI Structure (Standard)',
    wiringKit: 'Standard Wiring & LA Kit',
    installationType: 'Rooftop',
    panelCostPerUnit: 22000,
    inverterCost: 35000,
    structureCost: 8000,
    wiringCost: 5000,
    installationCharges: 15000,
    otherCharges: 21000,
    gstPercent: 0,
    subsidy: 78000,
    subtotal: 260000,
    gstAmount: 0,
    totalCost: 260000,
    netPayable: 182000,
    createdAt: '2026-03-04T00:00:00.000Z',
    updatedAt: '2026-03-04T00:00:00.000Z'
  },
  {
    id: 'AE/SOLAR/2602/016',
    customerName: 'M/s Hanuman Nagar, Nagpur',
    contactNumber: '9822112233',
    address: 'Hanuman Nagar, Nagpur',
    date: '2026-02-11',
    status: 'Sent',
    notes: 'Follow up after 15 days',
    phase: '1-Phase',
    panel: 'Premier 600-620 Wp DCR TOPCON Bifacial (Elan Pride Series)',
    panelCount: 8,
    panelWattage: 610,
    systemCapacity: 4.88,
    inverter: 'Polycab 5kW On-Grid 1-Phase',
    mountingStructure: 'GI Structure (Standard)',
    wiringKit: 'Standard Wiring & LA Kit',
    installationType: 'Rooftop',
    panelCostPerUnit: 21000,
    inverterCost: 55000,
    structureCost: 8000,
    wiringCost: 5000,
    installationCharges: 16000,
    otherCharges: 16000,
    gstPercent: 0,
    subsidy: 78000,
    subtotal: 300000,
    gstAmount: 0,
    totalCost: 300000,
    netPayable: 222000,
    createdAt: '2026-02-11T00:00:00.000Z',
    updatedAt: '2026-02-11T00:00:00.000Z'
  }
]

// ─── Local Store IPC ──────────────────────────────────────────────────────────
ipcMain.handle('store:getQuotes', () => {
  const quotes = readJSON(quotesFile, null)
  if (quotes === null) {
    writeJSON(quotesFile, SAMPLE_QUOTES)
    return SAMPLE_QUOTES
  }
  return quotes
})

ipcMain.handle('store:saveQuotes', (_, quotes) => {
  writeJSON(quotesFile, quotes)
  return true
})

ipcMain.handle('store:getSettings', () => {
  const saved = readJSON(settingsFile, null)
  if (!saved) return DEFAULT_SETTINGS
  return {
    company: { ...DEFAULT_SETTINGS.company, ...saved.company },
    bank: { ...DEFAULT_SETTINGS.bank, ...saved.bank },
    defaults: { ...DEFAULT_SETTINGS.defaults, ...saved.defaults },
    prices: {
      panels: { ...DEFAULT_SETTINGS.prices.panels, ...(saved.prices?.panels || {}) },
      inverters: { ...DEFAULT_SETTINGS.prices.inverters, ...(saved.prices?.inverters || {}) },
      structures: { ...DEFAULT_SETTINGS.prices.structures, ...(saved.prices?.structures || {}) },
      wiringKits: { ...DEFAULT_SETTINGS.prices.wiringKits, ...(saved.prices?.wiringKits || {}) }
    }
  }
})

ipcMain.handle('store:saveSettings', (_, settings) => {
  writeJSON(settingsFile, settings)
  return true
})

// ─── PDF Export ───────────────────────────────────────────────────────────────
ipcMain.handle('pdf:export', async (_, { html, filename }) => {
  const pdfWin = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })

  try {
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Quotation PDF',
      defaultPath: path.join(app.getPath('downloads'), filename || 'quotation.pdf'),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })

    if (!canceled && filePath) {
      const pdfBuffer = await pdfWin.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      })
      fs.writeFileSync(filePath, pdfBuffer)
      shell.openPath(filePath)
      return { success: true, filePath }
    }
    return { success: false, canceled: true }
  } catch (err) {
    console.error('PDF export error:', err)
    return { success: false, error: err.message }
  } finally {
    pdfWin.destroy()
  }
})

// ─── Data Folder IPC (Google Drive / shared folder sync) ──────────────────────
// No API needed. User installs Google Drive Desktop, points the app at a folder
// inside Google Drive, and all devices sharing that Google account stay in sync.

ipcMain.handle('folder:getPath', () => {
  return {
    current: dataDir,
    isCustom: dataDir !== getDefaultDataDir(),
    isDefault: dataDir === getDefaultDataDir()
  }
})

ipcMain.handle('folder:choose', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Data Sync Folder',
    defaultPath: dataDir,
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use This Folder'
  })
  if (canceled || !filePaths[0]) return { success: false, canceled: true }

  const newDir = filePaths[0]
  const newQuotesFile = path.join(newDir, 'quotes.json')
  const newSettingsFile = path.join(newDir, 'settings.json')

  try {
    // Copy existing data to the new folder so nothing is lost
    if (fs.existsSync(quotesFile) && !fs.existsSync(newQuotesFile)) {
      fs.copyFileSync(quotesFile, newQuotesFile)
    }
    if (fs.existsSync(settingsFile) && !fs.existsSync(newSettingsFile)) {
      fs.copyFileSync(settingsFile, newSettingsFile)
    }

    // Save the new folder path to folder-config
    writeJSON(folderConfigFile, { dataDir: newDir, setAt: new Date().toISOString() })

    // Update in-memory paths
    dataDir = newDir
    quotesFile = newQuotesFile
    settingsFile = newSettingsFile

    return { success: true, path: newDir }
  } catch (err) {
    console.error('[folder:choose]', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('folder:reset', () => {
  try {
    if (fs.existsSync(folderConfigFile)) fs.unlinkSync(folderConfigFile)
    const defaultDir = getDefaultDataDir()

    // Copy data back to default location
    const defaultQuotes = path.join(defaultDir, 'quotes.json')
    const defaultSettings = path.join(defaultDir, 'settings.json')
    if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true })
    if (fs.existsSync(quotesFile) && !fs.existsSync(defaultQuotes)) {
      fs.copyFileSync(quotesFile, defaultQuotes)
    }
    if (fs.existsSync(settingsFile) && !fs.existsSync(defaultSettings)) {
      fs.copyFileSync(settingsFile, defaultSettings)
    }

    dataDir = defaultDir
    quotesFile = defaultQuotes
    settingsFile = defaultSettings

    return { success: true, path: defaultDir }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initPaths()
  ensureDataDir()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch(err => {
  console.error('[main] app.whenReady failed:', err)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err)
})
