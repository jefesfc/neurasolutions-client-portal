import { useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CATALOGUE = [
  {
    num: '01', category: 'Injectable Treatments', accent: '#5b5bd6', accentRgb: '91,91,214', light: '#f0f0ff',
    items: [
      { name: 'Anti-Wrinkle Injections',  duration: '30–45 min',  price: 'From £250',        desc: 'Botulinum toxin to relax dynamic facial lines — forehead, frown, crow\'s feet. Natural-looking results, lasting 3–4 months.' },
      { name: 'Dermal Fillers',           duration: '30–60 min',  price: 'From £350',        desc: 'Hyaluronic acid to restore lost volume, define contours and smooth deep lines. Immediate results lasting 9–18 months.' },
      { name: 'Lip Augmentation',         duration: '30 min',     price: 'From £299',        desc: 'Subtle or statement enhancement using premium HA fillers. Adds volume, definition and symmetry.' },
      { name: 'Jaw & Face Slimming',      duration: '30 min',     price: 'From £350',        desc: 'Masseter Botox to reduce jaw tension and achieve a slimmer, softer facial profile.' },
      { name: 'Skin Boosters · Profhilo', duration: '30 min',     price: 'From £450',        desc: 'Ultra-pure HA to deeply hydrate, firm and bioremodel. 2-session protocol; visible for 6 months.' },
      { name: 'PRP Therapy',              duration: '60 min',     price: 'From £400',        desc: 'Platelet-Rich Plasma to stimulate collagen and improve skin texture. Entirely natural, regenerative.' },
    ],
  },
  {
    num: '02', category: 'Laser & Light Treatments', accent: '#0891b2', accentRgb: '8,145,178', light: '#ecfeff',
    items: [
      { name: 'CO2 Laser Resurfacing',    duration: '60–90 min',  price: 'From £800',        desc: 'Fractional CO2 for deep skin renewal — reduces wrinkles, acne scars and pigmentation with significant results.' },
      { name: 'IPL Photofacial',          duration: '45 min',     price: 'From £350',        desc: 'Intense Pulsed Light targets sun damage, redness and broken capillaries for an even, luminous complexion.' },
      { name: 'Laser Hair Removal',       duration: '15–60 min',  price: 'From £100 / session', desc: 'Medical-grade diode laser for permanent hair reduction on face and body. 6–8 sessions for optimal results.' },
    ],
  },
  {
    num: '03', category: 'Skin Treatments', accent: '#059669', accentRgb: '5,150,105', light: '#f0fdf4',
    items: [
      { name: 'HydraFacial',              duration: '60 min',     price: 'From £160',        desc: 'Multi-step cleanse, exfoliate, extract and hydrate. Suitable for all skin types; immediate glow, zero downtime.' },
      { name: 'Chemical Peel',            duration: '45 min',     price: 'From £180',        desc: 'Medical-grade acid peel to resurface, brighten and even skin tone. Addresses pigmentation and fine lines.' },
      { name: 'Microneedling',            duration: '60 min',     price: 'From £250',        desc: 'Controlled micro-injuries stimulate collagen and elastin. Improves texture, pores, scars and firmness.' },
      { name: 'Microneedling + PRP',      duration: '90 min',     price: 'From £450',        desc: 'Combined protocol for amplified collagen stimulation, faster renewal and transformative skin resurfacing.' },
    ],
  },
  {
    num: '04', category: 'Body Treatments', accent: '#c2821a', accentRgb: '194,130,26', light: '#fefce8',
    items: [
      { name: 'Non-Invasive Body Contouring', duration: '60 min', price: 'From £300',        desc: 'Targeted technology to reduce stubborn fat, tighten skin and improve body contour — no surgery, no downtime.' },
      { name: 'Thread Lift',              duration: '60–90 min',  price: 'From £1,200',      desc: 'Dissolvable PDO threads lift and tighten sagging skin on face, neck or jowls. Lasts 12–18 months.' },
    ],
  },
];

const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
const totalTreatments = CATALOGUE.reduce((s, c) => s + c.items.length, 0);

export default function TreatmentsBrochurePage() {
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
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: '#f7f6f2', minHeight: '100vh' }}>

      {/* Toolbar — hidden in print */}
      <div className="no-print" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100, display: 'flex', gap: '10px' }}>
        <Link to="/emails" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: 500, color: '#475569', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <ArrowLeft size={14} /> Back
        </Link>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 500, color: 'white', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* ── COVER ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(160deg, #080611 0%, #0f0c1e 45%, #0c1a2e 100%)', padding: '72px 64px 60px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative rings */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '380px', height: '380px', borderRadius: '50%', border: '1px solid rgba(91,91,214,0.25)' }} />
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '260px', height: '260px', borderRadius: '50%', border: '1px solid rgba(91,91,214,0.15)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '10%', width: '220px', height: '220px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.04)' }} />

        {/* Eyebrow */}
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', letterSpacing: '0.35em', color: '#818cf8', textTransform: 'uppercase', marginBottom: '28px', fontWeight: 500 }}>
          Noor Aesthetics · Private Clinic · London
        </p>

        {/* Title */}
        <h1 style={{ fontFamily: "'Cormorant Garant', Georgia, serif", fontWeight: 300, fontSize: '80px', lineHeight: 0.88, color: '#ffffff', letterSpacing: '-2px', margin: '0 0 28px 0' }}>
          Treatment<br />
          <span style={{ fontStyle: 'italic', color: '#a5b4fc', fontWeight: 300 }}>Menu</span>
        </h1>

        {/* Gold rule */}
        <div style={{ width: '56px', height: '1.5px', background: 'linear-gradient(to right, #818cf8, transparent)', marginBottom: '24px' }} />

        {/* Meta row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <p style={{ color: '#64748b', fontSize: '13px', letterSpacing: '0.04em', margin: 0 }}>
            {CATALOGUE.length} treatment categories &ensp;·&ensp; {totalTreatments} procedures &ensp;·&ensp; Complimentary consultation available
          </p>
          <p style={{ color: '#334155', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>
            {today}
          </p>
        </div>
      </div>

      {/* ── INTRO STRIP ────────────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #ece9e0', padding: '20px 64px', display: 'flex', gap: '48px' }}>
        {[
          { label: 'CQC Registered', sub: 'Regulated practice' },
          { label: 'GMC Practitioners', sub: 'Doctor-led treatments' },
          { label: 'Premium Products', sub: 'Juvederm · Botox · Sculptra' },
          { label: 'Aftercare Included', sub: '14-day follow-up consultation' },
        ].map(item => (
          <div key={item.label}>
            <p style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>{item.label}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, letterSpacing: '0.03em' }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ── CATEGORY SECTIONS ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 64px 80px' }}>

        {CATALOGUE.map((cat, catIdx) => (
          <div key={cat.num} className={catIdx > 0 ? 'page-break' : ''} style={{ paddingTop: '56px' }}>

            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0', marginBottom: '4px', position: 'relative' }}>
              {/* Ghost numeral */}
              <span style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '110px', fontWeight: 300, lineHeight: 1, color: 'rgba(0,0,0,0.04)', letterSpacing: '-6px', marginRight: '8px', userSelect: 'none', flexShrink: 0 }}>
                {cat.num}
              </span>
              <div style={{ paddingBottom: '12px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                  <div style={{ width: '28px', height: '2px', background: cat.accent }} />
                  <span style={{ fontSize: '10px', letterSpacing: '0.25em', color: cat.accent, textTransform: 'uppercase', fontWeight: 500 }}>
                    {['Injectables', 'Laser & Light', 'Skin', 'Body'][catIdx]}
                  </span>
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '34px', fontWeight: 500, color: '#0f172a', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {cat.category}
                </h2>
              </div>
            </div>

            {/* Thin separator */}
            <div style={{ height: '1px', background: `linear-gradient(to right, rgba(${cat.accentRgb},0.5), rgba(${cat.accentRgb},0.05), transparent)`, marginBottom: '24px' }} />

            {/* Treatment grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {cat.items.map(item => (
                <div
                  key={item.name}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '22px 24px 20px',
                    border: '1px solid #ece9e0',
                    borderLeft: `3px solid ${cat.accent}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    position: 'relative',
                  }}
                >
                  {/* Treatment name + price */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
                    <h3 style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '20px', fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.1 }}>
                      {item.name}
                    </h3>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600, color: cat.accent, background: cat.light, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.02em' }}>
                      {item.price}
                    </span>
                  </div>

                  {/* Duration */}
                  <p style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 500 }}>
                    {item.duration}
                  </p>

                  {/* Description */}
                  <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.65, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ── PRICE SUMMARY TABLE ───────────────────────────────────────────── */}
        <div className="page-break" style={{ paddingTop: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '28px', height: '2px', background: '#5b5bd6' }} />
            <h2 style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '28px', fontWeight: 500, color: '#0f172a', margin: 0 }}>
              Treatment Price Summary
            </h2>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Treatment', 'Category', 'Duration', 'Starting From'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: i === 3 ? 'right' : 'left', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATALOGUE.flatMap(cat =>
                cat.items.map((item, itemIdx) => (
                  <tr key={item.name} style={{ background: itemIdx % 2 === 0 ? '#ffffff' : '#f9f9f7', borderBottom: '1px solid #ece9e0' }}>
                    <td style={{ padding: '12px 16px', fontFamily: "'Cormorant Garant', serif", fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '11px', color: cat.accent, fontWeight: 600, letterSpacing: '0.05em' }}>{cat.category.split(' ')[0]}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>{item.duration}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: "'Cormorant Garant', serif", fontSize: '17px', fontWeight: 600, color: cat.accent }}>{item.price}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '16px', letterSpacing: '0.03em', fontStyle: 'italic' }}>
            All prices are starting from and subject to change. A complimentary consultation is required prior to treatment. Package pricing and membership discounts available — ask your consultant.
          </p>
        </div>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #ece9e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
