import { useState } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import type { SubscriptionPlan, UsageStats } from "../../types";
import { formatDate } from "../../lib/formatters";
import { Check, Calendar, Zap, Database, Users, Cpu, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

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

const CONNECTED_SYSTEMS = [
  { name: "Web AI Chat",        status: "active" },
  { name: "Telegram Bot",       status: "active" },
  { name: "Voice (Whisper)",    status: "active" },
  { name: "Gmail Sync",         status: "active" },
  { name: "Calendar",           status: "active" },
  { name: "n8n Automation",     status: "active" },
  { name: "Security Monitor",   status: "active" },
];

function generatePaymentSchedule(price: number, currency: string): { label: string; amount: string; isNext: boolean }[] {
  const rows = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i + 1, 28);
    rows.push({
      label: d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      amount: fmt(price, currency),
      isNext: i === 0,
    });
  }
  return rows;
}

export function SubscriptionCard({ subscription, usage }: SubscriptionCardProps) {
  const [showSchedule, setShowSchedule] = useState(false);
  const currency = subscription.currency ?? "GBP";
  const schedule = generatePaymentSchedule(subscription.price, currency);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Plan overview */}
      <Card className="lg:col-span-2">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-brand-500" />
              <h3 className="text-lg font-semibold text-slate-800">{subscription.name} Plan</h3>
              <Badge variant="success" dot>{subscription.status}</Badge>
            </div>
            <p className="text-slate-500 text-sm">Next invoice {formatDate(subscription.renewalDate)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-800">{fmt(subscription.price, currency)}</p>
            <p className="text-sm text-slate-400">per month</p>
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
          {[
            { icon: Zap,      label: "AI Interactions",  value: usage.aiInteractions.used,  max: usage.aiInteractions.limit,  variant: "brand"   as const },
            { icon: Database, label: "Storage",          value: usage.storageUsed.used,     max: usage.storageUsed.limit,     variant: "success" as const, unit: "GB" },
            { icon: Cpu,      label: "Active Systems",   value: usage.activeSystems.used,   max: usage.activeSystems.limit,   variant: "brand"   as const },
            { icon: Users,    label: "Users",            value: 3,                          max: subscription.limits.users,   variant: "warning" as const },
          ].map(({ icon: Icon, label, value, max, variant, unit }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
                <span className="text-xs font-medium text-slate-600 tabular-nums">
                  {value.toLocaleString()}{unit ? ` ${unit}` : ""} / {max.toLocaleString()}{unit ? ` ${unit}` : ""}
                </span>
              </div>
              <ProgressBar value={value} max={max} size="sm" variant={variant} />
            </div>
          ))}
        </div>

        {/* Connected Systems */}
        <div className="mb-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2.5">Connected Systems</p>
          <div className="flex flex-wrap gap-1.5">
            {CONNECTED_SYSTEMS.map((s) => (
              <span
                key={s.name}
                className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 font-medium"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-slate-100 mb-4">
          {subscription.features.map((f) => (
            <div key={f.id} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-positive flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-700 font-medium">{f.name}</span>
                <p className="text-xs text-slate-400 leading-tight">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowSchedule((v) => !v)}
          >
            <Calendar className="h-4 w-4" />
            {showSchedule ? "Hide Schedule" : "View Schedule"}
            {showSchedule ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </Button>
          <Button size="sm" className="flex-1">Contact NeuraSolutions</Button>
        </div>

        {/* Payment schedule (toggle) */}
        {showSchedule && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Payment Schedule — Next 12 months</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {schedule.map((row) => (
                <div
                  key={row.label}
                  className={`flex justify-between items-center text-xs px-2.5 py-1.5 rounded-lg ${
                    row.isNext
                      ? "bg-brand-50 border border-brand-200 font-semibold text-brand-700"
                      : "bg-slate-50 text-slate-600"
                  }`}
                >
                  <span>{row.label}</span>
                  <span className="font-medium">{row.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Cost summary card */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Cost Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Monthly maintenance</span>
            <span className="font-semibold text-slate-800">{fmt(subscription.price, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Contract term / Annual (×12 month)</span>
            <span className="font-medium text-slate-700">{fmt(subscription.price * 12, currency)}</span>
          </div>
          {subscription.setupFee && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Setup fee (one-time)</span>
              <span className="font-medium text-slate-700">{fmt(subscription.setupFee, currency)}</span>
            </div>
          )}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-700">First-year total</span>
              <span className="text-slate-800">
                {fmt((subscription.price * 12) + (subscription.setupFee ?? 0), currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Plan includes</p>
          <div className="flex justify-between text-xs text-slate-600">
            <span>AI interactions / mo</span>
            <span className="font-medium">{(subscription.limits.monthlyInteractions / 1000).toFixed(0)}K</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Users</span>
            <span className="font-medium">Up to {subscription.limits.users}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Storage</span>
            <span className="font-medium">{subscription.limits.storageGb} GB</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Priority support</span>
            <span className="font-medium text-positive">✓ Included</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Custom reports</span>
            <span className="font-medium text-positive">✓ Included</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
