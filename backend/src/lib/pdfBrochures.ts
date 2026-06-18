import PDFDocument from 'pdfkit';

const INDIGO = '#6366f1';
const SLATE  = '#475569';
const DARK   = '#1e293b';
const LIGHT  = '#f8fafc';

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

function makeDoc(): PDFKit.PDFDocument {
  return new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
}

function drawHeader(doc: PDFKit.PDFDocument, subtitle: string): void {
  doc.rect(0, 0, doc.page.width, 90).fill('#0f0c29');
  doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold')
     .text('NOOR AESTHETICS', 50, 28, { align: 'left' });
  doc.fontSize(10).fillColor('rgba(255,255,255,0.6)').font('Helvetica')
     .text(subtitle, 50, 56, { align: 'left' });
  doc.fontSize(9).fillColor('rgba(255,255,255,0.4)')
     .text(`Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
           50, 56, { align: 'right', width: doc.page.width - 100 });
  doc.rect(0, 90, doc.page.width, 3).fill(INDIGO);
  doc.y = 120;
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const y = doc.page.height - 40;
  doc.rect(0, y - 4, doc.page.width, 44).fill('#0f172a');
  doc.fontSize(8).fillColor('rgba(255,255,255,0.4)').font('Helvetica')
     .text('Noor Aesthetics  ·  All prices from. Complimentary consultation included.',
           50, y + 4, { align: 'left', width: doc.page.width - 100 });
  doc.text('+44 7519685477', 50, y + 4, { align: 'right', width: doc.page.width - 100 });
}

export function generateBrochurePDF(type: 'treatments' | 'membership'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = makeDoc();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (type === 'treatments') {
      drawHeader(doc, 'Treatment Menu & Pricing');

      for (const section of TREATMENT_SECTIONS) {
        // Section header bar
        doc.rect(50, doc.y, doc.page.width - 100, 22).fill(INDIGO);
        doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
           .text(section.title, 58, doc.y - 18);
        doc.y += 8;

        for (const [name, price] of section.items) {
          const rowY = doc.y;
          doc.rect(50, rowY, doc.page.width - 100, 18).fill(LIGHT);
          doc.rect(50, rowY + 17, doc.page.width - 100, 1).fill('#e2e8f0');
          doc.fontSize(9.5).fillColor(DARK).font('Helvetica')
             .text(`  • ${name}`, 54, rowY + 4, { continued: false });
          doc.fontSize(9.5).fillColor(INDIGO).font('Helvetica-Bold')
             .text(price, 50, rowY + 4, { align: 'right', width: doc.page.width - 100 });
          doc.y = rowY + 18;
        }
        doc.y += 10;
      }

      doc.fontSize(9).fillColor(SLATE).font('Helvetica')
         .text('All treatments include a complimentary consultation. Reply to this email or call us to book.',
               50, doc.y + 6, { align: 'center', width: doc.page.width - 100 });

    } else {
      drawHeader(doc, 'Exclusive Membership Packages');

      for (const tier of MEMBERSHIP_TIERS) {
        const blockY = doc.y;
        const estimatedH = 38 + tier.features.length * 16 + 10;
        doc.rect(50, blockY, doc.page.width - 100, estimatedH).fill(LIGHT).stroke('#e2e8f0');
        doc.rect(50, blockY, doc.page.width - 100, 28).fill(INDIGO);
        doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold')
           .text(tier.name, 60, blockY + 8, { continued: false });
        doc.fontSize(10).fillColor('#fcd34d').font('Helvetica-Bold')
           .text(tier.price, 60, blockY + 8, { align: 'right', width: doc.page.width - 120 });
        doc.y = blockY + 32;
        for (const f of tier.features) {
          doc.fontSize(9.5).fillColor(DARK).font('Helvetica')
             .text(`   ✓  ${f}`, 58, doc.y, { lineGap: 2 });
          doc.y += 15;
        }
        doc.y = blockY + estimatedH + 12;
      }

      doc.fontSize(9).fillColor(SLATE).font('Helvetica')
         .text('To join or for a complimentary membership consultation, reply to this email or call us.',
               50, doc.y + 4, { align: 'center', width: doc.page.width - 100 });
    }

    drawFooter(doc);
    doc.end();
  });
}
