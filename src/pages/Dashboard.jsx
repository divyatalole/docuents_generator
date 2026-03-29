import React from 'react'
import { FileText, Clock, CheckCircle, FilePlus, Eye, Calculator, TrendingUp, Sun } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PAGES } from '../constants.js'

function fmt(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

const STATUS_BADGE = {
  Pending: 'badge-pending',
  Sent: 'badge-sent',
  Approved: 'badge-approved',
  Rejected: 'badge-rejected'
}

export default function Dashboard({ navigate }) {
  const { quotes, loading } = useApp()

  const stats = React.useMemo(() => {
    const total = quotes.length
    const pending = quotes.filter(q => q.status === 'Pending').length
    const sent = quotes.filter(q => q.status === 'Sent').length
    const approved = quotes.filter(q => q.status === 'Approved').length
    const totalValue = quotes.reduce((s, q) => s + (q.totalCost || 0), 0)
    return { total, pending, sent, approved, totalValue }
  }, [quotes])

  const recent = quotes.slice(0, 8)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
          <Sun size={32} style={{ margin: '0 auto 12px', animation: 'spin 2s linear infinite' }} />
          <p>Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon navy"><FileText size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Quotations</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Clock size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><TrendingUp size={22} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(stats.totalValue)}</div>
            <div className="stat-label">Total Quote Value</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="btn btn-primary" onClick={() => navigate(PAGES.NEW_QUOTATION)}>
          <FilePlus size={15} /> New Quotation
        </button>
        <button className="btn btn-outline" onClick={() => navigate(PAGES.ALL_QUOTATIONS)}>
          <Eye size={15} /> View All Quotes
        </button>
        <button className="btn btn-outline" onClick={() => navigate(PAGES.ROI_CALCULATOR)}>
          <Calculator size={15} /> ROI Calculator
        </button>
      </div>

      {/* Recent Quotations */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Quotations</h3>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(PAGES.ALL_QUOTATIONS)}>
            View All
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} />
            <h4>No quotations yet</h4>
            <p>Create your first quotation to get started</p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate(PAGES.NEW_QUOTATION)}>
              <FilePlus size={14} /> New Quotation
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Capacity</th>
                  <th>Total Cost</th>
                  <th>Subsidy</th>
                  <th>Net Payable</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(q => (
                  <tr key={q.id}>
                    <td>
                      <span className="font-mono" style={{ fontSize: 12.5, color: 'var(--navy)', fontWeight: 600 }}>
                        {q.id}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12.5 }}>
                      {q.date ? new Date(q.date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ fontWeight: 500 }}>{q.customerName}</td>
                    <td style={{ color: 'var(--gray-600)' }}>{q.systemCapacity?.toFixed(2)} kW</td>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{fmt(q.totalCost)}</td>
                    <td className="text-green font-mono">{fmt(q.subsidy)}</td>
                    <td className="font-mono" style={{ color: 'var(--amber-dark)', fontWeight: 700 }}>{fmt(q.netPayable)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[q.status] || 'badge-pending'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-icons">
                        <button
                          className="icon-btn"
                          title="View"
                          onClick={() => navigate(PAGES.QUOTATION_PREVIEW, { quoteId: q.id })}
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 20 }}>
        <div className="card card-body" style={{ padding: '18px 22px' }}>
          <h4 style={{ fontSize: 14, marginBottom: 14, color: 'var(--gray-600)' }}>Status Breakdown</h4>
          {['Pending', 'Sent', 'Approved', 'Rejected'].map(status => {
            const count = quotes.filter(q => q.status === status).length
            const pct = quotes.length ? Math.round(count / quotes.length * 100) : 0
            return (
              <div key={status} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className={`badge ${STATUS_BADGE[status]}`}>{status}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{count} quotes</span>
                </div>
                <div style={{ background: 'var(--gray-100)', borderRadius: 4, height: 6 }}>
                  <div style={{
                    background: status === 'Approved' ? 'var(--green)' :
                      status === 'Pending' ? '#D97706' :
                        status === 'Sent' ? 'var(--blue)' : 'var(--red)',
                    width: `${pct}%`,
                    height: '100%',
                    borderRadius: 4,
                    transition: 'width .4s ease'
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="card card-body" style={{ padding: '18px 22px' }}>
          <h4 style={{ fontSize: 14, marginBottom: 14, color: 'var(--gray-600)' }}>Financial Summary</h4>
          {[
            { label: 'Total Quote Value', value: fmt(quotes.reduce((s, q) => s + (q.totalCost || 0), 0)), color: 'var(--navy)' },
            { label: 'Total Subsidy', value: fmt(quotes.reduce((s, q) => s + (q.subsidy || 0), 0)), color: 'var(--green)' },
            { label: 'Net Receivable', value: fmt(quotes.reduce((s, q) => s + (q.netPayable || 0), 0)), color: 'var(--amber-dark)' },
            { label: 'Approved Value', value: fmt(quotes.filter(q => q.status === 'Approved').reduce((s, q) => s + (q.netPayable || 0), 0)), color: 'var(--green)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>{row.label}</span>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 14, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
