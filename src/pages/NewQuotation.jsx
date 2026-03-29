import React, { useState, useEffect, useCallback } from 'react'
import { Check, ChevronRight, ChevronLeft, User, Zap, IndianRupee, Save, X } from 'lucide-react'
import { useApp, generateQuoteId, calcPricing } from '../context/AppContext.jsx'
import { PAGES } from '../constants.js'

const STEPS = ['Customer Details', 'System Configuration', 'Pricing & Summary']

const INSTALL_TYPES = ['Rooftop (RCC)', 'Rooftop (Sheet)', 'Ground Mount', 'Elevated Structure']

function fmt(n) {
  if (!n && n !== 0) return '—'
  return '₹' + Number(n).toLocaleString('en-IN')
}

function emptyForm(settings) {
  const panelKeys = settings?.prices?.panels ? Object.keys(settings.prices.panels) : []
  const inverterKeys = settings?.prices?.inverters ? Object.keys(settings.prices.inverters) : []
  const structureKeys = settings?.prices?.structures ? Object.keys(settings.prices.structures) : []
  const wiringKeys = settings?.prices?.wiringKits ? Object.keys(settings.prices.wiringKits) : []

  const defaultPanel = panelKeys[0] || ''
  const defaultInverter = inverterKeys[0] || ''
  const defaultStructure = structureKeys[0] || ''
  const defaultWiring = wiringKeys[0] || ''

  const panelData = settings?.prices?.panels?.[defaultPanel] || {}
  const inverterData = settings?.prices?.inverters?.[defaultInverter] || {}
  const structurePrice = settings?.prices?.structures?.[defaultStructure] || 0
  const wiringPrice = settings?.prices?.wiringKits?.[defaultWiring] || 0

  return {
    customerName: '',
    contactNumber: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    notes: '',
    phase: '1-Phase',
    panel: defaultPanel,
    panelCount: 7,
    panelWattage: panelData.wattage || 615,
    systemCapacity: (7 * (panelData.wattage || 615)) / 1000,
    inverter: defaultInverter,
    mountingStructure: defaultStructure,
    wiringKit: defaultWiring,
    installationType: 'Rooftop (RCC)',
    panelCostPerUnit: panelData.pricePerUnit || 0,
    inverterCost: inverterData.price || 0,
    structureCost: structurePrice,
    wiringCost: wiringPrice,
    installationCharges: 15000,
    otherCharges: 0,
    gstPercent: settings?.defaults?.gstPercent || 0,
    subsidy: settings?.defaults?.subsidy || 78000
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

  const panelOptions = settings?.prices?.panels ? Object.keys(settings.prices.panels) : []
  const inverterOptions = settings?.prices?.inverters ? Object.keys(settings.prices.inverters) : []
  const structureOptions = settings?.prices?.structures ? Object.keys(settings.prices.structures) : []
  const wiringOptions = settings?.prices?.wiringKits ? Object.keys(settings.prices.wiringKits) : []

  function set(key, value) {
    setForm(prev => {
      const next = { ...prev, [key]: value }

      // Auto-update wattage and price when panel changes
      if (key === 'panel') {
        const pd = settings?.prices?.panels?.[value] || {}
        next.panelWattage = pd.wattage || prev.panelWattage
        next.panelCostPerUnit = pd.pricePerUnit || prev.panelCostPerUnit
      }

      // Auto-update inverter price
      if (key === 'inverter') {
        const inv = settings?.prices?.inverters?.[value] || {}
        next.inverterCost = inv.price || prev.inverterCost
        if (inv.phase) next.phase = inv.phase
      }

      // Auto-update structure cost
      if (key === 'mountingStructure') {
        next.structureCost = settings?.prices?.structures?.[value] || prev.structureCost
      }

      // Auto-update wiring cost
      if (key === 'wiringKit') {
        next.wiringCost = settings?.prices?.wiringKits?.[value] || prev.wiringCost
      }

      // Recalculate capacity when panel count or wattage changes
      if (key === 'panelCount' || key === 'panelWattage' || key === 'panel') {
        const count = parseInt(key === 'panelCount' ? value : next.panelCount) || 0
        const watt = parseFloat(key === 'panelWattage' ? value : next.panelWattage) || 0
        next.systemCapacity = parseFloat(((count * watt) / 1000).toFixed(3))
      }

      return next
    })
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }))
  }

  function validateStep(s) {
    const errs = {}
    if (s === 0) {
      if (!form.customerName?.trim()) errs.customerName = 'Customer name is required'
    }
    if (s === 1) {
      if (!form.panel) errs.panel = 'Select a solar panel'
      if (!form.inverter) errs.inverter = 'Select an inverter'
      if (!(parseInt(form.panelCount) > 0)) errs.panelCount = 'Enter valid panel count'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function nextStep() {
    if (!validateStep(step)) return
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function prevStep() { setStep(s => Math.max(s - 1, 0)) }

  async function handleSave() {
    if (!validateStep(step)) return
    setSaving(true)
    try {
      const pricing = calcPricing(form)
      const now = new Date().toISOString()
      const quote = {
        ...form,
        panelCount: parseInt(form.panelCount) || 0,
        gstPercent: parseFloat(form.gstPercent) || 0,
        subsidy: parseFloat(form.subsidy) || 0,
        panelCostPerUnit: parseFloat(form.panelCostPerUnit) || 0,
        inverterCost: parseFloat(form.inverterCost) || 0,
        structureCost: parseFloat(form.structureCost) || 0,
        wiringCost: parseFloat(form.wiringCost) || 0,
        installationCharges: parseFloat(form.installationCharges) || 0,
        otherCharges: parseFloat(form.otherCharges) || 0,
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Form Panel */}
        <div className="card">
          <div className="card-header">
            <h3>{STEPS[step]}</h3>
          </div>
          <div className="card-body">
            {step === 0 && <StepCustomer form={form} set={set} errors={errors} />}
            {step === 1 && (
              <StepSystem
                form={form} set={set} errors={errors}
                panelOptions={panelOptions}
                inverterOptions={inverterOptions}
                structureOptions={structureOptions}
                wiringOptions={wiringOptions}
              />
            )}
            {step === 2 && <StepPricing form={form} set={set} errors={errors} pricing={pricing} />}
          </div>

          {/* Navigation */}
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

        {/* Live Price Preview */}
        <div className="price-preview">
          <h4>Live Cost Preview</h4>

          <div className="price-row subtle">
            <span>System</span>
            <span>{form.systemCapacity?.toFixed(3)} kW</span>
          </div>
          <div className="price-row subtle">
            <span>Panels</span>
            <span>{form.panelCount} × ₹{Number(form.panelCostPerUnit || 0).toLocaleString('en-IN')}</span>
          </div>
          <hr className="price-divider" />
          <div className="price-row">
            <span>Panel Cost</span>
            <span>₹{Number(pricing.panelTotal || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="price-row subtle">
            <span>Inverter</span>
            <span>₹{Number(form.inverterCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="price-row subtle">
            <span>Structure</span>
            <span>₹{Number(form.structureCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="price-row subtle">
            <span>Wiring & LA</span>
            <span>₹{Number(form.wiringCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="price-row subtle">
            <span>Installation</span>
            <span>₹{Number(form.installationCharges || 0).toLocaleString('en-IN')}</span>
          </div>
          {parseFloat(form.otherCharges) > 0 && (
            <div className="price-row subtle">
              <span>Other</span>
              <span>₹{Number(form.otherCharges || 0).toLocaleString('en-IN')}</span>
            </div>
          )}
          <hr className="price-divider" />
          <div className="price-row">
            <span>Subtotal</span>
            <span className="price-total">₹{Number(pricing.subtotal || 0).toLocaleString('en-IN')}</span>
          </div>
          {pricing.gstAmount > 0 && (
            <div className="price-row subtle">
              <span>GST ({form.gstPercent}%)</span>
              <span>₹{Number(pricing.gstAmount).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="price-row">
            <span>Total Cost</span>
            <span className="price-total">₹{Number(pricing.totalCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <hr className="price-divider" />
          <div className="price-row price-subsidy">
            <span>Govt. Subsidy</span>
            <span>− ₹{Number(form.subsidy || 0).toLocaleString('en-IN')}</span>
          </div>
          <hr className="price-divider" />
          <div className="price-row">
            <span style={{ fontWeight: 600 }}>Net Payable</span>
            <span className="price-net">₹{Number(pricing.netPayable || 0).toLocaleString('en-IN')}</span>
          </div>

          <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(255,255,255,.06)', borderRadius: 6, fontSize: 11.5, opacity: .7, lineHeight: 1.6 }}>
            PM Surya Ghar Muft Bijli Yojana subsidy applied. Subject to eligibility.
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
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
        <label className="form-label">Address</label>
        <textarea className="form-control" rows={2} placeholder="Customer site address"
          value={form.address} onChange={e => set('address', e.target.value)} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            <option>Pending</option>
            <option>Sent</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
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
function StepSystem({ form, set, errors, panelOptions, inverterOptions, structureOptions, wiringOptions }) {
  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Phase</label>
          <select className="form-control" value={form.phase} onChange={e => set('phase', e.target.value)}>
            <option>1-Phase</option>
            <option>3-Phase</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Installation Type</label>
          <select className="form-control" value={form.installationType}
            onChange={e => set('installationType', e.target.value)}>
            {INSTALL_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
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

      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Number of Panels</label>
          <input className={`form-control ${errors.panelCount ? 'error' : ''}`}
            type="number" min="1" value={form.panelCount}
            onChange={e => set('panelCount', e.target.value)} />
          {errors.panelCount && <div className="form-error">{errors.panelCount}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Panel Wattage (Wp)</label>
          <input className="form-control" type="number" value={form.panelWattage}
            onChange={e => set('panelWattage', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">System Capacity (kW)</label>
          <input className="form-control" readOnly value={form.systemCapacity?.toFixed(3) || '0.000'}
            style={{ background: 'var(--gray-50)', cursor: 'not-allowed' }} />
          <div className="form-hint">Auto-calculated</div>
        </div>
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

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Mounting Structure</label>
          <select className="form-control" value={form.mountingStructure}
            onChange={e => set('mountingStructure', e.target.value)}>
            {structureOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Wiring & LA Kit</label>
          <select className="form-control" value={form.wiringKit}
            onChange={e => set('wiringKit', e.target.value)}>
            {wiringOptions.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Pricing ──────────────────────────────────────────────────────────
function StepPricing({ form, set, errors, pricing }) {
  return (
    <div>
      <div style={{ marginBottom: 18, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 6, fontSize: 12.5, color: 'var(--gray-500)' }}>
        Prices are auto-filled from selected components. You can override any field.
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Panel Cost per Unit (₹)</label>
          <input className="form-control" type="number" value={form.panelCostPerUnit}
            onChange={e => set('panelCostPerUnit', e.target.value)} />
          <div className="form-hint">
            × {form.panelCount} panels = ₹{Number((form.panelCostPerUnit || 0) * (form.panelCount || 0)).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Inverter Cost (₹)</label>
          <input className="form-control" type="number" value={form.inverterCost}
            onChange={e => set('inverterCost', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Structure Cost (₹)</label>
          <input className="form-control" type="number" value={form.structureCost}
            onChange={e => set('structureCost', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Wiring & LA Kit Cost (₹)</label>
          <input className="form-control" type="number" value={form.wiringCost}
            onChange={e => set('wiringCost', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Installation Charges (₹)</label>
          <input className="form-control" type="number" value={form.installationCharges}
            onChange={e => set('installationCharges', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Other Charges (₹)</label>
          <input className="form-control" type="number" value={form.otherCharges}
            onChange={e => set('otherCharges', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">GST %</label>
          <input className="form-control" type="number" step="0.5" value={form.gstPercent}
            onChange={e => set('gstPercent', e.target.value)} />
          <div className="form-hint">Set 0 for GST-inclusive pricing</div>
        </div>
        <div className="form-group">
          <label className="form-label">Govt. Subsidy (₹)</label>
          <input className="form-control" type="number" value={form.subsidy}
            onChange={e => set('subsidy', e.target.value)} />
          <div className="form-hint">PM Surya Ghar Muft Bijli Yojana</div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginTop: 10, background: 'var(--gray-50)', borderRadius: 8, padding: '14px 16px', border: '1px solid var(--gray-200)' }}>
        {[
          { label: 'Subtotal (before GST)', value: pricing.subtotal },
          { label: `GST (${form.gstPercent}%)`, value: pricing.gstAmount },
          { label: 'Total System Cost', value: pricing.totalCost, bold: true },
          { label: 'PM Surya Ghar Subsidy', value: -parseFloat(form.subsidy || 0), green: true },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--gray-200)', fontSize: 13 }}>
            <span style={{ color: 'var(--gray-600)' }}>{row.label}</span>
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: row.bold ? 700 : 500,
              color: row.green ? 'var(--green)' : 'var(--gray-800)'
            }}>
              {row.green ? '−' : ''}₹{Math.abs(row.value || 0).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontSize: 15 }}>
          <span style={{ fontWeight: 700, color: 'var(--navy)' }}>Net Payable Amount</span>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--amber-dark)' }}>
            ₹{Number(pricing.netPayable || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  )
}
