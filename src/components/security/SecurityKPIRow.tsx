import type { SecuritySummary } from '../../types/security';

interface Props {
  summary: SecuritySummary | null;
  loading: boolean;
}

const CARDS = [
  { key: 'total_today' as const,    label: 'Events Today',        color: '#6366f1' },
  { key: 'low_count' as const,      label: 'Low Severity',         color: '#6b7280' },
  { key: 'medium_count' as const,   label: 'Medium Severity',      color: '#f59e0b' },
  { key: 'high_unresolved' as const, label: 'High / Unresolved',   color: '#ef4444' },
];

export function SecurityKPIRow({ summary, loading }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
      {CARDS.map(({ key, label, color }) => (
        <div
          key={key}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${color}33`,
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ color, fontSize: 32, fontWeight: 700, margin: 0 }}>
            {loading ? '—' : (summary?.[key] ?? '0')}
          </p>
        </div>
      ))}
    </div>
  );
}
