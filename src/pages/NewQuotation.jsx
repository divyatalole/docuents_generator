import React, { useState, useEffect } from 'react'
import { Check, ChevronRight, ChevronLeft, Save, X } from 'lucide-react'
import { useApp, generateQuoteId, calcPricing } from '../context/AppContext.jsx'
import { PAGES } from '../constants.js'

const STEPS = ['Customer Details', 'System Configuration', 'Pricing & Summary']
const INSTALL_TYPES = ['Rooftop (RCC)', 'Rooftop (Sheet)', 'Ground Mount', 'Elevated Structure']

function emptyForm(settings) {
  const panelKeys    = settings?.prices?.panels    ? Object.keys(settings.prices.panels)    : []
  const inverterKeys = settings?.prices?.inverters ? Object.keys(settings.prices.inverters) : []
  const wiringKeys   = settings?.prices?.wiringKits ? Object.keys(settings.prices.wiringKits) : []

  return {
    customerName:    '',
    contactNumber:   '',
    address:         '',
    date:            new Date().toISOString().split('T')[0],
    status:          'Pending',
    notes:           '',
    panel:           panelKeys[0] || '',
    panelCount:      7,
    systemCapacity:  0,
    inverter:        inverterKeys[0] || '',
    wiringKit:       wiringKeys[0] || '',
    installationType: 'Rooftop (RCC)',
    finalAmount:     0
  }
}

export default function NewQuotation({ navigate, editQuoteId }) {
  const { quotes, settings, addQuote, updateQuote } = useApp()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const isEdit = !!editQuoteId
  const editQuote = isEdit ? quotes.find(q => q.id === editQuoteId) : null

  useEffect(() => {
    if (!settings) return
    if (isEdit && editQuote) {
      setForm({ ...editQuote })
    } else {
      setForm(emptyForm(settings))
    }
  }, [settings, isEdit, editQuoteId])

  const panelOptions    = settings?.prices?.panels    ? Object.keys(settings.prices.panels)    : []
  const inverterOptions = settings?.prices?.inverters ? Object.keys(settings.prices.inverters) : []

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }))
  }

  function validateStep(s) {
    const errs = {}
    if (s === 0 && !form.customerName?.trim()) errs.customerName = 'Customer name is required'
    if (s === 1) {
      if (!form.panel)   errs.panel = 'Select a solar panel'
      if (!form.inverter) errs.inverter = 'Select an inverter'
      if (!(parseInt(form.panelCount) > 0)) errs.panelCount = 'Enter valid panel count'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function nextStep() { if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  function prevStep() { setStep(s => Math.max(s - 1, 0)) }

  async function handleSave() {
    if (!validateStep(step)) return
    setSaving(true)
    try {
      const pricing = calcPricing(form)
      const now = new Date().toISOString()
      const quote = {
        ...form,
        panelCount:   parseInt(form.panelCount) || 0,
        finalAmount:  parseFloat(form.finalAmount) || 0,
        ...pricing,
        updatedAt: now
      }

      if (isEdit) {
        await updateQuote(quote)
      } else {
        quote.id = generateQuoteId(quotes, form.date)
        quote.createdAt = now
        await addQuote(quote)
      }

      navigate(PAGES.QUOTATION_PREVIEW, { quoteId: quote.id })
    } catch (err) {
      setToast({ msg: 'Save failed: ' + err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  if (!form || !settings) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
  }

  const pricing = calcPricing(form)

  return (
    <div>
      {/* Wizard Header */}
      <div className="wizard-header">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="wizard-step">
              <div className={`wizard-step-num ${i < step ? 'done' : i === step ? 'active' : 'pending'}`}>
                {i < step ? <Check size={15} /> : i + 1}
              </div>
              <div>
                <div className={`wizard-step-label ${i < step ? 'done' : i === step ? 'active' : 'pending'}`}>
                  {label}
                </div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`wizard-connector ${i < step ? 'done' : 'pending'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Form Panel */}
        <div className="card">
          <div className="card-header"><h3>{STEPS[step]}</h3></div>
          <div className="card-body">
            {step === 0 && <StepCustomer form={form} set={set} errors={errors} />}
            {step === 1 && (
              <StepSystem
                form={form} set={set} errors={errors}
                panelOptions={panelOptions} inverterOptions={inverterOptions}
              />
            )}
            {step === 2 && <StepPricing form={form} set={set} pricing={pricing} />}
          </div>

          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {step > 0 && (
                <button className="btn btn-outline" onClick={prevStep}>
                  <ChevronLeft size={15} /> Back
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => navigate(PAGES.DASHBOARD)}>
                <X size={14} /> Cancel
              </button>
              {step < STEPS.length - 1 ? (
                <button className="btn btn-primary" onClick={nextStep}>
                  Next <ChevronRight size={15} />
                </button>
              ) : (
                <button className="btn btn-amber" onClick={handleSave} disabled={saving}>
                  <Save size={14} /> {saving ? 'Saving…' : isEdit ? 'Update Quote' : 'Save & Preview'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Live Price Preview ── */}
        <div className="price-preview">
          <h4>Live Cost Preview</h4>

          <div className="price-row subtle">
            <span>System Capacity</span>
            <span>{form.systemCapacity ? `${Number(form.systemCapacity).toFixed(3)} kW` : '—'}</span>
          </div>
          <div className="price-row subtle">
            <span>Final Amount</span>
            <span>₹{Number(form.finalAmount || 0).toLocaleString('en-IN')}</span>
          </div>

          <hr className="price-divider" />

          {/* 70% Solar block */}
          <div className="price-row subtle" style={{ color: 'var(--gray-500)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <span>Solar Rooftop System (70%)</span>
          </div>
          <div className="price-row subtle">
            <span style={{ paddingLeft: 8 }}>Base amount</span>
            <span>₹{Number(pricing.solarBase || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="price-row subtle">
            <span style={{ paddingLeft: 8 }}>GST @ 5%</span>
            <span>+ ₹{Number(pricing.solarGst || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="price-row" style={{ fontWeight: 600 }}>
            <span>Solar System Total</span>
            <span>₹{Number(pricing.solarTotal || 0).toLocaleString('en-IN')}</span>
          </div>

          <hr className="price-divider" />

          {/* 30% Commission block */}
          <div className="price-row subtle" style={{ color: 'var(--gray-500)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <span>System Commissions (30%)</span>
          </div>
          <div className="price-row subtle">
            <span style={{ paddingLeft: 8 }}>Base amount</span>
            <span>₹{Number(pricing.commBase || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="price-row subtle">
            <span style={{ paddingLeft: 8 }}>GST @ 18%</span>
            <span>+ ₹{Number(pricing.commGst || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="price-row" style={{ fontWeight: 600 }}>
            <span>Commissions Total</span>
            <span>₹{Number(pricing.commTotal || 0).toLocaleString('en-IN')}</span>
          </div>

          <hr className="price-divider" />

          <div className="price-row">
            <span style={{ fontWeight: 600 }}>Total System Cost</span>
            <span className="price-total">₹{Number(pricing.totalCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(255,255,255,.06)', borderRadius: 6, fontSize: 11, opacity: .7, lineHeight: 1.6 }}>
            GST split: 5% on panels &amp; inverter · 18% on commissions
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}

// ─── Step 1: Customer Details ─────────────────────────────────────────────────
function StepCustomer({ form, set, errors }) {
  return (
    <div>
      <div className="form-group">
        <label className="form-label">Customer Name *</label>
        <input
          className={`form-control ${errors.customerName ? 'error' : ''}`}
          placeholder="e.g. Mr. Rajesh Kumar / M/s ABC Company"
          value={form.customerName}
          onChange={e => set('customerName', e.target.value)}
        />
        {errors.customerName && <div className="form-error">{errors.customerName}</div>}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Contact Number</label>
          <input className="form-control" placeholder="9XXXXXXXXX" value={form.contactNumber}
            onChange={e => set('contactNumber', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Quotation Date</label>
          <input className="form-control" type="date" value={form.date}
            onChange={e => set('date', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Site Address (Full — as on electricity bill)</label>
        <textarea className="form-control" rows={3} placeholder="e.g. H.No.1247, Ward No.5, Rajiv Nagar, Issasani, Wagdara Hingna, Nagpur - 441110"
          value={form.address} onChange={e => set('address', e.target.value)} />
        <div className="form-hint">Include House No., Ward No., Street, Area, City and PIN — required for MSEDCL &amp; National Portal documents.</div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes / Remarks</label>
        <textarea className="form-control" rows={3} placeholder="Any special instructions, remarks..."
          value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
    </div>
  )
}

// ─── Step 2: System Configuration ────────────────────────────────────────────
function StepSystem({ form, set, errors, panelOptions, inverterOptions }) {
  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Installation Type</label>
          <select className="form-control" value={form.installationType}
            onChange={e => set('installationType', e.target.value)}>
            {INSTALL_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">System Capacity (kW)</label>
          <input className="form-control" type="number" min="0" step="0.001"
            value={form.systemCapacity}
            onChange={e => set('systemCapacity', e.target.value)}
            placeholder="e.g. 3.000" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Solar Panel Model *</label>
        <select className={`form-control ${errors.panel ? 'error' : ''}`}
          value={form.panel} onChange={e => set('panel', e.target.value)}>
          <option value="">— Select Panel —</option>
          {panelOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {errors.panel && <div className="form-error">{errors.panel}</div>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Number of Panels</label>
          <input className={`form-control ${errors.panelCount ? 'error' : ''}`}
            type="number" min="1" value={form.panelCount}
            onChange={e => set('panelCount', e.target.value)} />
          {errors.panelCount && <div className="form-error">{errors.panelCount}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Inverter *</label>
          <select className={`form-control ${errors.inverter ? 'error' : ''}`}
            value={form.inverter} onChange={e => set('inverter', e.target.value)}>
            <option value="">— Select Inverter —</option>
            {inverterOptions.map(inv => <option key={inv} value={inv}>{inv}</option>)}
          </select>
          {errors.inverter && <div className="form-error">{errors.inverter}</div>}
        </div>
      </div>

    </div>
  )
}

// ─── Step 3: Pricing ──────────────────────────────────────────────────────────
function StepPricing({ form, set, pricing }) {
  const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN')

  return (
    <div>
      {/* Final Amount input */}
      <div className="form-group">
        <label className="form-label">Final Amount (₹) — GST inclusive total</label>
        <input className="form-control" type="number" min="0" step="1"
          value={form.finalAmount}
          onChange={e => set('finalAmount', e.target.value)}
          placeholder="e.g. 180000" />
        <div className="form-hint">70% → Solar Rooftop System (incl. 5% GST) &nbsp;·&nbsp; 30% → System Commissioning (incl. 18% GST)</div>
      </div>

      {/* Auto breakdown table */}
      <div style={{ borderRadius: 8, border: '1px solid var(--gray-200)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ background: 'var(--gray-50)', padding: '8px 16px', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Auto-calculated GST Breakdown
        </div>

        {/* Solar system row */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>
              A. Solar Rooftop System (Panels + Inverter)
            </span>
            <span style={{ fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', fontSize: 13 }}>
              {inr(pricing.solarTotal)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--gray-500)' }}>
            <span>70% of base → {inr(pricing.solarBase)}</span>
            <span style={{ color: '#2563EB' }}>GST @ 5% → +{inr(pricing.solarGst)}</span>
          </div>
        </div>

        {/* Commissions row */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>
              B. System Commissions
            </span>
            <span style={{ fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', fontSize: 13 }}>
              {inr(pricing.commTotal)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--gray-500)' }}>
            <span>30% of base → {inr(pricing.commBase)}</span>
            <span style={{ color: '#D97706' }}>GST @ 18% → +{inr(pricing.commGst)}</span>
          </div>
        </div>

        {/* Totals */}
        <div style={{ padding: '12px 16px', background: 'var(--navy)', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
            <span>Total System Cost (A + B incl. GST)</span>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>{inr(pricing.totalCost)}</span>
          </div>
        </div>
      </div>

      {/* Total Payable */}
      <div className="form-group" style={{ marginTop: 4 }}>
        <label className="form-label">Total Payable Amount</label>
        <div style={{
          padding: '12px 16px', background: '#FFFBEB', border: '2px solid var(--amber)',
          borderRadius: 6, fontSize: 22, fontWeight: 800,
          fontFamily: 'Space Grotesk, sans-serif', color: 'var(--amber-dark)', textAlign: 'right'
        }}>
          {inr(pricing.totalCost)}
        </div>
      </div>
    </div>
  )
}
