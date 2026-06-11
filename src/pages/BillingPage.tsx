import { useEffect, useState } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { SubscriptionCard } from "../components/billing/SubscriptionCard";
import { InvoiceTable } from "../components/billing/InvoiceTable";
import { TokenSpendingChart } from "../components/billing/TokenSpendingChart";
import { mockSubscription, mockInvoices } from "../lib/mock-data";
import { useAuthStore } from "../store/auth-store";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

interface SpendingEntry {
  name: string;
  value: number;
  color: string;
  model: string;
  company: string;
}

interface BillingStats {
  tokenSpending: SpendingEntry[];
  usage: {
    aiInteractions: { used: number; limit: number };
    totalTokens: number;
    totalCostGbp: number;
    activeAgents: number;
  };
}

export default function BillingPage() {
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState<BillingStats | null>(null);

  useEffect(() => {
    void fetch(`${API_URL}/billing/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json() as Promise<BillingStats>)
      .then(setStats)
      .catch(console.error);
  }, [token]);

  const tokenSpending: SpendingEntry[] = stats?.tokenSpending ?? [];

  const usageStats = stats
    ? {
        aiInteractions: stats.usage.aiInteractions,
        storageUsed: { used: 18, limit: 100, unit: "GB" },
        apiCalls: { used: stats.usage.totalTokens, limit: 500000 },
        activeSystems: { used: Math.max(stats.usage.activeAgents, 3), limit: 5 },
      }
    : {
        aiInteractions: { used: 0, limit: 50000 },
        storageUsed: { used: 18, limit: 100, unit: "GB" },
        apiCalls: { used: 0, limit: 500000 },
        activeSystems: { used: 3, limit: 5 },
      };

  return (
    <PageTransition>
      <PageHeader
        title="Billing"
        description="Subscription details, AI token spend, and invoice history"
      />
      <div className="space-y-6">
        <SubscriptionCard subscription={mockSubscription} usage={usageStats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <TokenSpendingChart data={tokenSpending} />
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Invoice History</h2>
            <InvoiceTable invoices={mockInvoices} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
