import type { ReportData, ReportSection, ReportItem } from '../../types/chat';

function valueColor(highlight?: 'positive' | 'negative'): string {
  if (highlight === 'positive') return '#10b981';
  if (highlight === 'negative') return '#ef4444';
  return '#1e293b';
}

function SubItems({ sub }: { sub: NonNullable<ReportItem['sub']> }) {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 7, padding: '6px 10px',
      border: '1px solid #e2e8f0', marginTop: 5,
    }}>
      {sub.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: i < sub.length - 1 ? 3 : 0,
          }}
        >
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{s.label}</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: valueColor(s.highlight) }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionBlock({ section, isLast }: { section: ReportSection; isLast: boolean }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
      background: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
        <span style={{ fontSize: 11 }}>{section.icon}</span>
        <span style={{
          fontSize: 9, fontWeight: 800, color: section.color,
          textTransform: 'uppercase' as const, letterSpacing: '0.5px',
        }}>
          {section.label}
        </span>
      </div>
      {section.items.map((item, i) => (
        <div key={i} style={{ marginBottom: i < section.items.length - 1 ? 8 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{item.label}</span>
            <span style={{
              fontSize: 14, fontWeight: 800,
              color: valueColor(item.highlight),
              fontVariantNumeric: 'tabular-nums' as const,
            }}>
              {item.value}
            </span>
          </div>
          {item.sub && item.sub.length > 0 && <SubItems sub={item.sub} />}
        </div>
      ))}
    </div>
  );
}

export function ReportMessage({ report }: { report: ReportData }) {
  return (
    <div style={{
      borderRadius: '3px 14px 14px 14px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      {/* Dark header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '11px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
            Business Report
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'white', fontWeight: 700 }}>
            {report.title}
          </p>
          {report.subtitle && (
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>
              {report.subtitle}
            </p>
          )}
        </div>
        <div style={{
          background: 'rgba(99,102,241,0.2)',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: 6, padding: '4px 8px',
        }}>
          <span style={{ fontSize: 9, color: '#a5b4fc', fontWeight: 700, letterSpacing: '0.5px' }}>AIOS</span>
        </div>
      </div>

      {/* Intro sentence */}
      {report.intro && (
        <div style={{ background: 'white', padding: '8px 14px 4px', borderBottom: '1px solid #f1f5f9' }}>
          <p style={{ margin: 0, fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
            {report.intro}
          </p>
        </div>
      )}

      {/* Dynamic sections */}
      {report.sections.map((section, i) => (
        <SectionBlock
          key={i}
          section={section}
          isLast={i === report.sections.length - 1}
        />
      ))}
    </div>
  );
}
