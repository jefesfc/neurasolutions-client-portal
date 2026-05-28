import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "../ui/Card";

interface SpendingEntry {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: SpendingEntry[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: SpendingEntry }[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-white border border-surface-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-surface-900">{entry.name}</p>
      <p className="text-surface-600">£{entry.value.toFixed(2)}</p>
    </div>
  );
}


export function TokenSpendingChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-surface-900">AI Token Spend — May 2026</h3>
        <p className="text-2xl font-bold text-surface-900 mt-0.5">£{total.toFixed(2)}</p>
        <p className="text-xs text-surface-400">Total this month</p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-2 mt-1">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-surface-600">{entry.name}</span>
            </div>
            <span className="font-medium text-surface-800">£{entry.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
