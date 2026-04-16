import React, { useState } from 'react'
import { ArrowLeft, FileDown, Trash2, Edit3, ShoppingCart, Paperclip, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PAGES } from '../constants.js'
import { generatePurchaseBillHTML } from '../components/PurchaseBillTemplate.jsx'

function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }
function inr2(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const STATUS_STYLE = {
  Paid:    { background: '#dcfce7', color: '#16a34a' },
  Partial: { background: '#fef9c3', color: '#ca8a04' },
  Unpaid:  { background: '#fee2e2', color: '#dc2626' }
}

function SRow({ label, value, bold, color, small }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--gray-50)' }}>
      <span style={{ fontSize: small ? 11.5 : 13, color: small ? 'var(--gray-400)' : 'var(--gray-600)' }}>{label}</span>
      <span style={{ fontSize: small ? 11.5 : 13, fontWeight: bold ? 700 : 500, color: color || (bold ? 'var(--navy)' : 'var(--gray-700)') }}>{value}</span>
    </div>
  )
}

export default function PurchaseBillPreview({ navigate, billId }) {
  const { purchaseBills, settings, savePurchaseBill, deletePurchaseBill } = useApp()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [toast, setToast]         = useState(null)

  const bill = (purchaseBills || []).find(b => b.id === billId)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleExportPDF() {
    setExporting(true)
    try {
      const html     = generatePurchaseBillHTML(bill, settings)
      const safeName = (bill.supplierName || 'Supplier').replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `PurchaseBill_${bill.id.replace(/\//g, '-')}_${safeName}.pdf`
      const result   = await window.electronAPI.exportPDF({ html, filename })
      if (result?.success) showToast('PDF exported!')
      else if (!result?.canceled) showToast('Export failed. ' + (result?.error || ''), 'error')
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleStatusChange(s) {
    await savePurchaseBill({ ...bill, status: s })
    showToast(`Status set to "${s}"`)
  }

  async function handleDelete() {
    setDeleting(false)
    await deletePurchaseBill(bill.id)
    navigate(PAGES.PURCHASE_BILLS)
  }

  async function openAttachment() {
    if (!bill.attachmentPath) return
    const result = await window.electronAPI.openPurchaseAttachment(bill.attachmentPath)
    if (!result?.success) showToast('Could not open file — it may have been moved.', 'error')
  }

  async function handleAddAttachment() {
    const result = await window.electronAPI.addPurchaseAttachment(bill.id)
    if (result?.success) {
      await savePurchaseBill({ ...bill, attachmentPath: result.path, attachmentName: result.name })
      showToast('Attachment saved.')
    }
  }

  if (!bill) {
    return (
      <div className="empty-state">
        <h4>Bill not found</h4>
        <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => navigate(PAGES.PURCHASE_BILLS)}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    )
  }

  const items    = bill.items || []
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const totalGst = items.reduce((s, i) => s + (parseFloat(i.gstAmt) || 0), 0)
  const roundOff = parseFloat(bill.roundOff) || 0
  const total    = bill.total || Math.round(subtotal + roundOff)
  const paid     = parseFloat(bill.paid) || 0
  const balance  = total - paid
  const statusSt = STATUS_STYLE[bill.status] || STATUS_STYLE.Unpaid
  const dateStr  = bill.date ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => navigate(PAGES.PURCHASE_BILLS)}>
          <ArrowLeft size={14} /> Bills
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)' }}>{bill.id}</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600, ...statusSt }}>{bill.status}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{bill.supplierName} &nbsp;·&nbsp; {dateStr}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Unpaid', 'Partial', 'Paid'].map(s => (
            <button key={s} className={`btn btn-sm ${bill.status === s ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleStatusChange(s)}>
              {s === 'Paid' ? <CheckCircle size={13} /> : s === 'Partial' ? <Clock size={13} /> : <AlertCircle size={13} />} {s}
            </button>
          ))}
          <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleExportPDF} disabled={exporting}>
            <FileDown size={13} /> {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
          <button className="btn" style={{ padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12 }} onClick={() => setDeleting(true)}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

        {/* Left: Bill detail */}
        <div style={{ background: 'white', border: '1px solid var(--gray-100)', borderRadius: 12, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ background: 'var(--navy)', color: 'white', padding: '14px 18px' }}>
            <div style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', textAlign: 'center', marginBottom: 10 }}>Purchase Bill</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{settings?.company?.name}</div>
                <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>GSTIN: {settings?.company?.gst}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>No: {bill.id}</div>
                <div style={{ opacity: .8, marginTop: 2 }}>{dateStr}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Supplier / Bill Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ border: '1px solid var(--gray-100)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 5 }}>Bill From</div>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>{bill.supplierName}</div>
                {bill.supplierContact && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>📞 {bill.supplierContact}</div>}
                {bill.supplierGst     && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>GSTIN: {bill.supplierGst}</div>}
                {bill.supplierAddress && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{bill.supplierAddress}</div>}
              </div>
              <div style={{ border: '1px solid var(--gray-100)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 5 }}>Bill Details</div>
                <div style={{ fontSize: 12.5, color: 'var(--gray-700)', lineHeight: 1.8 }}>
                  {bill.supplierBillNo && <div>Supplier Bill No: <b>{bill.supplierBillNo}</b></div>}
                  <div>Our Bill No: <b>{bill.id}</b></div>
                  {bill.placeOfSupply  && <div>Place of Supply: <b>{bill.placeOfSupply}</b></div>}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div style={{ border: '1px solid var(--gray-100)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: 'white' }}>
                    {['#', 'Item Name', 'HSN', 'Qty', 'Unit', 'Price/Unit', 'GST', 'Amount'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 10px', fontWeight: 600, fontSize: 11.5, textAlign: i >= 5 ? 'right' : i === 2 || i === 3 || i === 4 ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} style={{ background: i % 2 === 1 ? '#f8fafc' : 'white' }}>
                      <td style={{ padding: '8px 10px', border: '1px solid var(--gray-100)', color: 'var(--gray-400)', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid var(--gray-100)', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid var(--gray-100)', textAlign: 'center', fontSize: 11.5 }}>{item.hsn}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid var(--gray-100)', textAlign: 'center' }}>{item.qty}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid var(--gray-100)', textAlign: 'center', fontSize: 11.5 }}>{item.unit}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid var(--gray-100)', textAlign: 'right' }}>{inr2(item.pricePerUnit)}</td>
                      <td style={{ padding: '8px 10px', border: '1px solid var(--gray-100)', textAlign: 'right' }}>
                        {inr2(item.gstAmt)}<br/><span style={{ fontSize: 10.5, color: 'var(--gray-400)' }}>@{item.gstRate}%</span>
                      </td>
                      <td style={{ padding: '8px 10px', border: '1px solid var(--gray-100)', textAlign: 'right', fontWeight: 600 }}>{inr2(item.amount)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--navy)', color: 'white' }}>
                    <td colSpan={5} style={{ padding: '8px 10px', fontWeight: 700 }}>Total ({items.length} items)</td>
                    <td></td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{inr2(totalGst)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 14 }}>{inr2(subtotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Attachment section */}
            <div style={{ border: '1px solid var(--gray-100)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 10, letterSpacing: '.5px' }}>Supplier Bill Attachment</div>
              {bill.attachmentName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: '#f0fdf4', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Paperclip size={16} color="#16a34a" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#16a34a' }}>{bill.attachmentName}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>Original supplier bill</div>
                  </div>
                  <button className="btn btn-outline" style={{ fontSize: 12, padding: '5px 12px' }} onClick={openAttachment}>
                    <ExternalLink size={13} /> Open
                  </button>
                  <button className="btn btn-outline" style={{ fontSize: 12, padding: '5px 12px' }} onClick={handleAddAttachment}>
                    <Edit3 size={13} /> Replace
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--gray-400)' }}>No attachment yet</div>
                  <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={handleAddAttachment}>
                    <Paperclip size={13} /> Attach Supplier Bill
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ background: 'white', border: '1px solid var(--gray-100)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: 'var(--navy)', color: 'white', padding: '10px 14px', fontWeight: 700, fontSize: 13 }}>Payment Summary</div>
            <div style={{ padding: '14px' }}>
              <SRow label="Subtotal"    value={inr2(subtotal)} />
              {roundOff !== 0 && <SRow label="Round Off" value={(roundOff < 0 ? '-' : '') + inr2(Math.abs(roundOff))} small />}
              <SRow label="Total"       value={inr(total)}   bold />
              <SRow label="Paid"        value={inr(paid)}    color="#16a34a" />
              <div style={{ height: 1, background: 'var(--gray-100)', margin: '10px 0' }} />
              <div style={{ background: balance > 0 ? '#fef3c7' : '#dcfce7', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: balance > 0 ? '#92400e' : '#16a34a' }}>Balance Due</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: balance > 0 ? '#92400e' : '#16a34a' }}>{inr(balance)}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 10, letterSpacing: '.5px' }}>GST Summary</div>
            <SRow label="Total Taxable" value={inr2(subtotal - totalGst)} />
            <SRow label="Total GST"     value={inr2(totalGst)} />
            <SRow label="CGST"          value={inr2(totalGst / 2)} small />
            <SRow label="SGST"          value={inr2(totalGst / 2)} small />
          </div>

          <div style={{ background: 'white', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 10, letterSpacing: '.5px' }}>Items ({items.length})</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--gray-50)', fontSize: 12 }}>
                <span style={{ color: 'var(--gray-600)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                <span style={{ fontWeight: 600 }}>{inr2(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 360, boxShadow: '0 10px 40px rgba(0,0,0,.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Delete this bill?</div>
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
