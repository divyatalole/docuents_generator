import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

const AppContext = createContext(null)

// ─── ID Generator ─────────────────────────────────────────────────────────────
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

// ─── Pricing Calculator ────────────────────────────────────────────────────────
export function calcPricing(form) {
  const panelTotal = (parseFloat(form.panelCostPerUnit) || 0) * (parseInt(form.panelCount) || 0)
  const inverterCost = parseFloat(form.inverterCost) || 0
  const structureCost = parseFloat(form.structureCost) || 0
  const wiringCost = parseFloat(form.wiringCost) || 0
  const installationCharges = parseFloat(form.installationCharges) || 0
  const otherCharges = parseFloat(form.otherCharges) || 0
  const subtotal = panelTotal + inverterCost + structureCost + wiringCost + installationCharges + otherCharges
  const gstPercent = parseFloat(form.gstPercent) || 0
  const gstAmount = Math.round(subtotal * gstPercent / 100)
  const totalCost = subtotal + gstAmount
  const subsidy = parseFloat(form.subsidy) || 0
  const netPayable = Math.max(0, totalCost - subsidy)
  return { panelTotal, subtotal, gstAmount, totalCost, netPayable }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_QUOTES': return { ...state, quotes: action.payload, loading: false }
    case 'SET_SETTINGS': return { ...state, settings: action.payload }
    case 'ADD_QUOTE': return { ...state, quotes: [action.payload, ...state.quotes] }
    case 'UPDATE_QUOTE':
      return {
        ...state,
        quotes: state.quotes.map(q => q.id === action.payload.id ? action.payload : q)
      }
    case 'DELETE_QUOTE':
      return { ...state, quotes: state.quotes.filter(q => q.id !== action.id) }
    case 'SET_LOADING': return { ...state, loading: action.payload }
    default: return state
  }
}

const initialState = { quotes: [], settings: null, loading: true }

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load data on mount
  useEffect(() => {
    async function load() {
      try {
        const [quotes, settings] = await Promise.all([
          window.electronAPI.getQuotes(),
          window.electronAPI.getSettings()
        ])
        dispatch({ type: 'SET_QUOTES', payload: quotes || [] })
        dispatch({ type: 'SET_SETTINGS', payload: settings })
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

  const value = {
    ...state,
    addQuote,
    updateQuote,
    deleteQuote,
    saveSettings
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
