import { cn } from '../../lib/cn';
import type { Range } from '../../lib/rangeUtils';

const RANGES: { label: string; value: Range }[] = [
  { label: '7d',  value: '7d'  },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: '1y',  value: '1y'  },
];

interface RangeSelectorProps {
  value: Range;
  onChange: (r: Range) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={cn(
            'px-2 py-0.5 text-xs rounded font-medium transition-colors',
            value === r.value
              ? 'bg-primary/10 text-primary'
              : 'text-surface-400 hover:text-surface-600'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
