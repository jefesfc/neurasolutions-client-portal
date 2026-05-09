import type { Priority } from "./common";

export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketCategory = "technical" | "billing" | "general" | "feature-request";

export const TICKET_STATUS = {
  Open: "open",
  InProgress: "in_progress",
  Waiting: "waiting",
  Resolved: "resolved",
  Closed: "closed",
} as const;

export const TICKET_CATEGORY = {
  Technical: "technical",
  Billing: "billing",
  General: "general",
  FeatureRequest: "feature-request",
} as const;

export interface SupportTicket {
  id: string;
  number: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category: TicketCategory;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  sender: "client" | "support";
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  url: string;
  type: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: TicketCategory;
}

export interface ChatMessage {
  id: string;
  sender: "client" | "support";
  content: string;
  timestamp: string;
}