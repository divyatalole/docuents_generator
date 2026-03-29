import React from 'react'
import { FilePlus, Sun } from 'lucide-react'
import { PAGES } from '../constants.js'

export default function Topbar({ title, subtitle, navigate }) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        <div className="topbar-subtitle">{subtitle}</div>
      </div>
      <div className="topbar-right">
        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{today}</span>
        <button className="btn btn-amber btn-sm" onClick={() => navigate(PAGES.NEW_QUOTATION)}>
          <FilePlus size={14} />
          New Quote
        </button>
      </div>
    </header>
  )
}
