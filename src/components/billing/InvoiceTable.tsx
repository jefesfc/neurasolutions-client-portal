import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { DataTable } from "../shared/DataTable";
import type { Invoice } from "../../types";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { downloadInvoicePDF } from "../../lib/pdf";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

interface InvoiceTableProps {
  invoices: Invoice[];
}

const statusBadgeVariant: Record<string, "success" | "warning" | "danger"> = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
};

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const columns = [
    {
      key: "number",
      header: "Invoice",
      accessor: (inv: Invoice): ReactNode => (
        <span className="font-medium text-surface-900 font-mono text-xs">{inv.number}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      accessor: (inv: Invoice): ReactNode => formatDate(inv.date),
    },
    {
      key: "amount",
      header: "Amount",
      accessor: (inv: Invoice): ReactNode => (
        <span className="font-medium">{formatCurrency(inv.amount, inv.currency || "GBP")}</span>
      ),
      align: "right" as const,
    },
    {
      key: "status",
      header: "Status",
      accessor: (inv: Invoice): ReactNode => (
        <Badge variant={statusBadgeVariant[inv.status]} dot>{inv.status}</Badge>
      ),
    },
    {
      key: "action",
      header: "",
      accessor: (inv: Invoice): ReactNode => (
        <Button size="sm" variant="ghost" onClick={() => void downloadInvoicePDF(inv)}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      ),
      align: "right" as const,
    },
  ];

  return (
    <Card padding="none">
      <DataTable columns={columns} data={invoices} keyExtractor={(inv) => inv.id} />
    </Card>
  );
}