export type Status = "active" | "inactive" | "pending" | "completed" | "error";
export type Priority = "low" | "medium" | "high" | "critical";
export type Size = "sm" | "md" | "lg";

export const STATUS = {
  Active: "active",
  Inactive: "inactive",
  Pending: "pending",
  Completed: "completed",
  Error: "error",
} as const;

export const PRIORITY = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Critical: "critical",
} as const;

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}