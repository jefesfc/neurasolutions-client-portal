import { useState } from "react";
import { Download } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { useT, useTranslations } from "../i18n/useT";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { SearchInput } from "../components/shared/SearchInput";
import { formatRelative } from "../lib/formatters";
import { downloadLeadsPDF } from "../lib/pdf";
import type { Lead } from "../types/aios";
import { useAuthStore } from "../store/auth-store";
import { ClientModal } from "../components/clients/ClientModal";

type LeadStatus = Lead["status"] | "all";

const STATUS_BADGE_VARIANT: Record<Lead["status"], "default" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  new:       "info",
  contacted: "warning",
  qualified: "default",
  won:       "success",
  lost:      "danger",
};

export default function LeadsPage() {
  const t = useT();
  const T = useTranslations();
  const { data: leads, loading, error } = useQuery<Lead>("leads", { order: "created_at.desc" });
  const [activeStatus, setActiveStatus] = useState<LeadStatus>("all");

  const STATUS_TABS: { key: LeadStatus; label: string }[] = [
    { key: "all",       label: T.leads.statusAll       },
    { key: "new",       label: T.leads.statusNew       },
    { key: "contacted", label: T.leads.statusContacted },
    { key: "qualified", label: T.leads.statusQualified },
    { key: "won",       label: T.leads.statusWon       },
    { key: "lost",      label: T.leads.statusLost      },
  ];

  const STATUS_BADGE_LABEL: Record<Lead["status"], string> = {
    new:       T.leads.statusNew,
    contacted: T.leads.statusContacted,
    qualified: T.leads.statusQualified,
    won:       T.leads.statusWon,
    lost:      T.leads.statusLost,
  };

  const SOURCE_LABEL: Record<string, string> = {
    website:  T.leads.srcWebsite,
    linkedin: T.leads.srcLinkedin,
    referral: T.leads.srcReferral,
    ads:      T.leads.srcAds,
    other:    T.leads.srcOther,
  };
  const [search, setSearch] = useState("");
  const { user } = useAuthStore();
  const canConvert = user?.role !== 'user';
  const [convertingLead, setConvertingLead]   = useState<Lead | null>(null);
  const [convertedLeadId, setConvertedLeadId] = useState<string | null>(null);

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
        title={t('pages.leads.title')}
        description={t('pages.leads.desc')}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadLeadsPDF(filtered, activeStatus, search)}
            disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            {T.leads.exportPdf}
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeStatus === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${
              activeStatus === tab.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"
            }`}>
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T.leads.search} />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">{T.leads.notFound}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">{T.leads.colName}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{T.leads.colEmail}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{T.leads.colPhone}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{T.leads.colSource}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{T.leads.colStatus}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{T.leads.colScore}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{T.leads.colAdded}</th>
                {canConvert && <th className="text-left px-4 py-3 font-medium text-slate-500">{T.leads.colActions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((lead) => {
                return (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{lead.name}</td>
                    <td className="px-4 py-3 text-slate-500">{lead.email}</td>
                    <td className="px-4 py-3 text-slate-500">{lead.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{SOURCE_LABEL[lead.source] ?? lead.source}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANT[lead.status]} dot>{STATUS_BADGE_LABEL[lead.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-slate-500 text-xs">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatRelative(lead.created_at)}</td>
                    {canConvert && (
                      <td className="px-4 py-3">
                        {convertedLeadId === lead.id ? (
                          <span className="text-xs text-green-600 font-medium">{T.leads.converted}</span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConvertingLead(lead); }}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                              lead.status === 'won'
                                ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                                : 'border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                            }`}
                          >
                            {T.leads.convert}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {convertingLead && (
        <ClientModal
          isOpen={Boolean(convertingLead)}
          convertingFromLead={convertingLead}
          onSuccess={() => {
            const id = convertingLead.id;
            setConvertingLead(null);
            setConvertedLeadId(id);
            setTimeout(() => setConvertedLeadId(null), 2000);
          }}
          onClose={() => setConvertingLead(null)}
        />
      )}
    </PageTransition>
  );
}
