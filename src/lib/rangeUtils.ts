export type Range = '7d' | '30d' | '90d' | '1y';

// Configurable per client deployment
export const USD_GBP = 0.79;

function subtractDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().substring(0, 10); // YYYY-MM-DD, stable within a day
}

export function getDateThreshold(range: Range): string {
  if (range === '7d')  return subtractDays(7);
  if (range === '30d') return subtractDays(30);
  if (range === '90d') return subtractDays(90);
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().substring(0, 10);
}

export function getDoubleThreshold(range: Range): string {
  if (range === '7d')  return subtractDays(14);
  if (range === '30d') return subtractDays(60);
  if (range === '90d') return subtractDays(180);
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().substring(0, 10);
}

export function formatChartDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
  });
}

export function groupByDate(
  items: { created_at: string }[],
  valueGetter: (item: any) => number
): { date: string; value: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.created_at.substring(0, 10);
    map.set(key, (map.get(key) ?? 0) + valueGetter(item));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ date: formatChartDate(key), value }));
}

export function groupByField<T>(
  items: T[],
  keyGetter: (item: T) => string,
  valueGetter: (item: T) => number
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyGetter(item);
    map.set(key, (map.get(key) ?? 0) + valueGetter(item));
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}
