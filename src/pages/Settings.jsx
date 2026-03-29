import React, { useState, useEffect } from 'react'
import { Save, Building, CreditCard, Settings as SettingsIcon, Zap, Sun, Cpu, Plus, Trash2, FolderOpen, RefreshCw, RotateCcw, CheckCircle, Info } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const TH = ({ children, center, width }) => (
  <th style={{
    padding: '8px 12px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)',
    textAlign: center ? 'center' : 'left', fontSize: 11, fontWeight: 600,
    color: 'var(--gray-500)', textTransform: 'uppercase', width
  }}>{children}</th>
)

export default function Settings() {
  const { settings, saveSettings } = useApp()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [folderInfo, setFolderInfo] = useState(null)
  const [folderBusy, setFolderBusy] = useState(false)

  useEffect(() => {
    window.electronAPI.getDataFolder?.().then(setFolderInfo)
  }, [])

  useEffect(() => {
    if (!settings) return
    const clone = JSON.parse(JSON.stringify(settings))
    // Convert object maps → arrays so names are fully editable
    clone._panelList = Object.entries(clone.prices.panels).map(([name, d]) => ({ name, ...d }))
    clone._inverterList = Object.entries(clone.prices.inverters).map(([name, d]) => ({ name, ...d }))
    setForm(clone)
  }, [settings])

  function set(path, value) {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return next
    })
  }

  // ── Panel list helpers ──────────────────────────────────────────────────
  function updatePanel(idx, field, value) {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next._panelList[idx][field] = field === 'name' ? value : (parseFloat(value) || 0)
      return next
    })
  }

  function addPanel() {
    setForm(prev => ({
      ...prev,
      _panelList: [...prev._panelList, { name: '', wattage: 0, pricePerUnit: 0 }]
    }))
  }

  function removePanel(idx) {
    setForm(prev => ({
      ...prev,
      _panelList: prev._panelList.filter((_, i) => i !== idx)
    }))
  }

  // ── Inverter list helpers ───────────────────────────────────────────────
  function updateInverter(idx, field, value) {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next._inverterList[idx][field] = field === 'price' ? (parseFloat(value) || 0) : value
      return next
    })
  }

  function addInverter() {
    setForm(prev => ({
      ...prev,
      _inverterList: [...prev._inverterList, { name: '', phase: '1-Phase', price: 0 }]
    }))
  }

  function removeInverter(idx) {
    setForm(prev => ({
      ...prev,
      _inverterList: prev._inverterList.filter((_, i) => i !== idx)
    }))
  }

  // ── Structure / Wiring helpers ──────────────────────────────────────────
  function setStructurePrice(key, value) {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next.prices.structures[key] = parseFloat(value) || 0
      return next
    })
  }

  function setWiringPrice(key, value) {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next.prices.wiringKits[key] = parseFloat(value) || 0
      return next
    })
  }

  // ── Save ────────────────────────────────────────────────────────────────
  async function handleChooseFolder() {
    setFolderBusy(true)
    try {
      const result = await window.electronAPI.chooseDataFolder()
      if (result.success) {
        setFolderInfo(await window.electronAPI.getDataFolder())
        setToast({ msg: 'Data folder updated. Restart the app to load data from the new location.', type: 'success' })
      }
    } finally {
      setFolderBusy(false)
    }
  }

  async function handleResetFolder() {
    if (!window.confirm('Reset to default data folder? Your data will be copied back.')) return
    setFolderBusy(true)
    try {
      await window.electronAPI.resetDataFolder()
      setFolderInfo(await window.electronAPI.getDataFolder())
      setToast({ msg: 'Reset to default folder. Restart the app to apply.', type: 'success' })
    } finally {
      setFolderBusy(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const toSave = JSON.parse(JSON.stringify(form))

      // Convert _panelList array → panels object (skip blank-name rows)
      toSave.prices.panels = {}
      form._panelList.forEach(p => {
        const name = p.name.trim()
        if (name) toSave.prices.panels[name] = { wattage: p.wattage, pricePerUnit: p.pricePerUnit }
      })

      // Convert _inverterList array → inverters object
      toSave.prices.inverters = {}
      form._inverterList.forEach(inv => {
        const name = inv.name.trim()
        if (name) toSave.prices.inverters[name] = { price: inv.price, phase: inv.phase }
      })

      delete toSave._panelList
      delete toSave._inverterList

      await saveSettings(toSave)
      setToast({ msg: 'Settings saved successfully!', type: 'success' })
    } catch (err) {
      setToast({ msg: 'Save failed: ' + err.message, type: 'error' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (!form) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading settings...</div>

  const rowStyle = { borderBottom: '1px solid var(--gray-100)' }
  const tdPad = { padding: '8px 10px' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Manage company information, pricing defaults, and warranty terms</p>
        </div>
        <button className="btn btn-amber" onClick={handleSave} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>

      {/* Google Drive Sync */}
      <div className="settings-section">
        <div className="settings-section-title"><RefreshCw size={17} /> Google Drive Sync</div>
        <div className="card">
          <div className="card-body">

            {/* How it works */}
            <div style={{ background: 'var(--navy-light)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Info size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--gray-800)' }}>How to sync across 3 devices — no API, completely free:</strong>
                <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  <li>Install <strong>Google Drive Desktop</strong> on all 3 PCs (it's free at drive.google.com/drive/download)</li>
                  <li>Sign in with the <strong>same Google account</strong> on all 3 PCs</li>
                  <li>On this PC, click <strong>"Change Folder"</strong> below and pick a folder inside your Google Drive</li>
                  <li>On the other 2 PCs, do the same — pick the <strong>exact same folder</strong></li>
                  <li>Google Drive Desktop syncs the files automatically in the background</li>
                </ol>
              </div>
            </div>

            {/* Current folder */}
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Current Data Folder</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  flex: 1, padding: '8px 12px', background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)', borderRadius: 6, fontSize: 13,
                  fontFamily: 'monospace', color: 'var(--gray-700)', wordBreak: 'break-all'
                }}>
                  {folderInfo?.current || '…'}
                </div>
                {folderInfo?.isCustom && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#10B981', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <CheckCircle size={13} /> Custom
                  </span>
                )}
              </div>
              {folderInfo?.isCustom && (
                <div className="form-hint" style={{ marginTop: 4 }}>
                  ✅ Using a custom folder — make sure Google Drive Desktop is syncing this location.
                </div>
              )}
              {folderInfo?.isDefault && (
                <div className="form-hint" style={{ marginTop: 4 }}>
                  Using the default local folder. Change it to a Google Drive folder to enable sync.
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-amber" onClick={handleChooseFolder} disabled={folderBusy}>
                <FolderOpen size={14} /> {folderBusy ? 'Choosing…' : 'Change Folder'}
              </button>
              {folderInfo?.isCustom && (
                <button className="btn btn-outline" onClick={handleResetFolder} disabled={folderBusy}>
                  <RotateCcw size={14} /> Reset to Default
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="settings-section">
        <div className="settings-section-title"><Building size={17} /> Company Details</div>
        <div className="card">
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input className="form-control" value={form.company.name} onChange={e => set('company.name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input className="form-control" value={form.company.contactPerson} onChange={e => set('company.contactPerson', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-control" rows={2} value={form.company.address} onChange={e => set('company.address', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input className="form-control" value={form.company.gst} onChange={e => set('company.gst', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Numbers</label>
                <input className="form-control" value={form.company.contact} onChange={e => set('company.contact', e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email</label>
              <input className="form-control" value={form.company.email} onChange={e => set('company.email', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="settings-section">
        <div className="settings-section-title"><CreditCard size={17} /> Bank Details</div>
        <div className="card">
          <div className="card-body">
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Bank Name / Branch</label>
                <input className="form-control" value={form.bank.name} onChange={e => set('bank.name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input className="form-control" value={form.bank.account} onChange={e => set('bank.account', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">IFSC Code</label>
                <input className="form-control" value={form.bank.ifsc} onChange={e => set('bank.ifsc', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Default Values */}
      <div className="settings-section">
        <div className="settings-section-title"><SettingsIcon size={17} /> Default Values</div>
        <div className="card">
          <div className="card-body">
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Default Govt. Subsidy (₹)</label>
                <input className="form-control" type="number" value={form.defaults.subsidy} onChange={e => set('defaults.subsidy', e.target.value)} />
                <div className="form-hint">PM Surya Ghar Muft Bijli Yojana</div>
              </div>
              <div className="form-group">
                <label className="form-label">Default GST %</label>
                <input className="form-control" type="number" step="0.5" value={form.defaults.gstPercent} onChange={e => set('defaults.gstPercent', e.target.value)} />
                <div className="form-hint">0 = GST inclusive pricing</div>
              </div>
              <div className="form-group">
                <label className="form-label">AMC Years</label>
                <input className="form-control" type="number" value={form.defaults.amcYears} onChange={e => set('defaults.amcYears', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Panel Warranty (Years)</label>
                <input className="form-control" type="number" value={form.defaults.panelWarranty} onChange={e => set('defaults.panelWarranty', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Inverter Warranty (Years)</label>
                <input className="form-control" type="number" value={form.defaults.inverterWarranty} onChange={e => set('defaults.inverterWarranty', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Solar Panel Pricing */}
      <div className="settings-section">
        <div className="settings-section-title"><Sun size={17} /> Solar Panel Pricing</div>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <TH>Panel Model / Name</TH>
                    <TH center width={130}>Wattage (Wp)</TH>
                    <TH center width={160}>Price per Panel (₹)</TH>
                    <TH center width={52}></TH>
                  </tr>
                </thead>
                <tbody>
                  {form._panelList.map((p, i) => (
                    <tr key={i} style={rowStyle}>
                      <td style={tdPad}>
                        <input
                          className="form-control"
                          placeholder="e.g. ADANI 610 Wp DCR TOPCON Bifacial"
                          value={p.name}
                          onChange={e => updatePanel(i, 'name', e.target.value)}
                          style={{ fontWeight: 500 }}
                        />
                      </td>
                      <td style={tdPad}>
                        <input
                          className="form-control"
                          type="number"
                          style={{ textAlign: 'center' }}
                          value={p.wattage}
                          onChange={e => updatePanel(i, 'wattage', e.target.value)}
                        />
                      </td>
                      <td style={tdPad}>
                        <input
                          className="form-control"
                          type="number"
                          style={{ textAlign: 'right' }}
                          value={p.pricePerUnit}
                          onChange={e => updatePanel(i, 'pricePerUnit', e.target.value)}
                        />
                      </td>
                      <td style={{ ...tdPad, textAlign: 'center' }}>
                        <button
                          onClick={() => removePanel(i)}
                          title="Remove panel"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 4, borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-400)'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 12px', borderTop: form._panelList.length ? '1px solid var(--gray-100)' : 'none' }}>
              <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={addPanel}>
                <Plus size={14} /> Add Panel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inverter Pricing */}
      <div className="settings-section">
        <div className="settings-section-title"><Cpu size={17} /> Inverter Pricing</div>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <TH>Inverter Model / Name</TH>
                    <TH center width={130}>Phase</TH>
                    <TH center width={160}>Price (₹)</TH>
                    <TH center width={52}></TH>
                  </tr>
                </thead>
                <tbody>
                  {form._inverterList.map((inv, i) => (
                    <tr key={i} style={rowStyle}>
                      <td style={tdPad}>
                        <input
                          className="form-control"
                          placeholder="e.g. Polycab 5kW On-Grid 1-Phase"
                          value={inv.name}
                          onChange={e => updateInverter(i, 'name', e.target.value)}
                          style={{ fontWeight: 500 }}
                        />
                      </td>
                      <td style={tdPad}>
                        <select
                          className="form-control"
                          value={inv.phase}
                          onChange={e => updateInverter(i, 'phase', e.target.value)}
                        >
                          <option>1-Phase</option>
                          <option>3-Phase</option>
                        </select>
                      </td>
                      <td style={tdPad}>
                        <input
                          className="form-control"
                          type="number"
                          style={{ textAlign: 'right' }}
                          value={inv.price}
                          onChange={e => updateInverter(i, 'price', e.target.value)}
                        />
                      </td>
                      <td style={{ ...tdPad, textAlign: 'center' }}>
                        <button
                          onClick={() => removeInverter(i)}
                          title="Remove inverter"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 4, borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-400)'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 12px', borderTop: form._inverterList.length ? '1px solid var(--gray-100)' : 'none' }}>
              <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={addInverter}>
                <Plus size={14} /> Add Inverter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Structure & Wiring Prices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="settings-section">
        <div>
          <div className="settings-section-title"><Zap size={17} /> Mounting Structure Prices</div>
          <div className="card">
            <div className="card-body">
              {Object.entries(form.prices.structures).map(([key, price]) => (
                <div key={key} className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">{key}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 13 }}>₹</span>
                    <input className="form-control" type="number" style={{ paddingLeft: 22 }} value={price} onChange={e => setStructurePrice(key, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="settings-section-title"><Zap size={17} /> Wiring & LA Kit Prices</div>
          <div className="card">
            <div className="card-body">
              {Object.entries(form.prices.wiringKits).map(([key, price]) => (
                <div key={key} className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">{key}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 13 }}>₹</span>
                    <input className="form-control" type="number" style={{ paddingLeft: 22 }} value={price} onChange={e => setWiringPrice(key, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save (bottom) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, marginBottom: 32 }}>
        <button className="btn btn-amber btn-lg" onClick={handleSave} disabled={saving}>
          <Save size={17} /> {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
