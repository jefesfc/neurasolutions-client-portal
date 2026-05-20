import { useState } from "react";
import { Download } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { SearchInput } from "../components/shared/SearchInput";
import { formatRelative } from "../lib/formatters";
import { downloadContactsPDF } from "../lib/pdf";
import type { Contact } from "../types/aios";

export default function ContactsPage() {
  const { data: contacts, loading, error } = useQuery<Contact>("contacts", { order: "created_at.desc" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = contacts.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <PageTransition>
      <PageHeader
        title="CRM"
        description="Manage your customer relationships"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadContactsPDF(filtered, statusFilter, search)}
            disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        {/* Status filter */}
        <div className="flex gap-1 bg-surface-100 rounded-xl p-1 w-fit">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-white text-surface-900 shadow-sm"
                  : "text-surface-500 hover:text-surface-700"
              }`}
            >
              {s === "all" ? `All (${contacts.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${contacts.filter(c => c.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="max-w-sm w-full">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." />
        </div>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-surface-400">No contacts found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-4 py-3 font-medium text-surface-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Company</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filtered.map((contact) => (
                <tr key={contact.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-surface-900">{contact.name}</td>
                  <td className="px-4 py-3 text-surface-500">{contact.email}</td>
                  <td className="px-4 py-3 text-surface-600">{contact.company ?? "—"}</td>
                  <td className="px-4 py-3 text-surface-500">{contact.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={contact.status === "active" ? "success" : "neutral"} dot>
                      {contact.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-surface-400">{formatRelative(contact.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageTransition>
  );
}
