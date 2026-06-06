import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-brand-500/10 text-brand-400 border-brand-500/25",
  success: "bg-positive/10 text-positive border-positive/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger:  "bg-danger/10 text-danger border-danger/25",
  info:    "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-brand-400",
  success: "bg-positive",
  warning: "bg-warning",
  danger:  "bg-danger",
  info:    "bg-cyan-400",
  neutral: "bg-slate-400",
};

export function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
