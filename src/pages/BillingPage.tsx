import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { SubscriptionCard } from "../components/billing/SubscriptionCard";
import { InvoiceTable } from "../components/billing/InvoiceTable";
import { TokenSpendingChart } from "../components/billing/TokenSpendingChart";
import { mockSubscription, mockInvoices, mockUsageStats, mockTokenSpending } from "../lib/mock-data";

export default function BillingPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Billing"
        description="Subscription details, AI token spend, and invoice history"
      />
      <div className="space-y-6">
        <SubscriptionCard subscription={mockSubscription} usage={mockUsageStats} />

        {/* Token spending row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <TokenSpendingChart data={mockTokenSpending} />
          </div>
          <div className="lg:col-span-2">
            <div className="h-full">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Invoice History</h2>
              <InvoiceTable invoices={mockInvoices} />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
