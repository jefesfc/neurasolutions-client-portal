import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ProjectionData } from '../../types/invoicing';

interface Props { data: ProjectionData | null; loading: boolean; }

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];
const SYM = '£';

const fmt = (v: number) =>
  `${SYM}${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `${SYM}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${SYM}${(v / 1_000).toFixed(0)}k`;
  return `${SYM}${v}`;
};

function buildMonthlyData(raw: Array<{ month: string; revenue: string }>) {
  const now = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 7 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-GB', { month: 'short' });
    const found = raw.find(r => r.month === key || r.month.startsWith(key));
    return { month: label, revenue: found ? parseFloat(found.revenue) : 0 };
  });
}

function buildProjections(mrr: number) {
  const g = 0.15;
  return [1, 3, 5, 10].map(y => ({
    year: `${y}Y`,
    conservative: Math.round(mrr * 12 * y * (1 + g * 0.5 * y)),
    base:          Math.round(mrr * 12 * y * (1 + g * y)),
    optimistic:    Math.round(mrr * 12 * y * (1 + g * 1.5 * y)),
  }));
}

interface PieLabelProps {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number; percent?: number;
}

function PiePercentLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: PieLabelProps) {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.58;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 10, fontWeight: 700, fill: '#fff', pointerEvents: 'none' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function FinancialProjections({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[120, 260, 300].map((h, i) => (
          <div key={i} style={{ height: h, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  const monthlyData  = buildMonthlyData(data.monthly_revenue);
  const projections  = buildProjections(data.mrr);
  const hasRevenue   = monthlyData.some(m => m.revenue > 0);

  const sorted = [...data.active_clients].sort((a, b) => parseFloat(b.contract_value) - parseFloat(a.contract_value));
  const top9   = sorted.slice(0, 9);
  const rest   = sorted.slice(9);
  const clientDist = [
    ...top9.map((c, i) => ({ name: c.company, value: parseFloat(c.contract_value), color: COLORS[i % COLORS.length] })),
    ...(rest.length > 0 ? [{ name: `Others (${rest.length})`, value: rest.reduce((s, c) => s + parseFloat(c.contract_value), 0), color: '#94a3b8' }] : []),
  ];

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
    padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* MRR / ARR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...card, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Monthly Recurring Revenue</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1 }}>{fmt(data.mrr)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '8px 0 0' }}>Based on {data.active_clients.length} active clients</p>
        </div>
        <div style={{ ...card, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Annual Recurring Revenue</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1 }}>{fmt(data.arr)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '8px 0 0' }}>Annualized from current MRR</p>
        </div>
      </div>

      {/* Monthly Revenue Trend — 8 months padded */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Monthly Revenue Trend</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
              {hasRevenue ? 'Last 8 months' : 'No invoice data yet — chart will populate as invoices are issued'}
            </p>
          </div>
          {hasRevenue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6366f1', fontWeight: 600 }}>
              <div style={{ width: 28, height: 3, borderRadius: 2, background: '#6366f1', opacity: 0.4 }} />
              MRR Baseline
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="revGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="60%"  stopColor="#6366f1" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#06b6d4" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
            <Tooltip
              formatter={(v: unknown) => [fmt(v as number), 'Revenue']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            {hasRevenue && (
              <ReferenceLine y={data.mrr} stroke="#6366f1" strokeDasharray="4 4" strokeOpacity={0.4} strokeWidth={1.5} />
            )}
            {/* Shadow area behind main line */}
            <Area type="natural" dataKey="revenue" stroke="none" fill="url(#revGrad2)" isAnimationActive={false} />
            {/* Main line */}
            <Area
              type="natural"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#revGrad1)"
              dot={{ r: 4, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Projections + Client distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* 1 / 3 / 5 / 10 year projections */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Revenue Projections</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>1 / 3 / 5 / 10 years · 15% YoY growth</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projections} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [fmt(v as number), String(name ?? '')]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="conservative" fill="#cbd5e1" name="Conservative" radius={[4, 4, 0, 0]} />
              <Bar dataKey="base"         fill="#6366f1" name="Base"         radius={[4, 4, 0, 0]} />
              <Bar dataKey="optimistic"   fill="#10b981" name="Optimistic"   radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by client */}
        {clientDist.length > 0 && (
          <div style={card}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Revenue by Client</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px' }}>Contract values · active clients</p>

            <ResponsiveContainer width="100%" height={210}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={clientDist}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={46}
                  strokeWidth={2}
                  stroke="#fff"
                  labelLine={false}
                  label={(props: PieLabelProps) => <PiePercentLabel {...props} />}
                >
                  {clientDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: unknown) => [fmt(v as number), 'Contract Value']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom legend outside container */}
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '5px 14px' }}>
              {clientDist.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
