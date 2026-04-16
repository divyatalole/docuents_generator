import React, { useState } from 'react'
import { ArrowLeft, FileDown, Trash2, CheckCircle, Clock, AlertCircle, Edit3, Receipt, IndianRupee } from 'lucide-react'
import { useApp, calcPricing } from '../context/AppContext.jsx'
import { PAGES } from '../constants.js'
import { generateBillHTML } from '../components/BillTemplate.jsx'

function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

const STATUS_STYLE = {
  Paid:    { background: '#dcfce7', color: '#16a34a' },
  Partial: { background: '#fef9c3', color: '#ca8a04' },
  Unpaid:  { background: '#fee2e2', color: '#dc2626' }
}

function Field({ label, type = 'text', value, onChange, placeholder, readOnly, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type={type} className="form-input"
        style={{ fontSize: 13, padding: '6px 10px', width: '100%', background: readOnly ? '#f8fafc' : undefined }}
        value={value ?? ''} placeholder={placeholder} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)} />
    </div>
  )
}

export default function BillPreview({ navigate, billId }) {
  const { bills, settings, saveBill, deleteBill } = useApp()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [editing, setEditing]     = useState(false)
  const [toast, setToast]         = useState(null)

  const bill = (bills || []).find(b => b.id === billId)

  // Editable copy
  const [editForm, setEditForm] = useState(null)
  const form = editing ? editForm : bill

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function startEdit() {
    setEditForm({ ...bill })
    setEditing(true)
  }

  function setF(k, v) { setEditForm(f => ({ ...f, [k]: v })) }

  async function handleSaveEdit() {
    const p = calcPricing(editForm)
    const updated = { ...editForm, ...p, netPayable: p.totalCost }
    await saveBill(updated)
    setEditing(false)
    showToast('Invoice updated.')
  }

  async function handleExportPDF() {
    setExporting(true)
    try {
      const html     = generateBillHTML(bill, settings)
      const safeName = bill.customerName.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `Invoice_${bill.id.replace(/\//g, '-')}_${safeName}.pdf`
      const result   = await window.electronAPI.exportPDF({ html, filename })
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

  async function handleDelete() {
    setDeleting(false)
    await deleteBill(bill.id)
    navigate(PAGES.SALE_BILLS)
  }

  async function handleStatusChange(s) {
    await saveBill({ ...bill, status: s })
    showToast(`Status set to "${s}"`)
  }

  if (!bill) {
    return (
      <div className="empty-state">
        <h4>Invoice not found</h4>
        <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => navigate(PAGES.SALE_BILLS)}>
          <ArrowLeft size={14} /> Back to Bills
        </button>
      </div>
    )
  }

  const p         = calcPricing(bill)
  const received  = parseFloat(bill.received) || 0
  const balance   = p.totalCost - received
  const statusSt  = STATUS_STYLE[bill.status] || STATUS_STYLE.Unpaid
  const dateStr   = bill.date ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          color: 'white', padding: '10px 18px', borderRadius: 8,
          fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.2)'
        }}>{toast.msg}</div>
      )}

      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => navigate(PAGES.SALE_BILLS)}>
          <ArrowLeft size={14} /> Bills
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)' }}>{bill.id}</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600, ...statusSt }}>{bill.status}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{bill.customerName} &nbsp;·&nbsp; {dateStr}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Status quick-set */}
          {['Unpaid', 'Partial', 'Paid'].map(s => (
            <button key={s} className={`btn ${bill.status === s ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => handleStatusChange(s)}>
              {s === 'Paid' ? <CheckCircle size={13} /> : s === 'Partial' ? <Clock size={13} /> : <AlertCircle size={13} />} {s}
            </button>
          ))}
          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={startEdit} disabled={editing}>
            <Edit3 size={13} /> Edit
          </button>
          <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleExportPDF} disabled={exporting}>
            <FileDown size={13} /> {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
          <button className="btn" style={{ padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12 }} onClick={() => setDeleting(true)}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {editing && editForm && (
        <div style={{ background: 'white', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 14 }}>Edit Invoice</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            <Field label="Customer Name" value={editForm.customerName} onChange={v => setF('customerName', v)} />
            <Field label="Contact"       value={editForm.contactNumber} onChange={v => setF('contactNumber', v)} />
            <Field label="Date" type="date" value={editForm.date} onChange={v => setF('date', v)} />
            <Field label="Address" value={editForm.address} onChange={v => setF('address', v)} span={2} />
            <Field label="Time"          value={editForm.time} onChange={v => setF('time', v)} />
            <Field label="System Capacity (kW)" type="number" value={editForm.systemCapacity} onChange={v => setF('systemCapacity', v)} />
            <Field label="Rate per kW (₹)"     type="number" value={editForm.ratePerKw}       onChange={v => setF('ratePerKw', v)} />
            <Field label="Amount Received (₹)" type="number" value={editForm.received}         onChange={v => setF('received', v)} />
            <Field label="Panel"         value={editForm.panel}            onChange={v => setF('panel', v)} />
            <Field label="Panel Count"   type="number" value={editForm.panelCount}  onChange={v => setF('panelCount', v)} />
            <Field label="Inverter"      value={editForm.inverter}          onChange={v => setF('inverter', v)} />
            <Field label="Mounting Structure" value={editForm.mountingStructure} onChange={v => setF('mountingStructure', v)} />
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 3 }}>Status</label>
              <select className="form-input" style={{ fontSize: 13, padding: '6px 10px', width: '100%' }}
                value={editForm.status} onChange={e => setF('status', e.target.value)}>
                {['Unpaid', 'Partial', 'Paid'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 3 }}>Terms / Notes</label>
            <textarea className="form-input" style={{ width: '100%', height: 56, fontSize: 13, padding: '7px 10px', resize: 'vertical' }}
              value={editForm.terms || ''} onChange={e => setF('terms', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveEdit}><Receipt size={14} /> Save Changes</button>
          </div>
        </div>
      )}

      {/* Invoice Preview Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Left: Invoice detail */}
        <div style={{ background: 'white', border: '1px solid var(--gray-100)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Invoice header */}
          <div style={{ background: 'var(--navy)', color: 'white', padding: '14px 18px' }}>
            <div style={{ fontWeight: 800, fontSize: 15, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 10 }}>Tax Invoice</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{settings?.company?.name || 'PV-Enviro Energies'}</div>
                <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>GSTIN: {settings?.company?.gst || ''}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>No: {bill.id}</div>
                <div style={{ opacity: .8, marginTop: 2 }}>{dateStr}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Customer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ border: '1px solid var(--gray-100)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 5 }}>Bill To</div>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>{bill.customerName}</div>
                {bill.address       && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{bill.address}</div>}
                {bill.contactNumber && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>📞 {bill.contactNumber}</div>}
              </div>
              <div style={{ border: '1px solid var(--gray-100)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 5 }}>System Details</div>
                <div style={{ fontSize: 12.5, color: 'var(--gray-700)' }}>
                  <div>{parseFloat(bill.systemCapacity || 0).toFixed(2)} kW System</div>
                  {bill.panel    && <div style={{ marginTop: 2 }}>{bill.panel}</div>}
                  {bill.inverter && <div style={{ marginTop: 2 }}>{bill.inverter}</div>}
                  {bill.quotationId && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--gray-400)' }}>Quote: {bill.quotationId}</div>}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div style={{ border: '1px solid var(--gray-100)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: 'white' }}>
                    {['#', 'Description', 'HSN', 'Taxable Value', 'GST', 'Amount'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 10px', fontWeight: 600, fontSize: 11.5, textAlign: i > 2 ? 'right' : i === 2 ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', color: 'var(--gray-500)' }}>1</td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)' }}>
                      <div style={{ fontWeight: 600 }}>Solar Rooftop System</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                        {bill.panel} × {bill.panelCount} + {bill.inverter}
                      </div>
                    </td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', textAlign: 'center', color: 'var(--gray-400)', fontSize: 11 }}>—</td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', textAlign: 'right' }}>{inr(p.solarBase)}</td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', textAlign: 'right' }}>
                      {inr(p.solarGst)}<br/><span style={{ fontSize: 10.5, color: 'var(--gray-400)' }}>@5%</span>
                    </td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', textAlign: 'right', fontWeight: 600 }}>{inr(p.solarPortion)}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc' }}>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', color: 'var(--gray-500)' }}>2</td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)' }}>
                      <div style={{ fontWeight: 600 }}>System Commissioning</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                        {bill.mountingStructure} · Wiring · Labour · Transport
                      </div>
                    </td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', textAlign: 'center', fontSize: 11.5 }}>9954</td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', textAlign: 'right' }}>{inr(p.commBase)}</td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', textAlign: 'right' }}>
                      {inr(p.commGst)}<br/><span style={{ fontSize: 10.5, color: 'var(--gray-400)' }}>@18%</span>
                    </td>
                    <td style={{ padding: '9px 10px', border: '1px solid var(--gray-100)', textAlign: 'right', fontWeight: 600 }}>{inr(p.commPortion)}</td>
                  </tr>
                  <tr style={{ background: 'var(--navy)', color: 'white' }}>
                    <td colSpan={3} style={{ padding: '9px 10px', fontWeight: 700 }}>Total</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600 }}>{inr(p.solarBase + p.commBase)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600 }}>{inr(p.solarGst + p.commGst)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, fontSize: 14 }}>{inr(p.totalCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tax summary */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 8 }}>Tax Summary (CGST + SGST)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['HSN', 'Taxable', 'CGST Rate', 'CGST Amt', 'SGST Rate', 'SGST Amt', 'Total Tax'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', border: '1px solid var(--gray-100)', fontWeight: 600, fontSize: 11, textAlign: 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { hsn: '—',    base: p.solarBase, cr: '2.5%', ca: Math.round(p.solarGst/2), sr: '2.5%', sa: p.solarGst - Math.round(p.solarGst/2), total: p.solarGst },
                    { hsn: '9954', base: p.commBase,  cr: '9%',   ca: Math.round(p.commGst/2),  sr: '9%',   sa: p.commGst  - Math.round(p.commGst/2),  total: p.commGst  }
                  ].map((r, i) => (
                    <tr key={i}>
                      {[r.hsn, inr(r.base), r.cr, inr(r.ca), r.sr, inr(r.sa), inr(r.total)].map((v, j) => (
                        <td key={j} style={{ padding: '6px 8px', border: '1px solid var(--gray-100)', textAlign: 'right', fontSize: 12 }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Payment summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'white', border: '1px solid var(--gray-100)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: 'var(--navy)', color: 'white', padding: '10px 14px', fontWeight: 700, fontSize: 13 }}>Payment Summary</div>
            <div style={{ padding: '14px' }}>
              <SummaryRow label="Invoice Total"   value={inr(p.totalCost)}    bold />
              <SummaryRow label="Amount Received" value={inr(received)}       color="#16a34a" />
              <div style={{ height: 1, background: 'var(--gray-100)', margin: '10px 0' }} />
              <div style={{ background: balance > 0 ? '#fef3c7' : '#dcfce7', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: balance > 0 ? '#92400e' : '#16a34a' }}>Balance Due</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: balance > 0 ? '#92400e' : '#16a34a' }}>{inr(balance)}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 10 }}>GST Breakdown</div>
            <SummaryRow label="Solar System (70%)" value={inr(p.solarPortion)} />
            <SummaryRow label="  Taxable @5%"      value={inr(p.solarBase)}    small />
            <SummaryRow label="  GST (5%)"          value={inr(p.solarGst)}     small />
            <div style={{ height: 1, background: 'var(--gray-100)', margin: '8px 0' }} />
            <SummaryRow label="Commissions (30%)"   value={inr(p.commPortion)}  />
            <SummaryRow label="  Taxable @18%"      value={inr(p.commBase)}     small />
            <SummaryRow label="  GST (18%)"          value={inr(p.commGst)}      small />
            <div style={{ height: 1, background: 'var(--gray-100)', margin: '8px 0' }} />
            <SummaryRow label="Total GST"           value={inr(p.solarGst + p.commGst)} bold />
          </div>

          {settings?.bank?.account && (
            <div style={{ background: 'white', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 10 }}>Bank Details</div>
              <div style={{ fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.8 }}>
                <div>{settings.bank.name}</div>
                <div>A/C: {settings.bank.account}</div>
                <div>IFSC: {settings.bank.ifsc}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 360, boxShadow: '0 10px 40px rgba(0,0,0,.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Delete this invoice?</div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 18 }}>This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setDeleting(false)}>Cancel</button>
              <button className="btn" style={{ background: '#dc2626', color: 'white' }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value, bold, small, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--gray-50)' }}>
      <span style={{ fontSize: small ? 11.5 : 13, color: small ? 'var(--gray-400)' : 'var(--gray-600)' }}>{label}</span>
      <span style={{ fontSize: small ? 11.5 : 13, fontWeight: bold ? 700 : 500, color: color || (bold ? 'var(--navy)' : 'var(--gray-700)') }}>{value}</span>
    </div>
  )
}
