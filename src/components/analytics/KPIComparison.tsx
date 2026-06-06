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
      <h3 className="text-base font-semibold text-slate-800 mb-4">Monthly Comparison</h3>
      <div className="space-y-3">
        {kpis.map((kpi) => {
          const changePercent =
            kpi.prev > 0 ? ((kpi.current - kpi.prev) / kpi.prev) * 100 : 0;
          const isUp   = changePercent > 0;
          const isGood = kpi.positiveIsGood ? isUp : !isUp;
          const Icon   = isUp ? TrendingUp : TrendingDown;
          return (
            <div key={kpi.label} className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{kpi.label}</span>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">
                    {kpi.format(kpi.current)}
                  </p>
                  <p className="text-xs text-slate-400">
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
