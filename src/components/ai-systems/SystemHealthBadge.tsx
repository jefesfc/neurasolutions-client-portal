import { cn } from "../../lib/cn";
import type { SystemHealth } from "../../types";
import { StatusDot } from "../shared/StatusDot";

const healthConfig: Record<SystemHealth, { label: string; color: "green" | "yellow" | "red" }> = {
  healthy: { label: "Healthy", color: "green" },
  degraded: { label: "Degraded", color: "yellow" },
  down: { label: "Down", color: "red" },
};

interface SystemHealthBadgeProps {
  health: SystemHealth;
  className?: string;
}

export function SystemHealthBadge({ health, className }: SystemHealthBadgeProps) {
  const config = healthConfig[health];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", className)}>
      <StatusDot color={config.color} pulse={health === "healthy"} />
      <span>{config.label}</span>
    </span>
  );
}