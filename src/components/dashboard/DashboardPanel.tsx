import { Link } from "react-router-dom";
import {
  UserPlus, Star, Trophy, PhoneCall, XCircle,
  Building2, TrendingUp, AlertCircle, UserMinus,
} from "lucide-react";
import { Skeleton } from "../ui/Skeleton";
import { StatusDot } from "../shared/StatusDot";
import { ProgressBar } from "../ui/ProgressBar";
import { useQuery } from "../../hooks/useQuery";
import { cn } from "../../lib/cn";
import { formatRelative } from "../../lib/formatters";
import { mockAISystems } from "../../lib/mock-data";
import type { Lead, Client } from "../../types/aios";
import { ROUTES } from "../../config/routes";

// ── Activity config ──────────────────────────────────────────────────────────

const LEAD_CFG: Record<Lead["status"], {
  icon: typeof UserPlus;
  iconCls: string;
  bgCls: string;
  title: (n: string) => string;
  desc: (s: string) => string;
}> = {
  new:       { icon: UserPlus,  iconCls: "text-blue-600",    bgCls: "bg-blue-50",    title: n => `New lead: ${n}`,   desc: s => `Entered via ${s}`      },
  contacted: { icon: PhoneCall, iconCls: "text-amber-600",   bgCls: "bg-amber-50",   title: n => `Contacted: ${n}`,  desc: () => "Follow-up in progress" },
  qualified: { icon: Star,      iconCls: "text-indigo-600",  bgCls: "bg-indigo-50",  title: n => `Qualified: ${n}`,  desc: () => "Ready for proposal"    },
  won:       { icon: Trophy,    iconCls: "text-emerald-600", bgCls: "bg-emerald-50", title: n => `Deal won: ${n}`,   desc: () => "Converted to client"   },
  lost:      { icon: XCircle,   iconCls: "text-red-500",     bgCls: "bg-red-50",     title: n => `Lead lost: ${n}`,  desc: () => "Marked as lost"        },
};

// ── Clients config ───────────────────────────────────────────────────────────

const CLIENT_STATUS: Record<Client["status"], { dot: string; badge: string; label: string }> = {
  active:   { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", label: "Active"   },
  inactive: { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700",     label: "Inactive" },
  churned:  { dot: "bg-red-400",     badge: "bg-red-50 text-red-600",         label: "Churned"  },
};

const HEALTH_COLOR: Record<string, "green" | "yellow" | "red" | "gray"> = {
  healthy:  "green",
  degraded: "yellow",
  down:     "red",
};

// ── Section accent colours ───────────────────────────────────────────────────

const SECTION_ACCENT = {
  activity: { dot: "bg-indigo-500",  label: "text-indigo-600",  bg: "bg-indigo-50/60"  },
  systems:  { dot: "bg-emerald-500", label: "text-emerald-600", bg: "bg-emerald-50/60" },
  clients:  { dot: "bg-violet-500",  label: "text-violet-600",  bg: "bg-violet-50/60"  },
};

function SectionHeader({
  title, linkTo, dot,
}: { title: string; dot: string; linkTo?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">
          View all →
        </Link>
      )}
    </div>
  );
}

// ── DashboardPanel ───────────────────────────────────────────────────────────

export function DashboardPanel() {
  const { data: leads,   loading: l1 } = useQuery<Lead>("leads",   { order: "created_at.desc", limit: 8, pollInterval: 30_000 });
  const { data: clients, loading: l2 } = useQuery<Client>("clients", { order: "created_at.desc",           pollInterval: 30_000 });

  const activeClients   = clients.filter(c => c.status === "active").length;
  const inactiveClients = clients.filter(c => c.status === "inactive").length;
  const churnedClients  = clients.filter(c => c.status === "churned").length;
  const recentClients   = clients.slice(0, 6);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* ── Header strip ── */}
      <div className="grid grid-cols-3 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
        <div className={cn("border-r border-slate-200", SECTION_ACCENT.activity.bg)}>
          <SectionHeader title="Recent Activity" dot={SECTION_ACCENT.activity.dot} />
        </div>
        <div className={cn("border-r border-slate-200", SECTION_ACCENT.systems.bg)}>
          <SectionHeader title="AI Systems" dot={SECTION_ACCENT.systems.dot} linkTo={ROUTES.AISystems} />
        </div>
        <div className={SECTION_ACCENT.clients.bg}>
          <SectionHeader title="Clients" dot={SECTION_ACCENT.clients.dot} linkTo={ROUTES.Clients} />
        </div>
      </div>

      {/* ── Content row ── */}
      <div className="grid grid-cols-3 min-h-[400px]" style={{ background: "#fafafa" }}>

        {/* ── Activity ── */}
        <div className="border-r border-slate-200 divide-y divide-slate-100 overflow-y-auto max-h-[520px] bg-white">
          {l1 ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400 gap-2">
              <UserPlus className="h-8 w-8 opacity-30" />
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            leads.map(lead => {
              const cfg = LEAD_CFG[lead.status];
              const Icon = cfg.icon;
              return (
                <div key={lead.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-indigo-50/30 transition-colors cursor-default">
                  <div className={cn("mt-0.5 p-2 rounded-xl flex-shrink-0", cfg.bgCls)}>
                    <Icon className={cn("h-3.5 w-3.5", cfg.iconCls)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{cfg.title(lead.name)}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{cfg.desc(lead.source)}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap mt-1 bg-slate-100 px-2 py-0.5 rounded-full">
                    {formatRelative(lead.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* ── AI Systems ── */}
        <div className="border-r border-slate-200 divide-y divide-slate-100 overflow-y-auto max-h-[520px] bg-white">
          {mockAISystems.map(sys => (
            <Link
              key={sys.id}
              to={`${ROUTES.AISystems}/${sys.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-emerald-50/30 transition-colors"
            >
              <StatusDot
                color={HEALTH_COLOR[sys.health] ?? "gray"}
                pulse={sys.status === "active"}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{sys.name}</p>
                <p className="text-xs text-slate-500 truncate">{sys.shortDescription}</p>
              </div>
              <div className="hidden sm:block w-20">
                <ProgressBar
                  value={sys.metrics.uptime}
                  max={100}
                  size="sm"
                  variant={sys.health === "healthy" ? "success" : "warning"}
                />
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 border",
                sys.status === "active"      && "bg-emerald-50 text-emerald-700 border-emerald-200",
                sys.status === "maintenance" && "bg-amber-50 text-amber-700 border-amber-200",
                sys.status === "inactive"    && "bg-slate-100 text-slate-500 border-slate-200",
                sys.status === "error"       && "bg-red-50 text-red-700 border-red-200",
              )}>
                {sys.status}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Clients ── */}
        <div className="flex flex-col overflow-y-auto max-h-[520px] bg-white">
          {/* KPI strip */}
          <div className="grid grid-cols-3 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" }}>
            {[
              { icon: TrendingUp, color: "text-emerald-600", val: activeClients,   label: "Active",   bg: "bg-emerald-100/60" },
              { icon: AlertCircle, color: "text-amber-500",  val: inactiveClients, label: "Inactive", bg: "bg-amber-100/60"   },
              { icon: UserMinus,  color: "text-red-500",     val: churnedClients,  label: "Churned",  bg: "bg-red-100/60"     },
            ].map((s, i) => (
              <div key={s.label} className={cn("flex flex-col items-center py-3.5 gap-1", i < 2 && "border-r border-slate-200/70")}>
                <div className={cn("p-1.5 rounded-lg mb-0.5", s.bg)}>
                  <s.icon className={cn("h-3.5 w-3.5", s.color)} />
                </div>
                <span className="text-lg font-bold text-slate-800">{s.val}</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Client list */}
          <div className="divide-y divide-slate-100 flex-1">
            {l2 ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : recentClients.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-slate-300 gap-2">
                <Building2 className="h-9 w-9 opacity-40" />
                <p className="text-sm font-medium text-slate-400">No clients yet</p>
                <Link to={ROUTES.Clients} className="text-xs text-indigo-500 hover:underline">Add first client →</Link>
              </div>
            ) : (
              recentClients.map(c => {
                const st = CLIENT_STATUS[c.status];
                return (
                  <Link
                    key={c.id}
                    to={ROUTES.Clients}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-violet-50/30 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.company}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 border",
                      c.status === "active"   && "bg-emerald-50 text-emerald-700 border-emerald-200",
                      c.status === "inactive" && "bg-amber-50 text-amber-700 border-amber-200",
                      c.status === "churned"  && "bg-red-50 text-red-600 border-red-200",
                    )}>
                      {st.label}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
