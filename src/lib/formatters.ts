import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export function formatDuration(hours: number): string {
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k hrs`;
  if (hours >= 1) return `${hours.toFixed(0)} hrs`;
  return `${(hours * 60).toFixed(0)} min`;
}

export function formatDate(dateStr: string, fmt = "MMM d, yyyy"): string {
  return format(parseISO(dateStr), fmt);
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy h:mm a");
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function formatKPIValue(
  value: number,
  format?: "number" | "currency" | "percentage" | "duration"
): string {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "duration":
      return formatDuration(value);
    default:
      return formatNumber(value);
  }
}
