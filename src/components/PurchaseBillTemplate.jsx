// Generates a self-contained HTML "Bill" for purchase bills — matches Vyapar Bill format

export function generatePurchaseBillHTML(bill, settings) {
  const company = settings?.company || {}

  function inr(n) {
    return '₹\u00a0' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  function inrWhole(n) {
    return '₹\u00a0' + Number(n || 0).toLocaleString('en-IN')
  }

  const dateStr = bill.date
    ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''
  const timeStr = bill.time || ''

  // Compute totals from line items
  const items     = bill.items || []
  const subtotal  = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const totalGst  = items.reduce((s, i) => s + (parseFloat(i.gstAmt) || 0), 0)
  const roundOff  = bill.roundOff || 0
  const total     = Math.round(subtotal + roundOff)
  const paid      = parseFloat(bill.paid) || 0
  const balance   = total - paid

  // Tax summary — group by HSN
  const hsnMap = {}
  items.forEach(item => {
    const hsn  = item.hsn || '—'
    const base = (parseFloat(item.pricePerUnit) || 0) * (parseFloat(item.qty) || 1)
    const gst  = parseFloat(item.gstAmt) || 0
    const rate = parseFloat(item.gstRate) || 0
    if (!hsnMap[hsn]) hsnMap[hsn] = { base: 0, gst: 0, rate }
    hsnMap[hsn].base += base
    hsnMap[hsn].gst  += gst
  })
  const hsnRows = Object.entries(hsnMap)

  function amountInWords(n) {
    if (!n) return 'Zero Rupees only'
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
      'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    function w(x) {
      if (x < 20)        return ones[x]
      if (x < 100)       return tens[Math.floor(x/10)] + (x%10 ? ' '+ones[x%10] : '')
      if (x < 1000)      return ones[Math.floor(x/100)] + ' Hundred' + (x%100 ? ' '+w(x%100) : '')
      if (x < 100000)    return w(Math.floor(x/1000))   + ' Thousand' + (x%1000   ? ' '+w(x%1000)   : '')
      if (x < 10000000)  return w(Math.floor(x/100000)) + ' Lakh'     + (x%100000 ? ' '+w(x%100000) : '')
      return w(Math.floor(x/10000000)) + ' Crore' + (x%10000000 ? ' '+w(x%10000000) : '')
    }
    return w(n) + ' Rupees only'
  }

  const itemRows = items.map((item, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><div class="item-main">${item.name || ''}</div></td>
      <td class="center">${item.hsn || ''}</td>
      <td class="center">${item.qty || 1}</td>
      <td class="center">${item.unit || 'Nos'}</td>
      <td class="right">${inr(item.pricePerUnit)}</td>
      <td class="right">${inr(item.gstAmt)}&nbsp;<span style="font-size:10.5px;color:#64748b">(${item.gstRate || 0}%)</span></td>
      <td class="right" style="font-weight:600">${inr(item.amount)}</td>
    </tr>`).join('')

  const taxSummaryRows = hsnRows.map(([hsn, d]) => {
    const cgst = Math.round(d.gst / 2 * 100) / 100
    const sgst = d.gst - cgst
    const cgstRate = d.rate / 2
    return `
      <tr>
        <td class="left">${hsn}</td>
        <td>${inr(d.base)}</td>
        <td>${cgstRate}</td><td>${inr(cgst)}</td>
        <td>${cgstRate}</td><td>${inr(sgst)}</td>
        <td>${inr(d.gst)}</td>
      </tr>`
  }).join('')

  const totBase = hsnRows.reduce((s, [, d]) => s + d.base, 0)
  const totGst  = hsnRows.reduce((s, [, d]) => s + d.gst,  0)
  const totCGST = Math.round(totGst / 2 * 100) / 100
  const totSGST = totGst - totCGST

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Bill — ${bill.id}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: white; }
.page { max-width: 794px; margin: 0 auto; padding: 20px 28px 24px; min-height: 1123px; }
.inv-title {
  text-align: center; font-size: 18px; font-weight: 800; color: #0F2A4A;
  text-transform: uppercase; letter-spacing: 1px;
  border-bottom: 2px solid #0F2A4A; padding-bottom: 6px; margin-bottom: 14px;
}
/* Company header */
.company-header {
  display: flex; align-items: stretch; gap: 0;
  border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 14px;
}
.logo-space {
  width: 110px; min-height: 100px; flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: center; background: #f8fafc;
}
.logo-circle {
  width: 80px; height: 80px;
  border: 2px dashed #cbd5e1; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  text-align: center; font-size: 9.5px; color: #94a3b8; line-height: 1.4;
}
.company-info { flex: 1; padding: 12px 16px; }
.company-name { font-size: 20px; font-weight: 900; color: #0F2A4A; letter-spacing: -.3px; }
.company-addr { font-size: 11px; color: #475569; margin-top: 3px; line-height: 1.5; }
.company-line { font-size: 11.5px; color: #475569; margin-top: 3px; }
.company-line strong { color: #1e293b; }
/* Bill From / Bill Details */
.meta-row {
  display: grid; grid-template-columns: 1fr 1fr;
  border: 1px solid #94a3b8; border-radius: 4px; margin-bottom: 14px;
}
.meta-col { padding: 10px 12px; }
.meta-col:first-child { border-right: 1px solid #94a3b8; }
.meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #64748b; margin-bottom: 5px; }
.meta-name  { font-size: 14px; font-weight: 700; color: #0F2A4A; }
.meta-sub   { font-size: 11.5px; color: #475569; margin-top: 2px; }
.inv-no     { font-size: 13px; font-weight: 700; color: #0F2A4A; }
.inv-row    { font-size: 12px; color: #475569; margin-top: 3px; }
/* Items table */
table.items { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 12px; }
table.items th {
  background: #0F2A4A; color: white; padding: 8px 10px;
  font-size: 11px; font-weight: 600; text-align: left; border: 1px solid #1e3a5f;
}
table.items th.right { text-align: right; }
table.items th.center { text-align: center; }
table.items td { padding: 9px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
table.items td.right  { text-align: right; white-space: nowrap; }
table.items td.center { text-align: center; }
.item-main { font-weight: 700; font-size: 12.5px; color: #0F2A4A; }
.total-row td { background: #f1f5f9; font-weight: 700; border-top: 2px solid #94a3b8; }
/* Bottom: tax summary + totals */
.bottom-section { display: grid; grid-template-columns: 1fr auto; gap: 0; border: 1px solid #cbd5e1; border-top: none; }
.tax-summary { padding: 10px; border-right: 1px solid #cbd5e1; }
.tax-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #0F2A4A; margin-bottom: 7px; }
table.tax { width: 100%; border-collapse: collapse; font-size: 11px; }
table.tax th { background: #f8fafc; padding: 5px 7px; border: 1px solid #cbd5e1; font-weight: 600; text-align: center; font-size: 10.5px; }
table.tax td { padding: 5px 7px; border: 1px solid #cbd5e1; text-align: right; }
table.tax td.left { text-align: left; }
table.tax tr.foot td { background: #f1f5f9; font-weight: 700; }
.totals-panel { width: 220px; padding: 0; }
.totals-row { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
.totals-row.subtotal  { font-weight: 600; }
.totals-row.roundoff  { color: #64748b; font-size: 11.5px; }
.totals-row.grand     { background: #0F2A4A; color: white; font-weight: 700; font-size: 13px; }
.totals-row.words     { font-size: 10.5px; color: #475569; font-style: italic; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; }
.totals-row.paid-row  { color: #16a34a; font-weight: 600; }
.totals-row.balance   { background: #fef3c7; font-weight: 800; font-size: 13px; color: #92400e; }
/* Terms + footer */
.terms-block { border: 1px solid #cbd5e1; border-top: none; padding: 8px 12px; }
.terms-title { font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #0F2A4A; margin-bottom: 4px; }
.terms-text  { font-size: 11px; color: #475569; }
.footer-row  {
  display: flex; justify-content: flex-end;
  border: 1px solid #cbd5e1; border-top: none; padding: 10px 12px;
}
.sig-block { text-align: right; }
.sig-company { font-weight: 700; color: #0F2A4A; font-size: 13px; }
.sig-stamp {
  border: 2px dashed #cbd5e1; width: 100px; height: 55px;
  display: flex; align-items: center; justify-content: center;
  font-size: 9.5px; color: #94a3b8; text-align: center;
  border-radius: 4px; margin: 6px 0 8px auto;
}
.sig-label { font-size: 11px; color: #64748b; }
</style>
</head>
<body>
<div class="page">

  <div class="inv-title">Bill</div>

  <!-- Company Header -->
  <div class="company-header">
    <div class="logo-space">
      <div class="logo-circle">Company<br>Logo</div>
    </div>
    <div class="company-info">
      <div class="company-name">${company.name || 'PV-Enviro Energies Pvt. Ltd.'}</div>
      <div class="company-addr">${(company.address || '').replace(/,\s*/g, ', ')}</div>
      <div class="company-line">Phone: <strong>${company.contact || ''}</strong> &nbsp;&nbsp; Email: <strong>${company.email || ''}</strong></div>
      <div class="company-line">GSTIN: <strong>${company.gst || ''}</strong> &nbsp;&nbsp; State: <strong>27-Maharashtra</strong></div>
    </div>
  </div>

  <!-- Bill From + Bill Details -->
  <div class="meta-row">
    <div class="meta-col">
      <div class="meta-label">Bill From:</div>
      <div class="meta-name">${bill.supplierName || ''}</div>
      ${bill.supplierContact ? `<div class="meta-sub">Contact No: ${bill.supplierContact}</div>` : ''}
      ${bill.supplierGst     ? `<div class="meta-sub">GSTIN: ${bill.supplierGst}</div>`          : ''}
      ${bill.supplierAddress ? `<div class="meta-sub">${bill.supplierAddress}</div>`              : ''}
    </div>
    <div class="meta-col">
      <div class="meta-label">Bill Details:</div>
      <div class="inv-no">No: &nbsp;${bill.supplierBillNo || bill.id}</div>
      <div class="inv-row">Date: &nbsp;${dateStr}</div>
      ${timeStr                ? `<div class="inv-row">Time: &nbsp;${timeStr}</div>`                                   : ''}
      ${bill.placeOfSupply     ? `<div class="inv-row">Place Of Supply: &nbsp;<strong>${bill.placeOfSupply}</strong></div>` : ''}
    </div>
  </div>

  <!-- Items Table -->
  <table class="items">
    <thead>
      <tr>
        <th style="width:26px">#</th>
        <th>Item name</th>
        <th class="center" style="width:72px">HSN/ SAC</th>
        <th class="center" style="width:52px">Quantity</th>
        <th class="center" style="width:46px">Unit</th>
        <th class="right"  style="width:100px">Price/ Unit(&#8377;)</th>
        <th class="right"  style="width:116px">GST(&#8377;)</th>
        <th class="right"  style="width:100px">Amount(&#8377;)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="3" style="padding-left:10px">Total</td>
        <td class="center">${items.length}</td>
        <td></td><td></td>
        <td class="right">${inr(totalGst)}</td>
        <td class="right">${inr(subtotal)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Tax Summary + Totals -->
  <div class="bottom-section">
    <div class="tax-summary">
      <div class="tax-title">Tax Summary:</div>
      <table class="tax">
        <thead>
          <tr>
            <th rowspan="2" class="left" style="text-align:left;vertical-align:middle">HSN/ SAC</th>
            <th rowspan="2" style="vertical-align:middle">Taxable<br>amount (&#8377;)</th>
            <th colspan="2">CGST</th>
            <th colspan="2">SGST</th>
            <th rowspan="2" style="vertical-align:middle">Total Tax (&#8377;)</th>
          </tr>
          <tr>
            <th>Rate&nbsp;(%)</th><th>Amt&nbsp;(&#8377;)</th>
            <th>Rate&nbsp;(%)</th><th>Amt&nbsp;(&#8377;)</th>
          </tr>
        </thead>
        <tbody>
          ${taxSummaryRows}
          <tr class="foot">
            <td class="left">TOTAL</td>
            <td>${inr(totBase)}</td>
            <td></td><td>${inr(totCGST)}</td>
            <td></td><td>${inr(totSGST)}</td>
            <td>${inr(totGst)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="totals-panel">
      <div class="totals-row subtotal"><span>Sub Total</span><span>${inrWhole(subtotal)}</span></div>
      ${roundOff !== 0 ? `<div class="totals-row roundoff"><span>Round Off</span><span>${roundOff < 0 ? '-\u00a0' : ''}${inrWhole(Math.abs(roundOff))}</span></div>` : ''}
      <div class="totals-row grand"><span>Total</span><span>${inrWhole(total)}</span></div>
      <div class="totals-row words" style="display:block">
        Bill Amount in Words:<br>
        <strong style="color:#1e293b;font-style:normal">${amountInWords(total)}</strong>
      </div>
      <div class="totals-row paid-row"><span>Paid</span><span>${inrWhole(paid)}</span></div>
      <div class="totals-row balance"><span>Balance</span><span>${inrWhole(balance)}</span></div>
    </div>
  </div>

  <!-- Terms -->
  <div class="terms-block">
    <div class="terms-title">Terms &amp; Conditions:</div>
    <div class="terms-text">${bill.terms || 'Thanks for doing business with us!'}</div>
  </div>

  <!-- Signature only (no bank on purchase bills) -->
  <div class="footer-row">
    <div class="sig-block">
      <div class="sig-company">For ${company.name || ''}:</div>
      <div class="sig-stamp">Stamp &amp;<br>Signature</div>
      <div class="sig-label">Authorized Signatory</div>
    </div>
  </div>

</div>
</body>
</html>`
}
