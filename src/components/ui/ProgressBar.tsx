import { cn } from "../../lib/cn";

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "success" | "warning" | "danger";
  showLabel?: boolean;
  labelFormat?: "percent" | "fraction";
  className?: string;
}

const sizeStyles = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

const variantStyles = {
  brand: "bg-brand-500",
  success: "bg-positive",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function ProgressBar({
  value,
  max = 100,
  size = "md",
  variant = "brand",
  showLabel = false,
  labelFormat = "percent",
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex-1 bg-slate-200 rounded-full overflow-hidden", sizeStyles[size])}>
        <div
          className={cn("rounded-full transition-all duration-500", sizeStyles[size], variantStyles[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-500 w-12 text-right">
          {labelFormat === "percent" ? `${pct.toFixed(0)}%` : `${value}/${max}`}
        </span>
      )}
    </div>
  );
}
