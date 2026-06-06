import { Fragment } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

interface SpendingEntry {
  name: string;
  value: number;
  color: string;
  model: string;
  company: string;
}

interface Props {
  data: SpendingEntry[];
}

const API_LIST = [
  { name: "OpenAI Chat Completions", status: "active" as const, note: "GPT-4o · chat & agents" },
  { name: "OpenAI Whisper",          status: "active" as const, note: "Speech-to-text" },
  { name: "Telegram Bot API",        status: "active" as const, note: "Messaging channel" },
  { name: "Gmail API",               status: "active" as const, note: "Email sync via n8n" },
  { name: "Google Calendar API",     status: "active" as const, note: "Calendar sync via n8n" },
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: SpendingEntry }[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-slate-800">{entry.name}</p>
      <p className="text-slate-600">£{entry.value.toFixed(2)}</p>
      <p className="text-xs text-slate-400">{entry.payload.model} · {entry.payload.company}</p>
    </div>
  );
}

export function TokenSpendingChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-800">AI Token Spend — May 2026</h3>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">£{total.toFixed(2)}</p>
          <p className="text-xs text-slate-400">Total this month</p>
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
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend with model + company */}
        <div className="mt-2 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-xs">
            <span className="text-slate-400 font-medium">Service</span>
            <span className="text-slate-400 font-medium text-right">Model</span>
            <span className="text-slate-400 font-medium text-right">Cost</span>
            {data.map((entry) => (
              <Fragment key={entry.name}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-600">{entry.name}</span>
                </div>
                <span className="text-slate-400 text-right tabular-nums">
                  {entry.model}
                </span>
                <span className="font-medium text-slate-800 text-right tabular-nums">
                  £{entry.value.toFixed(2)}
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      </Card>

      {/* APIs Used */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">APIs Used</h3>
        <div className="space-y-2.5">
          {API_LIST.map((api) => (
            <div key={api.name} className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-700">{api.name}</p>
                <p className="text-xs text-slate-400">{api.note}</p>
              </div>
              <Badge variant="success" dot>{api.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
