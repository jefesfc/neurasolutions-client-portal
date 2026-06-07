import { Link } from "react-router-dom";
import {
  UserPlus, Star, Trophy, PhoneCall, XCircle,
  Building2, TrendingUp, AlertCircle, UserMinus,
} from "lucide-react";
import { Card } from "../ui/Card";
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

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, linkTo }: { title: string; linkTo?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {linkTo && (
        <Link to={linkTo} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
          View all
        </Link>
      )}
    </div>
  );
}

// ── DashboardPanel ───────────────────────────────────────────────────────────

export function DashboardPanel() {
  const { data: leads,   loading: l1 } = useQuery<Lead>("leads",   { order: "created_at.desc", limit: 8 });
  const { data: clients, loading: l2 } = useQuery<Client>("clients", { order: "created_at.desc" });

  const activeClients   = clients.filter(c => c.status === "active").length;
  const inactiveClients = clients.filter(c => c.status === "inactive").length;
  const churnedClients  = clients.filter(c => c.status === "churned").length;
  const recentClients   = clients.slice(0, 6);

  return (
    <Card padding="none" className="overflow-hidden">
      {/* ── Header row ── */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-200 bg-slate-50/60">
        <SectionHeader title="Recent Activity" />
        <SectionHeader title="AI Systems"      linkTo={ROUTES.AISystems} />
        <SectionHeader title="Clients"         linkTo={ROUTES.Clients}   />
      </div>

      {/* ── Content row ── */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 min-h-[420px]">

        {/* ── Activity ── */}
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[520px]">
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
                <div key={lead.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className={cn("mt-0.5 p-2 rounded-lg flex-shrink-0", cfg.bgCls, cfg.iconCls)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{cfg.title(lead.name)}</p>
                    <p className="text-sm text-slate-500 truncate mt-0.5">{cfg.desc(lead.source)}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap mt-1">
                    {formatRelative(lead.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* ── AI Systems ── */}
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[520px]">
          {mockAISystems.map(sys => (
            <Link
              key={sys.id}
              to={`/systems/${sys.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
            >
              <StatusDot
                color={HEALTH_COLOR[sys.health] ?? "gray"}
                pulse={sys.status === "active"}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{sys.name}</p>
                <p className="text-xs text-slate-500 truncate">{sys.shortDescription}</p>
              </div>
              <div className="hidden sm:block w-24">
                <ProgressBar
                  value={sys.metrics.uptime}
                  max={100}
                  size="sm"
                  variant={sys.health === "healthy" ? "success" : "warning"}
                />
              </div>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                sys.status === "active"      && "bg-emerald-50 text-emerald-700",
                sys.status === "maintenance" && "bg-amber-50 text-amber-700",
                sys.status === "inactive"    && "bg-slate-100 text-slate-500",
                sys.status === "error"       && "bg-red-50 text-red-700",
              )}>
                {sys.status}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Clients ── */}
        <div className="flex flex-col overflow-y-auto max-h-[520px]">
          {/* KPI strip */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
            <div className="flex flex-col items-center py-3 gap-0.5">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-base font-bold text-slate-800">{activeClients}</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">Active</span>
            </div>
            <div className="flex flex-col items-center py-3 gap-0.5">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-base font-bold text-slate-800">{inactiveClients}</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">Inactive</span>
            </div>
            <div className="flex flex-col items-center py-3 gap-0.5">
              <div className="flex items-center gap-1">
                <UserMinus className="h-3.5 w-3.5 text-red-400" />
                <span className="text-base font-bold text-slate-800">{churnedClients}</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">Churned</span>
            </div>
          </div>

          {/* Client list */}
          <div className="divide-y divide-slate-100 flex-1">
            {l2 ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : recentClients.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-slate-400 gap-2">
                <Building2 className="h-8 w-8 opacity-30" />
                <p className="text-sm">No clients yet</p>
              </div>
            ) : (
              recentClients.map(c => {
                const st = CLIENT_STATUS[c.status];
                return (
                  <Link
                    key={c.id}
                    to={ROUTES.Clients}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.company}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", st.badge)}>
                      {st.label}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
