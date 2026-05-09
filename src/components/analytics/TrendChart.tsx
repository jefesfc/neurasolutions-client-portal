import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartCard } from "./ChartCard";
import type { TrendData } from "../../types";
import { formatNumber } from "../../lib/formatters";

interface TrendChartProps {
  trend: TrendData;
}

export function TrendChart({ trend }: TrendChartProps) {
  return (
    <ChartCard
      title={trend.title}
      subtitle={`${formatNumber(trend.currentValue)} total · ${trend.changePercent > 0 ? "+" : ""}${trend.changePercent.toFixed(1)}%`}
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={trend.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${trend.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={trend.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={trend.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatNumber(v)}
            dx={-4}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontSize: 13,
            }}
            formatter={(value) => [formatNumber(Number(value)), trend.title]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={trend.color}
            strokeWidth={2}
            fill={`url(#gradient-${trend.id})`}
            dot={false}
            activeDot={{ r: 4, stroke: trend.color, strokeWidth: 2, fill: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}