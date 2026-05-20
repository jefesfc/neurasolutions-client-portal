import { useState } from "react";
import { FileText, Download, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import type { Report } from "../../types";
import { formatDate } from "../../lib/formatters";
import { downloadReportPDF } from "../../lib/pdf";

const typeBadges: Record<string, "default" | "success" | "info" | "warning"> = {
  monthly: "info",
  quarterly: "warning",
  annual: "success",
  executive: "default",
};

const categoryLabels: Record<string, string> = {
  performance: "Performance",
  financial: "Financial",
  automation: "Automation",
  roi: "ROI Analysis",
};

interface ReportCardProps {
  report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 50));
    downloadReportPDF(report);
    setLoading(false);
  };

  return (
    <Card hover className="flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <FileText className="h-5 w-5 text-brand-600" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={typeBadges[report.type]}>{report.type}</Badge>
          <Badge variant="neutral">{categoryLabels[report.category]}</Badge>
        </div>
      </div>

      <h3 className="text-base font-semibold text-surface-900 mb-1">{report.title}</h3>
      <p className="text-sm text-surface-500 line-clamp-2 mb-3">{report.summary}</p>

      {/* Highlights */}
      {report.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {report.highlights.map((h, i) => (
            <span key={i} className="text-xs bg-surface-50 text-surface-600 px-2 py-1 rounded-md">
              {h}
            </span>
          ))}
        </div>
      )}

      {/* AI Note */}
      <div className="bg-brand-50/50 rounded-xl p-3 mb-4 flex gap-2">
        <Sparkles className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-700 line-clamp-3">{report.aiGeneratedNote}</p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface-100">
        <div className="text-xs text-surface-400">
          <span>{formatDate(report.generatedAt)}</span>
          <span className="mx-2">·</span>
          <span>{report.size}</span>
        </div>
        <Button size="sm" variant="outline" loading={loading} onClick={handleDownload}>
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </Button>
      </div>
    </Card>
  );
}