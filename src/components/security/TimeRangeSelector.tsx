import type { SecurityTimeRange } from '../../types/security';

const RANGES: { value: SecurityTimeRange; label: string }[] = [
  { value: '1w', label: '1 Week' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '1y', label: '1 Year' },
];

interface Props {
  value: SecurityTimeRange;
  onChange: (r: SecurityTimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {RANGES.map(r => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          style={{
            padding: '5px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            border: value === r.value ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
            background: value === r.value ? '#6366f1' : '#f8fafc',
            color: value === r.value ? '#fff' : '#64748b',
            transition: 'all 0.15s',
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
