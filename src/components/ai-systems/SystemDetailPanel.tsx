import type { AISystem } from "../../types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SystemHealthBadge } from "./SystemHealthBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { formatNumber, formatDate, formatRelative } from "../../lib/formatters";
import { Activity, Zap } from "lucide-react";

interface SystemDetailPanelProps {
  system: AISystem;
}

export function SystemDetailPanel({ system }: SystemDetailPanelProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-surface-900">{system.name}</h2>
              <SystemHealthBadge health={system.health} />
            </div>
            <p className="text-surface-500">{system.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-surface-400">
              <span>v{system.version}</span>
              <span>Installed {formatDate(system.installedDate)}</span>
              <span>Last active {formatRelative(system.lastActive)}</span>
            </div>
          </div>
          <Badge
            variant={
              system.status === "active" ? "success" :
              system.status === "maintenance" ? "warning" :
              system.status === "error" ? "danger" : "neutral"
            }
            dot
          >
            {system.status}
          </Badge>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Interactions", value: formatNumber(system.metrics.totalInteractions), icon: Activity },
          { label: "This Month", value: formatNumber(system.metrics.interactionsThisMonth), icon: Activity },
          { label: "Tasks Automated", value: formatNumber(system.metrics.tasksAutomated), icon: Zap },
          { label: "Hours Saved", value: formatNumber(system.metrics.hoursSaved), icon: Zap },
        ].map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="flex items-center gap-2 text-surface-400 mb-2">
              <stat.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-surface-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-surface-500 mb-4">Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-surface-500">Success Rate</span>
                <span className="text-surface-900 font-medium">{system.successRate}%</span>
              </div>
              <ProgressBar value={system.successRate} max={100} variant="success" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-surface-500">Uptime</span>
                <span className="text-surface-900 font-medium">{system.metrics.uptime}%</span>
              </div>
              <ProgressBar value={system.metrics.uptime} max={100} variant="brand" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-surface-500">Avg Response Time</span>
                <span className="text-surface-900 font-medium">{system.metrics.avgResponseTime}s</span>
              </div>
              <ProgressBar value={Math.max(0, 100 - (system.metrics.avgResponseTime / 10) * 100)} max={100} variant="warning" />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-surface-500 mb-4">Automations</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-surface-500">Active Automations</span>
                <span className="text-surface-900 font-medium">{system.automations}</span>
              </div>
            </div>
            {system.category === "lead-generation" && system.metrics.leadsGenerated > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-surface-500">Leads Generated</span>
                  <span className="text-surface-900 font-medium">{formatNumber(system.metrics.leadsGenerated)}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}