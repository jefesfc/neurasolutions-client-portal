import PDFDocument from 'pdfkit';

const INDIGO = '#6366f1';
const SLATE  = '#475569';
const DARK   = '#1e293b';
const LIGHT  = '#f8fafc';
const MARGIN = 50;
const PAGE_W = 595.28;  // A4 width in points
const PAGE_H = 841.89;  // A4 height in points
const FOOTER_H = 44;
const USABLE_W = PAGE_W - MARGIN * 2;
const SAFE_BOTTOM = PAGE_H - FOOTER_H - 20;

interface Section {
  title: string;
  items: [string, string][];
}

const TREATMENT_SECTIONS: Section[] = [
  {
    title: 'INJECTABLE TREATMENTS',
    items: [
      ['Anti-Wrinkle Injections',   'from £250'],
      ['Dermal Fillers',            'from £350'],
      ['Lip Augmentation',          'from £299'],
      ['Jaw / Face Slimming',       'from £350'],
      ['Skin Boosters (Profhilo)',  'from £450'],
      ['PRP Therapy',               'from £400'],
    ],
  },
  {
    title: 'LASER & RESURFACING',
    items: [
      ['CO2 Laser Resurfacing',  'from £800'],
      ['IPL Photofacial',        'from £350'],
      ['Laser Hair Removal',     'from £100 / session'],
    ],
  },
  {
    title: 'SKIN TREATMENTS',
    items: [
      ['HydraFacial',        'from £160'],
      ['Chemical Peel',      'from £180'],
      ['Microneedling',      'from £250'],
      ['Microneedling + PRP','from £450'],
    ],
  },
  {
    title: 'BODY TREATMENTS',
    items: [
      ['Non-Invasive Body Contouring', 'from £300'],
      ['Thread Lift',                  'from £1,200'],
    ],
  },
];

interface MembershipTier {
  name: string;
  price: string;
  features: string[];
}

const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    name: 'SILVER MEMBERSHIP',
    price: '£1,500 / year',
    features: [
      '2 Anti-Wrinkle treatments per year',
      '1 HydraFacial every month',
      '10% discount on all additional treatments',
      'Priority booking',
    ],
  },
  {
    name: 'GOLD MEMBERSHIP',
    price: '£2,800 / year',
    features: [
      '4 Anti-Wrinkle treatments per year',
      '1 HydraFacial + 1 Chemical Peel per month',
      '20% discount on all treatments',
      'Dedicated personal consultant',
      'Free annual skin assessment',
      'Complimentary birthday treatment',
    ],
  },
  {
    name: 'PLATINUM MEMBERSHIP',
    price: '£5,200 / year  (or £450 / month)',
    features: [
      'Unlimited Anti-Wrinkle and Filler treatments',
      'Unlimited HydraFacials and Chemical Peels',
      '30% discount on all laser and body treatments',
      'Same-day VIP booking',
      'Dedicated personal consultant',
      'Quarterly PRP sessions included',
      'Annual full skin rejuvenation package',
    ],
  },
];

function drawHeader(doc: PDFKit.PDFDocument, subtitle: string): void {
  doc.rect(0, 0, PAGE_W, 90).fill('#0f0c29');
  doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold')
     .text('NOOR AESTHETICS', MARGIN, 28, { align: 'left' });
  doc.fontSize(10).fillColor('rgba(255,255,255,0.6)').font('Helvetica')
     .text(subtitle, MARGIN, 56, { align: 'left' });
  doc.fontSize(9).fillColor('rgba(255,255,255,0.4)')
     .text(
       `Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
       MARGIN, 56, { align: 'right', width: USABLE_W }
     );
  doc.rect(0, 90, PAGE_W, 3).fill(INDIGO);
  doc.y = 120;
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const y = PAGE_H - FOOTER_H;
  doc.rect(0, y, PAGE_W, FOOTER_H).fill('#0f172a');
  doc.fontSize(8).fillColor('rgba(255,255,255,0.4)').font('Helvetica')
     .text('Noor Aesthetics  ·  All prices from. Complimentary consultation included.',
           MARGIN, y + 14, { align: 'left', width: USABLE_W });
  doc.text('+44 7519685477', MARGIN, y + 14, { align: 'right', width: USABLE_W });
}

/** Ensure there is at least `needed` points before the safe bottom; if not, add a new page. */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > SAFE_BOTTOM) {
    doc.addPage();
    doc.y = MARGIN;
  }
}

export function generateBrochurePDF(type: 'treatments' | 'membership'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (type === 'treatments') {
      drawHeader(doc, 'Treatment Menu & Pricing');

      for (const section of TREATMENT_SECTIONS) {
        const sectionH = 22 + section.items.length * 18 + 10;
        ensureSpace(doc, sectionH);

        // Section header bar
        const headerY = doc.y;
        doc.rect(MARGIN, headerY, USABLE_W, 22).fill(INDIGO);
        doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
           .text(section.title, MARGIN + 8, headerY + 6, { width: USABLE_W - 16 });
        doc.y = headerY + 22;

        for (const [name, price] of section.items) {
          ensureSpace(doc, 20);
          const rowY = doc.y;
          doc.rect(MARGIN, rowY, USABLE_W, 18).fill(LIGHT);
          doc.rect(MARGIN, rowY + 17, USABLE_W, 1).fill('#e2e8f0');
          doc.fontSize(9.5).fillColor(DARK).font('Helvetica')
             .text(`  • ${name}`, MARGIN + 4, rowY + 4, { width: USABLE_W * 0.65 });
          doc.fontSize(9.5).fillColor(INDIGO).font('Helvetica-Bold')
             .text(price, MARGIN, rowY + 4, { align: 'right', width: USABLE_W - 4 });
          doc.y = rowY + 18;
        }
        doc.y += 10;
      }

      ensureSpace(doc, 24);
      doc.fontSize(9).fillColor(SLATE).font('Helvetica')
         .text('All treatments include a complimentary consultation. Reply to this email or call us to book.',
               MARGIN, doc.y + 6, { align: 'center', width: USABLE_W });

    } else {
      drawHeader(doc, 'Exclusive Membership Packages');

      for (const tier of MEMBERSHIP_TIERS) {
        const cardH = 28 + tier.features.length * 16 + 14;
        // Keep entire card on one page
        ensureSpace(doc, cardH);

        const blockY = doc.y;
        doc.rect(MARGIN, blockY, USABLE_W, cardH).fill(LIGHT).strokeColor('#e2e8f0').stroke();
        doc.rect(MARGIN, blockY, USABLE_W, 28).fill(INDIGO);
        doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold')
           .text(tier.name, MARGIN + 10, blockY + 9, { width: USABLE_W * 0.55 });
        doc.fontSize(10).fillColor('#fcd34d').font('Helvetica-Bold')
           .text(tier.price, MARGIN, blockY + 9, { align: 'right', width: USABLE_W - 10 });

        doc.y = blockY + 32;
        for (const f of tier.features) {
          doc.fontSize(9.5).fillColor(DARK).font('Helvetica')
             .text(`   ✓  ${f}`, MARGIN + 8, doc.y, { lineGap: 2 });
          doc.y += 16;
        }
        doc.y = blockY + cardH + 14;
      }

      ensureSpace(doc, 24);
      doc.fontSize(9).fillColor(SLATE).font('Helvetica')
         .text('To join or for a complimentary membership consultation, reply to this email or call us.',
               MARGIN, doc.y + 4, { align: 'center', width: USABLE_W });
    }

    // Draw footer on every page
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(pageRange.start + i);
      drawFooter(doc);
    }

    doc.end();
  });
}
