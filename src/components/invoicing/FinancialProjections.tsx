import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ProjectionData } from '../../types/invoicing';

interface Props { data: ProjectionData | null; loading: boolean; }

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];
const SYM = '£';

const fmt = (v: number) => `${SYM}${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `${SYM}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${SYM}${(v / 1_000).toFixed(0)}k`;
  return `${SYM}${v}`;
};

function buildProjections(mrr: number) {
  const years = [1, 3, 5, 10];
  const g = 0.15;
  return years.map(y => ({
    year: `${y}Y`,
    conservative: Math.round(mrr * 12 * y * (1 + g * 0.5 * y)),
    base:          Math.round(mrr * 12 * y * (1 + g * y)),
    optimistic:    Math.round(mrr * 12 * y * (1 + g * 1.5 * y)),
  }));
}

export function FinancialProjections({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[400, 260, 320].map((h, i) => (
          <div key={i} style={{ height: h, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  const monthlyData = data.monthly_revenue.map(r => ({
    month: r.month.substring(5),
    revenue: parseFloat(r.revenue),
  }));

  const projections = buildProjections(data.mrr);

  /* Top 9 clients by contract value + "Others" bucket */
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

      {/* Monthly revenue trend */}
      {monthlyData.length > 0 && (
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Monthly Revenue Trend</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>
            {monthlyData.length < 3 ? 'Limited data — more months will appear as invoices are issued' : 'Last 12 months'}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip formatter={(v: unknown) => [fmt(v as number), 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Projections + Client distribution — 2 col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* 1 / 3 / 5 / 10 year projections */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Revenue Projections (1 / 3 / 5 / 10 Years)</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>15% YoY growth — conservative / base / optimistic</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projections} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip formatter={(v: unknown, name: unknown) => [fmt(v as number), String(name ?? '')]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="conservative" fill="#cbd5e1" name="Conservative" radius={[4, 4, 0, 0]} />
              <Bar dataKey="base"         fill="#6366f1" name="Base"         radius={[4, 4, 0, 0]} />
              <Bar dataKey="optimistic"   fill="#10b981" name="Optimistic"   radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by client — pie with constrained legend */}
        {clientDist.length > 0 && (
          <div style={card}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Revenue by Client</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>Contract values — active clients only</p>

            {/* Chart area */}
            <ResponsiveContainer width="100%" height={200}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={clientDist}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={44}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {clientDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: unknown) => [fmt(v as number), 'Contract Value']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom legend — outside ResponsiveContainer so it doesn't clip */}
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
              {clientDist.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
