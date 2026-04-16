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
let dataDir, customersDir, billsDir, purchaseBillsDir, purchaseAttachmentsDir, settingsFile

function getDefaultDataDir() {
  return path.join(app.getPath('userData'), 'solar-data')
}

function initPaths() {
  const appData = app.getPath('userData')
  folderConfigFile = path.join(appData, 'folder-config.json')

  // Check if user has chosen a custom data folder
  const folderCfg = readJSON(folderConfigFile, null)
  const savedDir = (folderCfg && folderCfg.dataDir) ? folderCfg.dataDir : null

  // Validate the saved custom path — fall back to default if the drive/folder is unreachable
  if (savedDir) {
    try {
      const parentDir = path.dirname(savedDir)
      if (!fs.existsSync(parentDir)) throw new Error('parent not accessible')
      dataDir = savedDir
    } catch (_) {
      console.warn('[main] Custom data folder unreachable, falling back to default:', savedDir)
      dataDir = getDefaultDataDir()
    }
  } else {
    dataDir = getDefaultDataDir()
  }

  customersDir           = path.join(dataDir, 'customers')
  billsDir               = path.join(dataDir, 'bills')
  purchaseBillsDir       = path.join(dataDir, 'purchase-bills')
  purchaseAttachmentsDir = path.join(dataDir, 'purchase-bills', 'attachments')
  settingsFile           = path.join(dataDir, 'settings.json')
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir))               fs.mkdirSync(dataDir,               { recursive: true })
  if (!fs.existsSync(customersDir))          fs.mkdirSync(customersDir,          { recursive: true })
  if (!fs.existsSync(billsDir))              fs.mkdirSync(billsDir,              { recursive: true })
  if (!fs.existsSync(purchaseBillsDir))      fs.mkdirSync(purchaseBillsDir,      { recursive: true })
  if (!fs.existsSync(purchaseAttachmentsDir))fs.mkdirSync(purchaseAttachmentsDir,{ recursive: true })
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

// Sanitize a name for use as a folder/file name
function sanitizeName(name) {
  return (name || 'Unknown').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').trim()
}

// ─── PDF Invoice Parsing Helpers ─────────────────────────────────────────────

function normaliseDate(str) {
  if (!str) return ''
  str = str.trim()
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  let m = str.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})$/)
  if (m) {
    const yr = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${yr}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  }
  // DD-Mon-YYYY, DD/Mon/YYYY, DD Mon YYYY
  const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12}
  m = str.match(/(\d{1,2})[-\/\s]([A-Za-z]{3,9})[-\/\s](\d{2,4})/)
  if (m) {
    const day = m[1].padStart(2,'0')
    const mon = months[m[2].toLowerCase().slice(0,3)]
    if (!mon) return ''
    const yr = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${yr}-${String(mon).padStart(2,'0')}-${day}`
  }
  return ''
}

function parseNum(s) {
  return parseFloat(String(s || '0').replace(/,/g,'')) || 0
}

// Bug 4: covers "S GST 2.5%", "CGST@9%", "CGST 2.50 %" etc.
const GST_RATE_RX = /[SC]\s?GST\s*[@]?\s*(\d+(?:\.\d+)?)\s*%/gi

function findGstRateForHsn(lines, hsn) {
  for (const line of lines) {
    if (hsn && !line.includes(hsn)) continue
    const rates = [...line.matchAll(GST_RATE_RX)].map(m => parseFloat(m[1]))
    if (rates.length >= 2) return rates[0] + rates[1]
    if (rates.length === 1) return rates[0] * 2
  }
  return null
}

// Find the start/end line indices of the items table
function findTableBounds(lines) {
  let start = 0, end = lines.length
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase()
    if (
      /(?:description|particulars|item\s*name|narration|product|goods|service)/i.test(l) &&
      /(?:qty|quantity|hsn|sac|rate|amount)/i.test(l)
    ) { start = i + 1; break }
  }
  for (let i = start; i < lines.length; i++) {
    const l = lines[i]
    if (/^(?:sub[\s-]*total|total\s+taxable|taxable\s+value|amount\s+in\s+words|grand\s+total)/i.test(l)) {
      end = i; break
    }
  }
  return { start, end }
}

function extractItems(lines) {
  const { start, end } = findTableBounds(lines)
  const tableLines = lines.slice(start, end)
  const items = []
  const seenHsn = new Set()

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i]
    if (!line) continue
    const tokens = line.split(/\s+/).filter(Boolean)
    if (tokens.length < 2) continue

    // Skip obvious header/footer rows
    if (/^(?:sr\.?\s*no|s\.?\s*no|#|description|particulars|hsn|qty|rate|amount|total|cgst|sgst|igst|tax\s)/i.test(line)) continue

    // ── Strategy 1: HSN-anchored (4–8 digit code that isn't a year/serial/price) ──
    let hsnIdx = -1, hsn = ''
    for (let t = 0; t < tokens.length; t++) {
      const tok = tokens[t]
      if (!/^\d{4,8}$/.test(tok)) continue
      const n = parseInt(tok)
      if (t === 0 && n < 1000) continue        // skip small serial numbers at col 0
      if (n >= 2000 && n <= 2100) continue      // skip years
      hsn = tok; hsnIdx = t; break
    }

    if (hsn && !seenHsn.has(hsn)) {
      seenHsn.add(hsn)
      // Skip tax-summary rows (HSN repeated with 5+ numeric/% tokens)
      const numCount = tokens.filter(t => /^[\d,]+(?:\.\d+)?%?$/.test(t)).length
      if (numCount >= 6) continue

      // Description: tokens before HSN; fall back to previous lines
      // Bug 2: use \d+\s* (zero or more spaces) so "1L&T..." strips the leading serial too
      let name = tokens.slice(0, hsnIdx).join(' ').trim().replace(/^\d+\s*/, '')
      if (name.length < 2 && i > 0) name = tableLines[i-1].replace(/^\d+\s*/, '').trim()
      if (name.length < 2 && i > 1) name = tableLines[i-2].replace(/^\d+\s*/, '').trim()

      // After HSN: qty, optional unit, price per unit
      const afterHsn  = tokens.slice(hsnIdx + 1)
      const nums      = afterHsn.filter(t => /^[\d,]+(?:\.\d+)?$/.test(t)).map(parseNum)
      const unitWords = afterHsn.filter(t => /^[A-Za-z]{1,6}$/.test(t))

      const qty          = nums[0] || 1
      const unit         = unitWords[0] || 'Nos'
      const pricePerUnit = nums[1] || (nums.length === 1 ? nums[0] : 0)
      const gstRate      = findGstRateForHsn(lines, hsn)

      if (name || pricePerUnit > 0) {
        items.push({ name: name || 'Item', hsn, qty, unit, pricePerUnit, gstRate, gstAmt: 0, amount: 0 })
      }
      continue
    }

    // ── Strategy 2: Serial-numbered row without HSN ──
    // Pattern: "1 Item Description ... qty unit price amount"
    const firstTok = tokens[0]
    if (!/^\d{1,3}$/.test(firstTok) || parseInt(firstTok) === 0) continue

    const allNums  = tokens.filter(t => /^[\d,]+(?:\.\d+)?$/.test(t)).map(parseNum)
    const allWords = tokens.filter(t => /[A-Za-z]/.test(t) && t.length > 1)
    if (allWords.length === 0 || allNums.length < 2) continue

    // Build description from word-tokens (skip unit-like tokens at the end)
    const unitSet = new Set(['nos','pcs','kg','mtr','ltr','sqft','rmt','unit','set','box','bag','roll','kw','kwp'])
    let name = '', unit = 'Nos'
    for (const w of allWords) {
      if (unitSet.has(w.toLowerCase())) { unit = w; continue }
      name += (name ? ' ' : '') + w
    }
    // Bug 2: strip leading serial digits with zero or more spaces
    name = name.replace(/^\d+\s*/, '').trim()
    if (name.length < 2) continue

    // nums layout: [..., qty, pricePerUnit, amount]  — last is total, second-last is rate
    const pricePerUnit = allNums.length >= 2 ? allNums[allNums.length - 2] : 0
    const qty          = allNums.length >= 3 ? allNums[allNums.length - 3] : 1

    if (pricePerUnit > 0) {
      items.push({ name, hsn: '', qty: qty || 1, unit, pricePerUnit, gstRate: null, gstAmt: 0, amount: 0 })
    }
  }

  return items
}

// Bug 1: scan from the top of the document for the first clean company-name line
const ADDR_SKIP_RX = /plot|road|layout|midc|floor|godown|nagar|maharashtra|india|\bph\b|\bmob\b|contact|e-?mail|@|gstin|gst\s*no|\bwww\b/i

function extractSupplierName(lines) {
  for (const l of lines) {
    if (l.length <= 4) continue
    if (ADDR_SKIP_RX.test(l)) continue
    if (/^(?:tax\s*invoice|invoice|original|duplicate|gstin|gst\s*no)/i.test(l)) continue
    // Skip lines that are pure numbers / dates
    if (/^[\d\s\/\-.:,]+$/.test(l)) continue
    return l
  }
  // Bug 5: return empty string — let the user fill it in manually
  return ''
}

function extractSupplierAddress(lines, gstin) {
  const gstIdx = lines.findIndex(l => l.includes(gstin))
  if (gstIdx < 0) return ''
  const out = []
  for (let i = Math.max(0, gstIdx - 5); i < gstIdx; i++) {
    const l = lines[i]
    if (l.length > 3 && !/^(?:gstin|gst\s*no)/i.test(l)) out.push(l)
  }
  return out.join(', ')
}

// Bug 3: our own GSTIN — exclude it when searching for the supplier's GSTIN
const OWN_GSTIN = '27AEDPT3169E1ZD'

function parsePurchasePDFText(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const full  = lines.join('\n')

  // Bug 3: collect all GSTINs, exclude our own — first remaining is the supplier's
  const gstinRx = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/g
  const gstinMatches = [...full.matchAll(gstinRx)].map(m => m[1]).filter(g => g !== OWN_GSTIN)
  const supplierGst = gstinMatches.length > 0 ? gstinMatches[0] : ''

  // Bug 1: scan from top of document instead of searching relative to GSTIN line
  const supplierName    = extractSupplierName(lines)
  const supplierAddress = extractSupplierAddress(lines, supplierGst)

  // Invoice number — try several label variants
  let supplierBillNo = ''
  const invNoPatterns = [
    /(?:Invoice\s*No|Bill\s*No|Tax\s*Invoice\s*No|Inv(?:oice)?\.?\s*(?:No|Number)|Voucher\s*No|Vch\s*No)[.:\s#]*([A-Z0-9\/\-]+)/i,
    /\b((?:[A-Z]{1,5}\/\d{2}-\d{2}\/\d+)|(?:[A-Z]{1,5}\/\d{4}-\d{2}\/\d+))\b/,  // e.g. JKP/25-26/007892
  ]
  for (const rx of invNoPatterns) {
    const m = full.match(rx)
    if (m) { supplierBillNo = m[1].trim(); break }
  }

  // Date — multiple label variants and formats
  let date = ''
  const datePatterns = [
    /(?:Invoice\s*Date|Bill\s*Date|Date\s*of\s*(?:Invoice|Bill)|Dated?)[:\s]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i,
    /(?:Invoice\s*Date|Bill\s*Date|Date\s*of\s*(?:Invoice|Bill)|Dated?)[:\s]+(\d{1,2}[-\/\s][A-Za-z]{3,9}[-\/\s]\d{2,4})/i,
    /\bDate[:\s]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i,
    /\bDate[:\s]+(\d{1,2}[-\/\s][A-Za-z]{3,9}[-\/\s]\d{2,4})/i,
  ]
  for (const rx of datePatterns) {
    const m = full.match(rx)
    if (m) { date = normaliseDate(m[1]); if (date) break }
  }

  // Items
  const items = extractItems(lines)

  // Global GST fallback — Bug 4: use same broad GST regex (CGST/SGST, @, spaces)
  const cgstM = full.match(/C\s?GST\s*[@]?\s*(\d+(?:\.\d+)?)\s*%/i)
  const globalGstRate = cgstM ? parseFloat(cgstM[1]) * 2 : 5

  const resolvedItems = items.map(item => ({
    ...item,
    gstRate: (item.gstRate !== null && item.gstRate !== undefined) ? item.gstRate : globalGstRate
  }))

  // Supplier contact (mobile/phone)
  const contactM = full.match(/(?:mob(?:ile)?|tel|ph(?:one)?|contact)[.:\s]+(\+?[\d\s\-\/]{8,20})/i)
  const supplierContact = contactM ? contactM[1].trim().replace(/\s+/g, '') : ''

  // Round Off
  const roundOffM = full.match(/Round\s*(?:Off|off)[:\s]*([-+]?\d+(?:\.\d+)?)/i)
  const roundOff  = roundOffM ? parseFloat(roundOffM[1]) : 0

  return {
    supplierName,
    supplierGst,
    supplierAddress,
    supplierContact,
    supplierBillNo,
    date,
    placeOfSupply: '27-Maharashtra',
    items: resolvedItems,
    roundOff
  }
}

// Get the customer folder path, creating it if needed
function customerDir(customerName) {
  const dir = path.join(customersDir, sanitizeName(customerName))
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

// Read all quotes from all customer folders
function readAllQuotes() {
  if (!fs.existsSync(customersDir)) return null
  const quotes = []
  for (const folder of fs.readdirSync(customersDir)) {
    const folderPath = path.join(customersDir, folder)
    if (!fs.statSync(folderPath).isDirectory()) continue
    for (const file of fs.readdirSync(folderPath)) {
      if (!file.endsWith('.json')) continue
      const q = readJSON(path.join(folderPath, file), null)
      if (q) quotes.push(q)
    }
  }
  return quotes.length > 0 ? quotes : null
}

// Write all quotes — one file per quote inside per-customer folders
function writeAllQuotes(quotes) {
  ensureDataDir()
  // Track which files we write so we can clean up deleted quotes
  const written = new Set()
  for (const q of quotes) {
    const dir = customerDir(q.customerName)
    const file = path.join(dir, sanitizeName(q.id) + '.json')
    fs.writeFileSync(file, JSON.stringify(q, null, 2), 'utf-8')
    written.add(file)
  }
  // Remove JSON files for quotes that were deleted
  for (const folder of fs.readdirSync(customersDir)) {
    const folderPath = path.join(customersDir, folder)
    if (!fs.statSync(folderPath).isDirectory()) continue
    for (const file of fs.readdirSync(folderPath)) {
      if (!file.endsWith('.json')) continue
      const filePath = path.join(folderPath, file)
      if (!written.has(filePath)) fs.unlinkSync(filePath)
    }
    // Remove empty customer folders
    if (fs.readdirSync(folderPath).length === 0) fs.rmdirSync(folderPath)
  }
}

// Recursively copy a directory
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry)
    const destPath = path.join(dest, entry)
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// ─── Default Settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  company: {
    name: 'PV-Enviro Energies Pvt. Ltd.',
    address: 'Plot No.15 Puranik layout Bharat Nagar Opposite Hindustan Colony ,Amravati Road Nagpur-440033',
    gst: '27AEDPT3169E1ZD',
    contact: '9422443003 / 9881263527',
    email: 'pvenviroenergies@gmail.com',
    contactPerson: 'xxxxxxx ',
    authorizedSignatory: '',
    designation: 'Director'
  },
  bank: {
    name: 'xxxxxxxx',
    account: 'xxxxxxxxxx',
    ifsc: 'xxxxxxxx'
  },
  defaults: {
    subsidy: 78000,
    ratePerKw: 60000,
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
  // Migrate old flat quotes.json if it exists
  const legacyFile = path.join(dataDir, 'quotes.json')
  if (fs.existsSync(legacyFile)) {
    const legacy = readJSON(legacyFile, null)
    if (legacy && Array.isArray(legacy) && legacy.length > 0) {
      writeAllQuotes(legacy)
      fs.unlinkSync(legacyFile)
    }
  }
  const quotes = readAllQuotes()
  if (quotes === null) {
    writeAllQuotes(SAMPLE_QUOTES)
    return SAMPLE_QUOTES
  }
  return quotes
})

ipcMain.handle('store:saveQuotes', (_, quotes) => {
  writeAllQuotes(quotes)
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

// ─── Bill IPC ─────────────────────────────────────────────────────────────────
function readAllBills() {
  if (!fs.existsSync(billsDir)) return []
  const bills = []
  for (const file of fs.readdirSync(billsDir)) {
    if (!file.endsWith('.json')) continue
    const b = readJSON(path.join(billsDir, file), null)
    if (b) bills.push(b)
  }
  return bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

ipcMain.handle('bill:getAll', () => {
  ensureDataDir()
  return readAllBills()
})

ipcMain.handle('bill:save', (_, bill) => {
  ensureDataDir()
  const file = path.join(billsDir, sanitizeName(bill.id) + '.json')
  fs.writeFileSync(file, JSON.stringify(bill, null, 2), 'utf-8')
  return true
})

ipcMain.handle('bill:delete', (_, id) => {
  const file = path.join(billsDir, sanitizeName(id) + '.json')
  if (fs.existsSync(file)) fs.unlinkSync(file)
  return true
})

// ─── Purchase Bill IPC ────────────────────────────────────────────────────────
function readAllPurchaseBills() {
  if (!fs.existsSync(purchaseBillsDir)) return []
  const bills = []
  for (const file of fs.readdirSync(purchaseBillsDir)) {
    if (!file.endsWith('.json')) continue
    const b = readJSON(path.join(purchaseBillsDir, file), null)
    if (b) bills.push(b)
  }
  return bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

ipcMain.handle('purchase:getAll', () => {
  ensureDataDir()
  return readAllPurchaseBills()
})

ipcMain.handle('purchase:save', (_, bill) => {
  ensureDataDir()
  const file = path.join(purchaseBillsDir, sanitizeName(bill.id) + '.json')
  fs.writeFileSync(file, JSON.stringify(bill, null, 2), 'utf-8')
  return true
})

ipcMain.handle('purchase:delete', (_, id) => {
  const file = path.join(purchaseBillsDir, sanitizeName(id) + '.json')
  if (fs.existsSync(file)) fs.unlinkSync(file)
  return true
})

// Open file picker and copy chosen file into the attachments folder
ipcMain.handle('purchase:addAttachment', async (_, billId) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Supplier Bill',
    buttonLabel: 'Attach',
    filters: [
      { name: 'Documents & Images', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'] }
    ],
    properties: ['openFile']
  })
  if (canceled || !filePaths[0]) return { success: false, canceled: true }

  ensureDataDir()
  const src      = filePaths[0]
  const ext      = path.extname(src)
  const destName = `${sanitizeName(billId)}_attachment${ext}`
  const dest     = path.join(purchaseAttachmentsDir, destName)
  fs.copyFileSync(src, dest)
  return { success: true, path: dest, name: path.basename(src) }
})

// Open the stored attachment with the default OS application
ipcMain.handle('purchase:openAttachment', (_, filePath) => {
  if (fs.existsSync(filePath)) {
    shell.openPath(filePath)
    return { success: true }
  }
  return { success: false, error: 'File not found' }
})

// Parse a supplier invoice PDF and return structured bill data
ipcMain.handle('purchase:parseFromPDF', async () => {
  if (mainWindow) mainWindow.focus()
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Supplier Invoice PDF',
    defaultPath: app.getPath('documents'),
    buttonLabel: 'Import',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile']
  })
  if (canceled || !filePaths[0]) return { success: false, canceled: true }

  const srcPath = filePaths[0]
  let rawText
  try {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js')
    const buffer   = fs.readFileSync(srcPath)
    const result   = await pdfParse(buffer)
    rawText = result.text
  } catch (err) {
    return { success: false, error: 'Could not read PDF: ' + err.message }
  }

  const data = parsePurchasePDFText(rawText)

  // Copy PDF to attachments folder (same logic as purchase:addAttachment)
  ensureDataDir()
  const ext      = path.extname(srcPath)
  const safeName = sanitizeName(path.basename(srcPath, ext))
  const destName = `import_${safeName}_${Date.now()}${ext}`
  const destPath = path.join(purchaseAttachmentsDir, destName)
  fs.copyFileSync(srcPath, destPath)

  return { success: true, data, filePath: destPath, fileName: path.basename(srcPath) }
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
  const newSettingsFile = path.join(newDir, 'settings.json')

  try {
    // Copy customers folder and settings to new location
    copyDirRecursive(customersDir, path.join(newDir, 'customers'))
    if (fs.existsSync(settingsFile) && !fs.existsSync(newSettingsFile)) {
      fs.copyFileSync(settingsFile, newSettingsFile)
    }

    // Save the new folder path to folder-config
    writeJSON(folderConfigFile, { dataDir: newDir, setAt: new Date().toISOString() })

    // Copy bills and purchase-bills folders to new location
    copyDirRecursive(billsDir,         path.join(newDir, 'bills'))
    copyDirRecursive(purchaseBillsDir, path.join(newDir, 'purchase-bills'))

    // Update in-memory paths
    dataDir                = newDir
    customersDir           = path.join(newDir, 'customers')
    billsDir               = path.join(newDir, 'bills')
    purchaseBillsDir       = path.join(newDir, 'purchase-bills')
    purchaseAttachmentsDir = path.join(newDir, 'purchase-bills', 'attachments')
    settingsFile           = newSettingsFile

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
    const defaultSettings = path.join(defaultDir, 'settings.json')
    if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true })

    // Copy all data folders back to default location
    copyDirRecursive(customersDir,    path.join(defaultDir, 'customers'))
    copyDirRecursive(billsDir,        path.join(defaultDir, 'bills'))
    copyDirRecursive(purchaseBillsDir,path.join(defaultDir, 'purchase-bills'))
    if (fs.existsSync(settingsFile) && !fs.existsSync(defaultSettings)) {
      fs.copyFileSync(settingsFile, defaultSettings)
    }

    dataDir                = defaultDir
    customersDir           = path.join(defaultDir, 'customers')
    billsDir               = path.join(defaultDir, 'bills')
    purchaseBillsDir       = path.join(defaultDir, 'purchase-bills')
    purchaseAttachmentsDir = path.join(defaultDir, 'purchase-bills', 'attachments')
    settingsFile           = defaultSettings

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
