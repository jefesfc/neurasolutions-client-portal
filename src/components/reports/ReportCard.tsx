import { useState } from "react";
import { FileText, Download, Eye, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import type { Report } from "../../types";
import { formatDate } from "../../lib/formatters";
import { downloadReportPDF } from "../../lib/pdf";

const typeBadges: Record<string, "default" | "success" | "info" | "warning"> = {
  monthly:   "info",
  quarterly: "warning",
  annual:    "success",
  executive: "default",
};

const categoryLabels: Record<string, string> = {
  performance: "Performance",
  financial:   "Financial",
  automation:  "Automation",
  roi:         "ROI Analysis",
};

interface ReportCardProps {
  report: Report;
  onOpen: (report: Report) => void;
}

export function ReportCard({ report, onOpen }: ReportCardProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    await new Promise((r) => setTimeout(r, 50));
    await downloadReportPDF(report);
    setDownloading(false);
  };

  return (
    <Card
      hover
      className="flex flex-col cursor-pointer group"
      onClick={() => onOpen(report)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl bg-brand-500/10 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
          <FileText className="h-5 w-5 text-brand-400" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={typeBadges[report.type]}>{report.type}</Badge>
          <Badge variant="neutral">{categoryLabels[report.category]}</Badge>
        </div>
      </div>

      <h3 className="text-base font-semibold text-slate-800 mb-1 group-hover:text-brand-600 transition-colors">
        {report.title}
      </h3>
      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{report.summary}</p>

      {/* Highlights */}
      {report.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {report.highlights.slice(0, 3).map((h, i) => (
            <span
              key={i}
              className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200"
            >
              {h}
            </span>
          ))}
          {report.highlights.length > 3 && (
            <span className="text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded-md border border-slate-200">
              +{report.highlights.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* AI Note */}
      <div className="bg-brand-500/8 border border-brand-500/15 rounded-xl p-3 mb-4 flex gap-2">
        <Sparkles className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-600 line-clamp-2">{report.aiGeneratedNote}</p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          <span>{formatDate(report.generatedAt)}</span>
          <span className="mx-2">·</span>
          <span>{report.size}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "..." : "PDF"}
          </button>
          <span className="flex items-center gap-1 text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200 group-hover:bg-brand-100 transition-colors">
            <Eye className="h-3.5 w-3.5" />
            View
          </span>
        </div>
      </div>
    </Card>
  );
}
