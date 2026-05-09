import { Card, CardHeader, CardTitle } from "../ui/Card";
import { mockActivityFeed } from "../../lib/mock-data";
import { cn } from "../../lib/cn";
import { formatRelative } from "../../lib/formatters";
import { Zap, Cpu, FileText, MessageSquare, Award } from "lucide-react";

const iconMap = {
  automation: Zap,
  system: Cpu,
  report: FileText,
  ticket: MessageSquare,
  milestone: Award,
};

const statusColors = {
  success: "text-positive",
  info: "text-info",
  warning: "text-warning",
};

export function ActivityFeed() {
  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-surface-100">
        <CardHeader className="mb-0">
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
      </div>
      <div className="divide-y divide-surface-100">
        {mockActivityFeed.slice(0, 8).map((item) => {
          const Icon = iconMap[item.type];
          return (
            <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-50 transition-colors">
              <div className={cn("mt-0.5 p-2 rounded-lg bg-surface-100", statusColors[item.status])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 truncate">{item.title}</p>
                <p className="text-sm text-surface-500 truncate mt-0.5">{item.description}</p>
              </div>
              <span className="text-xs text-surface-400 whitespace-nowrap mt-1">
                {formatRelative(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}