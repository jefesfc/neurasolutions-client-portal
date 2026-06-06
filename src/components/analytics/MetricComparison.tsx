import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { Card } from "../ui/Card";
import { formatKPIValue } from "../../lib/formatters";
import type { MetricComparison as MetricComparisonType } from "../../types";

interface MetricComparisonProps {
  comparisons: MetricComparisonType[];
}

export function MetricComparison({ comparisons }: MetricComparisonProps) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-800 mb-4">Monthly Comparison</h3>
      <div className="space-y-3">
        {comparisons.map((comp) => {
          const isPositive = comp.changePercent > 0;
          const Icon = isPositive ? TrendingUp : TrendingDown;
          return (
            <div key={comp.id} className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{comp.label}</span>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">
                    {formatKPIValue(comp.currentPeriod, comp.format)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatKPIValue(comp.previousPeriod, comp.format)}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full",
                    isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {Math.abs(comp.changePercent).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}