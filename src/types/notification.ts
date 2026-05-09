export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  read: boolean;
  timestamp: string;
  link?: string;
  category: "system" | "billing" | "report" | "ticket" | "general";
}