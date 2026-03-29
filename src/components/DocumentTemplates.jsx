// Document template HTML generators
// All generators receive: (quote, settings, common, extra)
// common = { consumerNumber, email, installationDate, serialNumbers, applicationNumber }
// extra  = document-specific fields

const DOC_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #000; background: white; }
  .page { max-width: 794px; margin: 0 auto; padding: 36px 48px; min-height: 1123px; }
  h1 { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 6px; }
  h2 { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 16px; }
  p { font-size: 13px; line-height: 1.7; margin-bottom: 10px; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #000; padding: 6px 10px; font-size: 12.5px; vertical-align: top; }
  th { font-weight: bold; text-align: center; background: #f0f0f0; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .section-header td { font-weight: bold; text-align: center; background: #e8e8e8; }
  .indent { padding-left: 32px; }
  .page-break { page-break-before: always; }
  .underline { text-decoration: underline; }
  .aadhar-box { border: 1px solid #000; width: 320px; height: 180px; margin: 20px auto; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 12px; }
  .sig-two { display: flex; justify-content: space-between; margin-top: 50px; }
  .sig-col { text-align: center; width: 45%; }
  .sig-line { border-top: 1px solid #000; margin-top: 60px; margin-bottom: 4px; }
`

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.')
}
function fmtDateLong(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── 1. Work Completion Report ─────────────────────────────────────────────
export function generateWCRHTML(quote, settings, common, extra) {
  const company = settings?.company || {}
  const vendorName = company.name || 'Solartech'
  const capacityKW = quote.systemCapacity?.toFixed(2) || '0.00'
  const totalKWP = Math.round((quote.panelCount || 0) * (quote.panelWattage || 0))
  const sanctionLine = extra.sanctionNumber
    ? `${extra.sanctionNumber}  Dt: ${extra.sanctionDate || ''}`
    : `Dt: ${extra.sanctionDate || ''}`
  const earthingLine = `${extra.earthingCount || '3'} Earthing with ${extra.earthResistance || '1.5'} ohm`
  const warrantyLine = `${extra.productWarranty || '12'}+${extra.performanceWarranty || '25'}`
  const panelMake = extra.panelMake || quote.panel?.split(' ')[0] || ''
  const inverterMake = extra.inverterMake || quote.inverter?.split(' ')[0] || ''

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>WCR — ${quote.customerName}</title>
<style>${DOC_STYLES}</style></head><body><div class="page">

<h1>Work Completion Report for Solar Power Plant</h1>

<table>
  <thead><tr><th style="width:8%">Sr.No</th><th style="width:46%">Component</th><th style="width:46%">Observation</th></tr></thead>
  <tbody>
    <tr><td class="center">1</td><td>Name</td><td>${quote.customerName || ''}</td></tr>
    <tr><td class="center">2</td><td>Consumer number</td><td>${common.consumerNumber || ''}</td></tr>
    <tr><td class="center">3</td><td>Site/Location With Complete Address</td><td>${quote.address || ''}</td></tr>
    <tr><td class="center">4</td><td>Category: Govt/Private Sector</td><td>${extra.category || 'Private'}</td></tr>
    <tr><td class="center">5</td><td>Sanction number Dt:</td><td>${sanctionLine}</td></tr>
    <tr><td class="center" rowspan="2">6</td><td>Sanctioned Capacity of solar PV system (KW) Installed</td><td>${capacityKW} Kw</td></tr>
    <tr><td>Capacity of solar PV system (KW)</td><td>${capacityKW} Kw</td></tr>

    <tr><td class="center" rowspan="7">7</td><td colspan="2" class="section-header">Specification of the Modules</td></tr>
    <tr><td>Make of Module</td><td>${panelMake}</td></tr>
    <tr><td>ALMM Model Number</td><td>${extra.almmModelNumber || ''}</td></tr>
    <tr><td>Wattage per module</td><td>${quote.panelWattage || ''}</td></tr>
    <tr><td>No. of Module</td><td>${quote.panelCount || ''}</td></tr>
    <tr><td>Total Capacity (KWP)</td><td>${totalKWP} Kwp</td></tr>
    <tr><td>Warrantee Details (Product + Performance)</td><td>${warrantyLine}</td></tr>

    <tr><td class="center" rowspan="7">8</td><td colspan="2" class="section-header">PCU</td></tr>
    <tr><td>Make &amp; Model number of Inverter</td><td>${inverterMake}</td></tr>
    <tr><td>Rating</td><td>${extra.inverterRating || capacityKW + ' Kw'}</td></tr>
    <tr><td>Type of charge controller/ MPPT</td><td>${extra.mpptType || 'Single'}</td></tr>
    <tr><td>Capacity of Inverter</td><td>${extra.inverterCapacity || capacityKW + ' Kw'}</td></tr>
    <tr><td>HPD</td><td>${extra.hpd || 'No'}</td></tr>
    <tr><td>Year of manufacturing</td><td>${extra.yearOfManufacturing || new Date().getFullYear()}</td></tr>

    <tr><td class="center" rowspan="3">9</td><td colspan="2" class="section-header">Earthing and Protections</td></tr>
    <tr><td>No of Separate Earthings with earth Resistance</td><td>${earthingLine}</td></tr>
    <tr><td colspan="2" style="font-size:11.5px;">
      It is certified that the Earth Resistance measure in presence of Licensed Electrical
      Contractor/Supervisor and found in order i.e. &lt; 5 Ohms as per MNRE OM Dtd. 07.06.24 for CFA Component.
      <br/><br/><strong>Lightening Arrester</strong> &nbsp;&nbsp; ${extra.lightningArrester || 'Yes'}
    </td></tr>
  </tbody>
</table>

<p>We <strong>${vendorName}</strong> [Vendor] &amp; <strong>${quote.customerName || ''}</strong> [Consumer] bearing Consumer Number
<strong>${common.consumerNumber || ''}</strong> Ensured structural stability of installed solar power plant and obtained requisite
permissions from the concerned authority. If in future, by virtue of any means due to collapsing or
damage to installed solar power plant, MSEDCL will not be held responsible for any loss to property or human life, if any.</p>

<p>This is to Certified above Installed Solar PV System is working properly with electrical safety &amp; Islanding
switch in case of any presence of backup inverter an arrangement should be made in such way the
backup inverter supply should never be synchronized with solar inverter to avoid any electrical
accident due to back feeding. We will be held responsible for non-working of islanding mechanism and
back feed to the de-energized grid.</p>

<div class="sig-two" style="margin-top:50px;">
  <div class="sig-col"><div class="sig-line"></div><div>Signature [Vendor]</div></div>
  <div class="sig-col"><div class="sig-line"></div><div>Signature [Consumer]</div></div>
</div>

<!-- Page 2 -->
<div class="page-break"></div>
<p style="margin-bottom:24px;">&nbsp;</p>
<p class="bold" style="margin-bottom:12px;">Guarantee Certificate Undertaking to be submitted by VENDOR</p>
<p>The undersigned will provide the services to the consumers for repairs/maintenance of the RTS plant
free of cost for 5 years of the comprehensive Maintenance Contract (CMC) period from the date of
commissioning of the plant. Non performing/under-performing system component will be
replaced/repaired free of cost in the CMC period.</p>
<p style="margin-top:32px;">Signature [Vendor]</p>
<p style="margin-top:16px;">Stamp &amp; Seal</p>
<p style="margin-top:40px;">Identity Details of Consumer: - <strong>${quote.customerName || ''}</strong><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Aadhar Number : -</p>
<div class="aadhar-box">Upload Xerox of AADHAR CARD HERE<br/>SHOULD BE SELF ATTESTED BY CONSUMER</div>

</div></body></html>`
}

// ─── 2. Annexure-I (Commissioning Report) ─────────────────────────────────
export function generateAnnexureIHTML(quote, settings, common, extra) {
  const company = settings?.company || {}
  const vendorName = company.name || 'Solartech'
  const capacityKW = quote.systemCapacity?.toFixed(2) || '0.00'
  const inverterMake = quote.inverter?.split(' ')[0]?.toUpperCase() || ''
  const installDate = fmtDate(common.installationDate) || extra.installationDate || ''
  const installDateLong = fmtDateLong(common.installationDate) || extra.installationDate || ''

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Annexure-I — ${quote.customerName}</title>
<style>${DOC_STYLES}
  .re-title { font-size: 15px; font-weight: bold; text-align: center; color: #555; margin-bottom: 4px; }
  .proforma-title { font-size: 13px; font-weight: bold; text-align: center; margin: 24px 0 4px; }
  .proforma-sub { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 8px; }
  .cert-text { font-size: 12.5px; font-weight: bold; line-height: 1.8; text-align: justify; }
</style></head><body><div class="page">

<p class="re-title">Renewable Energy Generating System</p>
<h1>Annexure-I</h1>
<h2>(Commissioning Report for RE System)</h2>

<table>
  <thead>
    <tr>
      <th style="width:10%">SNo.</th>
      <th style="width:55%">Particulars</th>
      <th style="width:35%">As Commissioned</th>
    </tr>
  </thead>
  <tbody>
    <tr><td class="center">1</td><td>Name of the Consumer</td><td class="bold">${quote.customerName || ''}</td></tr>
    <tr><td class="center">2</td><td>Consumer Number</td><td class="bold">${common.consumerNumber || ''}</td></tr>
    <tr><td class="center">3</td><td>Mobile Number</td><td>${quote.contactNumber || ''}</td></tr>
    <tr><td class="center">4</td><td>E-mail</td><td>${common.email || ''}</td></tr>
    <tr><td class="center">5</td><td>Address of Installation</td><td class="bold">${quote.address || ''}</td></tr>
    <tr><td class="center">6</td><td>RE Arrangement Type</td><td class="bold">Net Metering Arrangement</td></tr>
    <tr><td class="center">7</td><td>RE Source</td><td>Solar Roof Top</td></tr>
    <tr><td class="center">8</td><td>Sanctioned Capacity</td><td>${capacityKW} Kw</td></tr>
    <tr><td class="center">9</td><td>Capacity Type</td><td>Residential</td></tr>
    <tr><td class="center">10</td><td>Project Model</td><td>Capex</td></tr>
    <tr><td class="center">11</td><td>RE installed Capacity (Rooftop)</td><td>${capacityKW} Kw</td></tr>
    <tr><td class="center">12</td><td>RE installed Capacity (Rooftop + Ground) (KW)</td><td>0</td></tr>
    <tr><td class="center">13</td><td>RE installed Capacity (Ground) (KW)</td><td>0 kw</td></tr>
    <tr><td class="center">14</td><td>Installation date</td><td>${installDate}</td></tr>
    <tr>
      <td class="center">15</td>
      <td colspan="2">
        <strong>Solar PV Details</strong><br/>
        <div style="margin-top:8px;">
          Inverter Capacity (KW) &nbsp;&nbsp; ${capacityKW} Kw<br/>
          Inverter Make &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${inverterMake}<br/>
          No. of PV Modules &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${quote.panelCount || ''}<br/>
          Module Capacity (KW) &nbsp;&nbsp; ${capacityKW} KW
        </div>
      </td>
    </tr>
  </tbody>
</table>

<p class="proforma-title">Proforma-A</p>
<p class="proforma-sub">COMMISSIONING REPORT (PROVISIONAL) FOR GRID CONNECTED SOLAR<br/>
PHOTOVOLTAIC POWER PLANT (with Net-metering facility)</p>

<p class="cert-text">
  Certified that a Grid Connected SPV Power Plant of ${capacityKW} KWp capacity has been installed at the site
  ${quote.address || ''} of MAHARASHTRA which has been installed by M/s ${vendorName} on ${installDateLong}.
  The system is as per BIS/MNRE specifications. The system has been checked for its
  performance and found in order for further commissioning.
</p>

<div class="sig-two" style="margin-top:60px;">
  <div class="sig-col"><div class="sig-line"></div><div>Signature of the beneficiary</div></div>
  <div class="sig-col"><div class="sig-line"></div><div>Signature of the agency with name, seal and date</div></div>
</div>

<!-- Page 2 -->
<div class="page-break"></div>
<p style="margin-bottom:20px;">&nbsp;</p>
<p style="text-align:justify; font-weight:bold; font-size:13px;">
  The above RTS installation has been inspected by me for Pre-Commissioning Testing of Roof Top Solar Connection on
  dt………………………… as per guidelines issued by the office of The Chief Engineer vide letter no 21653 on dt.
  18.08.2022 and found in order for commissioning.
</p>
<div style="margin-top:60px;">
  <p class="bold">Signature of the MSEDCL Officer</p>
  <p>Name,</p>
  <p>Designation</p>
  <p>Date and seal</p>
</div>

</div></body></html>`
}

// ─── 3. DCR Declaration (Annexure-A) ──────────────────────────────────────
export function generateDCRHTML(quote, settings, common, extra) {
  const company = settings?.company || {}
  const vendorName = company.name || 'Solartech'
  const capacityKW = quote.systemCapacity?.toFixed(2) || '0.00'
  const panelMake = extra.panelMake || quote.panel?.split(' ')[0] || ''
  const appDate = fmtDate(extra.applicationDate)

  const serials = (common.serialNumbers || '')
    .split(/[\n,]/).map(s => s.trim()).filter(Boolean)
  const serialsFormatted = serials.length > 0
    ? serials.map((s, i) => `${i + 1}) ${s}`).join('&nbsp;&nbsp;&nbsp;')
    : ''

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>DCR — ${quote.customerName}</title>
<style>${DOC_STYLES}</style></head><body><div class="page">

<h1>Annexure -A</h1>
<h2>Undertaking/Self- Declaration for Domestic Content Requirement fulfillment</h2>
<br/>

<p style="margin-left:20px;margin-bottom:18px;">
  1. This is to certify that M/S <strong>${vendorName}</strong> [Company Name] has Installed
  <strong>${capacityKW} KW</strong> [Capacity] Grid Connected Rooftop Solar Plant For
  <strong>${quote.customerName || ''}</strong> [Consumer Name]
  <strong>${quote.address || ''}</strong> [Address] under application number
  <strong>${common.applicationNumber || ''}</strong> dated
  <strong>${appDate}</strong> [date of application] under
  <strong>${extra.subdivision || ''}</strong> <strong>${extra.discomName || 'MSEDCL'}</strong> [DISCOM Name].
</p>

<p>2. It is hereby undertaken that the PV modules installed for the above-mentioned project are
domestically manufactured using domestic manufactured solar cells. The details of installed PV Modules are follows:</p>

<div class="indent" style="margin-bottom:16px;">
  <p>1. PV Module Capacity: ${capacityKW} WP</p>
  <p>2. Number of PV Modules: ${quote.panelCount || ''}/${quote.panelWattage || ''} watt panel</p>
  <p>3. Sr No of PV Module ${serialsFormatted || '___________________________________________'}</p>
  <p>4. PV Module Make: ${panelMake}</p>
  <p>5. Cell manufacturer's name: ${extra.cellManufacturer || ''}</p>
  <p>6. Cell GST invoice No: ${extra.cellGSTInvoice || ''}</p>
</div>

<p>3. The above undertaking is based on the certificate issued by PV Module manufacturer/supplier
while supplying the above mentioned order.</p>

<p>4. I, <strong>${extra.authorizedPerson || ''}</strong> on behalf of M/S <strong>${vendorName}</strong> [Company
Name] further declare that the information given above is true and correct and nothing has been
concealed therein. If anything is found incorrect at any stage, then REC/ MNRE may take any
appropriate action against my company for wrong declaration. Supporting documents and proof
of the above information will be provided as and when requested by MNRE.</p>

<div style="margin-top:48px;display:flex;justify-content:flex-end;">
  <div style="width:55%;text-align:left;">
    <p style="text-align:right;margin-bottom:24px;">(Signature With official Seal)</p>
    <p>For M/S……………………………………………………….</p>
    <p style="margin-top:12px;">Name:………………………………………………………</p>
    <p style="margin-top:12px;">Designation:……………………………………………</p>
    <p style="margin-top:12px;">Phone:…………………………………………………</p>
    <p style="margin-top:12px;">Email:……………………………………………………</p>
  </div>
</div>

</div></body></html>`
}

// ─── 4. CFA Agreement (Annexure 2) ────────────────────────────────────────
export function generateCFAHTML(quote, settings, common, extra) {
  const company = settings?.company || {}
  const vendorName = company.name || 'Solartech'
  const vendorAddress = extra.vendorAddress || company.address || ''
  const capacityKW = quote.systemCapacity?.toFixed(2) || '0.00'
  const agreementDateLong = fmtDateLong(extra.agreementDate)
  const paymentTerms = extra.paymentTerms || '25% at booking, 65% before dispatch of materials, 10% before meter fixing & system handover.'

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>CFA Agreement — ${quote.customerName}</title>
<style>${DOC_STYLES}
  .activities-list { margin:0 0 0 24px; }
  .activities-list li { margin-bottom:8px; line-height:1.6; }
  .sec-title { font-weight:bold; text-decoration:underline; margin:16px 0 8px; font-size:13px; }
  .footer-note { font-style:italic; font-size:11px; margin-top:16px; border-top:1px solid #ccc; padding-top:10px; }
  .footer-center { text-align:center; font-size:11px; color:#555; margin-top:4px; }
</style></head><body><div class="page">

<h1>Annexure 2</h1>
<h2>Model Draft Agreement between Consumer &amp; Vendor for installation of grid connected<br/>
rooftop solar (RTS) project under PM – Surya Ghar: Muft Bijli Yojana</h2>

<p>This agreement is executed on <strong>${agreementDateLong}</strong> for design, supply,
installation, commissioning and 5-year comprehensive maintenance of RTS project/system
along with warranty under PM Surya Ghar: Muft Bijli Yojana</p>

<p class="center" style="margin:16px 0;font-weight:bold;">Between</p>

<p><strong>${quote.customerName || ''}</strong> (Name of Consumer) having <strong>${quote.address || ''}</strong>
(hereinafter referred to as first Party i.e. consumer/purchaser/owner of system).</p>

<p class="center" style="margin:10px 0;font-weight:bold;">And</p>

<p>M/s <strong>${vendorName}</strong> (Name of Vendor) having registered office at <strong>${vendorAddress}</strong>
(hereinafter referred to as second Party i.e. Vendor/contractor/System Integrator).</p>

<p style="margin:16px 0;font-weight:bold;">Whereas</p>
<p>First Party wishes to install a Grid Connected Rooftop Solar Plant on the rooftop of the residential
<strong>${quote.address || ''}</strong> of the Consumer under PM Surya Ghar: Muft Bijli Yojana.</p>

<p style="margin:12px 0;font-weight:bold;">And whereas</p>
<p>Second Party has verified availability of appropriate roof and found it feasible to install a Grid
Connected Roof Top Solar plant and that the second party is willing to design, supply, install,
test, commission and carry out Operation &amp; Maintenance of the Rooftop Solar plant for 5 year period.</p>

<p style="margin:12px 0;">On this day, <strong>${agreementDateLong}</strong> the First Party and Second Party agree to the following:</p>

<p class="sec-title">The First Party hereby undertakes to perform the following activities:</p>
<ol class="activities-list">
  <li>Submission of online application at National Portal for installation of RTS project/system, submission of application for net-metering and system inspection and upload of the relevant documents on the National Portal of the scheme.</li>
  <li>Provide secure storage of the material of the RTS plant delivered at the premises till handover of the system.</li>
  <li>Provide access to the Roof Top during installation of the plant, operation &amp; maintenance, testing of the plant and equipment and for meter reading from solar meter, inverter etc.</li>
  <li>Provide electricity during plant installation and water for cleaning of the panels.</li>
  <li>Report any malfunctioning of the plant to the Vendor during the warranty period.</li>
  <li>Pay the amount as per the payment schedule as mutually agreed with the vendor, including any additional amount to the second party for any additional work/customization required depending upon the building condition.</li>
</ol>

<p class="sec-title">The Second Party hereby undertakes to perform the following activities:</p>
<ol class="activities-list">
  <li>The Vendor must follow all the standards and safety guidelines prescribed under state regulations and technical standards prescribed by MNRE for RTS projects, failing which the vendor is liable for blacklisting from participation in the govt. project/scheme and other penal actions in accordance with the law.</li>
  <li><strong>Site Survey:</strong> Site visit, survey and development of detailed project report for installation of RTS system including feasibility study of roof, strength of roof and shadow free area.</li>
  <li><strong>Design &amp; Engineering:</strong> Design of plant along with drawings and selection of components as per standard provided by the DISCOM/SERC/MNRE for best performance and safety of the plant.</li>
  <li><strong>Module and Inverter:</strong> The solar modules, including the solar cells, should be manufactured in India. Both the solar modules and inverters shall conform to the relevant standards and specifications prescribed by MNRE.</li>
  <li><strong>Procurement &amp; Supply:</strong> Procurement of complete system as per BIS/IS/IEC standard &amp; safety guidelines. The supplied materials should comply with all MNRE standards for release of subsidy.</li>
  <li><strong>Installation &amp; Civil work:</strong> Complete civil work, structure work and electrical work (including drawings) following all the safety and relevant BIS standards.</li>
  <li><strong>Documentation:</strong> All technical catalogues, warranty certificates, BIS certificates and other test reports shall be provided to the consumer for online uploading on the national portal.</li>
  <li><strong>Project completion report (PCR):</strong> Assisting the consumer in filling and uploading of signed documents (Consumer &amp; Vendor) on the national portal.</li>
  <li><strong>Warranty:</strong> The complete system should be warranted for 5 years from the date of commissioning by DISCOM. Individual component warranty documents shall be provided to the consumer.</li>
  <li><strong>NET meter &amp; Grid Connectivity:</strong> Net meter supply/procurement, testing and approvals shall be in the scope of vendor. Grid connection of the plant shall be in the scope of the vendor.</li>
  <li><strong>Testing and Commissioning:</strong> The vendor shall be present at the time of testing and commissioning by the DISCOM.</li>
  <li><strong>Operation &amp; Maintenance:</strong> Five (5) years Comprehensive Operation and Maintenance including overhauling, wear and tear and regular checking at proper interval shall be in the scope of vendor.</li>
  <li><strong>Insurance:</strong> Any insurance cost pertaining to material transfer/storage before commissioning of the system shall be in the scope of the vendor.</li>
  <li><strong>Performance of Plant:</strong> The Performance Ratio (PR) of Plant must be 75% at the time of commissioning. Vendor must maintain the PR of the plant till warranty of project i.e. 5 years from the date of commissioning.</li>
</ol>

<p style="margin:16px 0;font-weight:bold;">19. Mutually Agreed Terms of Payment</p>
<p>${paymentTerms}</p>

<div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
  <div>
    <p class="bold">First Party</p>
    <p style="margin-top:14px;">Name: ${quote.customerName || ''}</p>
    <p style="margin-top:10px;">Address: ${quote.address || ''}</p>
    <p style="margin-top:48px;">Sign: ___________________________</p>
    <p style="margin-top:10px;">Date: ___________________________</p>
  </div>
  <div>
    <p class="bold">Second Party</p>
    <p style="margin-top:14px;">Name: ${vendorName}</p>
    <p style="margin-top:10px;">Address: ${vendorAddress}</p>
    <p style="margin-top:48px;">Sign: ___________________________</p>
    <p style="margin-top:10px;">Date: ___________________________</p>
  </div>
</div>

<p class="footer-note">Disclaimer: This agreement is between vendor and consumer and any dispute related to the same shall not involve any third party including MNRE and Distribution Utilities.</p>
<p class="footer-center">Guidelines for PM-Surya Ghar: Muft Bijli Yojana — Central Financial Assistance to Residential Consumers</p>

</div></body></html>`
}

// ─── 5. Net Metering Agreement ─────────────────────────────────────────────
export function generateNetMeteringHTML(quote, settings, common, extra) {
  const capacityKW = quote.systemCapacity?.toFixed(2) || '0.00'
  const agreementDay = extra.agreementDate ? new Date(extra.agreementDate).getDate() : ''
  const agreementMonthYear = extra.agreementDate
    ? new Date(extra.agreementDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : ''

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Net Metering Agreement — ${quote.customerName}</title>
<style>${DOC_STYLES}
  p { font-size:13px; line-height:1.8; margin-bottom:12px; text-align:justify; font-weight:bold; }
  .clause-num { font-weight:bold; }
</style></head><body><div class="page">

<h1 style="margin-bottom:20px;">Net Metering</h1>

<p>This Agreement is made and entered into at <span class="underline">${quote.address || ''}</span> on this
${agreementDay} day of ${agreementMonthYear} between the Eligible Consumer
<strong>${quote.customerName || ''}</strong> having premises at <strong>${quote.address || ''}</strong> and
Consumer No <strong>${common.consumerNumber || ''}</strong> as the first Party,</p>

<p>AND</p>

<p>The Distribution Licensee Maharashtra State Electricity Distribution Co. Ltd (hereinafter referred to as
'the Licensee') and having its Registered Office at Prakhashgad, Anant Kanekar Marg, Station road,
Bandra (E), Mumbai–400051 as second Party of this Agreement. Whereas, the Eligible Consumer has applied
to the Licensee for approval of a Net Metering Arrangement under the provisions of the concerned SERC
(State Electricity Regulatory Commission) regulations. And whereas, the Licensee has agreed to provide
Network connectivity to the Eligible Consumer for injection of electricity generated from its Roof-top
Renewable Energy Generating System of <strong>${capacityKW} kilowatt (kW)</strong></p>

<p>Both Parties hereby agree as follows:-</p>

<p><span class="clause-num">1. Eligibility:</span> The Roof-top Renewable Energy Generating System meets the
applicable norms for being integrated into the Distribution Network, and that the Eligible Consumer shall
maintain the System accordingly for the duration of this Agreement.</p>

<p><span class="clause-num">2. Technical and Inter-connection Requirements:</span></p>
<p>2.1 The metering arrangement and the inter-connection of the Roof-top Renewable Energy Generating System
with the Network of the Licensee shall be as per the provisions of the Net Metering Regulations and the
technical standards and norms specified by the Central Electricity Authority for connectivity of distributed
generation resources and for the installation and operation of meters.</p>
<p>2.2. The Eligible Consumer agrees that he shall install, prior to connection of the Rooftop Renewable Energy
Generating System to the Network of the Licensee, an isolation device (both automatic and in built within
inverter and external manual relays); and the Licensee shall have access to it if required for the repair and
maintenance of the Distribution Network.</p>
<p>2.3. The Licensee shall specify the interface/inter-connection point and metering point.</p>
<p>2.4. The Eligible Consumer shall furnish all relevant data, such as voltage, frequency, circuit breaker, isolator
position in his System, as and when required by the Licensee.</p>
<p>2.5. All the equipment connected to Network of the Licensee at the time of installation shall be compliant with
the Technical Specifications for rooftop system as Published by MNRE.</p>

<p><span class="clause-num">3. Safety:</span></p>
<p>3.1 The consumer shall comply with the Central Electricity Authority (Measures Relating to Safety and Electricity
Supply) Regulations 2010.</p>
<p>3.2. The equipment connected to the Licensee's Distribution System shall be compliant with relevant
International (IEEE/IEC) or Indian Standards (BIS), and the installation of electrical equipment shall comply with
the requirements specified by the Central Electricity Authority regarding safety and electricity supply.</p>
<p>3.3. The design, installation, maintenance and operation of the Roof-top Renewable Energy Generating System
shall be undertaken in a manner conducive to the safety of the Roof-top Renewable Energy Generating System as
well as the Licensee's Network.</p>
<p>3.4. If, at any time, the Licensee determines that the Eligible Consumer's Roof-top Renewable Energy Generating
System is causing or may cause damage to the Licensee's other consumers or its assets, the Eligible Consumer
shall disconnect the Roof-top Renewable Energy Generating System upon direction from the Licensee and shall
undertake corrective measures at his own expense prior to re-connection.</p>
<p>3.5. The Licensee shall not be responsible for any accident resulting in injury to human beings or animals or
damage to property that may occur due to back-feeding from the Roof-top Renewable Energy Generating System
when the grid supply is off.</p>

<p><span class="clause-num">4. Other Clearances and Approvals:</span> The Eligible Consumer shall obtain any statutory approvals and
clearances that may be required, such as from the Electrical Inspector or the municipal or other authorities,
before connecting the Roof-top Renewable Energy Generating System to the distribution Network.</p>

<p><span class="clause-num">5. Period of Agreement, and Termination:</span> This Agreement shall be for a period for 25 years, but may be
terminated prematurely. (a) By mutual consent; or (b) By the Eligible Consumer, by giving 30 days' notice to the
Licensee. (c) By the Licensee, by giving 30 days' notice, if the Eligible Consumer breaches any terms of this
Agreement or the provisions of the Net Metering Regulations and does not remedy such breach within 30 days.</p>

<p><span class="clause-num">6. Access and Disconnection:</span> The Eligible Consumer shall provide access to the Licensee to the metering
equipment and disconnecting devices of Roof-top Renewable Energy Generating System. Upon termination of this
Agreement, the Eligible Consumer shall disconnect the Roof-top Renewable Energy Generating System forthwith
from the Network of the Licensee.</p>

<p><span class="clause-num">7. Liabilities:</span> The Parties shall indemnify each other for damages or adverse effects of either Party's negligence
or misconduct during the installation of the Roof-top Renewable Energy Generating System, connectivity with the
distribution Network and operation of the System. The Parties shall not be liable to each other for any loss of
profits or revenues, business interruption losses, loss of contract or goodwill, or for indirect, consequential,
incidental or special damages.</p>

<p><span class="clause-num">8. Commercial Settlement:</span> The commercial settlements under this Agreement shall be in accordance with the
Net Metering Regulations. The Licensee shall not be liable to compensate the Eligible Consumer if his Rooftop
Renewable Energy Generating System is unable to inject surplus power generated into the Licensee's Network on
account of failure of power supply in the grid/Network.</p>

<p><span class="clause-num">9. Connection Costs:</span> The Eligible Consumer shall bear all costs related to the setting up of the Roof-top
Renewable Energy Generating System and the cost of Net Meters.</p>

<p><span class="clause-num">10. Dispute Resolution:</span><br/>
10.1 Any dispute arising under this Agreement shall be resolved promptly, in good faith and in an equitable manner by both the Parties.<br/>
10.2. The Eligible Consumer shall have recourse to the concerned Consumer Grievance Redressal Forum constituted under the relevant Regulations in respect of any grievance regarding billing which has not been redressed by the Licensee.</p>

<p><span class="clause-num">11.</span> This agreement stands valid upto my sanctioned electrical load capacity.
Submission of this document by the consumer shall be deemed as an automatic agreement to the terms,
conditions, and declarations specified above.</p>

<div style="margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:40px;">
  <div>
    <p style="text-align:left;">Shri_______________________</p>
    <p style="text-align:left;">For and on behalf of Eligible consumer</p>
    <p style="text-align:left;margin-top:20px;">Witness 1;</p>
    <p style="text-align:left;margin-top:10px;">Witness 2;</p>
    <p style="text-align:left;margin-top:10px;">Date _______________________</p>
  </div>
  <div>
    <p style="text-align:left;">Shri_______________________</p>
    <p style="text-align:left;">for and on behalf of MSEDCL</p>
    <p style="text-align:left;margin-top:20px;">Witness 1;</p>
    <p style="text-align:left;margin-top:10px;">Witness 2;</p>
    <p style="text-align:left;margin-top:10px;">Date _______________________</p>
  </div>
</div>

</div></body></html>`
}
