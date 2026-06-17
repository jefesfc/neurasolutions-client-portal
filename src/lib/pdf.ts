import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Report } from '../types/report';
import type { Invoice } from '../types/client';
import type { Lead, Contact, TokenUsage, Client } from '../types/aios';
import logoSrc from '../assets/neura-logo-white.png';

// ── Treatment catalogue data ────────────────────────────────────────────────
const TREATMENT_CATALOGUE = [
  {
    category: 'Injectable Treatments',
    color: [99, 102, 241] as [number, number, number],
    items: [
      { name: 'Anti-Wrinkle Injections', duration: '30–45 min', price: 'From £250', desc: 'Botulinum toxin to relax dynamic facial lines — forehead, frown, crows feet. Softens expression lines with natural results lasting 3–4 months.' },
      { name: 'Dermal Fillers', duration: '30–60 min', price: 'From £350', desc: 'Hyaluronic acid fillers to restore volume, define contours and smooth deep lines. Results immediate; lasts 9–18 months.' },
      { name: 'Lip Augmentation', duration: '30 min', price: 'From £299', desc: 'Subtle or statement lip enhancement using premium HA fillers. Adds volume, definition and symmetry with natural-looking results.' },
      { name: 'Jaw / Face Slimming', duration: '30 min', price: 'From £350', desc: 'Masseter Botox to reduce jaw tension, teeth grinding and achieve a slimmer, softer facial profile.' },
      { name: 'Skin Boosters (Profhilo)', duration: '30 min', price: 'From £450', desc: 'Ultra-pure HA injected to deeply hydrate, firm and bioremodel the skin. 2-session protocol; results visible for 6 months.' },
      { name: 'PRP Therapy', duration: '60 min', price: 'From £400', desc: 'Platelet-Rich Plasma harvested from your own blood to stimulate collagen, improve texture and accelerate healing. Natural & regenerative.' },
    ],
  },
  {
    category: 'Laser & Light Treatments',
    color: [6, 182, 212] as [number, number, number],
    items: [
      { name: 'CO2 Laser Resurfacing', duration: '60–90 min', price: 'From £800', desc: 'Fractional CO2 laser for deep skin renewal — reduces wrinkles, acne scars and pigmentation. Significant results after single session.' },
      { name: 'IPL Photofacial', duration: '45 min', price: 'From £350', desc: 'Intense Pulsed Light targets sun damage, redness, broken capillaries and pigmentation for an even, luminous skin tone.' },
      { name: 'Laser Hair Removal', duration: '15–60 min', price: 'From £100/session', desc: 'Medical-grade diode laser for permanent hair reduction on face and body. 6–8 sessions recommended for optimal results.' },
    ],
  },
  {
    category: 'Skin Treatments',
    color: [16, 185, 129] as [number, number, number],
    items: [
      { name: 'HydraFacial', duration: '60 min', price: 'From £160', desc: 'Multi-step cleanse, exfoliate, extract and hydrate facial. Suitable for all skin types; immediate glow with no downtime.' },
      { name: 'Chemical Peel', duration: '45 min', price: 'From £180', desc: 'Medical-grade acid peel to resurface, brighten and even out skin tone. Addresses pigmentation, fine lines and blemishes.' },
      { name: 'Microneedling', duration: '60 min', price: 'From £250', desc: 'Controlled micro-injuries stimulate collagen and elastin production. Improves texture, pores, scars and firmness.' },
      { name: 'Microneedling + PRP', duration: '90 min', price: 'From £450', desc: 'Combined microneedling with your own PRP applied topically for amplified collagen stimulation and faster skin renewal.' },
    ],
  },
  {
    category: 'Body Treatments',
    color: [245, 158, 11] as [number, number, number],
    items: [
      { name: 'Non-Invasive Body Contouring', duration: '60 min', price: 'From £300', desc: 'Targeted technology to reduce stubborn fat, tighten skin and improve body contour — no surgery, no downtime.' },
      { name: 'Thread Lift', duration: '60–90 min', price: 'From £1,200', desc: 'Dissolvable PDO threads lift and tighten sagging skin on face, neck or jowls. Immediate lifting effect; collagen-stimulating for 12–18 months.' },
    ],
  },
];

const _logoImg = new Promise<HTMLImageElement>((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(new Image());
  img.src = logoSrc;
});

const BRAND_HEX = '#6366f1';
const BRAND_RGB: [number, number, number] = [99, 102, 241];
const SURFACE_RGB: [number, number, number] = [248, 250, 252];
const TEXT_DARK_HEX = '#0f172a';
const TEXT_MID_HEX = '#64748b';
const TEXT_LIGHT_HEX = '#94a3b8';

const SOURCE_LABEL: Record<string, string> = {
  website: 'Website',
  linkedin: 'LinkedIn',
  referral: 'Referral',
  ads: 'Ads',
  other: 'Other',
};

async function addPageHeader(doc: jsPDF, title: string, meta?: string): Promise<number> {
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(BRAND_HEX);
  doc.rect(0, 0, w, 30, 'F');

  const logo = await _logoImg;
  if (logo.naturalWidth > 0) {
    const logoH = 18;
    const logoW = (logo.naturalWidth / logo.naturalHeight) * logoH;
    doc.addImage(logo, 'PNG', 12, 6, logoW, logoH);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('NeuraSolutions', w - 14, 13, { align: 'right' });

  if (meta) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 200, 255);
    doc.text(meta, w - 14, 20, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(TEXT_DARK_HEX);
  doc.text(title, 14, 46);

  return 52;
}

function addPageFooters(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_LIGHT_HEX);
    doc.text(`Generated by NeuraSolutions AIOS · ${today}`, 14, h - 7);
    doc.text(`Page ${i} / ${pageCount}`, w - 14, h - 7, { align: 'right' });
  }
}

// ── Reports ────────────────────────────────────────────────────────────────

export async function downloadReportPDF(report: Report): Promise<void> {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  const meta = `${report.period} · ${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report`;
  let y = await addPageHeader(doc, report.title, meta);

  // Category badge
  const catLabel = report.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  doc.setFillColor('#e0e7ff');
  doc.roundedRect(14, y, catLabel.length * 4 + 16, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(BRAND_HEX);
  doc.text(catLabel.toUpperCase(), 14 + (catLabel.length * 4 + 16) / 2, y + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MID_HEX);
  const genDate = new Date(report.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Generated: ${genDate}  ·  ${report.size}`, w - 14, y + 5.5, { align: 'right' });

  y += 16;
  doc.setDrawColor(230, 230, 230);
  doc.line(14, y, w - 14, y);
  y += 10;

  // Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(TEXT_DARK_HEX);
  doc.text('Summary', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_MID_HEX);
  const summaryLines = doc.splitTextToSize(report.summary, w - 28) as string[];
  doc.text(summaryLines, 14, y);
  y += summaryLines.length * 5 + 10;

  // Highlights
  if (report.highlights.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(TEXT_DARK_HEX);
    doc.text('Key Highlights', 14, y);
    y += 7;

    report.highlights.forEach((h) => {
      doc.setFillColor(BRAND_HEX);
      doc.circle(17.5, y - 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(TEXT_MID_HEX);
      doc.text(h, 22, y);
      y += 6;
    });
    y += 6;
  }

  // AI Insight box
  const noteLines = doc.splitTextToSize(report.aiGeneratedNote, w - 44) as string[];
  const boxH = noteLines.length * 5 + 18;
  doc.setFillColor('#eef2ff');
  doc.roundedRect(14, y, w - 28, boxH, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(BRAND_HEX);
  doc.text('✦  AI INSIGHT', 20, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor('#3730a3');
  doc.text(noteLines, 20, y + 16);

  addPageFooters(doc);
  doc.save(`${report.title.replace(/[\s/]+/g, '-')}.pdf`);
}

// ── Invoices ───────────────────────────────────────────────────────────────

export async function downloadInvoicePDF(invoice: Invoice): Promise<void> {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  const dueFormatted = new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  let y = await addPageHeader(doc, `Invoice ${invoice.number}`, `Due: ${dueFormatted}`);

  // Status badge
  const statusStyle: Record<string, { bg: string; text: string }> = {
    paid:    { bg: '#d1fae5', text: '#065f46' },
    pending: { bg: '#fef3c7', text: '#92400e' },
    overdue: { bg: '#fee2e2', text: '#991b1b' },
  };
  const style = statusStyle[invoice.status] ?? { bg: '#f1f5f9', text: '#475569' };

  doc.setFillColor(style.bg);
  doc.roundedRect(14, y, 32, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(style.text);
  doc.text(invoice.status.toUpperCase(), 30, y + 5.5, { align: 'center' });

  y += 16;
  doc.setDrawColor(225, 225, 225);
  doc.line(14, y, w - 14, y);
  y += 10;

  // Details grid
  const half = w / 2;
  const drawDetail = (label: string, value: string, x: number, offsetY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_LIGHT_HEX);
    doc.text(label.toUpperCase(), x, offsetY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(TEXT_DARK_HEX);
    doc.text(value, x, offsetY + 7);
  };

  const invDate = new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  drawDetail('Invoice Number', invoice.number, 14, y);
  drawDetail('Invoice Date', invDate, half, y);
  y += 18;

  drawDetail('Bill To', 'Atlas Ventures', 14, y);
  drawDetail('Due Date', dueFormatted, half, y);
  y += 18;

  doc.line(14, y, w - 14, y);
  y += 6;

  // Line items
  const rows =
    invoice.items.length > 0
      ? invoice.items.map((item) => [
          item.description,
          String(item.quantity),
          `£${item.unitPrice.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
          `£${item.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
        ])
      : [['NeuraSolutions AIOS — Professional Plan', '1',
          `£${invoice.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
          `£${invoice.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`]];

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: rows,
    headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: SURFACE_RGB },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY: number = (doc as any).lastAutoTable.finalY + 8;
  const totalW = 82;

  doc.setFillColor('#f8fafc');
  doc.roundedRect(w - 14 - totalW, tableEndY, totalW, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_MID_HEX);
  doc.text('Total Due', w - 14 - totalW + 8, tableEndY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(BRAND_HEX);
  doc.text(`£${invoice.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, w - 16, tableEndY + 16, { align: 'right' });

  addPageFooters(doc);
  doc.save(`${invoice.number}.pdf`);
}

// ── Leads ──────────────────────────────────────────────────────────────────

export async function downloadLeadsPDF(leads: Lead[], statusFilter: string, search: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape' });

  const filterDesc = [
    statusFilter !== 'all' ? `Status: ${statusFilter}` : 'All statuses',
    search ? `Search: "${search}"` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  let y = await addPageHeader(doc, 'Leads Report', `${leads.length} leads · ${filterDesc}`);
  y += 4;

  const STATUS_COLOR: Record<string, [number, number, number]> = {
    new:       [59, 130, 246],
    contacted: [245, 158, 11],
    qualified: [99, 102, 241],
    won:       [16, 185, 129],
    lost:      [239, 68, 68],
  };

  autoTable(doc, {
    startY: y,
    head: [['Name', 'Email', 'Phone', 'Source', 'Status', 'Score', 'Added']],
    body: leads.map((l) => [
      l.name,
      l.email,
      l.phone ?? '—',
      SOURCE_LABEL[l.source] ?? l.source,
      l.status.charAt(0).toUpperCase() + l.status.slice(1),
      `${l.score}%`,
      new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    ]),
    headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: SURFACE_RGB },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 62 },
      2: { cellWidth: 32 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 32 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const lead = leads[data.row.index];
        if (lead && STATUS_COLOR[lead.status]) {
          data.cell.styles.textColor = STATUS_COLOR[lead.status];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc);
  doc.save(`leads-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Contacts ───────────────────────────────────────────────────────────────

export async function downloadContactsPDF(contacts: Contact[], statusFilter: string, search: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape' });

  const filterDesc = [
    statusFilter !== 'all' ? `Status: ${statusFilter}` : 'All statuses',
    search ? `Search: "${search}"` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  let y = await addPageHeader(doc, 'CRM Contacts Report', `${contacts.length} contacts · ${filterDesc}`);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Name', 'Email', 'Company', 'Phone', 'Status', 'Added']],
    body: contacts.map((c) => [
      c.name,
      c.email,
      c.company ?? '—',
      c.phone ?? '—',
      c.status === 'active' ? 'Active' : 'Inactive',
      new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    ]),
    headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: SURFACE_RGB },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 65 },
      2: { cellWidth: 55 },
      3: { cellWidth: 38 },
      4: { cellWidth: 28 },
      5: { cellWidth: 38 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const contact = contacts[data.row.index];
        if (contact) {
          data.cell.styles.textColor =
            contact.status === 'active' ? [16, 185, 129] : [100, 116, 139];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc);
  doc.save(`contacts-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Usage ──────────────────────────────────────────────────────────────────

export async function downloadUsagePDF(rows: TokenUsage[], agentFilter: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const y = await addPageHeader(
    doc,
    'Usage & Tokens Report',
    agentFilter ? `Agent: ${agentFilter}` : 'All Agents'
  );

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalTokens = rows.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0);

  doc.setFontSize(10);
  doc.setTextColor(TEXT_MID_HEX);
  doc.text(
    `Total records: ${rows.length}   |   Total tokens: ${totalTokens.toLocaleString()}   |   Total cost: £${(totalCost * 0.79).toFixed(4)}`,
    14,
    y + 8
  );

  autoTable(doc, {
    startY: y + 14,
    head: [['Agent', 'Model', 'Tokens In', 'Tokens Out', 'Cost (£)', 'Date']],
    body: rows.map((r) => [
      r.agent_name,
      r.model,
      r.tokens_in.toLocaleString(),
      r.tokens_out.toLocaleString(),
      `£${(r.cost * 0.79).toFixed(4)}`,
      new Date(r.created_at).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: SURFACE_RGB },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc);
  doc.save(`usage-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Clients ────────────────────────────────────────────────────────────────

export async function downloadClientsPDF(clients: Client[], statusFilter: string, search: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape' });

  const filterDesc = [
    statusFilter !== 'all' ? `Status: ${statusFilter}` : 'All statuses',
    search ? `Search: "${search}"` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  let y = await addPageHeader(doc, 'Clients Report', `${clients.length} clients · ${filterDesc}`);
  y += 4;

  const STATUS_COLOR: Record<string, [number, number, number]> = {
    active:   [16, 185, 129],
    inactive: [245, 158, 11],
    churned:  [239, 68, 68],
  };

  autoTable(doc, {
    startY: y,
    head: [['Company', 'Name', 'Email', 'Contract Value', 'Status', 'Renewal']],
    body: clients.map((c) => [
      c.company,
      c.name,
      c.email,
      c.contract_value != null
        ? `£${c.contract_value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
        : '—',
      c.status.charAt(0).toUpperCase() + c.status.slice(1),
      c.next_renewal_at
        ? new Date(c.next_renewal_at + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
    ]),
    headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: SURFACE_RGB },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 45 },
      2: { cellWidth: 62 },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 28 },
      5: { cellWidth: 32 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const client = clients[data.row.index];
        if (client && STATUS_COLOR[client.status]) {
          data.cell.styles.textColor = STATUS_COLOR[client.status];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc);
  doc.save(`clients-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Treatment Brochure ──────────────────────────────────────────────────────

export async function generateTreatmentsBrochurePDF(): Promise<void> {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Cover page ────────────────────────────────────────────────────────────
  // Dark gradient background (simulated with rect)
  doc.setFillColor(15, 12, 41);
  doc.rect(0, 0, w, h, 'F');

  // Decorative circles
  doc.setFillColor(67, 56, 202);
  doc.circle(w + 10, -10, 60, 'F');
  doc.setFillColor(99, 102, 241);
  doc.circle(-10, h + 10, 50, 'F');
  doc.setFillColor(30, 27, 75);
  doc.circle(w / 2, h / 2, 80, 'F');

  // Logo/brand
  const logo = await _logoImg;
  if (logo.naturalWidth > 0) {
    const lh = 22;
    const lw = (logo.naturalWidth / logo.naturalHeight) * lh;
    doc.addImage(logo, 'PNG', 14, 14, lw, lh);
  }

  // Accent line
  doc.setFillColor(99, 102, 241);
  doc.rect(14, 52, 30, 1.5, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text('Noor Aesthetics', 14, 72);
  doc.setFontSize(22);
  doc.setTextColor(165, 180, 252);
  doc.text('Treatment Brochure', 14, 84);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text('Premium aesthetic treatments for natural beauty & wellness', 14, 96);

  // Date badge
  doc.setFillColor(30, 27, 75);
  doc.roundedRect(14, 106, 60, 9, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(165, 180, 252);
  doc.text(today, 44, 112, { align: 'center' });

  // Category count
  const totalTreatments = TREATMENT_CATALOGUE.reduce((s, c) => s + c.items.length, 0);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${TREATMENT_CATALOGUE.length} categories  ·  ${totalTreatments} treatments`, 14, 124);

  // Bottom strip
  doc.setFillColor(67, 56, 202);
  doc.rect(0, h - 20, w, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('CONFIDENTIAL — Noor Aesthetics Client Document', 14, h - 8);
  doc.text('neurasolutions.cloud', w - 14, h - 8, { align: 'right' });

  // ── Category pages ─────────────────────────────────────────────────────────
  for (const cat of TREATMENT_CATALOGUE) {
    doc.addPage();

    // Category header band
    doc.setFillColor(...cat.color);
    doc.rect(0, 0, w, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(cat.category.toUpperCase(), 14, 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`${cat.items.length} treatments`, w - 14, 14.5, { align: 'right' });

    let y = 32;

    for (const item of cat.items) {
      // Check if we need a new page
      if (y > h - 60) {
        doc.addPage();
        // Mini header on continuation page
        doc.setFillColor(...cat.color);
        doc.rect(0, 0, w, 14, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(`${cat.category} (continued)`, 14, 9.5);
        y = 22;
      }

      const cardH = 48;
      // Card background
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, w - 28, cardH, 3, 3, 'F');
      // Left accent bar with category color
      doc.setFillColor(...cat.color);
      doc.roundedRect(14, y, 3, cardH, 1.5, 1.5, 'F');

      // Treatment name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(item.name, 22, y + 10);

      // Price badge
      doc.setFillColor(...cat.color);
      const priceW = item.price.length * 2.2 + 10;
      doc.roundedRect(w - 14 - priceW, y + 4, priceW, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(item.price, w - 14 - priceW / 2, y + 9.5, { align: 'center' });

      // Duration chip
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...cat.color);
      doc.text(`⏱ ${item.duration}`, 22, y + 19);

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const descLines = doc.splitTextToSize(item.desc, w - 42);
      doc.text(descLines.slice(0, 2), 22, y + 27);

      y += cardH + 6;
    }

    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Noor Aesthetics — Confidential Treatment Brochure', 14, h - 7);
    doc.text(today, w - 14, h - 7, { align: 'right' });
  }

  // ── Summary table page ────────────────────────────────────────────────────
  doc.addPage();
  await addPageHeader(doc, 'Treatment Price List', 'All treatments · ' + today);

  const allRows = TREATMENT_CATALOGUE.flatMap(cat =>
    cat.items.map(item => [cat.category, item.name, item.duration, item.price])
  );

  autoTable(doc, {
    startY: 56,
    head: [['Category', 'Treatment', 'Duration', 'Starting From']],
    body: allRows,
    headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: SURFACE_RGB },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold' },
      1: { cellWidth: 68 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 35, halign: 'right', textColor: [99, 102, 241], fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc);
  doc.save(`noor-aesthetics-treatment-brochure-${new Date().toISOString().slice(0, 10)}.pdf`);
}
