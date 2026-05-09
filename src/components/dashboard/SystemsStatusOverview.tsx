import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { StatusDot } from "../shared/StatusDot";
import { ProgressBar } from "../ui/ProgressBar";
import { mockAISystems } from "../../lib/mock-data";
import { cn } from "../../lib/cn";

const healthColorMap: Record<string, "green" | "yellow" | "red" | "gray"> = {
  healthy: "green",
  degraded: "yellow",
  down: "red",
};

export function SystemsStatusOverview() {
  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <CardHeader className="mb-0">
          <CardTitle>AI Systems</CardTitle>
        </CardHeader>
        <Link to="/systems" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
          View all
        </Link>
      </div>
      <div className="divide-y divide-surface-100">
        {mockAISystems.map((sys) => (
          <Link
            key={sys.id}
            to={`/systems/${sys.id}`}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-50 transition-colors"
          >
            <StatusDot
              color={healthColorMap[sys.health] ?? "gray"}
              pulse={sys.status === "active"}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">{sys.name}</p>
              <p className="text-xs text-surface-500 truncate">{sys.shortDescription}</p>
            </div>
            <div className="hidden sm:block w-32">
              <ProgressBar
                value={sys.metrics.uptime}
                max={100}
                size="sm"
                variant={sys.health === "healthy" ? "success" : "warning"}
              />
            </div>
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full",
                sys.status === "active" && "bg-emerald-50 text-emerald-700",
                sys.status === "maintenance" && "bg-amber-50 text-amber-700",
                sys.status === "inactive" && "bg-surface-100 text-surface-500",
                sys.status === "error" && "bg-red-50 text-red-700"
              )}
            >
              {sys.status}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}