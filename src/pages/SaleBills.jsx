import React, { useState } from 'react'
import { FilePlus, Eye, Trash2, Receipt, Search, CheckCircle, Clock, AlertCircle, IndianRupee } from 'lucide-react'
import { useApp, generateBillId, calcPricing } from '../context/AppContext.jsx'
import { PAGES } from '../constants.js'

function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

const STATUS_STYLE = {
  Paid:    { background: '#dcfce7', color: '#16a34a' },
  Partial: { background: '#fef9c3', color: '#ca8a04' },
  Unpaid:  { background: '#fee2e2', color: '#dc2626' }
}

function emptyBill(bills, quotes, fromQuote) {
  const now  = new Date()
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const date = now.toISOString().split('T')[0]
  const id   = generateBillId(bills, now)

  if (fromQuote) {
    const p = calcPricing(fromQuote)
    return {
      id,
      quotationId:    fromQuote.id,
      date,
      time,
      customerName:   fromQuote.customerName  || '',
      address:        fromQuote.address        || '',
      contactNumber:  fromQuote.contactNumber  || '',
      systemCapacity: fromQuote.systemCapacity || 0,
      finalAmount:    fromQuote.finalAmount    || fromQuote.totalCost || 0,
      panel:          fromQuote.panel          || '',
      panelCount:     fromQuote.panelCount     || 0,
      inverter:       fromQuote.inverter       || '',
      wiringKit:      fromQuote.wiringKit      || '',
      ...p,
      received:       0,
      status:         'Unpaid',
      terms:          'Thanks for doing business with us!',
      notes:          ''
    }
  }

  return {
    id,
    quotationId:    '',
    date,
    time,
    customerName:   '',
    address:        '',
    contactNumber:  '',
    systemCapacity: 0,
    finalAmount:    0,
    panel:          '',
    panelCount:     0,
    inverter:       '',
    wiringKit:      '',
    totalCost:      0,
    received:       0,
    status:         'Unpaid',
    terms:          'Thanks for doing business with us!',
    notes:          ''
  }
}

// ── New Bill Modal ──────────────────────────────────────────────────────────
function NewBillModal({ onClose, onSave, bills, fromQuote }) {
  const { settings } = useApp()
  const [form, setForm] = useState(() => emptyBill(bills, null, fromQuote))

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Recalculate whenever capacity or rate changes
  const p = calcPricing(form)

  async function handleSave() {
    if (!form.customerName.trim()) return alert('Customer name is required.')
    await onSave({ ...form, ...p, netPayable: p.totalCost })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', borderRadius: 12, width: 680, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)'
      }}>
        {/* Header */}
        <div style={{ background: 'var(--navy)', color: 'white', padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>New Tax Invoice</div>
            <div style={{ fontSize: 12, opacity: .7, marginTop: 2 }}>Invoice No: {form.id}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 10, borderBottom: '1px solid var(--gray-100)', paddingBottom: 5 }}>Bill To</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Customer Name *" value={form.customerName} onChange={v => set('customerName', v)} />
              <Field label="Contact Number"  value={form.contactNumber} onChange={v => set('contactNumber', v)} />
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Address" value={form.address} onChange={v => set('address', v)} />
              </div>
            </div>
          </section>

          {/* Invoice meta */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 10, borderBottom: '1px solid var(--gray-100)', paddingBottom: 5 }}>Invoice Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Date" type="date" value={form.date} onChange={v => set('date', v)} />
              <Field label="Time" value={form.time} onChange={v => set('time', v)} placeholder="07:21 PM" />
              {fromQuote && <Field label="Linked Quotation" value={form.quotationId} readOnly />}
            </div>
          </section>

          {/* System / Pricing */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 10, borderBottom: '1px solid var(--gray-100)', paddingBottom: 5 }}>System &amp; Pricing</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Final Amount (₹)" type="number" value={form.finalAmount} onChange={v => set('finalAmount', v)} placeholder="GST-inclusive total" />
              <Field label="System Capacity (kW)" type="number" value={form.systemCapacity} onChange={v => set('systemCapacity', v)} />
              <div></div>
              <Field label="Panel Model" value={form.panel} onChange={v => set('panel', v)} placeholder="e.g. Adani Topcon 620 Wp" />
              <Field label="Panel Count" type="number" value={form.panelCount} onChange={v => set('panelCount', v)} />
              <Field label="Inverter" value={form.inverter} onChange={v => set('inverter', v)} placeholder="e.g. K Solar 3.8 KW" />
              <Field label="Wiring Kit" value={form.wiringKit} onChange={v => set('wiringKit', v)} />
            </div>
          </section>

          {/* Auto-calculated breakdown */}
          {p.totalCost > 0 && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Auto-calculated Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 12 }}>
                <CalcRow label="Solar System (70%)" base={p.solarBase} gst={p.solarGst} gstRate="5%" total={p.solarPortion} />
                <CalcRow label="Commissions (30%)" base={p.commBase}  gst={p.commGst}  gstRate="18%" total={p.commPortion} />
                <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bae6fd', paddingTop: 6, fontWeight: 700, color: '#0F2A4A' }}>
                  <span>Total Payable</span>
                  <span style={{ color: '#F5A623', fontSize: 14 }}>{inr(p.totalCost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--navy)', marginBottom: 10, borderBottom: '1px solid var(--gray-100)', paddingBottom: 5 }}>Payment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Amount Received (₹)" type="number" value={form.received} onChange={v => set('received', v)} />
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 3 }}>Status</label>
                <select className="form-input" style={{ fontSize: 13, padding: '6px 10px', width: '100%' }}
                  value={form.status} onChange={e => set('status', e.target.value)}>
                  {['Unpaid', 'Partial', 'Paid'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ background: '#fef3c7', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                  Balance: {inr(p.totalCost - (parseFloat(form.received) || 0))}
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 4 }}>Terms / Notes</label>
            <textarea className="form-input" style={{ width: '100%', height: 60, fontSize: 13, padding: '7px 10px', resize: 'vertical' }}
              value={form.terms} onChange={e => set('terms', e.target.value)} />
          </section>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Receipt size={14} /> Save Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, readOnly }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type={type} className="form-input" readOnly={readOnly}
        style={{ fontSize: 13, padding: '6px 10px', width: '100%', background: readOnly ? '#f8fafc' : undefined }}
        value={value ?? ''} placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)} />
    </div>
  )
}

function CalcRow({ label, base, gst, gstRate, total }) {
  return (
    <div style={{ background: 'white', borderRadius: 6, padding: '7px 10px', border: '1px solid #e0f2fe' }}>
      <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: 4, fontSize: 11 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>Base: {inr(base)}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>GST @{gstRate}: {inr(gst)}</div>
      <div style={{ fontWeight: 700, color: '#0F2A4A', marginTop: 3 }}>{inr(total)}</div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function SaleBills({ navigate, fromQuote }) {
  const { bills, saveBill, deleteBill } = useApp()
  const [search, setSearch]         = useState('')
  const [showNew, setShowNew]       = useState(!!fromQuote)
  const [delConfirm, setDelConfirm] = useState(null)

  const filtered = (bills || []).filter(b => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      b.id?.toLowerCase().includes(s)           ||
      b.customerName?.toLowerCase().includes(s) ||
      b.status?.toLowerCase().includes(s)
    )
  }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

  async function handleSave(bill) {
    await saveBill(bill)
    setShowNew(false)
  }

  async function handleDelete(id) {
    await deleteBill(id)
    setDelConfirm(null)
  }

  const totalRevenue  = (bills || []).reduce((s, b) => s + (parseFloat(b.received) || 0), 0)
  const totalOutstanding = (bills || []).reduce((s, b) => s + (b.totalCost || 0) - (parseFloat(b.received) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="Total Bills"      value={(bills || []).length}             icon={<Receipt size={18} color="var(--navy)" />} />
        <StatCard label="Paid"             value={(bills || []).filter(b => b.status === 'Paid').length}    icon={<CheckCircle size={18} color="#16a34a" />} color="#dcfce7" />
        <StatCard label="Total Received"   value={inr(totalRevenue)}                icon={<IndianRupee size={18} color="#16a34a" />} color="#f0fdf4" />
        <StatCard label="Outstanding"      value={inr(totalOutstanding)}            icon={<AlertCircle size={18} color="#dc2626" />} color="#fef2f2" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: 30, fontSize: 13 }}
            placeholder="Search bills by customer, invoice no, status…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <FilePlus size={14} /> New Bill
        </button>
      </div>

      {/* Bills List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <Receipt size={40} color="var(--gray-300)" />
          <h4 style={{ marginTop: 12 }}>No bills yet</h4>
          <p>Create your first tax invoice or generate one from a quotation.</p>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowNew(true)}>
            <FilePlus size={14} /> New Bill
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(bill => (
            <BillRow
              key={bill.id}
              bill={bill}
              onView={() => navigate(PAGES.BILL_PREVIEW, { billId: bill.id })}
              onDelete={() => setDelConfirm(bill.id)}
            />
          ))}
        </div>
      )}

      {/* New Bill Modal */}
      {showNew && (
        <NewBillModal
          bills={bills || []}
          fromQuote={fromQuote || null}
          onClose={() => setShowNew(false)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm */}
      {delConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', borderRadius: 10, padding: 24, width: 360, boxShadow: '0 10px 40px rgba(0,0,0,.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Delete Invoice?</div>
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
  const balance  = (bill.totalCost || 0) - (parseFloat(bill.received) || 0)
  const statusSt = STATUS_STYLE[bill.status] || STATUS_STYLE.Unpaid
  const dateStr  = bill.date ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'white', border: '1px solid var(--gray-100)', borderRadius: 10,
      padding: '12px 16px', cursor: 'pointer'
    }} onClick={onView}>
      <div style={{ width: 40, height: 40, background: '#f0f9ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Receipt size={18} color="var(--navy)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>{bill.customerName}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, ...statusSt }}>{bill.status}</span>
          {bill.quotationId && (
            <span style={{ fontSize: 10.5, color: '#64748b', background: '#f1f5f9', padding: '2px 7px', borderRadius: 20 }}>
              From {bill.quotationId}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{bill.id} &nbsp;·&nbsp; {dateStr} &nbsp;·&nbsp; {parseFloat(bill.systemCapacity || 0).toFixed(2)} kW</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{inr(bill.totalCost)}</div>
        {balance > 0 && <div style={{ fontSize: 11.5, color: '#dc2626' }}>Balance: {inr(balance)}</div>}
        {balance <= 0 && bill.totalCost > 0 && <div style={{ fontSize: 11.5, color: '#16a34a' }}>Fully paid</div>}
      </div>
      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
        <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 12 }} onClick={onView}>
          <Eye size={13} /> View
        </button>
        <button className="btn" style={{ padding: '5px 10px', fontSize: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={onDelete}>
          <Trash2 size={13} />
        </button>
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
