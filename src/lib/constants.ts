export const BRAND = {
  name: "NeuraSolutions",
  portalName: "Client Portal",
  tagline: "AI Infrastructure for Modern Business",
} as const;

export const CHART_COLORS = {
  primary: "#6366f1",
  secondary: "#818cf8",
  tertiary: "#a5b4fc",
  positive: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  slate: "#64748b",
  palette: ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6"],
} as const;

export const STATUS_COLORS: Record<string, string> = {
  active: "bg-positive/10 text-positive border-positive/20",
  inactive: "bg-surface-300/20 text-surface-400 border-surface-300/30",
  maintenance: "bg-warning/10 text-warning border-warning/20",
  error: "bg-danger/10 text-danger border-danger/20",
  pending: "bg-surface-300/20 text-surface-500 border-surface-300/30",
  completed: "bg-info/10 text-info border-info/20",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-surface-200 text-surface-600",
  medium: "bg-warning/10 text-warning",
  high: "bg-danger/10 text-danger",
  critical: "bg-danger text-white",
};

export const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-positive",
  degraded: "bg-warning",
  down: "bg-danger",
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;
