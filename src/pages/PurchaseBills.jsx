import React, { useState } from 'react'
import { FilePlus, FileSearch, Eye, Trash2, ShoppingCart, Search, Plus, X, Paperclip } from 'lucide-react'
import { useApp, generatePurchaseBillId } from '../context/AppContext.jsx'
import { PAGES } from '../constants.js'

function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

const STATUS_STYLE = {
  Paid:    { background: '#dcfce7', color: '#16a34a' },
  Partial: { background: '#fef9c3', color: '#ca8a04' },
  Unpaid:  { background: '#fee2e2', color: '#dc2626' }
}

function emptyItem() {
  return { name: '', hsn: '', qty: 1, unit: 'Nos', pricePerUnit: 0, gstRate: 5, gstAmt: 0, amount: 0 }
}

function calcItem(item) {
  const base   = (parseFloat(item.pricePerUnit) || 0) * (parseFloat(item.qty) || 1)
  const gstAmt = Math.round(base * (parseFloat(item.gstRate) || 0) / 100 * 100) / 100
  return { ...item, gstAmt, amount: Math.round((base + gstAmt) * 100) / 100 }
}

function emptyBill(purchaseBills) {
  const now  = new Date()
  return {
    id:              generatePurchaseBillId(purchaseBills, now),
    date:            now.toISOString().split('T')[0],
    time:            now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    supplierName:    '',
    supplierContact: '',
    supplierGst:     '',
    supplierAddress: '',
    supplierBillNo:  '',
    placeOfSupply:   '27-Maharashtra',
    items:           [emptyItem()],
    roundOff:        0,
    paid:            0,
    status:          'Unpaid',
    terms:           'Thanks for doing business with us!',
    attachmentPath:  '',
    attachmentName:  '',
  }
}

// ── Field helpers ───────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type={type} className="form-input"
        style={{ fontSize: 13, padding: '6px 10px', width: '100%' }}
        value={value ?? ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ── New Purchase Bill Modal ──────────────────────────────────────────────────
function NewBillModal({ onClose, onSave, purchaseBills, prefillData }) {
  const [form, setForm] = useState(() => {
    const base = emptyBill(purchaseBills)
    if (!prefillData?.parsed) return base
    const p = prefillData.parsed
    const items = p.items?.length
      ? p.items.map(item => calcItem({
          name: item.name || '', hsn: item.hsn || '', qty: item.qty || 1,
          unit: item.unit || 'Nos', pricePerUnit: item.pricePerUnit || 0,
          gstRate: item.gstRate ?? 5, gstAmt: 0, amount: 0
        }))
      : base.items
    return {
      ...base,
      supplierName:    p.supplierName    || '',
      supplierContact: p.supplierContact || '',
      supplierGst:     p.supplierGst     || '',
      supplierAddress: p.supplierAddress || '',
      supplierBillNo:  p.supplierBillNo  || '',
      date:            p.date            || base.date,
      placeOfSupply:   p.placeOfSupply   || base.placeOfSupply,
      roundOff:        p.roundOff        ?? 0,
      items,
      attachmentPath:  prefillData.filePath || '',
      attachmentName:  prefillData.fileName || '',
    }
  })
  const [attaching, setAttaching] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Line item helpers
  function setItem(idx, key, val) {
    setForm(f => {
      const items = f.items.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [key]: val }
        return calcItem(updated)
      })
      return { ...f, items }
    })
  }
  function addItem()    { setForm(f => ({ ...f, items: [...f.items, emptyItem()] })) }
  function removeItem(idx) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }

  const subtotal = form.items.reduce((s, i) => s + (i.amount || 0), 0)
  const total    = Math.round(subtotal + (parseFloat(form.roundOff) || 0))
  const balance  = total - (parseFloat(form.paid) || 0)

  async function handleAttach() {
    setAttaching(true)
    try {
      const result = await window.electronAPI.addPurchaseAttachment(form.id)
      if (result?.success) {
        set('attachmentPath', result.path)
        set('attachmentName', result.name)
      }
    } finally {
      setAttaching(false)
    }
  }

  async function handleSave() {
    if (!form.supplierName.trim()) return alert('Supplier name is required.')
    if (!form.items.length)        return alert('Add at least one item.')
    await onSave({ ...form, subtotal, total })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 12, width: 780, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>

        {/* Header */}
        <div style={{ background: 'var(--navy)', color: 'white', padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>New Purchase Bill</div>
            <div style={{ fontSize: 12, opacity: .7, marginTop: 2 }}>Bill No: {form.id}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>

        {/* Auto-fill banner */}
        {prefillData?.parsed && (
          <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '8px 20px', fontSize: 12.5, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileSearch size={13} /> Form auto-populated from PDF — please review before saving.
          </div>
        )}

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Supplier */}
          <Section title="Bill From (Supplier)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Supplier Name *" value={form.supplierName}    onChange={v => set('supplierName', v)} />
              <Field label="Contact Number"  value={form.supplierContact} onChange={v => set('supplierContact', v)} />
              <Field label="Supplier GSTIN"  value={form.supplierGst}     onChange={v => set('supplierGst', v)} placeholder="e.g. 27XXXXX" />
              <Field label="Supplier Bill No" value={form.supplierBillNo} onChange={v => set('supplierBillNo', v)} placeholder="e.g. JKP/25-26/007854" />
              <Field label="Supplier Address" value={form.supplierAddress} onChange={v => set('supplierAddress', v)} span={2} />
            </div>
          </Section>

          {/* Bill Details */}
          <Section title="Bill Details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Date" type="date" value={form.date} onChange={v => set('date', v)} />
              <Field label="Time"             value={form.time} onChange={v => set('time', v)} placeholder="07:52 AM" />
              <Field label="Place of Supply"  value={form.placeOfSupply} onChange={v => set('placeOfSupply', v)} placeholder="27-Maharashtra" />
            </div>
          </Section>

          {/* Line Items */}
          <Section title="Items">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: 'white' }}>
                    {['#','Item Name','HSN/SAC','Qty','Unit','Price/Unit','GST %','GST Amt','Amount',''].map(h => (
                      <th key={h} style={{ padding: '7px 8px', fontWeight: 600, fontSize: 11.5, textAlign: h === 'Amount' || h === 'GST Amt' || h === 'Price/Unit' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '6px 8px', color: 'var(--gray-400)', fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ padding: '4px 6px', minWidth: 160 }}>
                        <input className="form-input" style={{ fontSize: 12.5, padding: '5px 8px', width: '100%' }}
                          value={item.name} placeholder="Item description"
                          onChange={e => setItem(idx, 'name', e.target.value)} />
                      </td>
                      <td style={{ padding: '4px 6px', width: 90 }}>
                        <input className="form-input" style={{ fontSize: 12.5, padding: '5px 8px', width: '100%' }}
                          value={item.hsn} placeholder="HSN"
                          onChange={e => setItem(idx, 'hsn', e.target.value)} />
                      </td>
                      <td style={{ padding: '4px 6px', width: 60 }}>
                        <input className="form-input" type="number" style={{ fontSize: 12.5, padding: '5px 8px', width: '100%' }}
                          value={item.qty} min={1}
                          onChange={e => setItem(idx, 'qty', e.target.value)} />
                      </td>
                      <td style={{ padding: '4px 6px', width: 70 }}>
                        <input className="form-input" style={{ fontSize: 12.5, padding: '5px 8px', width: '100%' }}
                          value={item.unit} placeholder="Nos"
                          onChange={e => setItem(idx, 'unit', e.target.value)} />
                      </td>
                      <td style={{ padding: '4px 6px', width: 100 }}>
                        <input className="form-input" type="number" style={{ fontSize: 12.5, padding: '5px 8px', width: '100%', textAlign: 'right' }}
                          value={item.pricePerUnit}
                          onChange={e => setItem(idx, 'pricePerUnit', e.target.value)} />
                      </td>
                      <td style={{ padding: '4px 6px', width: 70 }}>
                        <select className="form-input" style={{ fontSize: 12.5, padding: '5px 6px', width: '100%' }}
                          value={item.gstRate} onChange={e => setItem(idx, 'gstRate', e.target.value)}>
                          {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 12.5, color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>{inr(item.gstAmt)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap' }}>{inr(item.amount)}</td>
                      <td style={{ padding: '4px 6px', width: 32 }}>
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}>
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-outline" style={{ marginTop: 10, fontSize: 12.5 }} onClick={addItem}>
              <Plus size={13} /> Add Item
            </button>
          </Section>

          {/* Payment + Attachment */}
          <Section title="Payment & Attachment">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Round Off" type="number" value={form.roundOff} onChange={v => set('roundOff', v)} placeholder="e.g. -0.14" />
              <Field label="Amount Paid (₹)" type="number" value={form.paid} onChange={v => set('paid', v)} />
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 3 }}>Status</label>
                <select className="form-input" style={{ fontSize: 13, padding: '6px 10px', width: '100%' }}
                  value={form.status} onChange={e => set('status', e.target.value)}>
                  {['Unpaid', 'Partial', 'Paid'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Totals preview */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>Subtotal: <b>{inr(subtotal)}</b></div>
              <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>Total: <b style={{ color: 'var(--navy)' }}>{inr(total)}</b></div>
              <div style={{ fontSize: 12.5, background: '#fef3c7', color: '#92400e', fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>Balance: {inr(balance)}</div>
            </div>

            {/* Attachment */}
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid var(--gray-100)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Supplier Bill Attachment (PDF / Image)</div>
              {form.attachmentName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Paperclip size={14} color="#16a34a" />
                  <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 600 }}>{form.attachmentName}</span>
                  <button onClick={() => { set('attachmentPath', ''); set('attachmentName', '') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', marginLeft: 4 }}>
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={handleAttach} disabled={attaching}>
                  <Paperclip size={13} /> {attaching ? 'Selecting…' : 'Attach Supplier Bill'}
                </button>
              )}
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>Accepts PDF, JPG, PNG</div>
            </div>
          </Section>

          {/* Terms */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 4 }}>Terms / Notes</label>
            <textarea className="form-input" style={{ width: '100%', height: 56, fontSize: 13, padding: '7px 10px', resize: 'vertical' }}
              value={form.terms} onChange={e => set('terms', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              <ShoppingCart size={14} /> Save Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 10, borderBottom: '1px solid var(--gray-100)', paddingBottom: 5 }}>
        {title}
      </div>
      {children}
    </section>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function PurchaseBills({ navigate }) {
  const { purchaseBills, savePurchaseBill, deletePurchaseBill } = useApp()
  const [search, setSearch]         = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [delConfirm, setDelConfirm] = useState(null)
  const [prefillData, setPrefillData] = useState(null)
  const [importing, setImporting]     = useState(false)

  const list = (purchaseBills || []).filter(b => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      b.id?.toLowerCase().includes(s)            ||
      b.supplierName?.toLowerCase().includes(s)  ||
      b.supplierBillNo?.toLowerCase().includes(s)||
      b.status?.toLowerCase().includes(s)
    )
  })

  async function handleSave(bill) {
    await savePurchaseBill(bill)
    setShowNew(false)
    setPrefillData(null)
  }

  async function handleImportPDF() {
    setImporting(true)
    try {
      const result = await window.electronAPI.parsePurchasePDF()
      if (!result || result.canceled) return
      if (!result.success) { alert('Could not parse PDF: ' + (result.error || 'Unknown error')); return }
      setPrefillData({ parsed: result.data, filePath: result.filePath, fileName: result.fileName })
      setShowNew(true)
    } catch (err) {
      alert('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }
  async function handleDelete(id) {
    await deletePurchaseBill(id)
    setDelConfirm(null)
  }

  const totalSpend       = (purchaseBills || []).reduce((s, b) => s + (b.total   || 0), 0)
  const totalOutstanding = (purchaseBills || []).reduce((s, b) => s + (b.total   || 0) - (parseFloat(b.paid) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <StatCard label="Total Bills"   value={(purchaseBills||[]).length}                                        icon={<ShoppingCart size={18} color="var(--navy)" />} />
        <StatCard label="Paid"          value={(purchaseBills||[]).filter(b => b.status==='Paid').length}         icon={<ShoppingCart size={18} color="#16a34a" />} color="#f0fdf4" />
        <StatCard label="Total Spend"   value={inr(totalSpend)}                                                    icon={<ShoppingCart size={18} color="#7c3aed" />} color="#faf5ff" />
        <StatCard label="Outstanding"   value={inr(totalOutstanding)}                                              icon={<ShoppingCart size={18} color="#dc2626" />} color="#fef2f2" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: 30, fontSize: 13 }}
            placeholder="Search by supplier, bill no, status…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-outline" onClick={handleImportPDF} disabled={importing}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <FileSearch size={14} /> {importing ? 'Reading PDF…' : 'Import from PDF'}
        </button>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <FilePlus size={14} /> New Purchase Bill
        </button>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={40} color="var(--gray-300)" />
          <h4 style={{ marginTop: 12 }}>No purchase bills yet</h4>
          <p>Record bills from your suppliers here and attach their original invoices.</p>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowNew(true)}>
            <FilePlus size={14} /> New Purchase Bill
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(bill => (
            <BillRow key={bill.id} bill={bill}
              onView={() => navigate(PAGES.PURCHASE_BILL_PREVIEW, { billId: bill.id })}
              onDelete={() => setDelConfirm(bill.id)} />
          ))}
        </div>
      )}

      {showNew && (
        <NewBillModal
          purchaseBills={purchaseBills||[]}
          prefillData={prefillData}
          onClose={() => { setShowNew(false); setPrefillData(null) }}
          onSave={handleSave}
        />
      )}

      {delConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 360, boxShadow: '0 10px 40px rgba(0,0,0,.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Delete this bill?</div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 18 }}>This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setDelConfirm(null)}>Cancel</button>
              <button className="btn" style={{ background: '#dc2626', color: 'white' }} onClick={() => handleDelete(delConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BillRow({ bill, onView, onDelete }) {
  const paid     = parseFloat(bill.paid) || 0
  const balance  = (bill.total || 0) - paid
  const statusSt = STATUS_STYLE[bill.status] || STATUS_STYLE.Unpaid
  const dateStr  = bill.date ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', border: '1px solid var(--gray-100)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer' }}
      onClick={onView}>
      <div style={{ width: 40, height: 40, background: '#faf5ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ShoppingCart size={18} color="#7c3aed" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>{bill.supplierName}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, ...statusSt }}>{bill.status}</span>
          {bill.attachmentName && (
            <span style={{ fontSize: 10.5, color: '#16a34a', background: '#f0fdf4', padding: '2px 7px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Paperclip size={10} /> Bill attached
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          {bill.id} &nbsp;·&nbsp; {bill.supplierBillNo && `Supplier No: ${bill.supplierBillNo} ·`} {dateStr} &nbsp;·&nbsp; {(bill.items||[]).length} items
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{inr(bill.total)}</div>
        {balance > 0  && <div style={{ fontSize: 11.5, color: '#dc2626' }}>Balance: {inr(balance)}</div>}
        {balance <= 0 && bill.total > 0 && <div style={{ fontSize: 11.5, color: '#16a34a' }}>Fully paid</div>}
      </div>
      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
        <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 12 }} onClick={onView}><Eye size={13} /> View</button>
        <button className="btn" style={{ padding: '5px 10px', fontSize: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={onDelete}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: color || 'white', border: '1px solid var(--gray-100)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.08)', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', fontFamily: 'Space Grotesk, sans-serif' }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  )
}
