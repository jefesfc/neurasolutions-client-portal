import {
  ResponsiveContainer,
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { CHART_COLORS } from "../../lib/constants";
import { formatNumber } from "../../lib/formatters";

interface BarChartProps {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
}

export function BarChart({ title, data, color: _color = CHART_COLORS.primary }: BarChartProps) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={280}>
        <RechartsBar data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
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
            formatter={(value) => [formatNumber(Number(value)), title]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} />
            ))}
          </Bar>
        </RechartsBar>
      </ResponsiveContainer>
    </ChartCard>
  );
}