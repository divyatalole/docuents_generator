import React, { useState } from 'react'
import { AppProvider } from './context/AppContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewQuotation from './pages/NewQuotation.jsx'
import QuotationPreview from './pages/QuotationPreview.jsx'
import AllQuotations from './pages/AllQuotations.jsx'
import ROICalculator from './pages/ROICalculator.jsx'
import Settings from './pages/Settings.jsx'
import { PAGES } from './constants.js'

export { PAGES }

const PAGE_TITLES = {
  [PAGES.DASHBOARD]: { title: 'Dashboard', sub: 'Welcome back — PV-Enviro Energies Pvt. Ltd.' },
  [PAGES.NEW_QUOTATION]: { title: 'New Quotation', sub: 'Create a new solar installation quote' },
  [PAGES.EDIT_QUOTATION]: { title: 'Edit Quotation', sub: 'Update quotation details' },
  [PAGES.QUOTATION_PREVIEW]: { title: 'Quotation Preview', sub: 'Review and export quotation' },
  [PAGES.ALL_QUOTATIONS]: { title: 'All Quotations', sub: 'Manage all quotations' },
  [PAGES.ROI_CALCULATOR]: { title: 'ROI Calculator', sub: 'Calculate solar investment returns' },
  [PAGES.SETTINGS]: { title: 'Settings', sub: 'Manage company details and defaults' }
}

export default function App() {
  const [page, setPage] = useState(PAGES.DASHBOARD)
  const [pageData, setPageData] = useState(null)  // e.g. { quoteId }

  function navigate(newPage, data = null) {
    setPage(newPage)
    setPageData(data)
  }

  const currentMeta = PAGE_TITLES[page] || PAGE_TITLES[PAGES.DASHBOARD]

  function renderPage() {
    switch (page) {
      case PAGES.DASHBOARD:
        return <Dashboard navigate={navigate} />
      case PAGES.NEW_QUOTATION:
        return <NewQuotation navigate={navigate} />
      case PAGES.EDIT_QUOTATION:
        return <NewQuotation navigate={navigate} editQuoteId={pageData?.quoteId} />
      case PAGES.QUOTATION_PREVIEW:
        return <QuotationPreview navigate={navigate} quoteId={pageData?.quoteId} />
      case PAGES.ALL_QUOTATIONS:
        return <AllQuotations navigate={navigate} />
      case PAGES.ROI_CALCULATOR:
        return <ROICalculator navigate={navigate} />
      case PAGES.SETTINGS:
        return <Settings navigate={navigate} />
      default:
        return <Dashboard navigate={navigate} />
    }
  }

  return (
    <AppProvider>
      <div className="app-shell">
        <Sidebar currentPage={page} navigate={navigate} />
        <div className="main-content">
          <Topbar title={currentMeta.title} subtitle={currentMeta.sub} navigate={navigate} />
          <div className="page-content">
            {renderPage()}
          </div>
        </div>
      </div>
    </AppProvider>
  )
}
