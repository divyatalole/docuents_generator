import React, { useState, useRef, useEffect } from 'react'
import { FileDown, Edit, Trash2, CheckCircle, Clock, Send, XCircle, ArrowLeft, FileText, ClipboardList, FileCheck, Zap, ChevronDown, Layers, Receipt } from 'lucide-react'
import { useApp, calcPricing } from '../context/AppContext.jsx'
import { PAGES } from '../constants.js'
import { generatePrintHTML } from '../components/PrintTemplate.jsx'
import { generateWCRHTML, generateAnnexureIHTML, generateDCRHTML, generateCFAHTML, generateNetMeteringHTML } from '../components/DocumentTemplates.jsx'

const STATUS_BADGE = {
  Pending: 'badge-pending',
  Sent: 'badge-sent',
  Approved: 'badge-approved',
  Rejected: 'badge-rejected'
}

function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

// ── Reusable modal field components ────────────────────────────────────────
function FormField({ label, type = 'text', placeholder, value, onChange }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type={type} className="form-input" style={{ fontSize: 13, padding: '6px 10px', width: '100%' }}
        value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}
function SelectField({ label, options, value, onChange }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 3 }}>{label}</label>
      <select className="form-input" style={{ fontSize: 13, padding: '6px 10px', width: '100%' }}
        value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

// Common fields shared across all documents (filled once, auto-populated into every doc)
function CommonInfoBlock({ common, setCommon, showSerial, showAppNo, showAgreementDate, panelCount }) {
  const set = (k, v) => setCommon(d => ({ ...d, [k]: v }))
  const serialCount = common.serialNumbers
    ? common.serialNumbers.split(/[\n,]/).map(s => s.trim()).filter(Boolean).length
    : 0
  const serialMismatch = showSerial && panelCount && serialCount !== panelCount
  return (
    <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
        Common Info — fills all documents
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormField label="Consumer Number" placeholder="e.g. 410016703897" value={common.consumerNumber} onChange={v => set('consumerNumber', v)} />
        <FormField label="Consumer Email" placeholder="e.g. abc@gmail.com" value={common.email} onChange={v => set('email', v)} />
        <FormField label="Installation Date" type="date" value={common.installationDate} onChange={v => set('installationDate', v)} />
        {showAppNo && <FormField label="Application Number" placeholder="e.g. 76321470" value={common.applicationNumber} onChange={v => set('applicationNumber', v)} />}
        {showAgreementDate && (
          <FormField label="Agreement Date (CFA + Net Metering)" type="date" value={common.agreementDate} onChange={v => set('agreementDate', v)} />
        )}
      </div>
      {showSerial && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)' }}>Module Serial Numbers (one per line or comma-separated)</label>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: serialMismatch ? '#fef2f2' : serialCount > 0 ? '#f0fdf4' : '#f3f4f6',
              color: serialMismatch ? '#dc2626' : serialCount > 0 ? '#16a34a' : '#6b7280'
            }}>
              {serialCount} / {panelCount || '?'} panels
              {serialMismatch ? ' ⚠ count mismatch' : serialCount > 0 && serialCount === panelCount ? ' ✓' : ''}
            </span>
          </div>
          <textarea className="form-input" style={{
            fontSize: 12.5, padding: '6px 10px', width: '100%', height: 80, resize: 'vertical',
            borderColor: serialMismatch ? '#fca5a5' : undefined
          }}
            value={common.serialNumbers} placeholder={'AS260220090502\nAS260220093948\nAS260220096941'}
            onChange={e => set('serialNumbers', e.target.value)} />
          {serialMismatch && (
            <div style={{ fontSize: 11.5, color: '#dc2626', marginTop: 3 }}>
              MNRE requires exactly {panelCount} serial numbers (one per module). You have entered {serialCount}.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, bold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--gray-100)', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: bold ? 700 : 500, color: color || 'var(--gray-800)', fontFamily: bold ? 'Space Grotesk, sans-serif' : 'inherit' }}>
        {value}
      </span>
    </div>
  )
}

export default function QuotationPreview({ navigate, quoteId }) {
  const { quotes, settings, updateQuote, deleteQuote } = useApp()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [docModal, setDocModal] = useState(null) // 'wcr'|'annex'|'dcr'|'cfa'|'netmeter'
  const [docExporting, setDocExporting] = useState(false)

  // ── Shared common data (fills once, used by all documents) ──────────────
  const [common, setCommon] = useState({
    consumerNumber: '', email: '', installationDate: '',
    serialNumbers: '', applicationNumber: '', agreementDate: ''
  })

  // ── Per-document extra fields ───────────────────────────────────────────
  const [wcrData, setWcrData] = useState({
    category: 'Private', sanctionNumber: '', sanctionDate: '',
    panelMake: '', almmModelNumber: '', productWarranty: '12', performanceWarranty: '25',
    inverterMake: '', inverterRating: '', mpptType: 'Single', inverterCapacity: '',
    hpd: 'No', yearOfManufacturing: String(new Date().getFullYear()),
    earthingCount: '3', earthResistance: '1.5', lightningArrester: 'Yes'
  })
  const [dcrData, setDcrData] = useState({
    applicationDate: '', discomName: 'MSEDCL', subdivision: '',
    panelMake: '', cellManufacturer: '', cellGSTInvoice: '', authorizedPerson: ''
  })
  const [cfaData, setCfaData] = useState({
    agreementDate: '', vendorAddress: '',
    paymentTerms: '25% at booking, 65% before dispatch of materials, 10% before meter fixing & system handover.'
  })
  const [netMeterData, setNetMeterData] = useState({ agreementDate: '', stampPaperMode: false })

  // ── Doc preview overlay ─────────────────────────────────────────────────
  const [preview, setPreview] = useState(null) // { html, type, title } | null

  function getDocHTML(type) {
    const map = {
      wcr:      () => generateWCRHTML(quote, settings, common, wcrData),
      annex:    () => generateAnnexureIHTML(quote, settings, common, {}),
      dcr:      () => generateDCRHTML(quote, settings, common, dcrData),
      cfa:      () => generateCFAHTML(quote, settings, common, cfaData),
      netmeter: () => generateNetMeteringHTML(quote, settings, common, netMeterData),
    }
    return map[type]?.() || ''
  }

  const DOC_TITLES = {
    wcr: 'Work Completion Report', annex: 'Annexure-I', dcr: 'DCR Declaration',
    cfa: 'CFA Agreement', netmeter: 'Net Metering Agreement'
  }

  function openPreview(type) {
    setPreview({ html: getDocHTML(type), type, title: DOC_TITLES[type] })
  }

  // ── Docs dropdown ───────────────────────────────────────────────────────
  const [docsOpen, setDocsOpen] = useState(false)
  const docsRef = useRef(null)
  useEffect(() => {
    function onClickOutside(e) {
      if (docsRef.current && !docsRef.current.contains(e.target)) setDocsOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const quote = quotes.find(q => q.id === quoteId)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (!quote) {
    return (
      <div className="empty-state">
        <h4>Quotation not found</h4>
        <p>The requested quotation could not be loaded.</p>
        <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => navigate(PAGES.ALL_QUOTATIONS)}>
          <ArrowLeft size={14} /> Back to All Quotes
        </button>
      </div>
    )
  }

  async function handleExportPDF() {
    setExporting(true)
    try {
      const html = generatePrintHTML(quote, settings)
      const filename = `${quote.id.replace(/\//g, '-')}_${quote.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      const result = await window.electronAPI.exportPDF({ html, filename })
      if (result?.success) {
        showToast('PDF exported successfully!')
      } else if (!result?.canceled) {
        showToast('PDF export failed. ' + (result?.error || ''), 'error')
      }
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleStatusChange(newStatus) {
    await updateQuote({ ...quote, status: newStatus })
    showToast(`Status updated to "${newStatus}"`)
  }

  async function handleDelete() {
    setDeleting(false)
    await deleteQuote(quote.id)
    navigate(PAGES.ALL_QUOTATIONS)
  }

  function openDocModal(type) {
    const pm = quote.panel ? quote.panel.split(' ')[0] : ''
    const im = quote.inverter ? quote.inverter.split(' ')[0] : ''
    const cap = parseFloat(quote.systemCapacity || 0).toFixed(2)
    if (type === 'wcr') {
      setWcrData(d => ({
        ...d,
        panelMake: d.panelMake || pm,
        inverterMake: d.inverterMake || im,
        inverterRating: d.inverterRating || (cap ? cap + ' Kw' : ''),
        inverterCapacity: d.inverterCapacity || (cap ? cap + ' Kw' : ''),
        // Auto-fill sanction number from application number if blank
        sanctionNumber: d.sanctionNumber || common.applicationNumber || ''
      }))
    }
    if (type === 'dcr') {
      // Auto-fill cell manufacturer for Adani panels
      const isAdani = (pm || '').toLowerCase().includes('adani')
      setDcrData(d => ({
        ...d,
        panelMake: d.panelMake || pm,
        cellManufacturer: d.cellManufacturer || (isAdani ? 'Mundra Solar PV Ltd' : ''),
        authorizedPerson: d.authorizedPerson || settings?.company?.authorizedSignatory || settings?.company?.contactPerson || ''
      }))
    }
    if (type === 'cfa') setCfaData(d => ({ ...d, vendorAddress: d.vendorAddress || settings?.company?.address || '' }))
    setDocModal(type)
  }

  async function handleDocExport(type) {
    setDocExporting(true)
    try {
      const safeName = quote.customerName.replace(/[^a-zA-Z0-9]/g, '_')
      const map = {
        wcr:      { fn: () => generateWCRHTML(quote, settings, common, wcrData),        file: `WCR_${safeName}.pdf` },
        annex:    { fn: () => generateAnnexureIHTML(quote, settings, common, {}),        file: `AnnexureI_${safeName}.pdf` },
        dcr:      { fn: () => generateDCRHTML(quote, settings, common, dcrData),         file: `DCR_${safeName}.pdf` },
        cfa:      { fn: () => generateCFAHTML(quote, settings, common, cfaData),         file: `CFA_${safeName}.pdf` },
        netmeter: { fn: () => generateNetMeteringHTML(quote, settings, common, netMeterData), file: `NetMetering_${safeName}.pdf` }
      }
      const { fn, file } = map[type]
      const result = await window.electronAPI.exportPDF({ html: fn(), filename: file })
      if (result?.success) { showToast('Document exported successfully!'); setDocModal(null) }
      else if (!result?.canceled) showToast('Export failed. ' + (result?.error || ''), 'error')
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error')
    } finally {
      setDocExporting(false)
    }
  }

  async function handleExportAll() {
    setDocsOpen(false)
    setDocModal('all')
  }

  async function handleExportAllDocs() {
    setDocExporting(true)
    const safeName = quote.customerName.replace(/[^a-zA-Z0-9]/g, '_')
    const docs = [
      { fn: () => generateWCRHTML(quote, settings, common, wcrData),            file: `WCR_${safeName}.pdf` },
      { fn: () => generateAnnexureIHTML(quote, settings, common, {}),            file: `AnnexureI_${safeName}.pdf` },
      { fn: () => generateDCRHTML(quote, settings, common, dcrData),             file: `DCR_${safeName}.pdf` },
      { fn: () => generateCFAHTML(quote, settings, common, cfaData),             file: `CFA_${safeName}.pdf` },
      { fn: () => generateNetMeteringHTML(quote, settings, common, netMeterData), file: `NetMetering_${safeName}.pdf` },
    ]
    try {
      let exported = 0
      for (const d of docs) {
        const result = await window.electronAPI.exportPDF({ html: d.fn(), filename: d.file })
        if (result?.success) exported++
        else if (!result?.canceled) { showToast(`Export failed for ${d.file}`, 'error'); break }
      }
      if (exported === docs.length) { showToast(`All ${docs.length} documents exported!`); setDocModal(null) }
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error')
    } finally {
      setDocExporting(false)
    }
  }

  const dateStr = quote.date
    ? new Date(quote.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div>
      {/* Action Bar */}
      <div className="preview-actions">
        <button className="btn btn-outline btn-sm" onClick={() => navigate(PAGES.ALL_QUOTATIONS)}>
          <ArrowLeft size={13} /> Back
        </button>
        <div style={{ flex: 1 }} />

        {/* Docs Dropdown */}
        <div ref={docsRef} style={{ position: 'relative', marginRight: 4 }}>
          <button
            className="btn btn-outline btn-sm"
            style={{ gap: 5 }}
            onClick={() => setDocsOpen(o => !o)}
          >
            <FileText size={13} /> Docs <ChevronDown size={12} style={{ marginLeft: 2 }} />
          </button>
          {docsOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
              background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 170, padding: '4px 0'
            }}>
              {[
                { type: 'wcr',      label: 'WCR',            icon: <ClipboardList size={13} />, color: '#0F2A4A' },
                { type: 'annex',    label: 'Annexure-I',     icon: <FileCheck size={13} />,     color: '#b45309' },
                { type: 'dcr',      label: 'DCR',            icon: <FileCheck size={13} />,     color: '#1a6b3c' },
                { type: 'cfa',      label: 'CFA',            icon: <FileText size={13} />,      color: '#7c3aed' },
                { type: 'netmeter', label: 'Net Meter Agmt', icon: <Zap size={13} />,           color: '#0369a1' },
              ].map(d => (
                <button key={d.type}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: d.color, fontWeight: 500, textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  onClick={() => { setDocsOpen(false); openDocModal(d.type) }}
                >
                  {d.icon} {d.label}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--gray-200)', margin: '4px 0' }} />
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#dc2626', fontWeight: 600, textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                onClick={handleExportAll}
              >
                <Layers size={13} /> Generate All 5
              </button>
            </div>
          )}
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleExportPDF}
          disabled={exporting}
        >
          <FileDown size={14} /> {exporting ? 'Generating PDF…' : 'Export PDF'}
        </button>
        <button
          className="btn btn-sm"
          style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 600 }}
          onClick={() => navigate(PAGES.SALE_BILLS, { fromQuote: quote })}
          title="Create a Tax Invoice from this quotation"
        >
          <Receipt size={13} /> Create Bill
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(PAGES.EDIT_QUOTATION, { quoteId: quote.id })}>
          <Edit size={13} /> Edit
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => setDeleting(true)}>
          <Trash2 size={13} /> Delete
        </button>
      </div>

      {/* Status Update Row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: 'var(--gray-500)', fontWeight: 600 }}>Update Status:</span>
        {['Pending', 'Sent', 'Approved', 'Rejected'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${quote.status === s ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleStatusChange(s)}
            style={{ fontSize: 12 }}
          >
            {s === 'Pending' && <Clock size={12} />}
            {s === 'Sent' && <Send size={12} />}
            {s === 'Approved' && <CheckCircle size={12} />}
            {s === 'Rejected' && <XCircle size={12} />}
            {s}
          </button>
        ))}
      </div>

      {/* Preview Card */}
      <div className="preview-wrapper">
        {/* Company Header */}
        <div style={{
          background: 'var(--navy)', color: 'white',
          padding: '24px 32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-.3px' }}>
              {settings?.company?.name || 'PV-Enviro Energies Pvt. Ltd.'}
            </div>
            <div style={{ fontSize: 11, opacity: .5, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 }}>
              Solar Energy Solutions
            </div>
            <span style={{
              display: 'inline-block', marginTop: 6,
              background: 'var(--amber)', color: 'var(--navy-dark)',
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20
            }}>
              GSTIN: {settings?.company?.gst}
            </span>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, opacity: .75, lineHeight: 1.8 }}>
            {settings?.company?.address}<br />
            📞 {settings?.company?.contact}<br />
            ✉ {settings?.company?.email}
          </div>
        </div>

        {/* Quote Meta Bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          background: 'var(--gray-800)', color: 'white',
          padding: '12px 0'
        }}>
          {[
            { label: 'Quote No.', value: quote.id },
            { label: 'Date', value: dateStr },
            { label: 'System Capacity', value: `${parseFloat(quote.systemCapacity || 0).toFixed(2)} kW` },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', padding: '0 10px' }}>
              <div style={{ fontSize: 9.5, opacity: .5, textTransform: 'uppercase', letterSpacing: '.5px' }}>{item.label}</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 13, marginTop: 3 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '24px 32px' }}>
          {/* Customer Block */}
          <div style={{
            border: '1px solid var(--gray-200)', borderRadius: 8, padding: '14px 16px',
            marginBottom: 20, background: 'var(--gray-50)'
          }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gray-400)', fontWeight: 600, marginBottom: 4 }}>
              Quotation For
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>{quote.customerName}</div>
            {quote.contactNumber && <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 3 }}>📞 {quote.contactNumber}</div>}
            {quote.address && <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 2 }}>📍 {quote.address}</div>}
          </div>

          {/* Subject Line */}
          <div style={{
            background: 'rgba(245,166,35,.08)', borderLeft: '4px solid var(--amber)',
            padding: '10px 14px', borderRadius: '0 6px 6px 0', marginBottom: 20, fontSize: 13
          }}>
            <strong>Subject:</strong> Quotation for Installation of {parseFloat(quote.systemCapacity || 0).toFixed(2)} kW On-Grid Solar Power System
            ({quote.installationType || 'Rooftop'})
          </div>

          {/* System Specs */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
              System Specifications
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--navy)', color: 'white' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11 }}>Component</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11 }}>Specification</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11 }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Solar Panel', quote.panel, `${quote.panelCount} Nos.`],
                  ['Inverter', quote.inverter, '1 No.'],
                  ['Installation Type', quote.installationType || 'Rooftop', 'Complete'],
                  ['System Capacity', `${parseFloat(quote.systemCapacity || 0).toFixed(3)} kW`, '—'],
                ].map(([comp, spec, qty], i) => (
                  <tr key={comp} style={{ background: i % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                    <td style={{ padding: '8px 12px', border: '1px solid var(--gray-200)', fontWeight: 600, color: 'var(--gray-700)' }}>{comp}</td>
                    <td style={{ padding: '8px 12px', border: '1px solid var(--gray-200)', color: 'var(--gray-600)' }}>{spec}</td>
                    <td style={{ padding: '8px 12px', border: '1px solid var(--gray-200)', textAlign: 'center', color: 'var(--gray-600)' }}>{qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Breakdown */}
          {(() => {
            const p = calcPricing(quote)
            const td = (content, opts = {}) => (
              <td style={{
                padding: '9px 10px', border: '1px solid var(--gray-200)',
                textAlign: opts.right ? 'right' : 'left',
                fontWeight: opts.bold ? 700 : 400,
                fontSize: opts.size || 13,
                background: opts.bg || 'transparent',
                color: opts.color || 'inherit',
                fontFamily: opts.mono ? 'Space Grotesk, sans-serif' : 'inherit'
              }}>{content}</td>
            )
            return (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                  Pricing Breakdown
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--navy)', color: 'white' }}>
                      {['Description', 'Taxable Value', 'GST', 'Total (incl. GST)'].map((h, i) => (
                        <th key={i} style={{ padding: '8px 10px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row A — Solar Rooftop System */}
                    <tr style={{ background: 'white' }}>
                      <td style={{ padding: '10px 10px', border: '1px solid var(--gray-200)' }}>
                        <div style={{ fontWeight: 600 }}>A. Solar Rooftop System</div>
                        <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 2 }}>
                          Solar Panels ({quote.panel}) × {quote.panelCount} + Solar Inverter ({quote.inverter})
                        </div>
                      </td>
                      {td(inr(p.solarBase), { right: true })}
                      {td(`5% = ${inr(p.solarGst)}`, { right: true, color: '#2563EB' })}
                      {td(inr(p.solarPortion), { right: true, bold: true, mono: true })}
                    </tr>

                    {/* Row B — Installation & Commissioning */}
                    <tr style={{ background: 'var(--gray-50)' }}>
                      <td style={{ padding: '10px 10px', border: '1px solid var(--gray-200)' }}>
                        <div style={{ fontWeight: 600 }}>B. Installation &amp; Commissioning</div>
                        <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 2 }}>
                          Civil work, mounting, wiring, testing &amp; grid connection
                        </div>
                      </td>
                      {td(inr(p.commBase), { right: true })}
                      {td(`18% = ${inr(p.commGst)}`, { right: true, color: '#D97706' })}
                      {td(inr(p.commPortion), { right: true, bold: true, mono: true })}
                    </tr>

                    {/* Total */}
                    <tr style={{ background: 'var(--navy)' }}>
                      <td colSpan={3} style={{ padding: '10px 10px', border: '1px solid var(--navy)', textAlign: 'right', fontWeight: 700, fontSize: 13, color: 'white' }}>
                        Total System Cost (A + B)
                      </td>
                      <td style={{ padding: '10px 10px', border: '1px solid var(--navy)', textAlign: 'right', fontWeight: 800, fontSize: 15, color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}>
                        {inr(p.totalCost)}
                      </td>
                    </tr>

                    {/* Net Payable */}
                    <tr style={{ background: '#FEF3C7' }}>
                      <td colSpan={3} style={{ padding: '11px 10px', border: '1px solid #FCD34D', textAlign: 'right', fontWeight: 800, color: '#92400E', fontSize: 14 }}>
                        NET PAYABLE AMOUNT
                      </td>
                      <td style={{ padding: '11px 10px', border: '1px solid #FCD34D', textAlign: 'right', fontWeight: 800, color: '#92400E', fontSize: 16, fontFamily: 'Space Grotesk, sans-serif' }}>
                        {inr(p.totalCost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* Warranty & Payment Terms */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <h5 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid var(--gray-200)' }}>
                Warranty Terms
              </h5>
              <ul style={{ listStyle: 'none', fontSize: 12.5 }}>
                {[
                  `Solar Panels: ${settings?.defaults?.panelWarranty || 25} Years Performance Warranty`,
                  `Inverter: ${settings?.defaults?.inverterWarranty || 10} Years Replacement Warranty`,
                  'Mounting Structure: 10 Years Structural Warranty',
                  'Wiring & Cabling: 1 Year Workmanship Warranty',
                  'AMC Support Available (Optional)'
                ].map(t => (
                  <li key={t} style={{ padding: '3px 0 3px 14px', position: 'relative', color: 'var(--gray-600)' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--amber-dark)', fontWeight: 700 }}>•</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid var(--gray-200)' }}>
                Payment Terms
              </h5>
              <ul style={{ listStyle: 'none', fontSize: 12.5 }}>
                {[
                  '25% at booking (fabrication advance)',
                  '65% before dispatch of panels / inverter / materials',
                  '10% before meter fixing & system handover',
                  'Cheque / NEFT / UPI accepted'
                ].map(t => (
                  <li key={t} style={{ padding: '3px 0 3px 14px', position: 'relative', color: 'var(--gray-600)' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--amber-dark)', fontWeight: 700 }}>•</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 12.5, color: 'var(--gray-600)' }}>
              <strong>Notes:</strong> {quote.notes}
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '2px solid var(--navy)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.8 }}>
              <strong style={{ color: 'var(--navy)', display: 'block', marginBottom: 2 }}>Bank Details</strong>
              {settings?.bank?.name}<br />
              A/C: {settings?.bank?.account} | IFSC: {settings?.bank?.ifsc}
              <div style={{ marginTop: 8, fontSize: 11 }}>
                For: <strong>{settings?.company?.name}</strong> | {settings?.company?.contactPerson} | {settings?.company?.contact}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ border: '2px dashed var(--gray-300)', width: 90, height: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--gray-300)', borderRadius: 4, marginBottom: 8, marginLeft: 'auto' }}>
                Stamp &<br />Signature
              </div>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13 }}>{settings?.company?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Authorised Signatory</div>
            </div>
          </div>

        </div>
      </div>

      {/* Generate Documents Section */}
      <div style={{ marginTop: 24, border: '1px solid var(--gray-200)', borderRadius: 10, padding: '20px 24px', background: 'var(--gray-50)' }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>
          Generate Official Documents
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { type: 'wcr',      icon: <ClipboardList size={20} />, title: 'Work Completion Report', desc: 'WCR — MSEDCL post-installation', color: '#0F2A4A' },
            { type: 'annex',    icon: <FileCheck size={20} />,     title: 'Annexure-I',             desc: 'Commissioning Report for RE System', color: '#b45309' },
            { type: 'dcr',      icon: <FileCheck size={20} />,     title: 'DCR Declaration',        desc: 'Annexure-A: Domestic Content Requirement', color: '#1a6b3c' },
            { type: 'cfa',      icon: <FileText size={20} />,      title: 'CFA Agreement',          desc: 'Annexure 2: Consumer–Vendor Agreement', color: '#7c3aed' },
            { type: 'netmeter', icon: <Zap size={20} />,           title: 'Net Metering Agreement', desc: 'MSEDCL Net Metering legal agreement', color: '#0369a1' },
          ].map(doc => (
            <div key={doc.type} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, padding: '16px', background: 'white', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ color: doc.color }}>{doc.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-800)' }}>{doc.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 2 }}>{doc.desc}</div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: 'auto', fontSize: 12 }}
                onClick={() => openDocModal(doc.type)}
              >
                <FileDown size={13} /> Generate PDF
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Shared helper: Common Info block shown in every modal ── */}
      {/* ── Document Modals ── */}

      {/* WCR Modal */}
      {docModal === 'wcr' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: 4 }}>Work Completion Report</h3>
            <CommonInfoBlock common={common} setCommon={setCommon} showSerial showAppNo panelCount={quote.panelCount} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              {[
                { label: 'Panel Make', key: 'panelMake', placeholder: 'e.g. Adani' },
                { label: 'ALMM Model Number', key: 'almmModelNumber', placeholder: 'e.g. Topcon Bifacial' },
                { label: 'Product Warranty (yrs)', key: 'productWarranty', placeholder: '12' },
                { label: 'Performance Warranty (yrs)', key: 'performanceWarranty', placeholder: '25' },
                { label: 'Inverter Make', key: 'inverterMake', placeholder: 'e.g. Polycab' },
                { label: 'Inverter Rating', key: 'inverterRating', placeholder: 'e.g. 3 Kw' },
                { label: 'Inverter Capacity', key: 'inverterCapacity', placeholder: 'e.g. 3 Kw' },
                { label: 'Year of Manufacturing', key: 'yearOfManufacturing', placeholder: '2025' },
                { label: 'No. of Earthings', key: 'earthingCount', placeholder: '3' },
                { label: 'Earth Resistance (ohm)', key: 'earthResistance', placeholder: '1.5' },
                { label: 'Sanction Number', key: 'sanctionNumber', placeholder: 'Optional' },
                { label: 'Sanction Date', key: 'sanctionDate', type: 'date' },
              ].map(f => (
                <FormField key={f.key} label={f.label} type={f.type || 'text'} placeholder={f.placeholder}
                  value={wcrData[f.key]} onChange={v => setWcrData(d => ({ ...d, [f.key]: v }))} />
              ))}
              {[
                { label: 'Category', key: 'category', options: ['Private', 'Govt'] },
                { label: 'MPPT Type', key: 'mpptType', options: ['Single', 'Dual', 'Triple'] },
                { label: 'HPD', key: 'hpd', options: ['No', 'Yes'] },
                { label: 'Lightning Arrester', key: 'lightningArrester', options: ['Yes', 'No'] },
              ].map(f => (
                <SelectField key={f.key} label={f.label} options={f.options}
                  value={wcrData[f.key]} onChange={v => setWcrData(d => ({ ...d, [f.key]: v }))} />
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setDocModal(null)}>Cancel</button>
              <button className="btn btn-outline" onClick={() => openPreview('wcr')}>Preview</button>
              <button className="btn btn-primary" onClick={() => handleDocExport('wcr')} disabled={docExporting}>
                <FileDown size={13} /> {docExporting ? 'Generating…' : 'Export WCR PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annexure-I Modal */}
      {docModal === 'annex' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <h3 style={{ marginBottom: 4 }}>Annexure-I — Commissioning Report</h3>
            <CommonInfoBlock common={common} setCommon={setCommon} showSerial={false} showAppNo={false} />
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setDocModal(null)}>Cancel</button>
              <button className="btn btn-outline" onClick={() => openPreview('annex')}>Preview</button>
              <button className="btn btn-primary" onClick={() => handleDocExport('annex')} disabled={docExporting}>
                <FileDown size={13} /> {docExporting ? 'Generating…' : 'Export Annexure-I PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DCR Modal */}
      {docModal === 'dcr' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: 4 }}>DCR Declaration — Annexure A</h3>
            <CommonInfoBlock common={common} setCommon={setCommon} showSerial showAppNo panelCount={quote.panelCount} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              {[
                { label: 'Panel Make', key: 'panelMake', placeholder: 'e.g. Adani' },
                { label: 'Cell Manufacturer', key: 'cellManufacturer', placeholder: 'e.g. Mundra Solar PV Ltd' },
                { label: 'Cell GST Invoice No', key: 'cellGSTInvoice', placeholder: 'Optional' },
                { label: 'Authorized Person', key: 'authorizedPerson', placeholder: 'e.g. Subhash Talole' },
                { label: 'DISCOM Name', key: 'discomName', placeholder: 'MSEDCL' },
                { label: 'Subdivision', key: 'subdivision', placeholder: 'e.g. Civil Line Subdivision' },
                { label: 'Application Date', key: 'applicationDate', type: 'date' },
              ].map(f => (
                <FormField key={f.key} label={f.label} type={f.type || 'text'} placeholder={f.placeholder}
                  value={dcrData[f.key]} onChange={v => setDcrData(d => ({ ...d, [f.key]: v }))} />
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setDocModal(null)}>Cancel</button>
              <button className="btn btn-outline" onClick={() => openPreview('dcr')}>Preview</button>
              <button className="btn btn-primary" onClick={() => handleDocExport('dcr')} disabled={docExporting}>
                <FileDown size={13} /> {docExporting ? 'Generating…' : 'Export DCR PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CFA Modal */}
      {docModal === 'cfa' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <h3 style={{ marginBottom: 4 }}>CFA Agreement — Annexure 2</h3>
            <CommonInfoBlock common={common} setCommon={setCommon} showSerial={false} showAppNo={false} showAgreementDate />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 4 }}>Vendor Registered Office Address</label>
                <textarea className="form-input" style={{ fontSize: 12.5, padding: '6px 10px', width: '100%', height: 68, resize: 'vertical' }}
                  value={cfaData.vendorAddress} placeholder="Full registered address"
                  onChange={e => setCfaData(d => ({ ...d, vendorAddress: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 4 }}>Payment Terms</label>
                <textarea className="form-input" style={{ fontSize: 12.5, padding: '6px 10px', width: '100%', height: 68, resize: 'vertical' }}
                  value={cfaData.paymentTerms}
                  onChange={e => setCfaData(d => ({ ...d, paymentTerms: e.target.value }))} />
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setDocModal(null)}>Cancel</button>
              <button className="btn btn-outline" onClick={() => openPreview('cfa')}>Preview</button>
              <button className="btn btn-primary" onClick={() => handleDocExport('cfa')} disabled={docExporting}>
                <FileDown size={13} /> {docExporting ? 'Generating…' : 'Export CFA PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Net Metering Modal */}
      {docModal === 'netmeter' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <h3 style={{ marginBottom: 4 }}>Net Metering Agreement</h3>
            <CommonInfoBlock common={common} setCommon={setCommon} showSerial={false} showAppNo={false} showAgreementDate />
            <div style={{ marginTop: 4, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input type="checkbox" id="stampPaperMode" style={{ marginTop: 2, cursor: 'pointer' }}
                checked={netMeterData.stampPaperMode}
                onChange={e => setNetMeterData(d => ({ ...d, stampPaperMode: e.target.checked }))} />
              <label htmlFor="stampPaperMode" style={{ fontSize: 12.5, cursor: 'pointer', lineHeight: 1.5 }}>
                <strong>Stamp Paper Mode</strong> — Adds ~110px top margin so text clears the ₹100 stamp paper header when printing on pre-printed stamp paper.
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setDocModal(null)}>Cancel</button>
              <button className="btn btn-outline" onClick={() => openPreview('netmeter')}>Preview</button>
              <button className="btn btn-primary" onClick={() => handleDocExport('netmeter')} disabled={docExporting}>
                <FileDown size={13} /> {docExporting ? 'Generating…' : 'Export Net Metering PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate All 5 Modal */}
      {docModal === 'all' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 540 }}>
            <h3 style={{ marginBottom: 4 }}>Generate All 5 Documents</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
              Fill in the shared info below — it will be used across all 5 documents.
            </p>
            <CommonInfoBlock common={common} setCommon={setCommon} showSerial showAppNo showAgreementDate panelCount={quote.panelCount} />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 8 }}>
              Preview individual documents before export:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {[
                { type: 'wcr', label: 'WCR', icon: <ClipboardList size={12} />, color: '#0F2A4A' },
                { type: 'annex', label: 'Annexure-I', icon: <FileCheck size={12} />, color: '#b45309' },
                { type: 'dcr', label: 'DCR', icon: <FileCheck size={12} />, color: '#1a6b3c' },
                { type: 'cfa', label: 'CFA', icon: <FileText size={12} />, color: '#7c3aed' },
                { type: 'netmeter', label: 'Net Meter', icon: <Zap size={12} />, color: '#0369a1' },
              ].map(d => (
                <button key={d.type} className="btn btn-outline btn-sm"
                  style={{ fontSize: 11.5, color: d.color, padding: '4px 10px' }}
                  onClick={() => openPreview(d.type)}>
                  {d.icon} Preview {d.label}
                </button>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: 4 }}>
              <button className="btn btn-outline" onClick={() => setDocModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleExportAllDocs} disabled={docExporting}>
                <Layers size={13} /> {docExporting ? 'Generating…' : 'Export All 5 PDFs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleting && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Delete Quotation?</h3>
            <p>
              Are you sure you want to delete quotation <strong>{quote.id}</strong> for{' '}
              <strong>{quote.customerName}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleting(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={13} /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {/* ── Full-screen document preview overlay ── */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'white', display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderBottom: '1px solid var(--gray-200)',
            background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.06)'
          }}>
            <button className="btn btn-outline btn-sm" onClick={() => setPreview(null)}>
              <ArrowLeft size={13} /> Back to Form
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginLeft: 4 }}>
              Preview — {preview.title}
            </span>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-primary btn-sm"
              disabled={docExporting}
              onClick={async () => { setPreview(null); await handleDocExport(preview.type) }}
            >
              <FileDown size={13} /> {docExporting ? 'Generating…' : 'Export PDF'}
            </button>
          </div>
          {/* Document iframe */}
          <iframe
            srcDoc={preview.html}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title={`Preview — ${preview.title}`}
          />
        </div>
      )}
    </div>
  )
}
