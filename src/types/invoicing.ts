export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface ClientInvoice {
  id: string;
  tenant_id: string;
  client_id: string | null;
  client_name?: string;
  client_company?: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  description: string | null;
  issued_at: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoicingSummary {
  total_invoices: string;
  total_collected: string;
  total_pending: string;
  total_overdue: string;
  paid_count: string;
  pending_count: string;
  overdue_count: string;
}

export interface ProjectionData {
  monthly_revenue: Array<{ month: string; revenue: string }>;
  active_clients: Array<{ name: string; company: string; contract_value: string; next_renewal_at: string | null; status: string }>;
  mrr: number;
  arr: number;
}

export const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  paid:      { label: 'Paid',      color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  overdue:   { label: 'Overdue',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};
