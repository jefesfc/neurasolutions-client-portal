import { StatCard } from "../shared/StatCard";
import { mockKPIs } from "../../lib/mock-data";

export function KPICardGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {mockKPIs.map((kpi) => (
        <StatCard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
}