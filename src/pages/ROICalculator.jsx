import React, { useState, useMemo } from 'react'
import { Calculator, TrendingUp, Sun, IndianRupee, Zap } from 'lucide-react'

function inr(n) { return '₹' + Number(Math.round(n)).toLocaleString('en-IN') }
function yr(n) { return Number(n).toFixed(1) + ' yrs' }

export default function ROICalculator() {
  const [form, setForm] = useState({
    systemCapacity: 5,
    monthlyUnits: 600,
    electricityRate: 8,
    systemCost: 300000,
    subsidy: 78000,
    tariffIncrease: 5
  })

  function set(k, v) { setForm(p => ({ ...p, [k]: parseFloat(v) || 0 })) }

  const result = useMemo(() => {
    const netInvestment = Math.max(0, form.systemCost - form.subsidy)
    const annualUnits = form.monthlyUnits * 12
    const annualSavings = annualUnits * form.electricityRate
    const paybackYears = annualSavings > 0 ? netInvestment / annualSavings : 0

    // 25-year projection with tariff increase
    let totalSavings = 0
    let currentRate = form.electricityRate
    for (let y = 1; y <= 25; y++) {
      totalSavings += annualUnits * currentRate
      currentRate *= (1 + form.tariffIncrease / 100)
    }
    const netProfit = totalSavings - netInvestment

    // Accurate payback with tariff increase
    let cumSavings = 0
    let paybackAccurate = 0
    let r = form.electricityRate
    for (let y = 1; y <= 25; y++) {
      cumSavings += annualUnits * r
      r *= (1 + form.tariffIncrease / 100)
      if (cumSavings >= netInvestment && paybackAccurate === 0) {
        paybackAccurate = y
      }
    }

    return { netInvestment, annualUnits, annualSavings, paybackYears, paybackAccurate: paybackAccurate || paybackYears, totalSavings, netProfit }
  }, [form])

  const ROI_PCT = result.netInvestment > 0
    ? Math.round((result.netProfit / result.netInvestment) * 100)
    : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>ROI Calculator</h2>
          <p>Estimate solar investment returns and payback period</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Input Form */}
        <div className="card">
          <div className="card-header">
            <h3><Calculator size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />Input Parameters</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">System Capacity (kW)</label>
              <input className="form-control" type="number" step="0.1" min="0"
                value={form.systemCapacity} onChange={e => set('systemCapacity', e.target.value)} />
              <div className="form-hint">Total installed capacity</div>
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Generation (kWh)</label>
              <input className="form-control" type="number" min="0"
                value={form.monthlyUnits} onChange={e => set('monthlyUnits', e.target.value)} />
              <div className="form-hint">Approx. units generated per month</div>
            </div>

            <div className="form-group">
              <label className="form-label">Electricity Tariff (₹/kWh)</label>
              <input className="form-control" type="number" step="0.5" min="0"
                value={form.electricityRate} onChange={e => set('electricityRate', e.target.value)} />
              <div className="form-hint">Current per-unit electricity rate</div>
            </div>

            <div className="form-group">
              <label className="form-label">System Cost (₹)</label>
              <input className="form-control" type="number" min="0"
                value={form.systemCost} onChange={e => set('systemCost', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Govt. Subsidy (₹)</label>
              <input className="form-control" type="number" min="0"
                value={form.subsidy} onChange={e => set('subsidy', e.target.value)} />
              <div className="form-hint">PM Surya Ghar Muft Bijli Yojana</div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Annual Tariff Increase (%)</label>
              <input className="form-control" type="number" step="0.5" min="0" max="20"
                value={form.tariffIncrease} onChange={e => set('tariffIncrease', e.target.value)} />
              <div className="form-hint">Expected annual electricity price rise</div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Net Investment', value: inr(result.netInvestment), icon: IndianRupee, color: 'var(--navy)', bg: 'rgba(15,42,74,.06)' },
              { label: 'Annual Savings', value: inr(result.annualSavings), icon: TrendingUp, color: 'var(--green)', bg: 'var(--green-light)' },
              { label: 'Payback Period', value: yr(result.paybackAccurate), icon: Sun, color: 'var(--amber-dark)', bg: 'rgba(245,166,35,.1)' },
              { label: 'Annual Units', value: result.annualUnits.toLocaleString('en-IN') + ' kWh', icon: Zap, color: 'var(--blue)', bg: 'var(--blue-light)' },
              { label: '25-Year Savings', value: inr(result.totalSavings), icon: TrendingUp, color: 'var(--green)', bg: 'var(--green-light)' },
              { label: 'Net Profit (25 Yr)', value: inr(result.netProfit), icon: IndianRupee, color: result.netProfit >= 0 ? 'var(--green)' : 'var(--red)', bg: result.netProfit >= 0 ? 'var(--green-light)' : 'var(--red-light)' },
            ].map(m => {
              const Icon = m.icon
              return (
                <div key={m.label} className="card" style={{ padding: '18px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={m.color} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{m.label}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ROI Gauge */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 10 }}>Return on Investment (25 Years)</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 48, fontWeight: 800, color: ROI_PCT >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {ROI_PCT}%
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>
                Earn back {inr(result.netProfit)} profit over 25 years on {inr(result.netInvestment)} net investment
              </div>
            </div>
          </div>

          {/* Year-by-Year Table */}
          <div className="card">
            <div className="card-header">
              <h3>Year-by-Year Projection</h3>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ background: 'var(--gray-50)', padding: '8px 14px', borderBottom: '1px solid var(--gray-200)', textAlign: 'left', color: 'var(--gray-500)', fontWeight: 600, fontSize: 11 }}>Year</th>
                    <th style={{ background: 'var(--gray-50)', padding: '8px 14px', borderBottom: '1px solid var(--gray-200)', textAlign: 'right', color: 'var(--gray-500)', fontWeight: 600, fontSize: 11 }}>Rate (₹/kWh)</th>
                    <th style={{ background: 'var(--gray-50)', padding: '8px 14px', borderBottom: '1px solid var(--gray-200)', textAlign: 'right', color: 'var(--gray-500)', fontWeight: 600, fontSize: 11 }}>Annual Saving</th>
                    <th style={{ background: 'var(--gray-50)', padding: '8px 14px', borderBottom: '1px solid var(--gray-200)', textAlign: 'right', color: 'var(--gray-500)', fontWeight: 600, fontSize: 11 }}>Cumulative</th>
                    <th style={{ background: 'var(--gray-50)', padding: '8px 14px', borderBottom: '1px solid var(--gray-200)', textAlign: 'right', color: 'var(--gray-500)', fontWeight: 600, fontSize: 11 }}>Net Position</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = []
                    let cumSavings = 0
                    let rate = form.electricityRate
                    const annualUnits = form.monthlyUnits * 12
                    for (let y = 1; y <= 25; y++) {
                      const saving = annualUnits * rate
                      cumSavings += saving
                      const netPos = cumSavings - result.netInvestment
                      const isPaid = netPos >= 0
                      rows.push(
                        <tr key={y} style={{ background: isPaid ? 'rgba(16,185,129,.04)' : 'white', borderBottom: '1px solid var(--gray-100)' }}>
                          <td style={{ padding: '7px 14px', fontWeight: 600, color: 'var(--gray-700)' }}>
                            Year {y}
                            {Math.ceil(result.paybackAccurate) === y && (
                              <span style={{ marginLeft: 6, background: 'var(--green)', color: 'white', fontSize: 9.5, padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>Payback</span>
                            )}
                          </td>
                          <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--gray-600)' }}>₹{rate.toFixed(2)}</td>
                          <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--green)', fontWeight: 600 }}>{inr(saving)}</td>
                          <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>{inr(cumSavings)}</td>
                          <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: isPaid ? 'var(--green)' : 'var(--red)' }}>
                            {netPos >= 0 ? '+' : ''}{inr(netPos)}
                          </td>
                        </tr>
                      )
                      rate *= (1 + form.tariffIncrease / 100)
                    }
                    return rows
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
