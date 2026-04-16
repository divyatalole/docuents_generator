import React from 'react'
import { LayoutDashboard, FilePlus, FileText, Settings, Sun, Calculator, Receipt, ShoppingCart } from 'lucide-react'
import { PAGES } from '../constants.js'

const NAV_ITEMS = [
  { label: 'Dashboard',      page: PAGES.DASHBOARD,      icon: LayoutDashboard },
  { label: 'New Quotation',  page: PAGES.NEW_QUOTATION,  icon: FilePlus },
  { label: 'All Quotations', page: PAGES.ALL_QUOTATIONS, icon: FileText },
  { label: 'Sale Bills',     page: PAGES.SALE_BILLS,     icon: Receipt },
  { label: 'Purchase Bills', page: PAGES.PURCHASE_BILLS, icon: ShoppingCart },
  { label: 'ROI Calculator', page: PAGES.ROI_CALCULATOR, icon: Calculator },
]

const NAV_BOTTOM = [
  { label: 'Settings', page: PAGES.SETTINGS, icon: Settings },
]

export default function Sidebar({ currentPage, navigate }) {
  function NavItem({ item }) {
    const Icon = item.icon
    const isActive = currentPage === item.page
    return (
      <button
        className={`sidebar-item ${isActive ? 'active' : ''}`}
        onClick={() => navigate(item.page)}
      >
        <Icon size={17} />
        {item.label}
      </button>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34, background: 'rgba(245,166,35,.15)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sun size={18} color="#F5A623" />
          </div>
          <div>
            <div className="sidebar-logo-title">PV-Enviro Energies Pvt. Ltd.</div>
            <div className="sidebar-logo-sub">Enterprises</div>
          </div>
        </div>
        <span className="sidebar-logo-badge">Solar Quotation</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        {NAV_ITEMS.map(item => <NavItem key={item.page} item={item} />)}

        <div className="sidebar-section-label" style={{ marginTop: 12 }}>System</div>
        {NAV_BOTTOM.map(item => <NavItem key={item.page} item={item} />)}
      </nav>

      <div className="sidebar-footer">
        v1.0 • PV-Enviro Energies Pvt. Ltd.<br />
        Nagpur — 2026
      </div>
    </aside>
  )
}
