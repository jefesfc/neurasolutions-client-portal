import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import type { SubscriptionPlan, UsageStats } from "../../types";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { Check, Calendar, Zap, Database, Users, Cpu } from "lucide-react";

interface SubscriptionCardProps {
  subscription: SubscriptionPlan;
  usage: UsageStats;
}

export function SubscriptionCard({ subscription, usage }: SubscriptionCardProps) {
  const isAnnual = subscription.billingCycle === "annual";

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-surface-900">{subscription.name} Plan</h3>
            <Badge variant="success" dot>{subscription.status}</Badge>
          </div>
          <p className="text-surface-500 text-sm">Renews {formatDate(subscription.renewalDate)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-surface-900">{formatCurrency(subscription.price)}</p>
          <p className="text-sm text-surface-400">per {isAnnual ? "year" : "month"}</p>
        </div>
      </div>

      {/* Usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <Zap className="h-3.5 w-3.5" />
            AI Interactions
          </div>
          <ProgressBar
            value={usage.aiInteractions.used}
            max={usage.aiInteractions.limit}
            size="sm"
            showLabel
            labelFormat="fraction"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <Database className="h-3.5 w-3.5" />
            Storage
          </div>
          <ProgressBar
            value={usage.storageUsed.used}
            max={usage.storageUsed.limit}
            size="sm"
            variant="success"
            showLabel
            labelFormat="fraction"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <Cpu className="h-3.5 w-3.5" />
            Active Systems
          </div>
          <ProgressBar
            value={usage.activeSystems.used}
            max={usage.activeSystems.limit}
            size="sm"
            variant="brand"
            showLabel
            labelFormat="fraction"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <Users className="h-3.5 w-3.5" />
            Users
          </div>
          <ProgressBar
            value={18}
            max={subscription.limits.users}
            size="sm"
            variant="warning"
            showLabel
            labelFormat="fraction"
          />
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 gap-2 mb-4 pt-4 border-t border-surface-100">
        {subscription.features.slice(0, 6).map((f) => (
          <div key={f.id} className="flex items-center gap-2 text-sm">
            <Check className={f.included ? "h-4 w-4 text-positive" : "h-4 w-4 text-surface-300"} />
            <span className={f.included ? "text-surface-700" : "text-surface-400 line-through"}>{f.name}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-surface-100">
        <Button variant="outline" size="sm" className="flex-1">
          <Calendar className="h-4 w-4" /> Manage Plan
        </Button>
        <Button size="sm" className="flex-1">Upgrade to Enterprise</Button>
      </div>
    </Card>
  );
}