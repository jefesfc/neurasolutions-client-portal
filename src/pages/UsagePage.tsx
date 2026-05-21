import { useState } from "react";
import { Download, Zap, DollarSign, Bot, Activity } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { SearchInput } from "../components/shared/SearchInput";
import { UsageChart } from "../components/usage/UsageChart";
import { formatDate, formatNumber } from "../lib/formatters";
import type { TokenUsage } from "../types/aios";

// downloadUsagePDF will be implemented in Task 4
async function downloadUsagePDF(_rows: TokenUsage[], _filter: string): Promise<void> {
  console.warn("PDF export not yet implemented");
}

function KPICard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className="rounded-lg bg-brand-50 p-3 flex-shrink-0">
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-surface-500">{label}</p>
        <p className="text-xl font-bold text-surface-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function UsagePage() {
  const { data: rows, loading, error } = useQuery<TokenUsage>("token_usage", {
    order: "created_at.desc",
  });
  const [agentFilter, setAgentFilter] = useState("");
  const [search, setSearch] = useState("");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth = rows.filter((r) => r.created_at >= monthStart);

  const totalTokens = thisMonth.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0);
  const totalCost = thisMonth.reduce((s, r) => s + r.cost, 0);
  const agents = [...new Set(rows.map((r) => r.agent_name))];
  const topAgent = agents.reduce((best, a) => {
    const count = rows.filter((r) => r.agent_name === a).length;
    const bestCount = rows.filter((r) => r.agent_name === best).length;
    return count > bestCount ? a : best;
  }, agents[0] ?? "—");

  const filtered = rows.filter((r) => {
    const matchAgent = !agentFilter || r.agent_name === agentFilter;
    const matchSearch =
      !search ||
      r.agent_name.toLowerCase().includes(search.toLowerCase()) ||
      r.model.toLowerCase().includes(search.toLowerCase());
    return matchAgent && matchSearch;
  });

  return (
    <PageTransition>
      <PageHeader
        title="Usage & Tokens"
        description="Monitor your AI consumption and costs"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadUsagePDF(filtered, agentFilter)}
            disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-danger">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total Tokens (this month)" value={formatNumber(totalTokens)} icon={Zap} />
            <KPICard label="Total Cost (this month)" value={`$${totalCost.toFixed(4)}`} icon={DollarSign} />
            <KPICard label="Most Used Agent" value={topAgent} icon={Bot} />
            <KPICard label="Total Calls (this month)" value={formatNumber(thisMonth.length)} icon={Activity} />
          </div>

          <div className="mb-6">
            <UsageChart rows={rows} />
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
              <button
                onClick={() => setAgentFilter("")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !agentFilter
                    ? "bg-white text-surface-900 shadow-sm"
                    : "text-surface-500 hover:text-surface-700"
                }`}
              >
                All Agents
              </button>
              {agents.map((a) => (
                <button
                  key={a}
                  onClick={() => setAgentFilter(a)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    agentFilter === a
                      ? "bg-white text-surface-900 shadow-sm"
                      : "text-surface-500 hover:text-surface-700"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="max-w-xs">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agent or model..."
              />
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-surface-400">No usage records found</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50">
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Agent</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Model</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Tokens In</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Tokens Out</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Cost</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant="default">{row.agent_name}</Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-500">{row.model}</td>
                      <td className="px-4 py-3 text-surface-600">{formatNumber(row.tokens_in)}</td>
                      <td className="px-4 py-3 text-surface-600">{formatNumber(row.tokens_out)}</td>
                      <td className="px-4 py-3 font-medium text-surface-900">${row.cost.toFixed(4)}</td>
                      <td className="px-4 py-3 text-surface-400">{formatDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </PageTransition>
  );
}
