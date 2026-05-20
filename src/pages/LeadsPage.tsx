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
import { downloadLeadsPDF } from "../lib/pdf";
import type { Lead } from "../types/aios";

type LeadStatus = Lead["status"] | "all";

const STATUS_TABS: { key: LeadStatus; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "new",       label: "New"       },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "won",       label: "Won"       },
  { key: "lost",      label: "Lost"      },
];

const STATUS_BADGE: Record<Lead["status"], { variant: "default" | "success" | "warning" | "danger" | "info" | "neutral"; label: string }> = {
  new:       { variant: "info",    label: "New"       },
  contacted: { variant: "warning", label: "Contacted" },
  qualified: { variant: "default", label: "Qualified" },
  won:       { variant: "success", label: "Won"       },
  lost:      { variant: "danger",  label: "Lost"      },
};

const SOURCE_LABEL: Record<string, string> = {
  website:  "Website",
  linkedin: "LinkedIn",
  referral: "Referral",
  ads:      "Ads",
  other:    "Other",
};

export default function LeadsPage() {
  const { data: leads, loading, error } = useQuery<Lead>("leads", { order: "created_at.desc" });
  const [activeStatus, setActiveStatus] = useState<LeadStatus>("all");
  const [search, setSearch] = useState("");

  const filtered = leads.filter((l) => {
    const matchStatus = activeStatus === "all" || l.status === activeStatus;
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const countFor = (s: LeadStatus) =>
    s === "all" ? leads.length : leads.filter((l) => l.status === s).length;

  return (
    <PageTransition>
      <PageHeader
        title="Leads"
        description="Track and manage your sales pipeline"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadLeadsPDF(filtered, activeStatus, search)}
            disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 w-fit mb-5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeStatus === tab.key
                ? "bg-white text-surface-900 shadow-sm"
                : "text-surface-500 hover:text-surface-700"
            }`}
          >
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${
              activeStatus === tab.key ? "bg-brand-100 text-brand-700" : "bg-surface-200 text-surface-500"
            }`}>
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." />
      </div>

      {/* Table */}
      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-surface-400">No leads found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-4 py-3 font-medium text-surface-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Source</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Score</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filtered.map((lead) => {
                const badge = STATUS_BADGE[lead.status];
                return (
                  <tr key={lead.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-surface-900">{lead.name}</td>
                    <td className="px-4 py-3 text-surface-500">{lead.email}</td>
                    <td className="px-4 py-3 text-surface-500">{SOURCE_LABEL[lead.source] ?? lead.source}</td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant} dot>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-surface-100 rounded-full h-1.5">
                          <div
                            className="bg-brand-500 h-1.5 rounded-full"
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-surface-600 text-xs">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-surface-400">{formatRelative(lead.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PageTransition>
  );
}
