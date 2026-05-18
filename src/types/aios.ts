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
