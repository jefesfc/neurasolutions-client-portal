# Analytics Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data in AnalyticsPage with live PostgREST queries; each chart is self-contained with its own per-chart time range selector (7d/30d/90d/1y).

**Architecture:** Each new chart component calls `useQuery` directly and manages its own range state. Shared utilities in `rangeUtils.ts` handle date thresholds and client-side grouping. `KPIComparison` replaces `MetricComparison` with 4 real KPIs from `leads` + `token_usage` tables.

**Tech Stack:** React 18 + TypeScript, recharts (already installed), PostgREST via existing `useQuery` hook, Tailwind v4, lucide-react.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/rangeUtils.ts` | Create | Date thresholds, client-side groupBy helpers, USD→GBP constant |
| `src/components/analytics/RangeSelector.tsx` | Create | 7d/30d/90d/1y pill buttons, shared by all charts |
| `src/components/analytics/LeadsTrendChart.tsx` | Create | Leads/day area chart with range selector |
| `src/components/analytics/CostTrendChart.tsx` | Create | AI cost/day (£) area chart with range selector |
| `src/components/analytics/LeadsBarChart.tsx` | Create | Leads by status bar chart with range selector |
| `src/components/analytics/CostBarChart.tsx` | Create | AI cost by agent (£) bar chart with range selector |
| `src/components/analytics/KPIComparison.tsx` | Replace | Month-over-month: New Leads, Conversion %, AI tokens, AI cost £ |
| `src/pages/AnalyticsPage.tsx` | Modify | Swap imports, keep layout structure |

Existing files **not touched:** `TrendChart.tsx`, `BarChart.tsx`, `MetricComparison.tsx`, `ChartCard.tsx`, `Heatmap.tsx`.

---

## Task 1: rangeUtils.ts

**Files:**
- Create: `src/lib/rangeUtils.ts`

- [ ] **Step 1: Create the file**

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd AIOS && npx tsc --noEmit
```

Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rangeUtils.ts
git commit -m "feat: add rangeUtils — date thresholds and groupBy helpers"
```

---

## Task 2: RangeSelector component

**Files:**
- Create: `src/components/analytics/RangeSelector.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/RangeSelector.tsx
git commit -m "feat: add RangeSelector component (7d/30d/90d/1y)"
```

---

## Task 3: LeadsTrendChart

**Files:**
- Create: `src/components/analytics/LeadsTrendChart.tsx`

**Context:**
- `useQuery<T>(table, opts)` — from `src/hooks/useQuery.ts`. Filter format: `{ created_at: 'gte.2024-01-01' }`. Returns `{ data: T[], loading: boolean, error: string | null }`.
- `ChartCard` has an `action` prop (ReactNode) rendered top-right. Pass `RangeSelector` there.
- Trend logic: fetch `2×range` of data, split at `getDateThreshold(range)` midpoint. First half = previous period, second half = current period. Compare totals for change %.

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { RangeSelector } from './RangeSelector';
import { useQuery } from '../../hooks/useQuery';
import {
  getDateThreshold, getDoubleThreshold,
  groupByDate, type Range,
} from '../../lib/rangeUtils';
import { formatNumber } from '../../lib/formatters';
import { CHART_COLORS } from '../../lib/constants';

interface Lead { created_at: string; }

export function LeadsTrendChart() {
  const [range, setRange] = useState<Range>('30d');

  const threshold = getDateThreshold(range);
  const doubleThreshold = getDoubleThreshold(range);

  const { data, loading } = useQuery<Lead>('leads', {
    select: 'created_at',
    filters: { created_at: `gte.${doubleThreshold}` },
    order: 'created_at.asc',
  });

  const currentData  = data.filter((d) => d.created_at.substring(0, 10) >= threshold);
  const previousData = data.filter((d) => d.created_at.substring(0, 10) < threshold);
  const chartData    = groupByDate(currentData, () => 1);

  const current = currentData.length;
  const prev    = previousData.length;
  const changePercent = prev > 0 ? ((current - prev) / prev) * 100 : 0;

  const subtitle = loading
    ? 'Loading...'
    : `${formatNumber(current)} total · ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;

  return (
    <ChartCard
      title="New Leads"
      subtitle={subtitle}
      action={<RangeSelector value={range} onChange={setRange} />}
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="leads-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false} axisLine={false} dy={8}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false} axisLine={false}
            tickFormatter={(v: number) => formatNumber(v)} dx={-4}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12, border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
            }}
            formatter={(value) => [formatNumber(Number(value)), 'Leads']}
          />
          <Area
            type="monotone" dataKey="value"
            stroke={CHART_COLORS.primary} strokeWidth={2}
            fill="url(#leads-gradient)" dot={false}
            activeDot={{ r: 4, stroke: CHART_COLORS.primary, strokeWidth: 2, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/LeadsTrendChart.tsx
git commit -m "feat: add LeadsTrendChart with real PostgREST data"
```

---

## Task 4: CostTrendChart

**Files:**
- Create: `src/components/analytics/CostTrendChart.tsx`

**Context:** Same pattern as `LeadsTrendChart`. `valueGetter` sums `cost * USD_GBP`. Y-axis and tooltip format as `£X.XX`. Uses `CHART_COLORS.warning` (amber) to visually distinguish from leads chart.

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { RangeSelector } from './RangeSelector';
import { useQuery } from '../../hooks/useQuery';
import {
  getDateThreshold, getDoubleThreshold,
  groupByDate, USD_GBP, type Range,
} from '../../lib/rangeUtils';
import { CHART_COLORS } from '../../lib/constants';

interface TokenUsage { created_at: string; cost: number; }

export function CostTrendChart() {
  const [range, setRange] = useState<Range>('30d');

  const threshold       = getDateThreshold(range);
  const doubleThreshold = getDoubleThreshold(range);

  const { data, loading } = useQuery<TokenUsage>('token_usage', {
    select: 'created_at,cost',
    filters: { created_at: `gte.${doubleThreshold}` },
    order: 'created_at.asc',
  });

  const currentData  = data.filter((d) => d.created_at.substring(0, 10) >= threshold);
  const previousData = data.filter((d) => d.created_at.substring(0, 10) < threshold);
  const chartData    = groupByDate(currentData, (item) => (item.cost ?? 0) * USD_GBP);

  const currentTotal = currentData.reduce((s, d) => s + (d.cost ?? 0) * USD_GBP, 0);
  const prevTotal    = previousData.reduce((s, d) => s + (d.cost ?? 0) * USD_GBP, 0);
  const changePercent = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

  const subtitle = loading
    ? 'Loading...'
    : `£${currentTotal.toFixed(2)} total · ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;

  return (
    <ChartCard
      title="AI Cost (£)"
      subtitle={subtitle}
      action={<RangeSelector value={range} onChange={setRange} />}
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cost-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART_COLORS.warning} stopOpacity={0.15} />
              <stop offset="95%" stopColor={CHART_COLORS.warning} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false} axisLine={false} dy={8}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false} axisLine={false}
            tickFormatter={(v: number) => `£${v.toFixed(2)}`} dx={-4}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12, border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
            }}
            formatter={(value) => [`£${Number(value).toFixed(4)}`, 'AI Cost']}
          />
          <Area
            type="monotone" dataKey="value"
            stroke={CHART_COLORS.warning} strokeWidth={2}
            fill="url(#cost-gradient)" dot={false}
            activeDot={{ r: 4, stroke: CHART_COLORS.warning, strokeWidth: 2, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/CostTrendChart.tsx
git commit -m "feat: add CostTrendChart — AI cost per day in GBP"
```

---

## Task 5: LeadsBarChart

**Files:**
- Create: `src/components/analytics/LeadsBarChart.tsx`

**Context:** Uses `groupByField` (not `groupByDate`). Query fetches `status,created_at` from `leads` filtered to selected range. Each status becomes a bar colored from `CHART_COLORS.palette`.

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react';
import {
  ResponsiveContainer, BarChart as RechartsBar,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { RangeSelector } from './RangeSelector';
import { useQuery } from '../../hooks/useQuery';
import { getDateThreshold, groupByField, type Range } from '../../lib/rangeUtils';
import { formatNumber } from '../../lib/formatters';
import { CHART_COLORS } from '../../lib/constants';

interface Lead { status: string; created_at: string; }

export function LeadsBarChart() {
  const [range, setRange] = useState<Range>('30d');

  const { data } = useQuery<Lead>('leads', {
    select: 'status,created_at',
    filters: { created_at: `gte.${getDateThreshold(range)}` },
  });

  const chartData = groupByField(
    data,
    (i) => i.status ?? 'unknown',
    () => 1
  );

  return (
    <ChartCard
      title="Leads by Status"
      action={<RangeSelector value={range} onChange={setRange} />}
    >
      <ResponsiveContainer width="100%" height={280}>
        <RechartsBar data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false} axisLine={false} dy={8}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false} axisLine={false}
            tickFormatter={(v: number) => formatNumber(v)} dx={-4}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12, border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
            }}
            formatter={(value) => [formatNumber(Number(value)), 'Leads']}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
              />
            ))}
          </Bar>
        </RechartsBar>
      </ResponsiveContainer>
    </ChartCard>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/LeadsBarChart.tsx
git commit -m "feat: add LeadsBarChart — leads grouped by status"
```

---

## Task 6: CostBarChart

**Files:**
- Create: `src/components/analytics/CostBarChart.tsx`

**Context:** Groups `token_usage` by `agent_name`, sums `cost * USD_GBP`. Falls back to `'Unknown'` if `agent_name` is null.

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react';
import {
  ResponsiveContainer, BarChart as RechartsBar,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { RangeSelector } from './RangeSelector';
import { useQuery } from '../../hooks/useQuery';
import { getDateThreshold, groupByField, USD_GBP, type Range } from '../../lib/rangeUtils';
import { CHART_COLORS } from '../../lib/constants';

interface TokenUsage { agent_name: string; cost: number; created_at: string; }

export function CostBarChart() {
  const [range, setRange] = useState<Range>('30d');

  const { data } = useQuery<TokenUsage>('token_usage', {
    select: 'agent_name,cost,created_at',
    filters: { created_at: `gte.${getDateThreshold(range)}` },
  });

  const chartData = groupByField(
    data,
    (i) => i.agent_name ?? 'Unknown',
    (i) => (i.cost ?? 0) * USD_GBP
  );

  return (
    <ChartCard
      title="AI Cost by Agent (£)"
      action={<RangeSelector value={range} onChange={setRange} />}
    >
      <ResponsiveContainer width="100%" height={280}>
        <RechartsBar data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false} axisLine={false} dy={8}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false} axisLine={false}
            tickFormatter={(v: number) => `£${Number(v).toFixed(2)}`} dx={-4}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12, border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
            }}
            formatter={(value) => [`£${Number(value).toFixed(2)}`, 'AI Cost']}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
              />
            ))}
          </Bar>
        </RechartsBar>
      </ResponsiveContainer>
    </ChartCard>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/CostBarChart.tsx
git commit -m "feat: add CostBarChart — AI cost per agent in GBP"
```

---

## Task 7: KPIComparison

**Files:**
- Modify: `src/components/analytics/KPIComparison.tsx` (full replacement — current file only uses mock data)

**Context:**
- Fixed month-over-month (no range selector).
- Fetches `leads` and `token_usage` from start of **previous** month to now. Splits client-side at start of current month.
- `positiveIsGood: false` for cost KPIs — down arrow shows green (spending less = good).
- `tokens` field on `token_usage`: if the column doesn't exist in the DB, this will return `undefined` and sum to 0. That's acceptable for a demo app.

- [ ] **Step 1: Replace KPIComparison.tsx**

```tsx
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';
import { useQuery } from '../../hooks/useQuery';
import { USD_GBP } from '../../lib/rangeUtils';
import { formatNumber } from '../../lib/formatters';

interface Lead { created_at: string; status: string; }
interface TokenUsage { created_at: string; cost: number; tokens: number; }

function getMonthBoundaries() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Build YYYY-MM-DD strings directly to avoid UTC timezone shift from toISOString()
  const startOfCurrent = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const prevMonth = month === 0 ? 12 : month;
  const prevYear  = month === 0 ? year - 1 : year;
  const startOfPrev = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
  return { startOfCurrent, startOfPrev };
}

interface KPI {
  label: string;
  current: number;
  prev: number;
  format: (v: number) => string;
  positiveIsGood: boolean;
}

export function KPIComparison() {
  const { startOfCurrent, startOfPrev } = getMonthBoundaries();

  const { data: leads } = useQuery<Lead>('leads', {
    select: 'created_at,status',
    filters: { created_at: `gte.${startOfPrev}` },
  });

  const { data: usage } = useQuery<TokenUsage>('token_usage', {
    select: 'created_at,cost,tokens',
    filters: { created_at: `gte.${startOfPrev}` },
  });

  const currentLeads  = leads.filter((l) => l.created_at.substring(0, 10) >= startOfCurrent);
  const prevLeads     = leads.filter((l) => l.created_at.substring(0, 10) < startOfCurrent);
  const currentUsage  = usage.filter((u) => u.created_at.substring(0, 10) >= startOfCurrent);
  const prevUsage     = usage.filter((u) => u.created_at.substring(0, 10) < startOfCurrent);

  const currentConverted = currentLeads.filter((l) => l.status === 'converted').length;
  const prevConverted    = prevLeads.filter((l) => l.status === 'converted').length;

  const kpis: KPI[] = [
    {
      label: 'New Leads',
      current: currentLeads.length,
      prev: prevLeads.length,
      format: (v) => formatNumber(v),
      positiveIsGood: true,
    },
    {
      label: 'Conversion Rate',
      current: currentLeads.length > 0 ? (currentConverted / currentLeads.length) * 100 : 0,
      prev: prevLeads.length > 0 ? (prevConverted / prevLeads.length) * 100 : 0,
      format: (v) => `${v.toFixed(1)}%`,
      positiveIsGood: true,
    },
    {
      label: 'AI Cost (tokens)',
      current: currentUsage.reduce((s, u) => s + (u.tokens ?? 0), 0),
      prev: prevUsage.reduce((s, u) => s + (u.tokens ?? 0), 0),
      format: (v) => formatNumber(v),
      positiveIsGood: false,
    },
    {
      label: 'AI Cost (£)',
      current: currentUsage.reduce((s, u) => s + (u.cost ?? 0) * USD_GBP, 0),
      prev: prevUsage.reduce((s, u) => s + (u.cost ?? 0) * USD_GBP, 0),
      format: (v) => `£${v.toFixed(2)}`,
      positiveIsGood: false,
    },
  ];

  return (
    <Card>
      <h3 className="text-base font-semibold text-surface-900 mb-4">Monthly Comparison</h3>
      <div className="space-y-3">
        {kpis.map((kpi) => {
          const changePercent =
            kpi.prev > 0 ? ((kpi.current - kpi.prev) / kpi.prev) * 100 : 0;
          const isUp   = changePercent > 0;
          const isGood = kpi.positiveIsGood ? isUp : !isUp;
          const Icon   = isUp ? TrendingUp : TrendingDown;
          return (
            <div key={kpi.label} className="flex items-center justify-between">
              <span className="text-sm text-surface-500">{kpi.label}</span>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-surface-900">
                    {kpi.format(kpi.current)}
                  </p>
                  <p className="text-xs text-surface-400">
                    {kpi.format(kpi.prev)}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full',
                    isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {Math.abs(changePercent).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/KPIComparison.tsx
git commit -m "feat: replace KPIComparison with real PostgREST data (4 KPIs)"
```

---

## Task 8: Update AnalyticsPage

**Files:**
- Modify: `src/pages/AnalyticsPage.tsx`

**Context:** Remove all mock trend imports. Keep `mockKPIs` (still used by SystemPerformance BarChart). Swap the 4 trend/bar rows and `MetricComparison` for the new self-contained components.

- [ ] **Step 1: Replace the file content**

```tsx
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { BarChart } from "../components/analytics/BarChart";
import { Heatmap } from "../components/analytics/Heatmap";
import { LeadsTrendChart } from "../components/analytics/LeadsTrendChart";
import { CostTrendChart } from "../components/analytics/CostTrendChart";
import { LeadsBarChart } from "../components/analytics/LeadsBarChart";
import { CostBarChart } from "../components/analytics/CostBarChart";
import { KPIComparison } from "../components/analytics/KPIComparison";
import { mockKPIs } from "../lib/mock-data";

const heatmapData = Array.from({ length: 168 }, () => {
  const dayIndex = Math.floor(Math.random() * 7);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    day: days[dayIndex],
    hour: Math.floor(Math.random() * 24),
    value: Math.floor(Math.random() * 500),
  };
});

const maxHeatmap = Math.max(...heatmapData.map((d) => d.value));

const systemPerformanceData = mockKPIs.slice(0, 5).map((kpi) => ({
  label: kpi.label,
  value: kpi.value,
}));

export default function AnalyticsPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Analytics"
        description="Performance trends, metrics, and insights across your AI platform"
      />
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeadsTrendChart />
          <CostTrendChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeadsBarChart />
          <CostBarChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <BarChart title="System Performance Overview" data={systemPerformanceData} />
          </div>
          <KPIComparison />
        </div>
        <Heatmap title="Activity Heatmap" data={heatmapData} maxValue={maxHeatmap} />
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Final compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify in browser**

```bash
npm run dev
```

Open `http://localhost:5173`, navigate to Analytics. Verify:
- All 4 new charts render (may show empty state if no data in range)
- Range selector buttons visible top-right of each chart
- Switching range refetches and re-renders
- KPIComparison shows 4 rows with current/prev values and trend arrows
- SystemPerformance and Heatmap still render (unchanged)
- Browser console: no errors (401 on token_usage is expected if RLS blocks that table)

- [ ] **Step 4: Commit**

```bash
git add src/pages/AnalyticsPage.tsx
git commit -m "feat: wire Analytics page to real data components"
```

---

## Task 9: Push and deploy

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Trigger EasyPanel deploy**

In EasyPanel, redeploy the frontend service. Wait for build to complete.

- [ ] **Step 3: Verify production**

Open `https://ios.neurasolutions.cloud`, navigate to Analytics. Confirm charts load with real data.
