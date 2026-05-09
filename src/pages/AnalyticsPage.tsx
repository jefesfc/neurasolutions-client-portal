import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { TrendChart } from "../components/analytics/TrendChart";
import { BarChart } from "../components/analytics/BarChart";
import { MetricComparison } from "../components/analytics/MetricComparison";
import { Heatmap } from "../components/analytics/Heatmap";
import { mockTrends, mockComparisons, mockKPIs } from "../lib/mock-data";

const heatmapData = Array.from({ length: 168 }, () => {
  const dayIndex = Math.floor(Math.random() * 7);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    day: days[dayIndex],
    hour: Math.floor(Math.random() * 24),
    value: Math.floor(Math.random() * 500),
  };
});

const maxHeatmap = Math.max(...heatmapData.map((d) => d.value));

const systemPerformanceData = mockKPIs.slice(0, 5).map((kpi) => ({
  label: kpi.label,
  value: kpi.value,
}));

export default function AnalyticsPage() {
  return (
    <PageTransition>
      <PageHeader
        title="Analytics"
        description="Performance trends, metrics, and insights across your AI platform"
      />
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockTrends.slice(0, 2).map((trend) => (
            <TrendChart key={trend.id} trend={trend} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockTrends.slice(2, 4).map((trend) => (
            <TrendChart key={trend.id} trend={trend} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <BarChart title="System Performance Overview" data={systemPerformanceData} />
          </div>
          <MetricComparison comparisons={mockComparisons} />
        </div>
        <Heatmap title="Activity Heatmap" data={heatmapData} maxValue={maxHeatmap} />
      </div>
    </PageTransition>
  );
}