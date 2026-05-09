import type { ReactNode } from "react";
import { Card } from "../ui/Card";
import { cn } from "../../lib/cn";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function ChartCard({ title, subtitle, children, className, action }: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-surface-900">{title}</h3>
          {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}