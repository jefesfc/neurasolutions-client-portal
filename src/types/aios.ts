export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string | null;
  source: 'website' | 'linkedin' | 'referral' | 'ads' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
  score: number;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export type ClientStage = 'admission' | 'investigation' | 'follow_up' | 'discharge' | 'active';

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string;
  industry: string | null;
  website: string | null;
  contract_value: number | null;
  status: 'active' | 'inactive' | 'churned';
  stage: ClientStage | null;
  notes: string | null;
  assigned_to: string | null;
  address: string | null;
  next_renewal_at: string | null;
  converted_from_lead_id: string | null;
  admission_date: string | null;
  admission_notes: string | null;
  investigation_date: string | null;
  investigation_notes: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  discharge_date: string | null;
  discharge_notes: string | null;
  treatments: string[] | null;
  membership_tier: 'silver' | 'gold' | 'platinum' | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  avatar: string | null;
  phone: string | null;
  is_active: boolean;
  created_at?: string;
  section_permissions?: string[];
}

export interface Email {
  id: string;
  tenant_id: string;
  gmail_id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  labels: string[];
  is_read: boolean;
  received_at: string;
  created_at: string;
}

export interface TokenUsage {
  id: string;
  tenant_id: string;
  agent_name: string;
  tokens_in: number;
  tokens_out: number;
  model: string;
  cost: number;
  created_at: string;
}
