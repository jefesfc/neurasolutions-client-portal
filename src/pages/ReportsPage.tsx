import { useState } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { ReportCard } from "../components/reports/ReportCard";
import { ReportViewer } from "../components/reports/ReportViewer";
import { Tabs } from "../components/ui/Tabs";
import { mockReports } from "../lib/mock-data";
import type { Report } from "../types";

const tabs = [
  { id: "all",       label: "All",       count: mockReports.length },
  { id: "monthly",   label: "Monthly",   count: mockReports.filter((r) => r.type === "monthly").length },
  { id: "quarterly", label: "Quarterly", count: mockReports.filter((r) => r.type === "quarterly").length },
  { id: "annual",    label: "Annual",    count: mockReports.filter((r) => r.type === "annual").length },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const filtered =
    activeTab === "all"
      ? mockReports
      : mockReports.filter((r) => r.type === activeTab);

  return (
    <PageTransition>
      <PageHeader
        title="Reports"
        description="AI-generated performance reports and executive summaries"
      />
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((report) => (
          <ReportCard key={report.id} report={report} onOpen={setSelectedReport} />
        ))}
      </div>

      <ReportViewer report={selectedReport} onClose={() => setSelectedReport(null)} />
    </PageTransition>
  );
}
