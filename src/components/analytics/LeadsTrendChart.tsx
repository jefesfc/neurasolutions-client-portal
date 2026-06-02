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
