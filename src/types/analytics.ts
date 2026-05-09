export interface KPI {
  id: string;
  label: string;
  value: number;
  change: number;
  changeType: "increase" | "decrease";
  icon: string;
  prefix?: string;
  suffix?: string;
  format?: "number" | "currency" | "percentage" | "duration";
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  description?: string;
  type: "line" | "bar" | "area" | "heatmap";
  color: string;
}

export interface TrendData {
  id: string;
  title: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  data: TimeSeriesDataPoint[];
  color: string;
}

export interface MetricComparison {
  id: string;
  label: string;
  currentPeriod: number;
  previousPeriod: number;
  changePercent: number;
  format?: "number" | "currency" | "percentage" | "duration";
}

export interface AnalyticsSummary {
  totalLeadsGenerated: number;
  totalHoursSaved: number;
  totalRevenueInfluenced: number;
  avgConversionImprovement: number;
  totalAIInteractions: number;
  automationRate: number;
  monthlyTrends: TrendData[];
  comparisons: MetricComparison[];
}