import { cn } from "../../lib/cn";
import { formatKPIValue } from "../../lib/formatters";
import { TrendingUp, TrendingDown } from "lucide-react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  change: number;
  changeType: "increase" | "decrease";
  icon: string;
  prefix?: string;
  suffix?: string;
  format?: "number" | "currency" | "percentage" | "duration";
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeType,
  icon,
  prefix,
  suffix,
  format,
  className,
}: StatCardProps) {
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[icon] ?? Icons.TrendingUp;
  const isPositive = changeType === "increase";
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        "bg-surface-800 border border-surface-700 rounded-xl shadow-sm p-5 flex flex-col gap-3",
        "transition-all duration-200",
        "hover:border-cyan-500/60 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.08),0_4px_24px_rgba(6,182,212,0.10)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-300">{label}</span>
        <div className="rounded-lg bg-brand-500/10 p-2">
          <Icon className="h-4 w-4 text-brand-400" />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-lg text-surface-400">{prefix}</span>}
        <span className="text-2xl font-bold text-surface-100">
          {formatKPIValue(value, format)}
        </span>
        {suffix && <span className="text-lg text-surface-400">{suffix}</span>}
      </div>
      <div className="flex items-center gap-1">
        <ChangeIcon
          className={cn("h-3.5 w-3.5", isPositive ? "text-positive" : "text-danger")}
        />
        <span className={cn("text-sm font-medium", isPositive ? "text-positive" : "text-danger")}>
          {Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-sm text-surface-400">vs last month</span>
      </div>
    </div>
  );
}
