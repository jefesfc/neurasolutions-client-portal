export type SystemStatus = "active" | "inactive" | "maintenance" | "error";
export type SystemHealth = "healthy" | "degraded" | "down";
export type SystemCategory =
  | "lead-generation"
  | "customer-support"
  | "data-analysis"
  | "workflow-automation"
  | "content-creation"
  | "predictive-analytics"
  | "ai-assistant"
  | "voice-processing"
  | "security"
  | "email-automation"
  | "calendar"
  | "knowledge-retrieval";

export const SYSTEM_STATUS = {
  Active: "active",
  Inactive: "inactive",
  Maintenance: "maintenance",
  Error: "error",
} as const;

export const SYSTEM_HEALTH = {
  Healthy: "healthy",
  Degraded: "degraded",
  Down: "down",
} as const;

export interface AISystem {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  status: SystemStatus;
  health: SystemHealth;
  category: SystemCategory;
  icon: string;
  installedDate: string;
  lastActive: string;
  version: string;
  metrics: AISystemMetrics;
  automations: number;
  successRate: number;
}

export interface AISystemMetrics {
  totalInteractions: number;
  interactionsThisMonth: number;
  avgResponseTime: number;
  tasksAutomated: number;
  leadsGenerated: number;
  hoursSaved: number;
  uptime: number;
}

export interface SystemActivity {
  id: string;
  systemId: string;
  systemName: string;
  action: string;
  timestamp: string;
  status: "success" | "warning" | "error";
  details: string;
}