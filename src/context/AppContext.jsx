import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

const AppContext = createContext(null)

// ─── ID Generators ────────────────────────────────────────────────────────────
export function generateQuoteId(quotes, date) {
  const d = date ? new Date(date) : new Date()
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const prefix = `AE/SOLAR/${yy}${mm}/`

  let max = 0
  quotes.forEach(q => {
    if (q.id && q.id.startsWith(prefix)) {
      const seq = parseInt(q.id.split('/')[3], 10) || 0
      if (seq > max) max = seq
    }
  })
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

// Bill ID format: ADV/25-26/04/001  (financial year / month 2-digit / seq)
export function generateBillId(bills, date) {
  const d = date ? new Date(date) : new Date()
  const year  = d.getFullYear()
  const month = d.getMonth() + 1  // 1-12
  const mm    = String(month).padStart(2, '0')
  // Financial year: Apr–Mar (month>=4 → YY/YY+1, else YY-1/YY)
  const fy1 = month >= 4 ? year     : year - 1
  const fy2 = month >= 4 ? year + 1 : year
  const fyStr = `${String(fy1).slice(-2)}-${String(fy2).slice(-2)}`
  const prefix = `ADV/${fyStr}/${mm}/`

  let max = 0
  ;(bills || []).forEach(b => {
    if (b.id && b.id.startsWith(prefix)) {
      const parts = b.id.split('/')
      const seq = parseInt(parts[parts.length - 1], 10) || 0
      if (seq > max) max = seq
    }
  })
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

// Purchase Bill ID: PB/25-26/04/001
export function generatePurchaseBillId(purchaseBills, date) {
  const d = date ? new Date(date) : new Date()
  const year  = d.getFullYear()
  const month = d.getMonth() + 1
  const mm    = String(month).padStart(2, '0')
  const fy1   = month >= 4 ? year     : year - 1
  const fy2   = month >= 4 ? year + 1 : year
  const fyStr = `${String(fy1).slice(-2)}-${String(fy2).slice(-2)}`
  const prefix = `PB/${fyStr}/${mm}/`
  let max = 0
  ;(purchaseBills || []).forEach(b => {
    if (b.id && b.id.startsWith(prefix)) {
      const parts = b.id.split('/')
      const seq = parseInt(parts[parts.length - 1], 10) || 0
      if (seq > max) max = seq
    }
  })
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

// ─── Pricing Calculator ────────────────────────────────────────────────────────
// Model: user enters the Final Amount directly (GST-inclusive total).
//   70% of Final Amount → Solar Rooftop System  — 5%  GST inside
//   30% of Final Amount → System Commissioning  — 18% GST inside
//
// Back-calculation: if portion P is GST-inclusive at rate r%:
//   taxable value = P / (1 + r)    GST = P − taxable value
//
// Backward-compat: if finalAmount is absent, fall back to systemCapacity × ratePerKw.
export function calcPricing(form) {
  const finalAmount = parseFloat(form.finalAmount) || 0
  const legacy      = (parseFloat(form.systemCapacity) || 0) * (parseFloat(form.ratePerKw) || 60000)
  const totalCost   = Math.round(finalAmount > 0 ? finalAmount : legacy)

  const solarPortion = Math.round(totalCost * 0.70)   // 70% GST-inclusive @ 5%
  const commPortion  = totalCost - solarPortion        // 30% GST-inclusive @ 18%

  const solarBase = Math.round(solarPortion / 1.05)
  const solarGst  = solarPortion - solarBase
  const solarTotal = solarPortion

  const commBase = Math.round(commPortion / 1.18)
  const commGst  = commPortion - commBase
  const commTotal = commPortion

  return { totalCost, solarPortion, solarTotal, solarBase, solarGst, commPortion, commTotal, commBase, commGst, netPayable: totalCost }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_QUOTES':   return { ...state, quotes: action.payload, loading: false }
    case 'SET_SETTINGS': return { ...state, settings: action.payload }
    case 'ADD_QUOTE':    return { ...state, quotes: [action.payload, ...state.quotes] }
    case 'UPDATE_QUOTE':
      return { ...state, quotes: state.quotes.map(q => q.id === action.payload.id ? action.payload : q) }
    case 'DELETE_QUOTE':
      return { ...state, quotes: state.quotes.filter(q => q.id !== action.id) }
    case 'SET_LOADING':  return { ...state, loading: action.payload }
    // Sale bills
    case 'SET_BILLS':    return { ...state, bills: action.payload }
    case 'UPSERT_BILL': {
      const exists = state.bills.some(b => b.id === action.payload.id)
      const bills = exists
        ? state.bills.map(b => b.id === action.payload.id ? action.payload : b)
        : [action.payload, ...state.bills]
      return { ...state, bills }
    }
    case 'DELETE_BILL':
      return { ...state, bills: state.bills.filter(b => b.id !== action.id) }
    // Purchase bills
    case 'SET_PURCHASE_BILLS': return { ...state, purchaseBills: action.payload }
    case 'UPSERT_PURCHASE_BILL': {
      const exists = state.purchaseBills.some(b => b.id === action.payload.id)
      const purchaseBills = exists
        ? state.purchaseBills.map(b => b.id === action.payload.id ? action.payload : b)
        : [action.payload, ...state.purchaseBills]
      return { ...state, purchaseBills }
    }
    case 'DELETE_PURCHASE_BILL':
      return { ...state, purchaseBills: state.purchaseBills.filter(b => b.id !== action.id) }
    default: return state
  }
}

const initialState = { quotes: [], bills: [], purchaseBills: [], settings: null, loading: true }

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load data on mount
  useEffect(() => {
    async function load() {
      try {
        const [quotes, settings, bills, purchaseBills] = await Promise.all([
          window.electronAPI.getQuotes(),
          window.electronAPI.getSettings(),
          window.electronAPI.getBills(),
          window.electronAPI.getPurchaseBills()
        ])
        dispatch({ type: 'SET_QUOTES',         payload: quotes         || [] })
        dispatch({ type: 'SET_SETTINGS',        payload: settings })
        dispatch({ type: 'SET_BILLS',           payload: bills          || [] })
        dispatch({ type: 'SET_PURCHASE_BILLS',  payload: purchaseBills  || [] })
      } catch (err) {
        console.error('Failed to load data:', err)
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
    load()
  }, [])

  const saveQuotes = useCallback(async (quotes) => {
    await window.electronAPI.saveQuotes(quotes)
  }, [])

  const addQuote = useCallback(async (quote) => {
    const newQuotes = [quote, ...state.quotes]
    dispatch({ type: 'ADD_QUOTE', payload: quote })
    await window.electronAPI.saveQuotes(newQuotes)
  }, [state.quotes])

  const updateQuote = useCallback(async (quote) => {
    const updated = { ...quote, updatedAt: new Date().toISOString() }
    const newQuotes = state.quotes.map(q => q.id === updated.id ? updated : q)
    dispatch({ type: 'UPDATE_QUOTE', payload: updated })
    await window.electronAPI.saveQuotes(newQuotes)
  }, [state.quotes])

  const deleteQuote = useCallback(async (id) => {
    const newQuotes = state.quotes.filter(q => q.id !== id)
    dispatch({ type: 'DELETE_QUOTE', id })
    await window.electronAPI.saveQuotes(newQuotes)
  }, [state.quotes])

  const saveSettings = useCallback(async (settings) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings })
    await window.electronAPI.saveSettings(settings)
  }, [])

  const saveBill = useCallback(async (bill) => {
    const now = new Date().toISOString()
    const b = bill.createdAt ? { ...bill, updatedAt: now } : { ...bill, createdAt: now, updatedAt: now }
    dispatch({ type: 'UPSERT_BILL', payload: b })
    await window.electronAPI.saveBill(b)
    return b
  }, [])

  const deleteBill = useCallback(async (id) => {
    dispatch({ type: 'DELETE_BILL', id })
    await window.electronAPI.deleteBill(id)
  }, [])

  const savePurchaseBill = useCallback(async (bill) => {
    const now = new Date().toISOString()
    const b = bill.createdAt ? { ...bill, updatedAt: now } : { ...bill, createdAt: now, updatedAt: now }
    dispatch({ type: 'UPSERT_PURCHASE_BILL', payload: b })
    await window.electronAPI.savePurchaseBill(b)
    return b
  }, [])

  const deletePurchaseBill = useCallback(async (id) => {
    dispatch({ type: 'DELETE_PURCHASE_BILL', id })
    await window.electronAPI.deletePurchaseBill(id)
  }, [])

  const value = {
    ...state,
    addQuote,
    updateQuote,
    deleteQuote,
    saveSettings,
    saveBill,
    deleteBill,
    savePurchaseBill,
    deletePurchaseBill
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
