import { cn } from "../../lib/cn";

type StatusColor = "green" | "yellow" | "red" | "gray" | "blue";

interface StatusDotProps {
  color: StatusColor;
  pulse?: boolean;
  className?: string;
}

const colorMap: Record<StatusColor, string> = {
  green: "bg-positive",
  yellow: "bg-warning",
  red: "bg-danger",
  gray: "bg-slate-400",
  blue: "bg-info",
};

export function StatusDot({ color, pulse = false, className }: StatusDotProps) {
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)}>
      {pulse && (
        <span
          className={cn("absolute inset-0 rounded-full animate-ping opacity-75", colorMap[color])}
        />
      )}
      <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", colorMap[color])} />
    </span>
  );
}