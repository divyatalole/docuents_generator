import React, { useState, useMemo } from 'react'
import { Search, Eye, Edit, Trash2, FilePlus, Filter } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PAGES } from '../constants.js'

const STATUS_BADGE = {
  Pending: 'badge-pending',
  Sent: 'badge-sent',
  Approved: 'badge-approved',
  Rejected: 'badge-rejected'
}

function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

export default function AllQuotations({ navigate }) {
  const { quotes, deleteQuote } = useApp()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('date_desc')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    let list = [...quotes]

    if (statusFilter !== 'All') {
      list = list.filter(q => q.status === statusFilter)
    }

    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(q =>
        q.customerName?.toLowerCase().includes(s) ||
        q.id?.toLowerCase().includes(s) ||
        q.address?.toLowerCase().includes(s)
      )
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc': return (b.date || '') > (a.date || '') ? 1 : -1
        case 'date_asc': return (a.date || '') > (b.date || '') ? 1 : -1
        case 'value_desc': return (b.totalCost || 0) - (a.totalCost || 0)
        case 'value_asc': return (a.totalCost || 0) - (b.totalCost || 0)
        case 'customer': return (a.customerName || '').localeCompare(b.customerName || '')
        default: return 0
      }
    })

    return list
  }, [quotes, search, statusFilter, sortBy])

  async function handleDelete(id) {
    await deleteQuote(id)
    setConfirmDelete(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>All Quotations</h2>
          <p>{quotes.length} total quotation{quotes.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-amber" onClick={() => navigate(PAGES.NEW_QUOTATION)}>
          <FilePlus size={15} /> New Quotation
        </button>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
          <Search size={15} />
          <input
            className="form-control"
            placeholder="Search by name or quote number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} style={{ color: 'var(--gray-400)' }} />
          {['All', 'Pending', 'Sent', 'Approved', 'Rejected'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter(s)}
              style={{ fontSize: 12 }}
            >
              {s}
              {s !== 'All' && (
                <span style={{
                  background: statusFilter === s ? 'rgba(255,255,255,.2)' : 'var(--gray-200)',
                  borderRadius: 10, padding: '0 5px', fontSize: 10.5, marginLeft: 2
                }}>
                  {quotes.filter(q => q.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <select className="form-control" style={{ width: 'auto', fontSize: 12.5 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date_desc">Date: Newest First</option>
          <option value="date_asc">Date: Oldest First</option>
          <option value="value_desc">Value: High to Low</option>
          <option value="value_asc">Value: Low to High</option>
          <option value="customer">Customer Name</option>
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Search size={40} />
            <h4>{quotes.length === 0 ? 'No quotations yet' : 'No results found'}</h4>
            <p>{quotes.length === 0 ? 'Create your first quotation' : 'Try adjusting your search or filters'}</p>
            {quotes.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate(PAGES.NEW_QUOTATION)}>
                <FilePlus size={14} /> New Quotation
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Panel / Inverter</th>
                  <th>Capacity</th>
                  <th>Total Cost</th>
                  <th>Subsidy</th>
                  <th>Net Payable</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id}>
                    <td>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 600 }}>
                        {q.id}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>
                      {q.date ? new Date(q.date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{q.customerName}</div>
                      {q.contactNumber && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{q.contactNumber}</div>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)', maxWidth: 180 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.panel?.split('(')[0].trim()}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                        {q.inverter?.split('On-Grid')[0].trim()}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>
                      {parseFloat(q.systemCapacity || 0).toFixed(2)} kW
                    </td>
                    <td style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>
                      {inr(q.totalCost)}
                    </td>
                    <td style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--green)', fontWeight: 600 }}>
                      {inr(q.subsidy)}
                    </td>
                    <td style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--amber-dark)', fontWeight: 700 }}>
                      {inr(q.netPayable)}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[q.status] || 'badge-pending'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-icons">
                        <button
                          className="icon-btn"
                          title="View Quote"
                          onClick={() => navigate(PAGES.QUOTATION_PREVIEW, { quoteId: q.id })}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="icon-btn"
                          title="Edit Quote"
                          onClick={() => navigate(PAGES.EDIT_QUOTATION, { quoteId: q.id })}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          className="icon-btn danger"
                          title="Delete Quote"
                          onClick={() => setConfirmDelete(q)}
                        >
                          <Trash2 size={13} />
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

      {/* Summary Footer */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 20, marginTop: 14, justifyContent: 'flex-end', fontSize: 13, color: 'var(--gray-500)' }}>
          <span>Showing <strong>{filtered.length}</strong> quotes</span>
          <span>Total Value: <strong style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--navy)' }}>{inr(filtered.reduce((s, q) => s + (q.totalCost || 0), 0))}</strong></span>
          <span>Net Payable: <strong style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--amber-dark)' }}>{inr(filtered.reduce((s, q) => s + (q.netPayable || 0), 0))}</strong></span>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Delete Quotation?</h3>
            <p>
              Delete <strong>{confirmDelete.id}</strong> for{' '}
              <strong>{confirmDelete.customerName}</strong>?<br />
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
