import { useEffect } from 'react';
import { Printer, ArrowLeft, Check, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';

function downloadMembershipTxt() {
  const lines: string[] = [
    'NOOR AESTHETICS — VIP MEMBERSHIP PACKAGES 2026',
    '='.repeat(52),
    'Private Aesthetic Clinic · London',
    '',
    'Three membership tiers designed for clients who want priority access,',
    'consistent results and the very best of aesthetic medicine.',
    '',
  ];

  for (const tier of TIERS) {
    lines.push(`\n${'—'.repeat(40)}`);
    lines.push(`${tier.name.toUpperCase()} MEMBERSHIP — ${tier.price} ${tier.priceNote}`);
    lines.push(tier.tagline);
    lines.push('');
    lines.push('Features included:');
    for (const f of tier.features) lines.push(`  - ${f}`);
  }

  lines.push(`\n${'='.repeat(52)}`);
  lines.push('\nCOMPARISON TABLE');
  lines.push('-'.repeat(40));
  const col = 22;
  lines.push(`${'Feature'.padEnd(col)}SILVER          GOLD            PLATINUM`);
  for (const row of COMPARISON) {
    lines.push(`${row.feature.padEnd(col)}${row.silver.padEnd(16)}${row.gold.padEnd(16)}${row.platinum}`);
  }

  lines.push('');
  lines.push('All memberships are annual. Renewable each year.');
  lines.push('Priority booking, dedicated support and exclusive member events included.');
  lines.push('www.nooraesthetics.co.uk');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Noor Aesthetics - Membership Packages.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

const TIERS = [
  {
    name: 'Silver',
    tagline: 'Essential aesthetic care',
    price: '£1,500',
    priceNote: 'per year',
    symbol: '◆',
    accent: '#64748b',
    accentRgb: '100,116,139',
    bg: '#f8fafc',
    headerBg: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    textOnHeader: '#e2e8f0',
    border: '#cbd5e1',
    chipBg: '#f1f5f9',
    chipColor: '#475569',
    features: [
      'Access to all skin & body treatments',
      '10% discount on all services',
      'Bi-annual skin consultation',
      'Priority 48-hour booking',
      'Monthly wellness newsletter',
      'Referral reward programme',
      '15% birthday discount voucher',
    ],
  },
  {
    name: 'Gold',
    tagline: 'Premium treatments & priority access',
    price: '£2,800',
    priceNote: 'per year',
    symbol: '✦',
    accent: '#b45309',
    accentRgb: '180,83,9',
    bg: '#fffbeb',
    headerBg: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
    textOnHeader: '#fde68a',
    border: '#fcd34d',
    chipBg: '#fef3c7',
    chipColor: '#92400e',
    features: [
      'Access to all injectable & laser treatments',
      '15% discount on all services',
      'Quarterly personalised skin review',
      '1 complimentary treatment per year',
      'Priority 24-hour booking guarantee',
      'Dedicated WhatsApp support line',
      'Birthday treatment gift (value up to £250)',
      'Invitation to seasonal member events',
      'Online treatment diary & progress tracking',
    ],
  },
  {
    name: 'Platinum',
    tagline: 'Unlimited access · ultimate luxury',
    price: '£5,200',
    priceNote: 'per year',
    symbol: '❖',
    accent: '#4f46e5',
    accentRgb: '79,70,229',
    bg: '#f5f3ff',
    headerBg: 'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)',
    textOnHeader: '#c7d2fe',
    border: '#818cf8',
    chipBg: '#ede9fe',
    chipColor: '#4338ca',
    featured: true,
    features: [
      'Unlimited access to all 15 treatments',
      'Dedicated personal treatment coordinator',
      '25% discount on all additional services',
      'Monthly skin health & wellness review',
      '2 complimentary premium treatments per year',
      'Priority same-day booking',
      'Exclusive member-only previews & events',
      'Annual in-depth consultation — senior clinician',
      'Birthday luxury treatment (value up to £500)',
      'Personalised home skincare regime & products',
    ],
  },
];

const COMPARISON = [
  { feature: 'Annual Fee',           silver: '£1,500',           gold: '£2,800',             platinum: '£5,200'            },
  { feature: 'Treatments Access',    silver: 'Skin & Body',      gold: 'Injectables + Laser', platinum: 'All 15 treatments' },
  { feature: 'Service Discount',     silver: '10%',              gold: '15%',                platinum: '25%'               },
  { feature: 'Booking Priority',     silver: '48h guarantee',    gold: '24h guarantee',      platinum: 'Same-day'          },
  { feature: 'Consultations',        silver: 'Bi-annual',        gold: 'Quarterly',          platinum: 'Monthly'           },
  { feature: 'Complimentary Treats', silver: '—',                gold: '1 per year',         platinum: '2 per year'        },
  { feature: 'Personal Coordinator', silver: '—',                gold: '—',                  platinum: '✓ Dedicated'       },
  { feature: 'Birthday Benefit',     silver: '15% discount',     gold: 'Treatment (£250)',   platinum: 'Treatment (£500)'  },
  { feature: 'Member Events',        silver: '—',                gold: '✓ Seasonal',         platinum: '✓ Exclusive'       },
];

const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

export default function MembershipBrochurePage() {
  useEffect(() => {
    const FONT_ID = 'noor-brochure-fonts';
    if (!document.getElementById(FONT_ID)) {
      const link = document.createElement('link');
      link.id = FONT_ID; link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap';
      document.head.appendChild(link);
    }
    const STYLE_ID = 'noor-brochure-print';
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement('style');
      s.id = STYLE_ID;
      s.textContent = `
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A4 portrait; }
          body { margin: 0 !important; }
          .page-break { page-break-before: always; break-before: page; }
          .page-break-after { page-break-after: always; break-after: page; }
          .no-break { page-break-inside: avoid; break-inside: avoid; }
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: '#f7f6f2', minHeight: '100vh' }}>

      {/* Toolbar */}
      <div className="no-print" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100, display: 'flex', gap: '10px' }}>
        <Link to="/emails" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: 500, color: '#475569', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <ArrowLeft size={14} /> Back
        </Link>
        <button onClick={downloadMembershipTxt} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0891b2', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 500, color: 'white', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <FileDown size={14} /> Download TXT for RAG
        </button>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 500, color: 'white', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* ── COVER ─────────────────────────────────────────────────────────── */}
      <div className="page-break-after" style={{ background: 'linear-gradient(160deg, #080611 0%, #0f0c1e 45%, #150d2e 100%)', padding: '72px 64px 60px', position: 'relative', overflow: 'hidden', minHeight: '297mm', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '420px', height: '420px', borderRadius: '50%', border: '1px solid rgba(167,139,250,0.2)' }} />
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', border: '1px solid rgba(167,139,250,0.12)' }} />
        <div style={{ position: 'absolute', bottom: '20px', left: '15%', width: '180px', height: '180px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.03)' }} />

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', letterSpacing: '0.35em', color: '#818cf8', textTransform: 'uppercase', marginBottom: '28px', fontWeight: 500 }}>
          Noor Aesthetics · Private Clinic · London
        </p>

        <h1 style={{ fontFamily: "'Cormorant Garant', Georgia, serif", fontWeight: 300, fontSize: '80px', lineHeight: 0.88, color: '#ffffff', letterSpacing: '-2px', margin: '0 0 28px 0' }}>
          Membership<br />
          <span style={{ fontStyle: 'italic', color: '#c4b5fd', fontWeight: 300 }}>Programmes</span>
        </h1>

        <div style={{ width: '56px', height: '1.5px', background: 'linear-gradient(to right, #818cf8, transparent)', marginBottom: '24px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <p style={{ color: '#64748b', fontSize: '13px', letterSpacing: '0.04em', margin: 0 }}>
            Three exclusive tiers &ensp;·&ensp; Annual membership &ensp;·&ensp; Exclusive benefits from day one
          </p>
          <p style={{ color: '#334155', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>
            {today}
          </p>
        </div>
      </div>

      {/* ── TIER OVERVIEW STRIP ─────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #ece9e0', padding: '0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {TIERS.map((tier, i) => (
          <div key={tier.name} style={{ padding: '20px 28px', borderRight: i < 2 ? '1px solid #ece9e0' : undefined, display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', background: tier.featured ? 'linear-gradient(135deg, rgba(79,70,229,0.04), rgba(79,70,229,0.02))' : undefined }}>
            {tier.featured && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${tier.accent}, ${tier.accent}80)` }} />}
            <span style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '28px', color: tier.accent, lineHeight: 1 }}>{tier.symbol}</span>
            <div>
              <p style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '20px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>{tier.name}</p>
              <p style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '18px', fontWeight: 500, color: tier.accent, margin: 0 }}>{tier.price}<span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}> /year</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* ── TIER DETAIL CARDS ───────────────────────────────────────────────── */}
      <div className="no-break" style={{ padding: '48px 48px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
        {TIERS.map(tier => (
          <div
            key={tier.name}
            className="no-break"
            style={{
              borderRadius: '16px',
              overflow: 'hidden',
              border: tier.featured ? `2px solid ${tier.border}` : '1px solid #ece9e0',
              boxShadow: tier.featured ? `0 8px 32px rgba(${tier.accentRgb},0.18)` : '0 2px 8px rgba(0,0,0,0.05)',
              background: '#ffffff',
              position: 'relative',
            }}
          >
            {/* Featured badge */}
            {tier.featured && (
              <div style={{ position: 'absolute', top: '16px', right: '16px', background: tier.accent, color: '#fff', fontSize: '9px', letterSpacing: '0.2em', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, textTransform: 'uppercase' }}>
                Most Popular
              </div>
            )}

            {/* Tier header */}
            <div style={{ background: tier.headerBg, padding: '28px 24px 24px' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 500 }}>
                {tier.symbol} {tier.name} Membership
              </p>
              <p style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '44px', fontWeight: 300, color: '#ffffff', margin: '0 0 2px 0', letterSpacing: '-1px', lineHeight: 1 }}>
                {tier.price}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 14px 0', letterSpacing: '0.1em' }}>
                {tier.priceNote}
              </p>
              <p style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '15px', fontStyle: 'italic', color: tier.textOnHeader, margin: 0, lineHeight: 1.4 }}>
                {tier.tagline}
              </p>
            </div>

            {/* Features */}
            <div style={{ padding: '24px', background: tier.bg }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: tier.accent, fontWeight: 600, marginBottom: '14px' }}>
                What's included
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tier.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: tier.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <Check size={10} color="#fff" strokeWidth={3} />
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA chip */}
              <div style={{ marginTop: '20px', padding: '12px 16px', background: tier.chipBg, borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '15px', fontWeight: 600, color: tier.chipColor, margin: '0 0 2px 0' }}>
                  Join {tier.name} →
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                  Speak to your consultant to enrol
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── COMPARISON TABLE ────────────────────────────────────────────────── */}
      <div className="page-break" style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 48px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '28px', height: '2px', background: '#5b5bd6' }} />
          <h2 style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '28px', fontWeight: 500, color: '#0f172a', margin: 0 }}>
            Membership Comparison
          </h2>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#64748b', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                Feature
              </th>
              {TIERS.map(t => (
                <th key={t.name} style={{ padding: '14px 20px', textAlign: 'center', fontSize: '11px', letterSpacing: '0.1em', color: t.featured ? '#a5b4fc' : '#94a3b8', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                  {t.symbol} {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row, i) => (
              <tr key={row.feature} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9f9f7', borderBottom: '1px solid #ece9e0' }}>
                <td style={{ padding: '13px 20px', fontSize: '13px', fontWeight: 500, color: '#334155', fontFamily: "'DM Sans', sans-serif" }}>
                  {row.feature}
                </td>
                <td style={{ padding: '13px 20px', textAlign: 'center', fontSize: i === 0 ? '16px' : '13px', color: i === 0 ? '#475569' : '#64748b', fontFamily: i === 0 ? "'Cormorant Garant', serif" : "'DM Sans', sans-serif", fontWeight: i === 0 ? 600 : 400 }}>
                  {row.silver}
                </td>
                <td style={{ padding: '13px 20px', textAlign: 'center', fontSize: i === 0 ? '16px' : '13px', color: i === 0 ? '#b45309' : '#64748b', fontFamily: i === 0 ? "'Cormorant Garant', serif" : "'DM Sans', sans-serif", fontWeight: i === 0 ? 600 : 400 }}>
                  {row.gold}
                </td>
                <td style={{ padding: '13px 20px', textAlign: 'center', fontSize: i === 0 ? '16px' : '13px', color: i === 0 ? '#4f46e5' : '#4338ca', fontFamily: i === 0 ? "'Cormorant Garant', serif" : "'DM Sans', sans-serif", fontWeight: 600, background: i % 2 === 0 ? 'rgba(79,70,229,0.04)' : 'rgba(79,70,229,0.03)' }}>
                  {row.platinum}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '16px', fontStyle: 'italic', letterSpacing: '0.02em' }}>
          All memberships are annual subscriptions. Monthly payment options available on request. Terms & conditions apply.
          Membership discounts cannot be combined with other promotions. Contact your consultant for full terms.
        </p>
      </div>

      {/* ── WHY JOIN ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 48px 0' }}>
        <div style={{ background: 'linear-gradient(135deg, #080611, #0f0c1e)', borderRadius: '16px', padding: '40px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', border: '1px solid rgba(99,102,241,0.2)' }} />
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.3em', color: '#818cf8', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 500 }}>Why Membership?</p>
            <h3 style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '32px', fontWeight: 400, color: '#fff', margin: '0 0 16px 0', lineHeight: 1.2 }}>
              Exceptional care,<br /><span style={{ fontStyle: 'italic', color: '#a5b4fc' }}>every visit</span>
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
              Our membership programmes are designed for clients who value consistent, high-quality aesthetic care. With a dedicated team, priority booking and exclusive benefits, your journey is always seamless.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            {['Save up to 25% on all treatments', 'Skip the wait with priority booking', 'Build a long-term relationship with your clinician', 'Achieve and maintain transformative results'].map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 48px 64px' }}>
        <div style={{ paddingTop: '24px', borderTop: '1px solid #ece9e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '18px', fontWeight: 500, color: '#0f172a', margin: '0 0 3px 0', letterSpacing: '0.05em' }}>
              NOOR AESTHETICS
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              Private Aesthetic Clinic · London · hello@nooraesthetics.co.uk
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', color: '#cbd5e1', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 2px 0' }}>Confidential</p>
            <p style={{ fontSize: '10px', color: '#cbd5e1', margin: 0 }}>{today}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
