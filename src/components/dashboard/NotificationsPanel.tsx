import { Card, CardHeader, CardTitle } from "../ui/Card";
import { useNotificationStore } from "../../store/notification-store";
import { formatRelative } from "../../lib/formatters";
import { cn } from "../../lib/cn";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const typeStyles = {
  info: "text-blue-600 bg-blue-50",
  success: "text-emerald-600 bg-emerald-50",
  warning: "text-amber-600 bg-amber-50",
  error: "text-red-600 bg-red-50",
};

export function NotificationsPanel() {
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <CardHeader className="mb-0">
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-slate-400 gap-2">
            <Bell className="h-8 w-8" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = typeIcons[n.type];
            return (
              <div
                key={n.id}
                onClick={() => !n.read && markAsRead(n.id)}
                className={cn(
                  "flex items-start gap-3 px-5 py-3.5 transition-colors cursor-pointer",
                  !n.read ? "bg-indigo-50/60" : "hover:bg-slate-50"
                )}
              >
                <div className={cn("mt-0.5 p-1.5 rounded-lg flex-shrink-0", typeStyles[n.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-500 truncate mt-0.5">{n.description}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap mt-1">
                  {formatRelative(n.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}