import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartCard } from "../analytics/ChartCard";
import { formatNumber } from "../../lib/formatters";
import type { TokenUsage } from "../../types/aios";

interface Props {
  rows: TokenUsage[];
}

export function UsageChart({ rows }: Props) {
  const byDay = rows.reduce<Record<string, number>>((acc, row) => {
    const day = row.created_at.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + row.tokens_in + row.tokens_out;
    return acc;
  }, {});

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: byDay[key] ?? 0,
    };
  });

  return (
    <ChartCard title="Daily Token Consumption (last 30 days)">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={last30} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontSize: 13,
            }}
            formatter={(v) => [formatNumber(Number(v)), "Tokens"]}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
