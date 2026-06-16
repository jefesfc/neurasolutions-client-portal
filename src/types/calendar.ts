export type EventCategory = 'meeting' | 'invoice' | 'contract' | 'reminder' | 'other';
export type EventStatus   = 'pending' | 'done' | 'cancelled';
export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  interval: number;
  until?: string;
}

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description: string | null;
  category: EventCategory;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  status: EventStatus;
  recurrence_rule: RecurrenceRule | null;
  linked_type: 'lead' | 'client' | null;
  linked_id: string | null;
  amount: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  category: EventCategory;
  start_at: string;
  end_at?: string;
  all_day?: boolean;
  recurrence_rule?: RecurrenceRule;
  linked_type?: 'lead' | 'client';
  linked_id?: string;
  amount?: number;
  currency?: string;
}

export const CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string }> = {
  meeting:  { label: 'Meeting',           color: '#6366f1' },
  invoice:  { label: 'Invoice / Payment', color: '#f59e0b' },
  contract: { label: 'Contract / Expiry', color: '#10b981' },
  reminder: { label: 'General Reminder',  color: '#64748b' },
  other:    { label: 'Other',             color: '#8b5cf6' },
};
