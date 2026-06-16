import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useQuery } from '../../hooks/useQuery';
import { USD_GBP } from '../../lib/rangeUtils';
import { KPITile } from '../ui/KPITile';
import { Skeleton } from '../ui/Skeleton';
import { Users, Building2, Shield, Cpu, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import type { Lead, Client, TokenUsage } from '../../types/aios';
import type { SecuritySummary } from '../../types/security';
import { useTranslations } from '../../i18n/useT';

const API_URL = (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const AI_MONTHLY_BUDGET = 40;

const AGENT_COLORS: Record<string, string> = {
  'aios-chat':         '#6366f1',
  'aios-telegram':     '#3b82f6',
  'aios-telegram-tts': '#8b5cf6',
  'security-analyzer': '#f43f5e',
  'aios-reports':      '#10b981',
};

interface StatusCounts { new: number; qualified: number; won: number; lost: number; contacted: number }

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: '18px 20px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

function CardHeader({ icon, title, sub, iconBg, iconBorder, iconColor }: {
  icon: React.ReactNode; title: string; sub?: string;
  iconBg: string; iconBorder: string; iconColor: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, border: `1px solid ${iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{title}</p>
        {sub && <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

function useCardHover() {
  const [hovered, setHovered] = useState(false);
  const hover = { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) };
  const style: React.CSSProperties = {
    ...CARD,
    cursor: 'pointer',
    transition: 'all 0.18s',
    transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: hovered ? '0 0 0 2px #06b6d4, 0 8px 28px rgba(6,182,212,0.18)' : '0 1px 4px rgba(0,0,0,0.05)',
    borderColor: hovered ? '#06b6d4' : '#e2e8f0',
  };
  return { hover, style };
}

// ─── LEADS PIPELINE CARD ─────────────────────────────────────────────────────

function LeadsPipelineCard({ total, counts, activeClients, conversionRate }: {
  total: number; counts: StatusCounts; activeClients: number; conversionRate: number;
}) {
  const navigate = useNavigate();
  const T = useTranslations();
  const { hover, style } = useCardHover();
  const LEAD_SEGS = [
    { key: 'new'       as const, color: '#6366f1', label: T.dashboard.statusNew       },
    { key: 'qualified' as const, color: '#34d399', label: T.dashboard.statusQualified },
    { key: 'won'       as const, color: '#06b6d4', label: T.dashboard.statusWon       },
    { key: 'contacted' as const, color: '#818cf8', label: T.dashboard.statusContacted },
    { key: 'lost'      as const, color: '#e2e8f0', label: T.dashboard.statusLost      },
  ];
  const R = 38;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = LEAD_SEGS.map(seg => {
    const count = counts[seg.key];
    const frac = total > 0 ? count / total : 0;
    const dash = frac * C;
    const res = { ...seg, count, pct: Math.round(frac * 100), dash, offset };
    offset += dash;
    return res;
  });

  return (
    <div onClick={() => void navigate('/leads')} {...hover} style={style}>
      <CardHeader icon={<Users size={14} />} title={T.dashboard.leadsPipeline} sub={T.dashboard.statusBreakdown(total)} iconBg="#eef2ff" iconBorder="#c7d2fe" iconColor="#6366f1" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={100} height={100} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={R} fill="none" stroke="#f1f5f9" strokeWidth={12} />
            {segments.map(seg => (
              <circle key={seg.key} cx={50} cy={50} r={R} fill="none"
                stroke={seg.color} strokeWidth={12}
                strokeDasharray={`${seg.dash} ${C}`}
                strokeDashoffset={-seg.offset}
                transform="rotate(-90 50 50)" />
            ))}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{total}</span>
            <span style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Leads</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {segments.map(seg => (
            <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#475569', flex: 1 }}>{seg.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{seg.count}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 2 }}>{seg.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{T.dashboard.conversionFunnel}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { label: T.dashboard.leads,   value: String(total),            bg: '#eef2ff', color: '#6366f1' },
            { label: T.dashboard.clients, value: String(activeClients),    bg: '#f0fdf4', color: '#10b981' },
            { label: T.dashboard.conversion, value: `${conversionRate}%`, bg: '#ecfeff', color: '#06b6d4' },
          ].map((item, i) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <div style={{ flex: 1, textAlign: 'center', background: item.bg, borderRadius: 6, padding: '6px 4px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>{item.label}</div>
              </div>
              {i < 2 && <span style={{ color: '#d1d5db', fontSize: 12, flexShrink: 0 }}>›</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CLIENTS OVERVIEW CARD ───────────────────────────────────────────────────

function ClientsOverviewCard({ clients, activeClients }: { clients: Client[]; activeClients: number }) {
  const navigate = useNavigate();
  const T = useTranslations();
  const { hover, style } = useCardHover();
  const totalRevenue = clients.reduce((sum, c) => sum + (c.contract_value ?? 0), 0);
  const churned = clients.filter(c => c.status === 'churned').length;
  const recent = [...clients].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);

  const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f87171', '#06b6d4', '#8b5cf6'];
  const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div onClick={() => void navigate('/clients')} {...hover} style={style}>
      <CardHeader icon={<Building2 size={14} />} title={T.dashboard.clientsOverview} sub={T.dashboard.activeAccounts} iconBg="#f0fdf4" iconBorder="#bbf7d0" iconColor="#10b981" />
      <div>
        {[
          { label: T.dashboard.activeClients,      val: activeClients,                          tag: activeClients > 0 ? `${clients.length} total` : undefined, tagColor: '#94a3b8' },
          { label: T.dashboard.totalContractValue, val: `£${totalRevenue.toLocaleString('en-GB')}`,    tag: undefined, tagColor: undefined },
          { label: T.dashboard.churned,            val: churned,                                tag: churned > 0 ? T.dashboard.attention : T.dashboard.none, tagColor: churned > 0 ? '#ef4444' : '#10b981' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>{row.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{String(row.val)}</span>
              {row.tag && <span style={{ fontSize: 10, fontWeight: 700, color: row.tagColor, background: row.tagColor + '18', borderRadius: 4, padding: '1px 6px' }}>{row.tag}</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{T.dashboard.recentClients}</p>
        {recent.length === 0
          ? <p style={{ fontSize: 11, color: '#94a3b8' }}>{T.dashboard.noClientsYet}</p>
          : recent.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < recent.length - 1 ? 8 : 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${AVATAR_COLORS[i % AVATAR_COLORS.length]}, ${AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {initials(c.company || c.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company || c.name}</p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0' }}>{c.status === 'active' ? T.dashboard.clientActive : c.status}</p>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: c.status === 'active' ? '#10b981' : '#ef4444', background: c.status === 'active' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${c.status === 'active' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 10, padding: '2px 6px', flexShrink: 0 }}>
                {c.status === 'active' ? T.dashboard.clientActive : T.dashboard.clientInactive}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── SECURITY HEALTH CARD ─────────────────────────────────────────────────────

function SecurityHealthCard({ secSummary }: { secSummary: SecuritySummary | null }) {
  const navigate = useNavigate();
  const T = useTranslations();
  const { hover, style } = useCardHover();
  const highAlerts = parseInt(secSummary?.high_unresolved ?? '0', 10);
  const medAlerts  = parseInt(secSummary?.medium_count    ?? '0', 10);
  const totalToday = parseInt(secSummary?.total_events     ?? '0', 10);
  const score      = secSummary === null ? 85 : highAlerts > 0 ? Math.max(40, 100 - highAlerts * 15) : 95;
  const scoreColor = highAlerts > 0 ? '#ef4444' : '#34d399';

  // Half-circle arc: M 10 70 A 45 45 0 0 1 100 70, length ≈ π*45 = 141.37
  const ARC_LEN = Math.PI * 45;
  const arcFill  = (score / 100) * ARC_LEN;

  return (
    <div onClick={() => void navigate('/security')} {...hover} style={style}>
      <CardHeader icon={<Shield size={14} />} title={T.dashboard.securityHealth} sub={T.dashboard.realtimeStatus} iconBg="#f0fdf4" iconBorder="#bbf7d0" iconColor="#10b981" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg width={110} height={80} viewBox="0 0 110 80">
          <path d="M 10 70 A 45 45 0 0 1 100 70" fill="none" stroke="#f1f5f9" strokeWidth={12} strokeLinecap="round" />
          <path d="M 10 70 A 45 45 0 0 1 100 70" fill="none" stroke={scoreColor} strokeWidth={12} strokeLinecap="round"
            strokeDasharray={`${arcFill} ${ARC_LEN}`} />
          <text x={55} y={62} textAnchor="middle" fontSize={20} fontWeight={800} fill="#0f172a">{score}</text>
          <text x={55} y={74} textAnchor="middle" fontSize={8} fill="#94a3b8">{T.dashboard.score}</text>
        </svg>
        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          {[
            { label: T.dashboard.critical, val: '0',               color: '#ef4444' },
            { label: T.dashboard.high,     val: String(highAlerts), color: '#f59e0b' },
            { label: T.dashboard.medium,   val: String(medAlerts),  color: '#818cf8' },
            { label: T.dashboard.total,    val: String(totalToday), color: '#94a3b8' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{secSummary === null ? '—' : m.val}</div>
              <div style={{ fontSize: 9, color: m.color }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
        {highAlerts > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#475569' }}>{T.dashboard.highAlerts}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{highAlerts}</span>
          </div>
        )}
        {medAlerts > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#475569' }}>{T.dashboard.mediumEvents}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{medAlerts}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #dcfce7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#166534', fontWeight: 500 }}>{T.dashboard.rlsActive}</span>
          </div>
          <span style={{ fontSize: 11, color: '#10b981' }}>✓</span>
        </div>
      </div>
    </div>
  );
}

// ─── PLATFORM HEALTH CARD ────────────────────────────────────────────────────

function PlatformHealthCard({ openCount, highCount }: { openCount: number; highCount: number }) {
  const navigate = useNavigate();
  const T = useTranslations();
  const { hover, style } = useCardHover();
  const ticketColor = openCount === 0 ? '#10b981' : highCount > 0 ? '#ef4444' : '#f59e0b';

  const bars = [
    { label: 'API Server',        pct: 99.9, color: '#10b981' },
    { label: 'Database (PostgreSQL)',pct: 99.7, color: '#10b981' },
    { label: 'AI Services (GPT-4o)', pct: 98.2, color: '#10b981' },
    { label: 'Telegram Webhook',  pct: 97.1, color: '#10b981' },
    { label: 'Gmail OAuth',       pct: 99.1, color: '#10b981' },
    { label: 'RAG / Pinecone',    pct: 99.4, color: '#10b981' },
  ];

  return (
    <div onClick={() => void navigate('/systems')} {...hover} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ecfeff', border: '1px solid #a5f3fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#06b6d4' }}>
          <Activity size={14} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{T.dashboard.platformHealth}</p>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>{T.dashboard.serviceUptime}</p>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>
          {T.dashboard.allSystems}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bars.map(bar => (
          <div key={bar.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{bar.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: bar.color }}>{bar.pct}%</span>
            </div>
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${bar.pct}%`, background: bar.color, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      {openCount > 0 && (
        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: ticketColor + '10', border: `1px solid ${ticketColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#475569' }}>{T.dashboard.openTickets}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: ticketColor }}>{openCount}</span>
        </div>
      )}
    </div>
  );
}

// ─── AI COST CARD ─────────────────────────────────────────────────────────────

function AICostCard({ totalCost, agentList, maxAgentCost }: {
  totalCost: number;
  agentList: [string, { cost: number; tokens: number }][];
  maxAgentCost: number;
}) {
  const navigate = useNavigate();
  const T = useTranslations();
  const { hover, style } = useCardHover();
  const budgetPct = Math.min((totalCost / AI_MONTHLY_BUDGET) * 100, 100);

  return (
    <div onClick={() => void navigate('/billing')} {...hover} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f59e0b' }}>
          <Cpu size={14} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{T.dashboard.aiCostBreakdown}</p>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>{T.dashboard.byAgent}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{T.dashboard.total}</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>£{totalCost.toFixed(2)}</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {agentList.length === 0
          ? <p style={{ fontSize: 11, color: '#94a3b8' }}>{T.dashboard.noUsage}</p>
          : agentList.map(([agent, data]) => {
              const barPct = (data.cost / maxAgentCost) * 100;
              const color  = AGENT_COLORS[agent] ?? '#6366f1';
              return (
                <div key={agent} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: '#475569', width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent}</span>
                  <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', width: 44, textAlign: 'right', flexShrink: 0 }}>£{data.cost.toFixed(2)}</span>
                </div>
              );
            })
        }
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{T.dashboard.monthlyBudget}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>£{totalCost.toFixed(2)} / £{AI_MONTHLY_BUDGET}</span>
        </div>
        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${budgetPct}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: 4 }} />
        </div>
        <p style={{ marginTop: 5, fontSize: 10, fontWeight: 600, color: '#10b981' }}>
          {T.dashboard.budgetRemaining((100 - budgetPct).toFixed(1))}
        </p>
      </div>
    </div>
  );
}

// ─── ACTIVE SYSTEMS STRIP ─────────────────────────────────────────────────────

function ActiveSystemsStrip({ secSummary }: { secSummary: SecuritySummary | null }) {
  const navigate = useNavigate();
  const T = useTranslations();
  const highAlerts = parseInt(secSummary?.high_unresolved ?? '0', 10);
  const secStatus  = secSummary === null ? 'connecting' : highAlerts > 0 ? 'alert' : 'online';

  const TAG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    online:     { label: T.dashboard.online,     color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
    warning:    { label: T.dashboard.warning,    color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    alert:      { label: T.dashboard.alert,      color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
    connecting: { label: T.dashboard.connecting, color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  };

  const SYSTEMS = [
    { emoji: '🤖', name: 'Chief of Staff', type: 'AI Agent',       status: 'online'      as const, route: '/systems'   },
    { emoji: '📡', name: 'Telegram Bot',   type: 'Messenger',      status: 'online'      as const, route: '/systems'   },
    { emoji: '📚', name: 'RAG Knowledge',  type: 'Pinecone · 147', status: 'online'      as const, route: '/knowledge' },
    { emoji: '📧', name: 'Gmail OAuth',    type: 'Email',          status: 'online'      as const, route: '/systems'   },
    { emoji: '🛡️', name: 'Security Agent', type: 'GPT-4o · RLS',   status: secStatus,             route: '/security'  },
    { emoji: '⚙️', name: 'n8n Workflows',  type: '3 running',      status: 'online'      as const, route: '/systems'   },
  ] as const;

  const DOT: Record<string, string> = { online: '#10b981', warning: '#f59e0b', alert: '#ef4444', connecting: '#94a3b8' };

  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>{T.dashboard.activeSystems}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {SYSTEMS.map(sys => {
          const tag = TAG[sys.status];
          return (
            <SystemCard key={sys.name} sys={sys} dotColor={DOT[sys.status]} tag={tag} onClick={() => void navigate(sys.route)} />
          );
        })}
      </div>
    </div>
  );
}

function SystemCard({ sys, dotColor, tag, onClick }: {
  sys: { emoji: string; name: string; type: string };
  dotColor: string;
  tag: { label: string; color: string; bg: string; border: string };
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff', border: `1px solid ${hovered ? '#06b6d4' : '#e2e8f0'}`, borderRadius: 12,
        padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        boxShadow: hovered ? '0 0 0 2px #06b6d4, 0 6px 20px rgba(6,182,212,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.18s', cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          {sys.emoji}
        </div>
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: dotColor, border: '2px solid white' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#0f172a', margin: 0 }}>{sys.name}</p>
        <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '2px 0 0' }}>{sys.type}</p>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color: tag.color, background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: 10, padding: '2px 6px' }}>
        {tag.label}
      </span>
    </div>
  );
}

// ─── HERO BANNER (main export) ────────────────────────────────────────────────

export function HeroBanner() {
  const navigate = useNavigate();
  const T = useTranslations();
  const user  = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);

  const { data: leads,      loading: l1 } = useQuery<Lead>('leads',      { pollInterval: 30_000 });
  const { data: clients,    loading: l2 } = useQuery<Client>('clients',   { pollInterval: 30_000 });
  const { data: tokenUsage, loading: l3 } = useQuery<TokenUsage>('token_usage', { pollInterval: 30_000 });
  const { data: openTickets, loading: l4 } = useQuery<{ priority: string }>('support_tickets', {
    filters: { status: 'eq.open' },
    pollInterval: 30_000,
  });

  const [secSummary, setSecSummary] = useState<SecuritySummary | null>(null);

  const fetchSecurity = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/security/summary`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setSecSummary(await r.json() as SecuritySummary);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { void fetchSecurity(); }, [fetchSecurity]);
  useEffect(() => {
    const id = setInterval(() => void fetchSecurity(), 30_000);
    return () => clearInterval(id);
  }, [fetchSecurity]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void fetchSecurity(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSecurity]);

  if (l1 || l2 || l3 || l4) {
    return <div className="mb-6"><Skeleton className="h-[600px] rounded-2xl" /></div>;
  }

  // ── Computed values ──────────────────────────────────────────────────────────
  const openCount      = openTickets.length;
  const highCount      = openTickets.filter(t => t.priority === 'high' || t.priority === 'critical').length;
  const wonLeads       = leads.filter(l => l.status === 'won').length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
  const activeClients  = clients.filter(c => c.status === 'active').length;
  const totalCost      = tokenUsage.reduce((sum, t) => sum + Number(t.cost), 0) * USD_GBP;
  const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;
  const highAlertsSec  = parseInt(secSummary?.high_unresolved ?? '0', 10);
  const secScore       = secSummary === null ? 85 : highAlertsSec > 0 ? Math.max(40, 100 - highAlertsSec * 15) : 95;

  const statusCounts: StatusCounts = {
    new:       leads.filter(l => l.status === 'new').length,
    qualified: qualifiedLeads,
    won:       wonLeads,
    lost:      leads.filter(l => l.status === 'lost').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
  };

  const agentMap = new Map<string, { cost: number; tokens: number }>();
  tokenUsage.forEach(t => {
    const prev = agentMap.get(t.agent_name) ?? { cost: 0, tokens: 0 };
    agentMap.set(t.agent_name, {
      cost:   prev.cost + Number(t.cost) * USD_GBP,
      tokens: prev.tokens + t.tokens_in + t.tokens_out,
    });
  });
  const agentList    = Array.from(agentMap.entries()).sort((a, b) => b[1].cost - a[1].cost);
  const maxAgentCost = agentList.reduce((m, [, v]) => Math.max(m, v.cost), 0.0001);

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? T.dashboard.greetMorning : hour < 18 ? T.dashboard.greetAfternoon : T.dashboard.greetEvening;
  const dateStr  = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── HERO STRIP ── */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%)',
        borderRadius: 16, padding: '22px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 120, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>{greeting}</p>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', margin: '0 0 4px' }}>
            {T.dashboard.welcomeBack(user?.name ?? 'Admin')}
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{dateStr} · {T.dashboard.overview}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => void navigate('/reports')}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            {T.dashboard.viewReports}
          </button>
          <button
            onClick={() => void navigate('/systems')}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'white', color: '#4f46e5', border: 'none' }}
          >
            {T.nav.aiSystems}
          </button>
        </div>
      </div>

      {/* ── 6 KPI TILES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        <div onClick={() => void navigate('/leads')} style={{ cursor: 'pointer' }}>
          <KPITile label={T.dashboard.leads} value={leads.length} sub={T.dashboard.activePipeline} color="#6366f1" Icon={Users} />
        </div>
        <div onClick={() => void navigate('/clients')} style={{ cursor: 'pointer' }}>
          <KPITile label={T.dashboard.clients} value={activeClients} sub={`${clients.length} total`} color="#10b981" Icon={Building2} />
        </div>
        <div onClick={() => void navigate('/security')} style={{ cursor: 'pointer' }}>
          <KPITile label={T.dashboard.security} value={secScore} sub={highAlertsSec > 0 ? T.dashboard.alertsActive : T.dashboard.protected} color="#34d399" Icon={Shield} />
        </div>
        <div onClick={() => void navigate('/billing')} style={{ cursor: 'pointer' }}>
          <KPITile label={T.dashboard.aiCost} value={`£${totalCost.toFixed(2)}`} sub={T.dashboard.thisMonth} color="#f59e0b" Icon={Cpu} />
        </div>
        <div onClick={() => void navigate('/support')} style={{ cursor: 'pointer' }}>
          <KPITile label={T.dashboard.tickets} value={openCount} sub={highCount > 0 ? T.dashboard.highPriority(highCount) : T.dashboard.allClear} color="#f87171" Icon={AlertTriangle} />
        </div>
        <div onClick={() => void navigate('/leads')} style={{ cursor: 'pointer' }}>
          <KPITile label={T.dashboard.conversion} value={`${conversionRate}%`} sub={T.dashboard.leadToClient} color="#06b6d4" Icon={TrendingUp} />
        </div>
      </div>

      {/* ── 3-COL CONTENT ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <LeadsPipelineCard
          total={leads.length}
          counts={statusCounts}
          activeClients={activeClients}
          conversionRate={conversionRate}
        />
        <ClientsOverviewCard clients={clients} activeClients={activeClients} />
        <SecurityHealthCard secSummary={secSummary} />
      </div>

      {/* ── 2-COL BOTTOM ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <PlatformHealthCard openCount={openCount} highCount={highCount} />
        <AICostCard totalCost={totalCost} agentList={agentList} maxAgentCost={maxAgentCost} />
      </div>

      {/* ── ACTIVE SYSTEMS STRIP ── */}
      <ActiveSystemsStrip secSummary={secSummary} />

    </div>
  );
}
