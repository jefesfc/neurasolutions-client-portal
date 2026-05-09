import type { KPI } from "./analytics";
import type { AISystem, SystemActivity } from "./ai-system";
import type { Notification } from "./notification";

export interface DashboardData {
  kpis: KPI[];
  recentActivity: SystemActivity[];
  systems: AISystem[];
  notifications: Notification[];
  welcomeMessage: string;
}

export interface ActivityFeedItem {
  id: string;
  type: "automation" | "system" | "report" | "ticket" | "milestone";
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "info" | "warning";
  metadata?: Record<string, string>;
}