import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { SubscriptionCard } from "../components/billing/SubscriptionCard";
import { InvoiceTable } from "../components/billing/InvoiceTable";
import { mockSubscription, mockInvoices, mockUsageStats } from "../lib/mock-data";

export default function BillingPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Billing"
        description="Manage your subscription and view invoice history"
      />
      <div className="space-y-6">
        <SubscriptionCard subscription={mockSubscription} usage={mockUsageStats} />
        <div>
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Invoice History</h2>
          <InvoiceTable invoices={mockInvoices} />
        </div>
      </div>
    </PageTransition>
  );
}