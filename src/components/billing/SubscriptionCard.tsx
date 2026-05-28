import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import type { SubscriptionPlan, UsageStats } from "../../types";
import { formatDate } from "../../lib/formatters";
import { Check, Calendar, Zap, Database, Users, Cpu, Sparkles } from "lucide-react";

interface SubscriptionCardProps {
  subscription: SubscriptionPlan;
  usage: UsageStats;
}

function fmt(value: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SubscriptionCard({ subscription, usage }: SubscriptionCardProps) {
  const currency = subscription.currency ?? "GBP";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Plan overview */}
      <Card className="lg:col-span-2">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-brand-500" />
              <h3 className="text-lg font-semibold text-surface-900">{subscription.name} Plan</h3>
              <Badge variant="success" dot>{subscription.status}</Badge>
            </div>
            <p className="text-surface-500 text-sm">Next invoice {formatDate(subscription.renewalDate)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-surface-900">{fmt(subscription.price, currency)}</p>
            <p className="text-sm text-surface-400">per month</p>
          </div>
        </div>

        {/* Setup fee callout */}
        {subscription.setupFee && (
          <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 mb-5">
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-800">One-time Setup & Development</p>
              <p className="text-xs text-brand-600">Full AIOS platform build, configuration and deployment</p>
            </div>
            <p className="text-lg font-bold text-brand-700">{fmt(subscription.setupFee, currency)}</p>
          </div>
        )}

        {/* Usage bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-surface-500">
              <Zap className="h-3.5 w-3.5" />
              AI Interactions
            </div>
            <ProgressBar value={usage.aiInteractions.used} max={usage.aiInteractions.limit} size="sm" showLabel labelFormat="fraction" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-surface-500">
              <Database className="h-3.5 w-3.5" />
              Storage
            </div>
            <ProgressBar value={usage.storageUsed.used} max={usage.storageUsed.limit} size="sm" variant="success" showLabel labelFormat="fraction" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-surface-500">
              <Cpu className="h-3.5 w-3.5" />
              Active Systems
            </div>
            <ProgressBar value={usage.activeSystems.used} max={usage.activeSystems.limit} size="sm" variant="brand" showLabel labelFormat="fraction" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-surface-500">
              <Users className="h-3.5 w-3.5" />
              Users
            </div>
            <ProgressBar value={3} max={subscription.limits.users} size="sm" variant="warning" showLabel labelFormat="fraction" />
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-surface-100 mb-4">
          {subscription.features.map((f) => (
            <div key={f.id} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-positive flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-surface-700 font-medium">{f.name}</span>
                <p className="text-xs text-surface-400 leading-tight">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-surface-100">
          <Button variant="outline" size="sm" className="flex-1">
            <Calendar className="h-4 w-4" /> View Schedule
          </Button>
          <Button size="sm" className="flex-1">Contact NeuraSolutions</Button>
        </div>
      </Card>

      {/* Cost summary card */}
      <Card>
        <h3 className="text-sm font-semibold text-surface-900 mb-4">Cost Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Monthly maintenance</span>
            <span className="font-semibold text-surface-900">{fmt(subscription.price, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Annual (×12)</span>
            <span className="font-medium text-surface-700">{fmt(subscription.price * 12, currency)}</span>
          </div>
          {subscription.setupFee && (
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Setup fee (one-time)</span>
              <span className="font-medium text-surface-700">{fmt(subscription.setupFee, currency)}</span>
            </div>
          )}
          <div className="border-t border-surface-100 pt-3">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-surface-700">First-year total</span>
              <span className="text-surface-900">{fmt((subscription.price * 12) + (subscription.setupFee ?? 0), currency)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-surface-100 space-y-2">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">Plan includes</p>
          <div className="flex justify-between text-xs text-surface-600">
            <span>AI interactions / mo</span>
            <span className="font-medium">{(subscription.limits.monthlyInteractions / 1000).toFixed(0)}K</span>
          </div>
          <div className="flex justify-between text-xs text-surface-600">
            <span>Users</span>
            <span className="font-medium">Up to {subscription.limits.users}</span>
          </div>
          <div className="flex justify-between text-xs text-surface-600">
            <span>Storage</span>
            <span className="font-medium">{subscription.limits.storageGb} GB</span>
          </div>
          <div className="flex justify-between text-xs text-surface-600">
            <span>Priority support</span>
            <span className="font-medium text-positive">✓ Included</span>
          </div>
          <div className="flex justify-between text-xs text-surface-600">
            <span>Custom reports</span>
            <span className="font-medium text-positive">✓ Included</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
