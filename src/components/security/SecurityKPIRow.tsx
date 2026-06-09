import type { SecuritySummary } from '../../types/security';

interface Props {
  summary: SecuritySummary | null;
  loading: boolean;
}

const CARDS = [
  { key: 'total_events' as const,   label: 'Total Events',        color: '#6366f1' },
  { key: 'low_count' as const,      label: 'Low Severity',         color: '#6b7280' },
  { key: 'medium_count' as const,   label: 'Medium Severity',      color: '#f59e0b' },
  { key: 'high_unresolved' as const, label: 'High / Unresolved',   color: '#ef4444' },
];

export function SecurityKPIRow({ summary, loading }: Props) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {CARDS.map(({ key, label, color }) => (
        <div
          key={key}
          className="bg-white rounded-xl px-5 py-4 border"
          style={{ borderColor: `${color}40` }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{label}</p>
          <p className="text-3xl font-bold m-0" style={{ color }}>
            {loading ? '—' : (summary?.[key] ?? '0')}
          </p>
        </div>
      ))}
    </div>
  );
}
