import { useState } from 'react';
import { Activity, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import type { SecuritySummary } from '../../types/security';

interface Props {
  summary: SecuritySummary | null;
  loading: boolean;
}

const CYAN = '#06b6d4';

const TILES = [
  {
    label: 'Total Events',
    color: '#818cf8',
    Icon: Activity,
    getValue: (s: SecuritySummary | null) => String(s?.total_events ?? '—'),
    sub: 'monitored',
  },
  {
    label: 'High / Critical',
    color: '#f87171',
    Icon: AlertTriangle,
    getValue: (s: SecuritySummary | null) =>
      `${s?.high_count ?? '0'} / ${s?.critical_count ?? '0'}`,
    sub: 'severity events',
  },
  {
    label: 'Unresolved',
    color: '#fbbf24',
    Icon: Clock,
    getValue: (s: SecuritySummary | null) => String(s?.high_unresolved ?? '—'),
    sub: 'require action',
  },
  {
    label: 'Resolved',
    color: '#34d399',
    Icon: ShieldCheck,
    getValue: (s: SecuritySummary | null) => String(s?.resolved_count ?? '—'),
    sub: 'cleared',
  },
];

export function SecurityKPIRow({ summary, loading }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {TILES.map(({ label, color, Icon, getValue, sub }) => {
        const value = loading ? '—' : getValue(summary);
        const isCyan = hovered === label;

        return (
          <div
            key={label}
            onMouseEnter={() => setHovered(label)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: 'linear-gradient(135deg, #0d1524 0%, #111c2e 100%)',
              borderTop: `3px solid ${isCyan ? CYAN : color}`,
              borderLeft:   `1px solid ${isCyan ? CYAN + '40' : color + '20'}`,
              borderRight:  `1px solid ${isCyan ? CYAN + '40' : color + '20'}`,
              borderBottom: `1px solid ${isCyan ? CYAN + '40' : color + '20'}`,
              borderRadius: '0 0 14px 14px',
              padding: '18px 20px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              cursor: 'default',
              transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.18s',
              boxShadow: isCyan
                ? `0 0 0 2px ${CYAN}25, 0 8px 28px rgba(6,182,212,0.14)`
                : `0 4px 16px rgba(0,0,0,0.25)`,
              transform: isCyan ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            {/* Label + Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.8px', color: '#475569',
              }}>
                {label}
              </span>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: isCyan ? `${CYAN}18` : `${color}18`,
                border: `1px solid ${isCyan ? CYAN + '35' : color + '30'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s',
              }}>
                <Icon size={15} color={isCyan ? CYAN : color} />
              </div>
            </div>

            {/* Value */}
            <div>
              <p style={{
                fontSize: 34, fontWeight: 800,
                color: isCyan ? CYAN : color,
                margin: 0, lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.5px',
                transition: 'color 0.18s',
              }}>
                {value}
              </p>
              <p style={{
                fontSize: 11, color: '#334155', fontWeight: 500,
                margin: '5px 0 0', lineHeight: 1,
              }}>
                {sub}
              </p>
            </div>

            {/* Footer strip */}
            <div style={{
              height: 3, borderRadius: 99, marginTop: 4,
              background: `linear-gradient(to right, ${isCyan ? CYAN : color}60, transparent)`,
              transition: 'background 0.18s',
            }} />
          </div>
        );
      })}
    </div>
  );
}
