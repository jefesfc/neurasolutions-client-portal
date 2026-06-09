import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProjectionData } from '../../types/invoicing';

interface Props { data: ProjectionData | null; loading: boolean; }

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899'];
const SYM = '£';
const fmt = (v: number) => `${SYM}${v.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

function buildProjections(mrr: number) {
  const years = [1, 3, 5, 10];
  const growthRate = 0.15;
  return years.map(y => ({
    year: `${y}Y`,
    conservative: Math.round(mrr * 12 * y * (1 + growthRate * 0.5 * y)),
    base:          Math.round(mrr * 12 * y * (1 + growthRate * y)),
    optimistic:    Math.round(mrr * 12 * y * (1 + growthRate * 1.5 * y)),
  }));
}

export function FinancialProjections({ data, loading }: Props) {
  if (loading || !data) {
    return <div style={{ height: 400, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }} />;
  }

  const monthlyData = data.monthly_revenue.map(r => ({
    month: r.month.substring(5),
    revenue: parseFloat(r.revenue),
  }));

  const projections = buildProjections(data.mrr);

  const clientDistribution = data.active_clients.map((c, i) => ({
    name: c.company,
    value: parseFloat(c.contract_value),
    color: COLORS[i % COLORS.length],
  }));

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* MRR / ARR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Monthly Recurring Revenue</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0 }}>{fmt(data.mrr)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>Based on {data.active_clients.length} active clients</p>
        </div>
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Annual Recurring Revenue</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0 }}>{fmt(data.arr)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>Annualized from current MRR</p>
        </div>
      </div>

      {/* Monthly revenue trend */}
      {monthlyData.length > 0 && (
        <div style={cardStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Monthly Revenue Trend (Last 12 months)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tickFormatter={(v: number) => `${SYM}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={(v: unknown) => [fmt(v as number), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* 1/3/5/10 year projections */}
        <div style={cardStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Revenue Projections (1 / 3 / 5 / 10 Years)</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>15% YoY growth — conservative / base / optimistic</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projections}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tickFormatter={(v: number) => `${SYM}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={(v: unknown, name: unknown) => [fmt(v as number), String(name ?? '')]} />
              <Legend />
              <Bar dataKey="conservative" fill="#94a3b8" name="Conservative" radius={[4,4,0,0]} />
              <Bar dataKey="base"         fill="#6366f1" name="Base"         radius={[4,4,0,0]} />
              <Bar dataKey="optimistic"   fill="#10b981" name="Optimistic"   radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Client revenue distribution */}
        {clientDistribution.length > 0 && (
          <div style={cardStyle}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Revenue by Client</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>Contract values — active clients only</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={clientDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                  {clientDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => [fmt(v as number), 'Contract Value']} />
                <Legend formatter={(v: unknown) => <span style={{ fontSize: 11 }}>{v as string}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
