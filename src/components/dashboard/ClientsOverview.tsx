import { Link } from "react-router-dom";
import { Building2, TrendingUp, AlertCircle, UserMinus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { useQuery } from "../../hooks/useQuery";
import { cn } from "../../lib/cn";
import { formatRelative } from "../../lib/formatters";
import type { Client } from "../../types/aios";
import { ROUTES } from "../../config/routes";

const STATUS_STYLE: Record<Client["status"], { dot: string; badge: string; label: string }> = {
  active:   { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700",  label: "Active"   },
  inactive: { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700",      label: "Inactive" },
  churned:  { dot: "bg-red-400",     badge: "bg-red-50 text-red-600",          label: "Churned"  },
};

export function ClientsOverview() {
  const { data: clients, loading } = useQuery<Client>("clients", { order: "created_at.desc" });

  const active   = clients.filter(c => c.status === "active").length;
  const inactive = clients.filter(c => c.status === "inactive").length;
  const churned  = clients.filter(c => c.status === "churned").length;
  const recent   = clients.slice(0, 5);

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <CardHeader className="mb-0">
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <Link to={ROUTES.Clients} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View all
        </Link>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
            <div className="flex flex-col items-center py-3 gap-0.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-base font-bold text-slate-800">{active}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Active</span>
            </div>
            <div className="flex flex-col items-center py-3 gap-0.5">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-base font-bold text-slate-800">{inactive}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Inactive</span>
            </div>
            <div className="flex flex-col items-center py-3 gap-0.5">
              <div className="flex items-center gap-1.5">
                <UserMinus className="h-3.5 w-3.5 text-red-400" />
                <span className="text-base font-bold text-slate-800">{churned}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Churned</span>
            </div>
          </div>

          {/* Recent clients */}
          <div className="divide-y divide-slate-100">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-400 gap-2">
                <Building2 className="h-7 w-7 opacity-40" />
                <p className="text-sm">No clients yet</p>
              </div>
            ) : (
              recent.map(c => {
                const st = STATUS_STYLE[c.status];
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
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", st.badge)}>
                        {st.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatRelative(c.created_at)}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </>
      )}
    </Card>
  );
}
