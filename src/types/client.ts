export interface Client {
  id: string;
  companyName: string;
  logo: string;
  industry: string;
  size: string;
  website: string;
  memberSince: string;
  accountManager: {
    name: string;
    email: string;
    avatar: string;
    phone: string;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: "monthly" | "annual";
  status: "active" | "past_due" | "canceled" | "trialing";
  renewalDate: string;
  features: PlanFeature[];
  limits: PlanLimits;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
}

export interface PlanLimits {
  aiSystems: number;
  monthlyInteractions: number;
  storageGb: number;
  users: number;
  apiAccess: boolean;
  customReports: boolean;
  prioritySupport: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "overdue";
  pdfUrl: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface UsageStats {
  aiInteractions: { used: number; limit: number };
  storageUsed: { used: number; limit: number; unit: string };
  apiCalls: { used: number; limit: number };
  activeSystems: { used: number; limit: number };
}