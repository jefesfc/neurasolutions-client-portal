import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Sparkles, CheckCircle2, Calendar, Tag, FileText } from "lucide-react";
import { Button } from "../ui/Button";
import type { Report } from "../../types";
import { downloadReportPDF } from "../../lib/pdf";

interface ReportViewerProps {
  report: Report | null;
  onClose: () => void;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  monthly:   { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200" },
  quarterly: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"  },
  annual:    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  executive: { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200" },
};

const CATEGORY_LABELS: Record<string, string> = {
  performance: "Performance",
  financial:   "Financial",
  automation:  "Automation",
  roi:         "ROI Analysis",
  executive:   "Executive",
};

function extractMetric(highlight: string): { value: string; label: string } | null {
  const m = highlight.match(/^(\$?[\d,]+(?:\.\d+)?[KkMmBb%]?)\s+(.+)$/);
  if (!m) return null;
  return { value: m[1], label: m[2] };
}

export function ReportViewer({ report, onClose }: ReportViewerProps) {
  const [downloading, setDownloading] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (report) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [report, handleKeyDown]);

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    await new Promise((r) => setTimeout(r, 50));
    await downloadReportPDF(report);
    setDownloading(false);
  };

  const genDate = report
    ? new Date(report.generatedAt).toLocaleDateString("en-GB", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "";

  const typeStyle = report ? (TYPE_STYLES[report.type] ?? TYPE_STYLES.monthly) : TYPE_STYLES.monthly;

  const metrics = report
    ? report.highlights.map(extractMetric).filter(Boolean) as { value: string; label: string }[]
    : [];
  const bullets = report
    ? report.highlights.filter((h) => !extractMetric(h))
    : [];

  return (
    <AnimatePresence>
      {report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* ── Top action bar ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-700">NeuraSolutions AIOS</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                  {report.type} Report
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  loading={downloading}
                  onClick={handleDownload}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Scrollable content ── */}
            <div className="overflow-y-auto flex-1">
              {/* Cover */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-8 pt-8 pb-10 text-white">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                    {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-white">
                    {CATEGORY_LABELS[report.category] ?? report.category}
                  </span>
                </div>
                <h1 className="text-2xl font-bold leading-tight mb-3">{report.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-indigo-200 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {report.period}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4" />
                    Generated {genDate}
                  </span>
                  <span className="text-indigo-300">{report.size}</span>
                </div>
              </div>

              {/* Body */}
              <div className="px-8 py-7 space-y-7">

                {/* Executive Summary */}
                <section>
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Executive Summary
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{report.summary}</p>
                </section>

                {/* Key Metrics (parsed highlights with numbers) */}
                {metrics.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                      Key Metrics
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {metrics.map((m, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                        >
                          <p className="text-xl font-bold text-indigo-600 tabular-nums leading-tight">
                            {m.value}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-tight capitalize">
                            {m.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Key Highlights (non-numeric bullets) */}
                {bullets.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                      Key Highlights
                    </h2>
                    <ul className="space-y-2">
                      {bullets.map((h, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-600">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* All highlights as bullets if none were parsed as metrics */}
                {metrics.length === 0 && bullets.length === 0 && report.highlights.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                      Key Highlights
                    </h2>
                    <ul className="space-y-2">
                      {report.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-600">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* AI Strategic Insight */}
                <section>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                        AI Strategic Insight
                      </span>
                    </div>
                    <p className="text-sm text-indigo-700 leading-relaxed">
                      {report.aiGeneratedNote}
                    </p>
                  </div>
                </section>

              </div>

              {/* Footer */}
              <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                <p className="text-xs text-slate-400">
                  Generated by NeuraSolutions AIOS · {genDate}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  loading={downloading}
                  onClick={handleDownload}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
