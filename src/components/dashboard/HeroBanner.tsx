import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "../../store/auth-store";
import { useQuery } from "../../hooks/useQuery";
import { USD_GBP } from "../../lib/rangeUtils";
import { Skeleton } from "../ui/Skeleton";
import { Link } from "react-router-dom";
import type { Lead, Client, TokenUsage } from "../../types/aios";
import type { SecuritySummary } from "../../types/security";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

// ── Gradient border panel helper ────────────────────────────────────────────

type AccentKey = "indigo" | "emerald" | "amber" | "red" | "multi";

const GLOW_COLORS: Record<AccentKey, string> = {
  indigo:  "rgba(99,102,241,0.65), rgba(129,140,248,0.35)",
  emerald: "rgba(16,185,129,0.65), rgba(52,211,153,0.35)",
  amber:   "rgba(245,158,11,0.65), rgba(252,211,77,0.35)",
  red:     "rgba(239,68,68,0.65), rgba(248,113,113,0.35)",
  multi:   "rgba(99,102,241,0.4), rgba(16,185,129,0.4)",
};

function glowPanel(accent: AccentKey, inner = "#0d1424"): React.CSSProperties {
  return {
    background: `linear-gradient(${inner}, ${inner}) padding-box, linear-gradient(135deg, ${GLOW_COLORS[accent]}) border-box`,
    border: "1.5px solid transparent",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
  };
}

// ── Shared inner panel style (no bg/border — wrapper provides them) ─────────

const panelInner: React.CSSProperties = {
  background: "transparent",
  border: "none",
  borderRadius: 12,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  flex: 1,
};

const panelTitle: React.CSSProperties = {
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 11,
  display: "flex",
  alignItems: "center",
  gap: 6,
  borderBottom: "1px solid rgba(255,215,0,0.1)",
  paddingBottom: 8,
};

// ── ActiveServicesCard (horizontal full-width layout) ───────────────────────

const STATUS_STYLE = {
  active:  { bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.25)", color: "#34d399", dot: "#34d399", label: "Active"    },
  pending: { bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.25)", color: "#fbbf24", dot: null,      label: "⚠ Pending" },
  alert:   { bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.25)",  color: "#f87171", dot: "#f87171", label: "⚠ Alert"   },
  soon:    { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.2)",  color: "#a5b4fc", dot: null,      label: "Soon"      },
} as const;

type ServiceStatus = keyof typeof STATUS_STYLE;

interface ServicesCardProps { secSummary: SecuritySummary | null }

function ActiveServicesCard({ secSummary }: ServicesCardProps) {
  const highAlerts = parseInt(secSummary?.high_unresolved ?? '0', 10);
  const secStatus: ServiceStatus = secSummary === null ? 'soon' : highAlerts > 0 ? 'alert' : 'active';
  const secDetail  = secSummary === null
    ? 'Connecting…'
    : highAlerts > 0 ? `${highAlerts} high alert${highAlerts > 1 ? 's' : ''}` : `${secSummary.total_events} events`;

  const SERVICES: { icon: string; name: string; detail: string; status: ServiceStatus }[] = [
    { icon: "✈️", name: "Telegram Bot",      detail: "@Neura_AIOS_demo_bot", status: "active"  },
    { icon: "🤖", name: "AI Orchestrator",   detail: "Claude Sonnet 4.6",    status: "active"  },
    { icon: "⚙️", name: "n8n Workflows",     detail: "3 running",            status: "active"  },
    { icon: "📧", name: "Gmail Sync",        detail: "last sync 2m ago",     status: "active"  },
    { icon: "📅", name: "Calendar Notifier", detail: "08:00 daily cron",     status: "pending" },
    { icon: "🛡️", name: "Security Agent",    detail: secDetail,              status: secStatus  },
  ];

  const activeCount = SERVICES.filter(s => s.status === "active").length;

  return (
    <div style={panelInner}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Active Services
        </span>
        <span style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.2)",
          color: "#34d399", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", animation: "pulse 2s infinite", display: "inline-block" }} />
          {activeCount} / {SERVICES.length} Active
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        {SERVICES.map(svc => {
          const st = STATUS_STYLE[svc.status];
          return (
            <div key={svc.name} style={{
              display: "flex", flexDirection: "column", gap: 4,
              padding: "8px 10px", borderRadius: 8,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,215,0,0.08)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 1 }}>
                <span style={{ fontSize: 13 }}>{svc.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fcd34d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {svc.name}
                </span>
              </div>
              <span style={{ fontSize: 9, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {svc.detail}
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3, width: "fit-content",
                fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 20,
                background: st.bg, border: `1px solid ${st.border}`, color: st.color,
              }}>
                {st.dot && <span style={{ width: 4, height: 4, borderRadius: "50%", background: st.dot, animation: "pulse 2s infinite", display: "inline-block" }} />}
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LeadsStatusChart ────────────────────────────────────────────────────────

interface LeadsStatusProps {
  leads: Lead[];
  statusCounts: { new: number; qualified: number; won: number; lost: number; contacted: number };
}

const LEAD_SEGMENTS = [
  { key: "new",       color: "#6366f1", label: "New"         },
  { key: "qualified", color: "#10b981", label: "Qualified"   },
  { key: "won",       color: "#f59e0b", label: "Won"         },
  { key: "lost",      color: "#ef4444", label: "Lost"        },
  { key: "contacted", color: "#8b5cf6", label: "In Progress" },
] as const;

function buildDonut(counts: Record<string, number>, total: number) {
  const circumference = 2 * Math.PI * 14;
  let offset = 0;
  return LEAD_SEGMENTS.map(seg => {
    const count = counts[seg.key] ?? 0;
    const fraction = total > 0 ? count / total : 0;
    const dash = fraction * circumference;
    const result = { ...seg, count, pct: Math.round(fraction * 100), dash, offset };
    offset += dash;
    return result;
  });
}

function LeadsStatusChart({ leads, statusCounts }: LeadsStatusProps) {
  const total = leads.length;
  const segments = buildDonut(statusCounts as Record<string, number>, total);
  const circumference = 87.96;

  return (
    <div style={panelInner}>
      <div style={panelTitle}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, display: "inline-block" }} />
        Leads by Status
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
        <svg width={110} height={110} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
          <circle r={14} cx={18} cy={18} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
          {segments.map(seg => (
            <circle key={seg.key}
              r={14} cx={18} cy={18} fill="transparent"
              stroke={seg.color} strokeWidth={6}
              strokeDasharray={`${seg.dash} ${circumference}`}
              strokeDashoffset={-seg.offset}
              transform="rotate(-90 18 18)"
            />
          ))}
          <text x={18} y={16.5} textAnchor="middle" fontSize={5.5} fontWeight={900} fill="#fff"
            style={{ filter: "drop-shadow(0 0 4px rgba(99,102,241,0.9))" }}>{total}</text>
          <text x={18} y={21.5} textAnchor="middle" fontSize={3.2} fill="#fcd34d">leads</text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%" }}>
          {segments.map(seg => (
            <div key={seg.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: seg.color, flexShrink: 0, display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#fcd34d", flex: 1 }}>{seg.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", minWidth: 16, textAlign: "right" }}>{seg.count}</span>
              <span style={{ fontSize: 11, color: "#b45309", minWidth: 34, textAlign: "right", background: "rgba(255,215,0,0.08)", borderRadius: 4, padding: "1px 5px" }}>
                {seg.pct}%
              </span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,215,0,0.1)", paddingTop: 6, marginTop: 2, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#fcd34d" }}>Pipeline total</span>
            <strong style={{ fontSize: 11, color: "#fff" }}>{total} leads</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PlatformHealthPanel ─────────────────────────────────────────────────────

const AI_MONTHLY_BUDGET = 40;

function PlatformHealthPanel({ totalCost }: { totalCost: number }) {
  const budgetPct = Math.min((totalCost / AI_MONTHLY_BUDGET) * 100, 100);
  const budgetColor = budgetPct > 80 ? "#ef4444" : budgetPct > 50 ? "#f59e0b" : "#6366f1";
  const healthBars = [
    { label: "Active Systems", value: "6 / 6",    pct: 100,      color: "#10b981", sub: "All operational",   valColor: "#34d399" },
    { label: "Uptime SLA",     value: "99.98%",   pct: 99.98,    color: "#10b981", sub: "This month",        valColor: "#34d399" },
    { label: "Plan Usage",     value: "78.4%",    pct: 78.4,     color: "#6366f1", sub: "Interactions used", valColor: "#a5b4fc" },
    { label: "Open Tickets",   value: "4",        pct: 33,       color: "#f59e0b", sub: "2 high priority",   valColor: "#fbbf24" },
    { label: "AI Cost Budget", value: `£${totalCost.toFixed(2)} / £${AI_MONTHLY_BUDGET}`, pct: budgetPct, color: budgetColor, sub: "Monthly limit", valColor: "#fff" },
  ];
  return (
    <div style={panelInner}>
      <div style={panelTitle}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0, display: "inline-block" }} />
        Platform Health
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, justifyContent: "center" }}>
        {healthBars.map(bar => (
          <div key={bar.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#fcd34d" }}>{bar.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: bar.valColor, textShadow: `0 0 8px ${bar.valColor}80` }}>{bar.value}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{
                width: `${bar.pct}%`, height: "100%", borderRadius: 6,
                background: `linear-gradient(90deg, ${bar.color}, ${bar.valColor})`,
                boxShadow: `0 0 6px ${bar.color}80`,
              }} />
            </div>
            <div style={{ fontSize: 9, color: "#b45309", marginTop: 2 }}>{bar.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AICostPanel ─────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  "aios-chat":           "#6366f1",
  "aios-telegram":       "#8b5cf6",
  "telegram-tts":        "#0ea5e9",
  "whisper":             "#10b981",
  "Appointment AI":      "#06b6d4",
  "Skincare Advisor AI": "#10b981",
  "Clinical Insights AI":"#8b5cf6",
  "Chief of Staff AI":   "#f59e0b",
};

interface AICostPanelProps {
  totalCost: number;
  agentList: [string, { cost: number; tokens: number }][];
  maxAgentCost: number;
}

function AICostPanel({ totalCost, agentList, maxAgentCost }: AICostPanelProps) {
  return (
    <div style={panelInner}>
      <div style={panelTitle}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0, display: "inline-block" }} />
        AI Cost Breakdown
      </div>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: "#fff", textShadow: "0 0 16px rgba(245,158,11,0.75), 0 0 32px rgba(245,158,11,0.3)" }}>
          £{totalCost.toFixed(2)}
        </span>
        <span style={{ fontSize: 10, color: "#fcd34d", marginLeft: 4 }}>total this month</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        {agentList.length === 0 ? (
          <span style={{ fontSize: 11, color: "#64748b" }}>No token usage recorded yet</span>
        ) : (
          agentList.map(([agent, data]) => {
            const barPct = (data.cost / maxAgentCost) * 100;
            const color  = AGENT_COLORS[agent] ?? "#6366f1";
            return (
              <div key={agent} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "#fcd34d", minWidth: 90 }}>{agent}</span>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 10, overflow: "hidden" }}>
                  <div style={{ width: `${barPct}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${color}99)`, boxShadow: `0 0 6px ${color}60` }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", minWidth: 36, textAlign: "right" }}>£{data.cost.toFixed(2)}</span>
                <span style={{ fontSize: 9, color: "#b45309", minWidth: 56, textAlign: "right" }}>
                  {data.tokens.toLocaleString()} tok
                </span>
              </div>
            );
          })
        )}
      </div>
      <hr style={{ border: "none", borderTop: "1px solid rgba(255,215,0,0.1)", margin: "6px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <small style={{ fontSize: 10, color: "#fcd34d" }}>claude-sonnet-4-6 · claude-haiku-4-5</small>
        <span style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
          ↓ Under budget
        </span>
      </div>
    </div>
  );
}

// ── SecurityHealthPanel ─────────────────────────────────────────────────────

interface SecurityHealthProps { secSummary: SecuritySummary | null }

function SecurityHealthPanel({ secSummary }: SecurityHealthProps) {
  const highAlerts  = parseInt(secSummary?.high_unresolved ?? '0', 10);
  const medAlerts   = parseInt(secSummary?.medium_count    ?? '0', 10);
  const totalToday  = parseInt(secSummary?.total_events     ?? '0', 10);
  const score       = secSummary === null ? 85 : highAlerts > 0 ? Math.max(40, 100 - highAlerts * 15) : 95;
  const standing    = highAlerts > 0 ? "Alerts Active" : "Good Standing";
  const scoreColor  = highAlerts > 0 ? "#f87171" : "#10b981";
  const circumference = 87.96;
  const dashLen = (score / 100) * circumference;

  return (
    <div style={panelInner}>
      <div style={panelTitle}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: scoreColor, flexShrink: 0, display: "inline-block" }} />
        Security Health
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
          <svg width={56} height={56} viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
            <circle r={14} cx={18} cy={18} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
            <circle r={14} cx={18} cy={18} fill="none" stroke={scoreColor} strokeWidth={5}
              strokeDasharray={`${dashLen} ${circumference}`} strokeDashoffset={0}
              style={{ filter: `drop-shadow(0 0 4px ${scoreColor}90)` }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", lineHeight: 1, textShadow: `0 0 10px ${scoreColor}` }}>{score}</span>
            <span style={{ fontSize: 7, color: "#fcd34d" }}>/100</span>
          </div>
        </div>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{standing}</h4>
          <p style={{ fontSize: 10, color: "#fcd34d", marginTop: 2 }}>
            {secSummary === null ? "Connecting…" : `${totalToday} events today`}
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4,
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)",
            color: "#a5b4fc", fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
          }}>
            🤖 CyberSec Agent
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, flex: 1 }}>
        {[
          { label: "High Alerts", val: secSummary === null ? "—" : String(highAlerts), sub: highAlerts > 0 ? "Unresolved" : "None",  color: highAlerts > 0 ? "#f87171" : "#34d399" },
          { label: "Medium",      val: secSummary === null ? "—" : String(medAlerts),  sub: medAlerts > 0 ? "Unresolved" : "Clear",  color: medAlerts > 0 ? "#fbbf24" : "#34d399"  },
          { label: "Auth",        val: "JWT ✓",  sub: "RLS active", color: "#34d399" },
          { label: "Compliance",  val: "OK",     sub: "GDPR ready", color: "#34d399" },
        ].map(m => (
          <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,215,0,0.1)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#fcd34d", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: m.color, textShadow: `0 0 8px ${m.color}80` }}>{m.val}</div>
            <div style={{ fontSize: 9, color: "#b45309", marginTop: 1 }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,215,0,0.08)", paddingTop: 8, marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { icon: "✅", text: "API encryption (HTTPS)" },
          { icon: "✅", text: "Row-Level Security active" },
          { icon: highAlerts > 0 ? "🔴" : "✅", text: highAlerts > 0 ? `${highAlerts} high priority alerts` : "No active threats" },
        ].map(c => (
          <div key={c.text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#fcd34d" }}>
            <span>{c.icon}</span> {c.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HeroBanner (main export) ────────────────────────────────────────────────

export function HeroBanner() {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { data: leads,      loading: l1 } = useQuery<Lead>("leads",       { pollInterval: 30_000 });
  const { data: clients,    loading: l2 } = useQuery<Client>("clients",    { pollInterval: 30_000 });
  const { data: tokenUsage, loading: l3 } = useQuery<TokenUsage>("token_usage", { pollInterval: 30_000 });

  const [secSummary, setSecSummary] = useState<SecuritySummary | null>(null);

  const fetchSecurity = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/security/summary`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setSecSummary(await r.json() as SecuritySummary);
    } catch { /* silent */ }
  }, [token]);

  // Initial + polling every 30s
  useEffect(() => { void fetchSecurity(); }, [fetchSecurity]);
  useEffect(() => {
    const id = setInterval(() => void fetchSecurity(), 30_000);
    return () => clearInterval(id);
  }, [fetchSecurity]);

  // Refresh when user returns to the tab
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void fetchSecurity(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSecurity]);

  if (l1 || l2 || l3) {
    return (
      <div className="mb-6">
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  // Computed values
  const wonLeads       = leads.filter(l => l.status === "won").length;
  const qualifiedLeads = leads.filter(l => l.status === "qualified").length;
  const activeClients  = clients.filter(c => c.status === "active").length;
  const totalCost      = tokenUsage.reduce((sum, t) => sum + Number(t.cost), 0) * USD_GBP;
  const totalTokens    = tokenUsage.reduce((sum, t) => sum + t.tokens_in + t.tokens_out, 0);
  const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

  const statusCounts = {
    new:       leads.filter(l => l.status === "new").length,
    qualified: qualifiedLeads,
    won:       wonLeads,
    lost:      leads.filter(l => l.status === "lost").length,
    contacted: leads.filter(l => l.status === "contacted").length,
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

  const headerStats = [
    { label: "Total Leads",     value: String(leads.length),           sub: "↑ active pipeline",  glow: "rgba(99,102,241,0.7)"  },
    { label: "Active Clients",   value: String(activeClients),          sub: "↑ this month",        glow: "rgba(16,185,129,0.7)"  },
    { label: "Conversion",      value: `${conversionRate}%`,           sub: "Deals / Leads",       glow: "rgba(245,158,11,0.7)"  },
    { label: "AI Cost",         value: `£${totalCost.toFixed(2)}`,     sub: "This month",          glow: "rgba(139,92,246,0.7)"  },
  ];

  const kpiCards = [
    { icon: "⭐", iconBg: "rgba(99,102,241,0.2)",  label: "Qualified Leads",   value: String(qualifiedLeads),         sub: "% of pipeline",         glow: "rgba(99,102,241,0.75)"  },
    { icon: "🏆", iconBg: "rgba(16,185,129,0.2)",  label: "Deals Won",         value: String(wonLeads),               sub: "↑ 0.0% vs last month",  glow: "rgba(16,185,129,0.75)"  },
    { icon: "🤖", iconBg: "rgba(245,158,11,0.2)",  label: "Total Tokens Used", value: totalTokens.toLocaleString(),   sub: "GPT-4o + TTS + Whisper", glow: "rgba(245,158,11,0.75)"  },
    { icon: "🎫", iconBg: "rgba(239,68,68,0.2)",   label: "Open Tickets",      value: "4",                            sub: "⚠ 2 high priority",     glow: "rgba(239,68,68,0.75)"   },
  ];

  return (
    <div className="mb-6" style={{
      background: "linear-gradient(135deg, #090e1c 0%, #1a1640 40%, #0e1628 100%)",
      borderRadius: 20,
      padding: "24px 28px",
      border: "1px solid rgba(255,215,0,0.08)",
      boxShadow: "0 0 60px rgba(99,102,241,0.06), 0 4px 32px rgba(0,0,0,0.4)",
    }}>

      {/* ── HEADER STRIP ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22, flexWrap: "nowrap" }}>

        {/* Greeting */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)",
            color: "#a5b4fc", fontSize: 10, fontWeight: 600,
            padding: "3px 10px", borderRadius: 20, marginBottom: 8,
          }}>
            ✦ Welcome back
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: "#fff", margin: "0 0 2px", textShadow: "0 0 20px rgba(165,180,252,0.3)" }}>
            {user?.name ?? "Admin AIOS"}
          </h2>
          <p style={{ color: "#fcd34d", fontSize: 11, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", animation: "pulse 2s infinite", display: "inline-block" }} />
            All systems operational · AI agents running
          </p>
        </div>

        <div style={{ flex: 1 }} />

        {/* 4 inline stat chips */}
        {headerStats.map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,215,0,0.1)",
            borderRadius: 10, padding: "8px 14px",
            textAlign: "center", flexShrink: 0,
          }}>
            <div style={{ color: "#94a3b8", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
              {s.label}
            </div>
            <div style={{ color: "#fff", fontSize: 19, fontWeight: 900, lineHeight: 1.1, textShadow: `0 0 14px ${s.glow}` }}>
              {s.value}
            </div>
            <div style={{ color: "#64748b", fontSize: 9, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}

        {/* Report button */}
        <Link to="/reports" style={{
          display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
          background: "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.12))",
          border: "1px solid rgba(99,102,241,0.45)",
          color: "#a5b4fc", padding: "9px 16px", borderRadius: 10,
          fontSize: 12, fontWeight: 600, textDecoration: "none",
          boxShadow: "0 0 16px rgba(99,102,241,0.15)",
        }}>
          View Report ↗
        </Link>
      </div>

      {/* ── 4 PANELS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
        <div className="hover-neon" style={glowPanel("indigo")}>
          <LeadsStatusChart leads={leads} statusCounts={statusCounts} />
        </div>
        <div className="hover-neon" style={glowPanel("emerald")}>
          <PlatformHealthPanel totalCost={totalCost} />
        </div>
        <div className="hover-neon" style={glowPanel("amber")}>
          <AICostPanel totalCost={totalCost} agentList={agentList} maxAgentCost={maxAgentCost} />
        </div>
        <div className="hover-neon" style={glowPanel("red")}>
          <SecurityHealthPanel secSummary={secSummary} />
        </div>
      </div>

      {/* ── ACTIVE SERVICES (full width) ── */}
      <div className="hover-neon" style={{ ...glowPanel("multi"), marginBottom: 16 }}>
        <ActiveServicesCard secSummary={secSummary} />
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ height: 1, background: "rgba(255,215,0,0.07)", margin: "0 0 16px" }} />

      {/* ── KPI ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {kpiCards.map(c => (
          <div key={c.label} className="hover-neon" style={{
            background: "rgba(255,255,255,0.025)",
            borderRadius: 12, padding: "14px 16px",
            border: "1px solid rgba(255,215,0,0.1)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
              {c.icon}
            </div>
            <div>
              <small style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                {c.label}
              </small>
              <strong style={{ color: "#fff", fontSize: 22, fontWeight: 900, display: "block", lineHeight: 1.2, textShadow: `0 0 14px ${c.glow}` }}>
                {c.value}
              </strong>
              <span style={{ fontSize: 10, color: "#64748b" }}>{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
