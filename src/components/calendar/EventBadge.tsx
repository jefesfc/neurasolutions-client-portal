import { CATEGORY_CONFIG, type EventCategory } from '../../types/calendar';

interface Props {
  category: EventCategory;
  size?: 'sm' | 'md';
}

export function EventBadge({ category, size = 'sm' }: Props) {
  const { label, color } = CATEGORY_CONFIG[category];
  const cls = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded font-medium whitespace-nowrap ${cls}`}
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  );
}
