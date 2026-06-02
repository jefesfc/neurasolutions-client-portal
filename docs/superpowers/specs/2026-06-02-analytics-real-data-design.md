# Analytics Module — Real Data Redesign

**Date:** 2026-06-02  
**Status:** Approved  

---

## Overview

Replace all mock data in `AnalyticsPage.tsx` with live PostgREST queries. Each chart becomes a self-contained component with its own data fetch and per-chart time range selector. Visual style stays neutral (existing `ChartCard` / `Card` components, light theme).

---

## Scope

**In scope:**
- 4 new self-contained chart components (trends + bars) with real data
- Replacement `KPIComparison` component with 4 real KPIs
- Shared `RangeSelector` UI component
- Shared `rangeUtils` helper
- Updated `AnalyticsPage.tsx` layout

**Out of scope:**
- `SystemPerformanceOverview` bar chart — stays as-is (existing `BarChart` + `mockKPIs`)
- `Heatmap` — stays static (interactions table may be sparse)
- Server-side aggregation (all grouping is client-side)
- Exchange rate API (fixed USD→GBP rate: `0.79`)

---

## File Structure

```
src/
  components/analytics/
    LeadsTrendChart.tsx      NEW
    CostTrendChart.tsx       NEW
    LeadsBarChart.tsx        NEW
    CostBarChart.tsx         NEW
    KPIComparison.tsx        REPLACE (was mock-only)
    RangeSelector.tsx        NEW (shared)
    ChartCard.tsx            UNCHANGED
    TrendChart.tsx           UNCHANGED (still used by SystemPerformance if needed)
    BarChart.tsx             UNCHANGED (still used by SystemPerformance)
    Heatmap.tsx              UNCHANGED
    MetricComparison.tsx     KEEP (may be used elsewhere)
  lib/
    rangeUtils.ts            NEW
  pages/
    AnalyticsPage.tsx        MODIFY (swap imports + layout)
```

---

## Shared Utilities

### `src/lib/rangeUtils.ts`

```ts
export type Range = '7d' | '30d' | '90d' | '1y';

export const USD_GBP = 0.79;

export function getDateThreshold(range: Range): string {
  const d = new Date();
  if (range === '7d')  d.setDate(d.getDate() - 7);
  if (range === '30d') d.setDate(d.getDate() - 30);
  if (range === '90d') d.setDate(d.getDate() - 90);
  if (range === '1y')  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
}

export function formatChartDate(iso: string): string {
  // "2026-01-15" → "Jan 15"
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
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

---

## Shared UI Component

### `src/components/analytics/RangeSelector.tsx`

Renders `[7d] [30d] [90d] [1y]` pill buttons. Active state uses `bg-primary text-white`, inactive uses `text-surface-400 hover:text-surface-600`. Passed to `ChartCard` via `action` prop.

Props: `{ value: Range; onChange: (r: Range) => void }`

---

## Chart Components

### `LeadsTrendChart.tsx`

- **Data:** `leads` table, select `created_at`, filter `created_at=gte.<threshold>`
- **Processing:** group by date (count per day), `valueGetter = () => 1`
- **Display:** AreaChart (recharts), title "New Leads", subtitle "X total · ±Y%"
- **Change %:** fetches `2 × range_days` of data, splits at midpoint. First half = previous period, second half = current period. `changePercent = (current - prev) / prev * 100`
- **getDateThreshold for 2x:** pass `range` to a `getDoubleThreshold(range)` helper (same logic, double the days/months)

### `CostTrendChart.tsx`

- **Data:** `token_usage` table, select `created_at,cost`, filter `created_at=gte.<threshold>`
- **Processing:** group by date, sum cost × `USD_GBP`
- **Display:** AreaChart, title "AI Cost (£)", subtitle "£X.XX total · ±Y%"
- **Y-axis formatter:** `£${v.toFixed(2)}`
- **Tooltip formatter:** `£${value.toFixed(4)}`

### `LeadsBarChart.tsx`

- **Data:** `leads` table, select `status`, filter `created_at=gte.<threshold>`
- **Processing:** `groupByField(items, i => i.status, () => 1)`
- **Display:** BarChart (recharts), title "Leads by Status"
- **Bar colors:** existing `CHART_COLORS.palette`

### `CostBarChart.tsx`

- **Data:** `token_usage` table, select `agent_name,cost`, filter `created_at=gte.<threshold>`
- **Processing:** `groupByField(items, i => i.agent_name, i => i.cost * USD_GBP)`
- **Display:** BarChart, title "AI Cost by Agent (£)"
- **Y-axis/tooltip formatter:** `£${v.toFixed(2)}`

---

## KPIComparison Component

### `KPIComparison.tsx`

Replaces existing `MetricComparison`. Fixed month-over-month (no range selector). Fetches two tables once and filters client-side.

**Queries:**
- `leads` — select `created_at,status`, filter `created_at=gte.<2_months_ago>`
- `token_usage` — select `created_at,cost,tokens`, filter `created_at=gte.<2_months_ago>`

**Client-side split:**
- `currentPeriod`: records where `created_at >= start_of_current_month`
- `previousPeriod`: records where `created_at < start_of_current_month`

**4 KPIs displayed:**

| Label | Current | Previous | Format |
|---|---|---|---|
| New Leads | count(current leads) | count(prev leads) | number |
| Conversion Rate | converted/total % | converted/total % | "X.X%" |
| AI Cost (tokens) | sum(current tokens) | sum(prev tokens) | number |
| AI Cost (£) | sum(current cost)×0.79 | sum(prev cost)×0.79 | "£X.XX" |

Change % calculated as `(current - prev) / prev * 100`. Up arrow = green, down = red for Leads/Conversion. For Cost, down = green (spending less = good).

---

## AnalyticsPage Layout

```tsx
// Row 1 — Trend charts
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <LeadsTrendChart />
  <CostTrendChart />
</div>

// Row 2 — Bar charts
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <LeadsBarChart />
  <CostBarChart />
</div>

// Row 3 — System overview + KPI comparison
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div className="lg:col-span-2">
    <BarChart title="System Performance Overview" data={systemPerformanceData} />
  </div>
  <KPIComparison />
</div>

// Row 4 — Heatmap (static)
<Heatmap title="Activity Heatmap" data={heatmapData} maxValue={maxHeatmap} />
```

---

## Error & Loading States

Each self-contained component handles its own states:
- **Loading:** skeleton pulse (same pattern as HeroBanner — `opacity: 0.5` on content area)
- **Error:** small red text below chart title, chart area hidden
- **Empty data:** chart renders with empty array (recharts handles gracefully)

---

## Constants

```ts
const USD_GBP = 0.79; // configurable per client deployment
```

Documented in code as "configurable per client" with a single-line comment pointing to `rangeUtils.ts`.

---

## Not Implemented (Future)

- Server-side aggregation via PostgREST RPC functions
- Dynamic USD→GBP rate from exchange rate API
- Export to CSV
- Annotation markers on trend charts
