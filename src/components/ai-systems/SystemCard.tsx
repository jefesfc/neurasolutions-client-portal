import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Cpu, Activity } from "lucide-react";
import { cn } from "../../lib/cn";
import type { AISystem } from "../../types";
import { StatusDot } from "../shared/StatusDot";
import { formatRelative, formatNumber } from "../../lib/formatters";

const healthColorMap: Record<string, "green" | "yellow" | "red" | "gray"> = {
  healthy: "green",
  degraded: "yellow",
  down: "red",
};

const categoryColors: Record<string, string> = {
  "lead-generation": "bg-brand-50 text-brand-700 border-brand-200",
  "customer-support": "bg-blue-50 text-blue-700 border-blue-200",
  "data-analysis": "bg-purple-50 text-purple-700 border-purple-200",
  "workflow-automation": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "content-creation": "bg-amber-50 text-amber-700 border-amber-200",
  "predictive-analytics": "bg-rose-50 text-rose-700 border-rose-200",
};

const categoryLabels: Record<string, string> = {
  "lead-generation": "Lead Gen",
  "customer-support": "Support",
  "data-analysis": "Data Analysis",
  "workflow-automation": "Workflow",
  "content-creation": "Content",
  "predictive-analytics": "Predictive",
};

interface SystemCardProps {
  system: AISystem;
  index: number;
}

export function SystemCard({ system, index }: SystemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/systems/${system.id}`}
        className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col p-5 h-full group"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Cpu className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">
                {system.name}
              </h3>
              <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-md", categoryColors[system.category])}>
                {categoryLabels[system.category]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot color={healthColorMap[system.health]} pulse={system.status === "active"} />
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{system.shortDescription}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          {[
            { label: "Interactions", value: formatNumber(system.metrics.interactionsThisMonth) },
            { label: "Hours Saved", value: formatNumber(system.metrics.hoursSaved) },
            { label: "Success Rate", value: `${system.successRate}%` },
            { label: "Uptime", value: `${system.metrics.uptime}%` },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="text-sm font-semibold text-slate-700">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
          <Activity className="h-3 w-3 text-slate-400" />
          <span className="text-xs text-slate-400">
            Last active {formatRelative(system.lastActive)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}