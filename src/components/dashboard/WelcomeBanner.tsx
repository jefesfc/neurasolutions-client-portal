import { useAuthStore } from "../../store/auth-store";
import { formatDate } from "../../lib/formatters";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export function WelcomeBanner() {
  const client = useAuthStore((s) => s.client);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-900 p-6 lg:p-8 mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-brand-500/20 to-transparent rounded-bl-full pointer-events-none" />
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-brand-300">
            <Sparkles className="h-4 w-4" />
            <span>Welcome back</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            {client?.companyName}
          </h1>
          <p className="text-surface-400 max-w-md">
            Your AI systems are performing at 99.9% uptime. Here's what's happening across your platform.
          </p>
          <p className="text-xs text-surface-500">
            Member since {client ? formatDate(client.memberSince, "MMMM yyyy") : ""}
          </p>
        </div>
        <Link
          to="/reports"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur-sm border border-white/10 self-start"
        >
          View Latest Report
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          { label: "Active Systems", value: "6 of 6", sub: "All operational" },
          { label: "Uptime SLA", value: "99.98%", sub: "This month" },
          { label: "Plan Usage", value: "78.4%", sub: "Interactions used" },
          { label: "Open Tickets", value: "4", sub: "2 high priority" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <p className="text-xs text-surface-400 mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="text-xs text-surface-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}