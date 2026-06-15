import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  Icon: LucideIcon;
  loading?: boolean;
}

const CYAN = '#06b6d4';

export function KPITile({ label, value, sub, color, Icon, loading }: Props) {
  const [hovered, setHovered] = useState(false);
  const c = hovered ? CYAN : color;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        borderTop: `3px solid ${c}`,
        borderLeft:   `1px solid ${hovered ? CYAN + '40' : color + '20'}`,
        borderRight:  `1px solid ${hovered ? CYAN + '40' : color + '20'}`,
        borderBottom: `1px solid ${hovered ? CYAN + '40' : color + '20'}`,
        borderRadius: '0 0 14px 14px',
        padding: '18px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: 'default',
        transition: 'box-shadow 0.18s, transform 0.18s, border-color 0.18s',
        boxShadow: hovered
          ? `0 0 0 2px ${CYAN}25, 0 6px 22px rgba(6,182,212,0.12)`
          : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.8px', color: '#64748b',
        }}>
          {label}
        </span>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: `${c}18`,
          border: `1px solid ${c}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.18s',
        }}>
          <Icon size={15} color={c} />
        </div>
      </div>

      <div>
        <p style={{
          fontSize: 34, fontWeight: 800, color: c,
          margin: 0, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.5px',
          transition: 'color 0.18s',
        }}>
          {loading ? '—' : value}
        </p>
        {sub && (
          <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: '5px 0 0', lineHeight: 1 }}>
            {sub}
          </p>
        )}
      </div>

      <div style={{
        height: 3, borderRadius: 99,
        background: `linear-gradient(to right, ${c}60, transparent)`,
        transition: 'background 0.18s',
      }} />
    </div>
  );
}
