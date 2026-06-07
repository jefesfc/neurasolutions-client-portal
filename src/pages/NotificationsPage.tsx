import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle,
  ShieldCheck, CreditCard, FileText, Ticket, Cpu, ArrowRight,
} from "lucide-react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { useNotificationStore } from "../store/notification-store";
import { cn } from "../lib/cn";
import type { Notification, NotificationType } from "../types/notification";
import { ROUTES } from "../config/routes";

// ── Icon maps ────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  info:    Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error:   XCircle,
};

const TYPE_STYLE: Record<NotificationType, string> = {
  info:    "text-blue-600 bg-blue-50 border-blue-100",
  success: "text-emerald-600 bg-emerald-50 border-emerald-100",
  warning: "text-amber-600 bg-amber-50 border-amber-100",
  error:   "text-red-600 bg-red-50 border-red-100",
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  system:  Cpu,
  billing: CreditCard,
  report:  FileText,
  ticket:  Ticket,
  general: Bell,
};

const CATEGORY_LINK: Record<string, string> = {
  system:  ROUTES.AISystems,
  billing: ROUTES.Billing,
  report:  ROUTES.Reports,
  ticket:  ROUTES.Support,
  general: ROUTES.Dashboard,
};

const CATEGORY_LABEL: Record<string, string> = {
  system:  "AI Systems",
  billing: "Billing",
  report:  "Reports",
  ticket:  "Support",
  general: "General",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function groupByDate(notifications: Notification[]): [string, Notification[]][] {
  const groups = new Map<string, Notification[]>();
  for (const n of notifications) {
    const key = formatDate(n.timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }
  return Array.from(groups.entries());
}

// ── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "unread" | "security" | "billing" | "system";

const TABS: { id: FilterTab; label: string; icon: React.ElementType }[] = [
  { id: "all",      label: "All",      icon: Bell         },
  { id: "unread",   label: "Unread",   icon: Info         },
  { id: "security", label: "Security", icon: ShieldCheck  },
  { id: "billing",  label: "Billing",  icon: CreditCard   },
  { id: "system",   label: "Systems",  icon: Cpu          },
];

// ── NotificationRow ──────────────────────────────────────────────────────────

function NotificationRow({ n, onClick }: { n: Notification; onClick: () => void }) {
  const Icon       = TYPE_ICON[n.type];
  const CatIcon    = CATEGORY_ICON[n.category] ?? Bell;
  const catLink    = n.link ?? CATEGORY_LINK[n.category] ?? "/";
  const catLabel   = CATEGORY_LABEL[n.category] ?? n.category;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors border-b border-slate-100 last:border-0 group",
        !n.read ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-slate-50"
      )}
    >
      {/* type icon */}
      <div className={cn("mt-0.5 p-2 rounded-xl border flex-shrink-0", TYPE_STYLE[n.type])}>
        <Icon className="h-4 w-4" />
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn("text-sm font-semibold truncate", n.read ? "text-slate-600" : "text-slate-800")}>
            {n.title}
          </p>
          {!n.read && <span className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />}
        </div>
        <p className="text-sm text-slate-500 line-clamp-2 mb-2">{n.description}</p>

        {/* module link chip */}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg group-hover:bg-indigo-100 transition-colors">
          <CatIcon className="h-3 w-3" />
          {catLabel}
          <ArrowRight className="h-3 w-3 opacity-60" />
        </span>

        {/* target path hint */}
        <span className="ml-2 text-[10px] text-slate-400">{catLink}</span>
      </div>

      <span className="text-xs text-slate-400 whitespace-nowrap mt-1 flex-shrink-0">
        {timeAgo(n.timestamp)}
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const navigate = useNavigate();

  function handleClick(n: Notification) {
    if (!n.read) markAsRead(n.id);
    const target = n.link ?? CATEGORY_LINK[n.category] ?? "/";
    navigate(target);
  }

  const filtered = notifications.filter(n => {
    if (activeTab === "all")      return true;
    if (activeTab === "unread")   return !n.read;
    if (activeTab === "security") return n.type === "error" || n.type === "warning";
    if (activeTab === "billing")  return n.category === "billing";
    if (activeTab === "system")   return n.category === "system";
    return true;
  });

  const grouped = groupByDate(filtered);

  return (
    <PageTransition>
      <PageHeader
        title="Notifications"
        description="All alerts, system events, and updates in one place"
      />

      {/* Tabs + action */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {TABS.map(tab => {
            const count = tab.id === "unread"
              ? unreadCount
              : tab.id === "all"
              ? notifications.length
              : notifications.filter(n => {
                  if (tab.id === "security") return n.type === "error" || n.type === "warning";
                  return n.category === tab.id;
                }).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    activeTab === tab.id ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-slate-400 gap-3">
          <Bell className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No notifications here</p>
          <p className="text-xs text-slate-400">Check back later or switch filters</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                {date}
              </p>
              <Card padding="none" className="overflow-hidden">
                {items.map(n => (
                  <NotificationRow key={n.id} n={n} onClick={() => handleClick(n)} />
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
