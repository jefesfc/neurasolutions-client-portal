export type ReportType = "monthly" | "quarterly" | "annual" | "executive";
export type ReportCategory = "performance" | "financial" | "automation" | "roi" | "executive";

export const REPORT_TYPE = {
  Monthly: "monthly",
  Quarterly: "quarterly",
  Annual: "annual",
  Executive: "executive",
} as const;

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  category: ReportCategory;
  period: string;
  generatedAt: string;
  size: string;
  pdfUrl: string;
  summary: string;
  highlights: string[];
  aiGeneratedNote: string;
  coverImage?: string;
}

export interface ExecutiveSummary {
  id: string;
  reportId: string;
  title: string;
  period: string;
  keyFindings: string[];
  recommendations: string[];
  roiStatement: string;
  performanceVsTarget: number;
}