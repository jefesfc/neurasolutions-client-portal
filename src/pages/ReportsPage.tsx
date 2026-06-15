import { useCallback, useEffect, useState } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { useT, useTranslations } from "../i18n/useT";
import { ReportCard } from "../components/reports/ReportCard";
import { ReportViewer } from "../components/reports/ReportViewer";
import { Tabs } from "../components/ui/Tabs";
import { useAuthStore } from "../store/auth-store";
import type { Report } from "../types";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

export default function ReportsPage() {
  const t = useT();
  const T = useTranslations();

  const ALL_TABS = [
    { id: "all",       label: T.reports.tabAll       },
    { id: "monthly",   label: T.reports.tabMonthly   },
    { id: "quarterly", label: T.reports.tabQuarterly },
    { id: "roi",       label: T.reports.tabROI       },
    { id: "financial", label: T.reports.tabFinancial },
  ];
  const token = useAuthStore((s) => s.token);
  const [activeTab, setActiveTab] = useState("all");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetch(`${API_URL}/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json() as Promise<Report[]>)
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleOpen = useCallback(
    async (report: Report) => {
      setSelectedReport(report);
      if (!report.aiGeneratedNote) {
        try {
          const res = await fetch(`${API_URL}/reports/generate/${report.id}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json() as { aiGeneratedNote: string };
          setSelectedReport((prev) =>
            prev?.id === report.id ? { ...prev, aiGeneratedNote: data.aiGeneratedNote } : prev
          );
          setReports((prev) =>
            prev.map((r) => (r.id === report.id ? { ...r, aiGeneratedNote: data.aiGeneratedNote } : r))
          );
        } catch {
          // non-critical: viewer shows without AI note
        }
      }
    },
    [token]
  );

  const filtered =
    activeTab === "all"
      ? reports
      : reports.filter((r) => r.type === activeTab || r.category === activeTab);

  const tabs = ALL_TABS.map((t) => ({
    ...t,
    count: t.id === "all" ? reports.length : reports.filter((r) => r.type === t.id || r.category === t.id).length,
  }));

  return (
    <PageTransition>
      <PageHeader
        title={t('pages.reports.title')}
        description={t('pages.reports.desc')}
      />
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">{T.reports.generating}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} onOpen={handleOpen} />
          ))}
        </div>
      )}
      <ReportViewer report={selectedReport} onClose={() => setSelectedReport(null)} />
    </PageTransition>
  );
}
