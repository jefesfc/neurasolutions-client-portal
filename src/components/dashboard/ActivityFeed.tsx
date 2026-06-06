import { Card, CardHeader, CardTitle } from "../ui/Card";
import { useQuery } from "../../hooks/useQuery";
import { Skeleton } from "../ui/Skeleton";
import { cn } from "../../lib/cn";
import { formatRelative } from "../../lib/formatters";
import { UserPlus, Star, Trophy, PhoneCall, XCircle } from "lucide-react";
import type { Lead } from "../../types/aios";

const STATUS_CONFIG: Record<Lead["status"], {
  icon: typeof UserPlus;
  iconCls: string;
  bgCls: string;
  title: (name: string) => string;
  description: (source: string) => string;
}> = {
  new:       { icon: UserPlus,  iconCls: "text-blue-600",    bgCls: "bg-blue-50",    title: (n) => `New lead: ${n}`,    description: (s) => `Entered via ${s}`     },
  contacted: { icon: PhoneCall, iconCls: "text-amber-600",   bgCls: "bg-amber-50",   title: (n) => `Contacted: ${n}`,   description: ()  => `Follow-up in progress` },
  qualified: { icon: Star,      iconCls: "text-indigo-600",  bgCls: "bg-indigo-50",  title: (n) => `Qualified: ${n}`,   description: ()  => `Ready for proposal`   },
  won:       { icon: Trophy,    iconCls: "text-emerald-600", bgCls: "bg-emerald-50", title: (n) => `Deal won: ${n}`,    description: ()  => `Converted to client`  },
  lost:      { icon: XCircle,   iconCls: "text-red-500",     bgCls: "bg-red-50",     title: (n) => `Lead lost: ${n}`,   description: ()  => `Marked as lost`       },
};

export function ActivityFeed() {
  const { data: leads, loading } = useQuery<Lead>("leads", { order: "created_at.desc", limit: 8 });

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-slate-100">
        <CardHeader className="mb-0">
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {leads.map((lead) => {
            const cfg = STATUS_CONFIG[lead.status];
            const Icon = cfg.icon;
            return (
              <div key={lead.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className={cn("mt-0.5 p-2 rounded-lg flex-shrink-0", cfg.bgCls, cfg.iconCls)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{cfg.title(lead.name)}</p>
                  <p className="text-sm text-slate-500 truncate mt-0.5">{cfg.description(lead.source)}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap mt-1">
                  {formatRelative(lead.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}