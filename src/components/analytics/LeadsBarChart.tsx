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
