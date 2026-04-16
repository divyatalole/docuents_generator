// Generates a self-contained HTML string for PDF export
export function generatePrintHTML(quote, settings) {
  const company = settings?.company || {}
  const bank = settings?.bank || {}
  const defs = settings?.defaults || {}

  function inr(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN')
  }

  const dateStr = quote.date
    ? new Date(quote.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  const warrantyPanel = defs.panelWarranty || 25
  const warrantyInverter = defs.inverterWarranty || 10

  // Pricing: user-entered Final Amount — 70% @5% GST + 30% @18% GST
  const systemCapacity = parseFloat(quote.systemCapacity) || 0
  const finalAmount    = parseFloat(quote.finalAmount) || 0
  const legacyTotal    = systemCapacity * (parseFloat(quote.ratePerKw) || 60000)
  const totalCost      = Math.round(finalAmount > 0 ? finalAmount : legacyTotal)
  const solarPortion   = Math.round(totalCost * 0.70)
  const commPortion    = totalCost - solarPortion
  const solarBase      = Math.round(solarPortion / 1.05)
  const solarGst       = solarPortion - solarBase
  const commBase       = Math.round(commPortion / 1.18)
  const commGst        = commPortion - commBase

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Quotation — ${quote.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #1e293b;
    background: white;
    padding: 0;
  }
  .page {
    max-width: 794px;
    margin: 0 auto;
    padding: 32px 36px;
    min-height: 1123px;
    position: relative;
  }
  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #0F2A4A;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .company-name {
    font-size: 22px;
    font-weight: 800;
    color: #0F2A4A;
    letter-spacing: -.3px;
  }
  .company-tag {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .company-info { font-size: 11.5px; color: #475569; line-height: 1.7; text-align: right; }
  .gst-chip {
    display: inline-block;
    background: #F5A623;
    color: #0F2A4A;
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
    margin-top: 4px;
  }
  /* Quote Meta */
  .quote-meta {
    display: flex;
    justify-content: space-between;
    background: #0F2A4A;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 18px;
  }
  .quote-meta-item { text-align: center; }
  .quote-meta-label { font-size: 10px; opacity: .6; text-transform: uppercase; letter-spacing: .5px; }
  .quote-meta-value { font-size: 14px; font-weight: 700; margin-top: 2px; }
  /* Customer Block */
  .customer-block {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
  }
  .customer-label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #64748b; margin-bottom: 4px; font-weight: 600; }
  .customer-name { font-size: 15px; font-weight: 700; color: #0F2A4A; }
  .customer-detail { font-size: 12px; color: #475569; margin-top: 2px; }
  /* Subject */
  .subject-box {
    background: #f8fafc;
    border-left: 4px solid #F5A623;
    padding: 10px 14px;
    margin-bottom: 18px;
    font-size: 13px;
  }
  .subject-box strong { color: #0F2A4A; }
  /* Specs Table */
  .specs-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .specs-table th {
    background: #0F2A4A;
    color: white;
    padding: 9px 12px;
    font-size: 11.5px;
    text-align: left;
    font-weight: 600;
  }
  .specs-table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12.5px; }
  .specs-table tr:nth-child(even) td { background: #f8fafc; }
  /* Pricing Table */
  .pricing-table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 13px; }
  .pricing-table th {
    background: #0F2A4A;
    color: white;
    padding: 9px 10px;
    font-size: 11.5px;
    text-align: left;
  }
  .pricing-table th:nth-child(2), .pricing-table th:nth-child(3), .pricing-table th:nth-child(4) {
    text-align: right;
  }
  .total-row td { background: #0F2A4A !important; color: white !important; font-weight: 700; font-size: 13.5px; }
  .net-row td { background: #fef3c7 !important; color: #92400e; font-weight: 800; font-size: 14px; }
  /* Terms */
  .terms-section { margin-top: 20px; }
  .terms-title { font-size: 12px; font-weight: 700; color: #0F2A4A; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
  .terms-list { list-style: none; }
  .terms-list li { font-size: 11.5px; color: #475569; padding: 3px 0; padding-left: 14px; position: relative; }
  .terms-list li::before { content: '•'; position: absolute; left: 0; color: #F5A623; font-weight: 700; }
  /* Footer */
  .footer {
    margin-top: 24px;
    border-top: 2px solid #0F2A4A;
    padding-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .bank-details { font-size: 11px; color: #475569; line-height: 1.7; }
  .bank-details strong { color: #0F2A4A; display: block; margin-bottom: 2px; font-size: 11.5px; }
  .signature-block { text-align: right; }
  .sig-name { font-weight: 700; color: #0F2A4A; font-size: 13px; }
  .sig-label { font-size: 11px; color: #64748b; margin-top: 2px; }
  .stamp-box {
    border: 2px dashed #cbd5e1;
    width: 90px;
    height: 55px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9.5px;
    color: #94a3b8;
    text-align: center;
    border-radius: 4px;
    margin-bottom: 8px;
    margin-left: auto;
  }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; }
  .section-head { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #0F2A4A; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">${company.name || 'PV-Enviro Energies Pvt. Ltd.'}</div>
      <div class="company-tag">Solar Energy Solutions</div>
      <div class="gst-chip">GSTIN: ${company.gst || ''}</div>
    </div>
    <div class="company-info">
      ${(company.address || '').replace(/,/g, ',<br>')}
      <br>📞 ${company.contact || ''}
      <br>✉ ${company.email || ''}
    </div>
  </div>

  <!-- Quote Meta Bar -->
  <div class="quote-meta" style="grid-template-columns: repeat(3, 1fr); display: grid; justify-content: center;">
    <div class="quote-meta-item">
      <div class="quote-meta-label">Quotation No.</div>
      <div class="quote-meta-value">${quote.id}</div>
    </div>
    <div class="quote-meta-item">
      <div class="quote-meta-label">Date</div>
      <div class="quote-meta-value">${dateStr}</div>
    </div>
    <div class="quote-meta-item">
      <div class="quote-meta-label">System Capacity</div>
      <div class="quote-meta-value">${systemCapacity.toFixed(2)} kW</div>
    </div>
  </div>

  <!-- Customer -->
  <div class="customer-block">
    <div>
      <div class="customer-label">Quotation For</div>
      <div class="customer-name">${quote.customerName}</div>
      ${quote.contactNumber ? `<div class="customer-detail">📞 ${quote.contactNumber}</div>` : ''}
      ${quote.address ? `<div class="customer-detail">📍 ${quote.address}</div>` : ''}
    </div>
  </div>

  <!-- Subject -->
  <div class="subject-box">
    <strong>Subject:</strong> Quotation for Installation of ${systemCapacity.toFixed(2)} kW On-Grid Solar Power System
    (${quote.installationType || 'Rooftop'})
  </div>

  <!-- System Specifications -->
  <table class="specs-table">
    <thead>
      <tr>
        <th>Component</th>
        <th>Specification</th>
        <th>Quantity</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Solar Panel</td><td>${quote.panel}</td><td>${quote.panelCount} Nos.</td></tr>
      <tr><td>Inverter</td><td>${quote.inverter}</td><td>1 No.</td></tr>
      <tr><td>Installation</td><td>${quote.installationType || 'Rooftop'}</td><td>Complete</td></tr>
      <tr><td>System Capacity</td><td>${systemCapacity.toFixed(3)} kW</td><td>—</td></tr>
    </tbody>
  </table>

  <!-- Pricing Breakdown -->
  <table class="pricing-table">
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right">Taxable Value</th>
        <th style="text-align:right">GST</th>
        <th style="text-align:right">Total (incl. GST)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;">
          <strong>A. Solar Rooftop System</strong><br>
          <span style="font-size:11.5px;color:#64748b;">Solar Panels (${quote.panel}) × ${quote.panelCount} + Solar Inverter (${quote.inverter})</span>
        </td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;">${inr(solarBase)}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;">${inr(solarGst)}<br><span style="font-size:10px;color:#64748b;">@5% GST</span></td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">${inr(solarPortion)}</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;">
          <strong>B. Installation &amp; Commissioning</strong><br>
          <span style="font-size:11.5px;color:#64748b;">Civil work, mounting, wiring, testing &amp; grid connection</span>
        </td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;background:#f8fafc;">${inr(commBase)}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;background:#f8fafc;">${inr(commGst)}<br><span style="font-size:10px;color:#64748b;">@18% GST</span></td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:600;background:#f8fafc;">${inr(commPortion)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="padding:9px 10px;border:1px solid #1e3a5f;text-align:right;">Total System Cost (A + B)</td>
        <td style="padding:9px 10px;border:1px solid #1e3a5f;text-align:right;font-size:14px;">${inr(totalCost)}</td>
      </tr>
      <tr class="net-row">
        <td colspan="3" style="padding:10px 10px;border:1px solid #f59e0b;text-align:right;font-size:13.5px;">NET PAYABLE AMOUNT</td>
        <td style="padding:10px 10px;border:1px solid #f59e0b;text-align:right;font-size:15px;">${inr(totalCost)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Terms & Warranty -->
  <div class="two-col">
    <div>
      <div class="section-head">Warranty Terms</div>
      <ul class="terms-list">
        <li>Solar Panels: <strong>${warrantyPanel} Years</strong> Performance Warranty</li>
        <li>Inverter: <strong>${warrantyInverter} Years</strong> Replacement Warranty</li>
        <li>Mounting Structure: <strong>10 Years</strong> Structural Warranty</li>
        <li>Wiring & Cabling: <strong>1 Year</strong> Workmanship Warranty</li>
        <li>AMC Support Available (Optional)</li>
      </ul>
    </div>
    <div>
      <div class="section-head">Payment Terms</div>
      <ul class="terms-list">
        <li><strong>25%</strong> at booking (fabrication advance)</li>
        <li><strong>65%</strong> before dispatch of panels / inverter / materials</li>
        <li><strong>10%</strong> before meter fixing & system handover</li>
        <li>Cheque / NEFT / UPI accepted</li>
      </ul>
    </div>
  </div>

  ${quote.notes ? `
  <div style="margin-top:14px;padding:10px 14px;background:#f8fafc;border-radius:6px;font-size:12px;color:#475569;">
    <strong>Notes:</strong> ${quote.notes}
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      <div class="bank-details">
        <strong>Bank Details for NEFT / Transfer</strong>
        ${bank.name || ''}<br>
        A/C No: ${bank.account || ''}<br>
        IFSC: ${bank.ifsc || ''}
      </div>
      <div style="margin-top:10px;font-size:11px;color:#94a3b8;">
        For: <strong style="color:#0F2A4A">${company.name || ''}</strong><br>
        Contact: ${company.contactPerson || ''} | ${company.contact || ''}
      </div>
    </div>
    <div class="signature-block">
      <div class="stamp-box">Stamp &<br>Signature</div>
      <div class="sig-name">${company.name || ''}</div>
      <div class="sig-label">Authorised Signatory</div>
    </div>
  </div>

  <div style="text-align:center;margin-top:18px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;">
    This quotation is valid for 30 days from the date of issue. Prices are subject to change without prior notice. GST applicable as per government rates.
  </div>
</div>
</body>
</html>`
}
