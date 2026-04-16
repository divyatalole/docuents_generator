// Generates a self-contained HTML Tax Invoice string for PDF export

export function generateBillHTML(bill, settings) {
  const company = settings?.company || {}
  const bank    = settings?.bank    || {}

  function inr(n) {
    return '₹\u00a0' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function inrWhole(n) {
    return '₹\u00a0' + Number(n || 0).toLocaleString('en-IN')
  }

  // Pricing calc
  const systemCapacity = parseFloat(bill.systemCapacity) || 0
  const ratePerKw      = parseFloat(bill.ratePerKw)      || 60000
  const totalCost      = Math.round(systemCapacity * ratePerKw)
  const solarPortion   = Math.round(totalCost * 0.70)
  const commPortion    = totalCost - solarPortion
  const solarBase      = Math.round(solarPortion / 1.05)
  const solarGst       = solarPortion - solarBase
  const commBase       = Math.round(commPortion / 1.18)
  const commGst        = commPortion - commBase
  const totalBase      = solarBase + commBase
  const totalGst       = solarGst  + commGst
  const solarCGST      = Math.round(solarGst / 2)
  const solarSGST      = solarGst - solarCGST
  const commCGST       = Math.round(commGst  / 2)
  const commSGST       = commGst  - commCGST
  const totalCGST      = solarCGST + commCGST
  const totalSGST      = solarSGST + commSGST
  const received       = parseFloat(bill.received) || 0
  const balance        = totalCost - received

  const dateStr = bill.date
    ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''
  const timeStr = bill.time || ''

  function amountInWords(n) {
    if (!n) return 'Zero Rupees only'
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
      'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    function w(num) {
      if (num < 20)        return ones[num]
      if (num < 100)       return tens[Math.floor(num/10)] + (num%10 ? ' '+ones[num%10] : '')
      if (num < 1000)      return ones[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' '+w(num%100) : '')
      if (num < 100000)    return w(Math.floor(num/1000))   + ' Thousand' + (num%1000   ? ' '+w(num%1000)   : '')
      if (num < 10000000)  return w(Math.floor(num/100000)) + ' Lakh'     + (num%100000 ? ' '+w(num%100000) : '')
      return w(Math.floor(num/10000000)) + ' Crore' + (num%10000000 ? ' '+w(num%10000000) : '')
    }
    return w(n) + ' Rupees only'
  }

  const panelLine = bill.panel
    ? `( ${systemCapacity.toFixed(2)} kw Panel -${bill.panel}${bill.panelWattage ? ' '+bill.panelWattage+' WP' : ''} Qty ${bill.panelCount||''} No Inverter - ${bill.inverter||''}) ACDB DCDB ,3 Earthing ,AC cables 2.5 Sq MM Copper DC Cable 4 Sq MM)`
    : `( ${systemCapacity.toFixed(2)} kW Solar System )`
  const mountLine = bill.mountingStructure ? bill.mountingStructure.toUpperCase() : 'GI PIPES 2*2PIPES, 1.5*1.5*PIPES'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Tax Invoice — ${bill.id}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 13px;
  color: #1e293b;
  background: white;
}
.page {
  max-width: 794px;
  margin: 0 auto;
  padding: 20px 28px 24px;
  min-height: 1123px;
}
.inv-title {
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  color: #0F2A4A;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 2px solid #0F2A4A;
  padding-bottom: 6px;
  margin-bottom: 14px;
}
/* Company header — logo left + info right */
.company-header {
  display: flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 14px;
}
.logo-space {
  width: 110px;
  min-height: 100px;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
.logo-circle {
  width: 80px;
  height: 80px;
  border: 2px dashed #cbd5e1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 9.5px;
  color: #94a3b8;
  line-height: 1.4;
}
.company-info {
  flex: 1;
  padding: 12px 16px;
}
.company-name {
  font-size: 20px;
  font-weight: 900;
  color: #0F2A4A;
  letter-spacing: -.3px;
}
.company-addr {
  font-size: 11px;
  color: #475569;
  margin-top: 3px;
  line-height: 1.5;
}
.company-line {
  font-size: 11.5px;
  color: #475569;
  margin-top: 3px;
}
.company-line strong { color: #1e293b; }
/* Bill to + Invoice details */
.meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  margin-bottom: 14px;
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
  background: #0F2A4A; color: white;
  padding: 8px 10px; font-size: 11px; font-weight: 600; text-align: left;
  border: 1px solid #1e3a5f;
}
table.items th.right { text-align: right; }
table.items td { padding: 9px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
table.items td.right { text-align: right; white-space: nowrap; }
table.items td.center { text-align: center; }
.item-main { font-weight: 700; font-size: 12.5px; color: #0F2A4A; }
.item-sub  { font-size: 11px; color: #475569; margin-top: 3px; line-height: 1.5; }
.total-row td { background: #f1f5f9; font-weight: 700; border-top: 2px solid #94a3b8; }
/* Tax summary + side totals */
.bottom-section {
  display: grid; grid-template-columns: 1fr auto; gap: 0;
  border: 1px solid #cbd5e1; border-top: none;
}
.tax-summary { padding: 10px; border-right: 1px solid #cbd5e1; }
.tax-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #0F2A4A; margin-bottom: 7px; }
table.tax { width: 100%; border-collapse: collapse; font-size: 11px; }
table.tax th {
  background: #f8fafc; padding: 5px 7px; border: 1px solid #cbd5e1;
  font-weight: 600; text-align: center; font-size: 10.5px;
}
table.tax td { padding: 5px 7px; border: 1px solid #cbd5e1; text-align: right; }
table.tax td.left { text-align: left; }
table.tax tr.foot td { background: #f1f5f9; font-weight: 700; }
.totals-panel { width: 220px; padding: 0; }
.totals-row { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
.totals-row.subtotal { font-weight: 600; }
.totals-row.grand { background: #0F2A4A; color: white; font-weight: 700; font-size: 13px; }
.totals-row.words { font-size: 10.5px; color: #475569; font-style: italic; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; }
.totals-row.received { color: #16a34a; font-weight: 600; }
.totals-row.balance  { background: #fef3c7; font-weight: 800; font-size: 13px; color: #92400e; }
/* Terms + footer */
.terms-block { border: 1px solid #cbd5e1; border-top: none; padding: 8px 12px; }
.terms-title { font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #0F2A4A; margin-bottom: 4px; letter-spacing: .4px; }
.terms-text  { font-size: 11px; color: #475569; }
.footer-row {
  display: flex; justify-content: space-between; align-items: flex-end;
  border: 1px solid #cbd5e1; border-top: none; padding: 10px 12px;
}
.bank-block strong { display: block; font-size: 11.5px; color: #0F2A4A; margin-bottom: 5px; }
.bank-block div    { font-size: 11px; color: #475569; line-height: 1.8; }
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

  <div class="inv-title">Tax Invoice</div>

  <!-- Company Header with logo space -->
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

  <!-- Bill To + Invoice Details -->
  <div class="meta-row">
    <div class="meta-col">
      <div class="meta-label">Bill To:</div>
      <div class="meta-name">${bill.customerName || ''}</div>
      ${bill.address       ? `<div class="meta-sub">${bill.address}</div>`                        : ''}
      ${bill.contactNumber ? `<div class="meta-sub">Contact No: ${bill.contactNumber}</div>` : ''}
    </div>
    <div class="meta-col">
      <div class="meta-label">Invoice Details:</div>
      <div class="inv-no">No: &nbsp;${bill.id}</div>
      <div class="inv-row">Date: &nbsp;${dateStr}</div>
      ${timeStr ? `<div class="inv-row">Time: &nbsp;${timeStr}</div>` : ''}
    </div>
  </div>

  <!-- Items Table -->
  <table class="items">
    <thead>
      <tr>
        <th style="width:26px">#</th>
        <th>Item name</th>
        <th style="width:58px;text-align:center">HSN/ SAC</th>
        <th class="right" style="width:46px">Quantity</th>
        <th class="right" style="width:110px">Price/ Unit(&#8377;)</th>
        <th class="right" style="width:118px">GST(&#8377;)</th>
        <th class="right" style="width:110px">Amount(&#8377;)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="center">1</td>
        <td>
          <div class="item-main">${systemCapacity.toFixed(2)} KW SOLAR POWER GENERATION SYSTEM</div>
          <div class="item-sub">${panelLine}</div>
        </td>
        <td class="center"></td>
        <td class="center">1</td>
        <td class="right">${inr(solarBase)}</td>
        <td class="right">${inr(solarGst)}&nbsp;<span style="font-size:10.5px;color:#64748b">(5%)</span></td>
        <td class="right" style="font-weight:600">${inr(solarPortion)}</td>
      </tr>
      <tr>
        <td class="center">2</td>
        <td>
          <div class="item-main">SYSTEM COMMISIONING</div>
          <div class="item-sub">( FABRICATIONS MATERIAL ${mountLine} MS PLATES, ANCHOR BOLTS, SS J BOLTS, FABRICATION LABOUR CHARGES, ELECTRICAL LABOUR CHARGE CIVIL WORKS LABOUR CHARGES, TRANSPORTION ETC)</div>
        </td>
        <td class="center">9954</td>
        <td class="center">1</td>
        <td class="right">${inr(commBase)}</td>
        <td class="right">${inr(commGst)}&nbsp;<span style="font-size:10.5px;color:#64748b">(18%)</span></td>
        <td class="right" style="font-weight:600">${inr(commPortion)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2" style="padding-left:10px">Total</td>
        <td></td>
        <td class="center">2</td>
        <td></td>
        <td class="right">${inr(totalGst)}</td>
        <td class="right">${inr(totalCost)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Tax Summary + Side Totals -->
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
          <tr>
            <td class="left">—</td>
            <td>${inr(solarBase)}</td>
            <td>2.5</td><td>${inr(solarCGST)}</td>
            <td>2.5</td><td>${inr(solarSGST)}</td>
            <td>${inr(solarGst)}</td>
          </tr>
          <tr>
            <td class="left">9954</td>
            <td>${inr(commBase)}</td>
            <td>9</td><td>${inr(commCGST)}</td>
            <td>9</td><td>${inr(commSGST)}</td>
            <td>${inr(commGst)}</td>
          </tr>
          <tr class="foot">
            <td class="left">TOTAL</td>
            <td>${inr(totalBase)}</td>
            <td></td><td>${inr(totalCGST)}</td>
            <td></td><td>${inr(totalSGST)}</td>
            <td>${inr(totalGst)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="totals-panel">
      <div class="totals-row subtotal"><span>Sub Total</span><span>${inrWhole(totalCost)}</span></div>
      <div class="totals-row grand"><span>Total</span><span>${inrWhole(totalCost)}</span></div>
      <div class="totals-row words" style="display:block">
        Invoice Amount in Words:<br>
        <strong style="color:#1e293b;font-style:normal">${amountInWords(totalCost)}</strong>
      </div>
      <div class="totals-row received"><span>Received</span><span>${inrWhole(received)}</span></div>
      <div class="totals-row balance"><span>Balance</span><span>${inrWhole(balance)}</span></div>
    </div>
  </div>

  <!-- Terms & Conditions -->
  <div class="terms-block">
    <div class="terms-title">Terms &amp; Conditions:</div>
    <div class="terms-text">${bill.terms || 'Thanks for doing business with us!'}</div>
  </div>

  <!-- Bank Details + Signature -->
  <div class="footer-row">
    <div class="bank-block">
      <strong>Bank Details:</strong>
      <div>
        Name : ${bank.name || ''}<br>
        Account No. : ${bank.account || ''}<br>
        IFSC code : ${bank.ifsc || ''}<br>
        ${company.name ? `Account holder's name : ${company.name}` : ''}
      </div>
    </div>
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
