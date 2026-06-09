import type { SecuritySummary } from '../../types/security';

interface Props {
  summary: SecuritySummary | null;
  loading: boolean;
}

export function SecurityKPIRow({ summary, loading }: Props) {
  const tiles = [
    {
      label: 'Total Events',
      value: loading ? '—' : (summary?.total_events ?? '—'),
      color: '#6366f1',
    },
    {
      label: 'High / Critical',
      value: loading ? '—' : `${summary?.high_count ?? '0'} / ${summary?.critical_count ?? '0'}`,
      color: '#ef4444',
    },
    {
      label: 'Unresolved',
      value: loading ? '—' : (summary?.high_unresolved ?? '—'),
      color: '#f59e0b',
    },
    {
      label: 'Resolved',
      value: loading ? '—' : (summary?.resolved_count ?? '—'),
      color: '#10b981',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {tiles.map(({ label, value, color }) => (
        <div
          key={label}
          className="bg-white rounded-xl px-5 py-4 border"
          style={{ borderColor: `${color}40` }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{label}</p>
          <p className="text-3xl font-bold m-0" style={{ color }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
