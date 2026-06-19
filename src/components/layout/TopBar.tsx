import { Link, useNavigate } from "react-router-dom";
import { Bell, MessageSquare, Search, Menu, LogOut, User, CheckCheck, AlertCircle, Info, CheckCircle, XCircle, ArrowRight, Languages, ShieldAlert } from "lucide-react";
import { ROUTES } from "../../config/routes";
import { useNotificationStore } from "../../store/notification-store";
import { useAuthStore } from "../../store/auth-store";
import type { AuthUser } from "../../store/auth-store";
import { useSidebarStore } from "../../store/sidebar-store";
import { useLanguageStore } from "../../store/language-store";
import { useT } from "../../i18n/useT";
import { Avatar } from "../ui/Avatar";
import { useState, useRef, useEffect, type ReactNode } from "react";
import type { Notification } from "../../types/notification";
import { useNotificationPolling } from "../../hooks/useNotificationPolling";
import { cn } from "../../lib/cn";

const NOTIF_ICONS: Record<string, ReactNode> = {
  success: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
  info:    <Info        className="w-3.5 h-3.5 text-blue-500"    />,
  warning: <AlertCircle className="w-3.5 h-3.5 text-amber-500"  />,
  error:   <XCircle     className="w-3.5 h-3.5 text-red-500"    />,
};

function timeAgo(iso: string, lang: 'en' | 'ar') {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === 'ar' ? 'الآن' : 'just now';
  if (m < 60) return lang === 'ar' ? `منذ ${m} دقيقة` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'ar' ? `منذ ${h} ساعة` : `${h}h ago`;
  return lang === 'ar' ? `منذ ${Math.floor(h / 24)} يوم` : `${Math.floor(h / 24)}d ago`;
}

function NotifDropdown({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const isRTL = lang === 'ar';
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const navigate = useNavigate();

  function handleClick(n: Notification) {
    markAsRead(n.id);
    if (n.link) { navigate(n.link); }
    onClose();
  }

  return (
    <div className={cn("absolute top-11 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden", isRTL ? "left-0" : "right-0")}>
      <div className={cn("flex items-center justify-between px-4 py-3 border-b border-slate-100", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <span className="text-sm font-semibold text-slate-800">{t('topbar.notifications')}</span>
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className={cn("flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors", isRTL && "flex-row-reverse")}>
            <CheckCheck className="w-3.5 h-3.5" />
            {t('topbar.markAllRead')}
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">{t('topbar.noNotif')}</div>
        ) : (
          notifications.slice(0, 8).map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                "w-full flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0",
                !n.read && "bg-indigo-50/50",
                isRTL ? "text-right flex-row-reverse" : "text-left"
              )}
            >
              <div className="mt-0.5 flex-shrink-0">{NOTIF_ICONS[n.type]}</div>
              <div className="flex-1 min-w-0">
                <div className={cn("flex items-start gap-2", isRTL ? "flex-row-reverse" : "justify-between")}>
                  <p className={`text-xs font-semibold truncate ${n.read ? "text-slate-600" : "text-slate-800"}`}>{n.title}</p>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(n.timestamp, lang)}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.description}</p>
              </div>
              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />}
            </button>
          ))
        )}
      </div>

      <Link
        to={ROUTES.Notifications}
        onClick={onClose}
        className={cn("flex items-center justify-center gap-1.5 w-full px-4 py-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 border-t border-slate-100 hover:bg-indigo-50/50 transition-colors", isRTL && "flex-row-reverse")}
      >
        {t('topbar.viewAll')}
        <ArrowRight className={cn("h-3.5 w-3.5", isRTL && "rotate-180")} />
      </Link>
    </div>
  );
}

export function TopBar() {
  useNotificationPolling();
  const t = useT();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const { lang, setLang } = useLanguageStore();
  const isRTL = lang === 'ar';
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const adminSession = (() => {
    try { return JSON.parse(localStorage.getItem('aios_admin_session') ?? 'null') as { token: string; user: AuthUser } | null; }
    catch { return null; }
  })();

  function exitImpersonation() {
    if (!adminSession) return;
    login(adminSession.token, adminSession.user);
    localStorage.removeItem('aios_admin_session');
    navigate('/admin');
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200">
      {adminSession && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-xs">
          <div className="flex items-center gap-2 text-amber-700">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Viewing as <strong>{user?.name ?? user?.email}</strong> — {user?.tenant_id?.slice(0, 8)}…</span>
          </div>
          <button
            onClick={exitImpersonation}
            className="flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-0.5 rounded-full transition-colors"
          >
            ← Exit to Admin
          </button>
        </div>
      )}
      <div className={cn("flex items-center justify-between h-16 px-4 lg:px-6", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block relative">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none", isRTL ? "right-3" : "left-3")} />
            <input
              type="text"
              placeholder={t('topbar.search')}
              className={cn(
                "w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
                isRTL ? "pr-9 pl-4 text-right" : "pl-9 pr-4"
              )}
            />
          </div>
        </div>

        <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
          <button onClick={() => setSearchOpen(true)} className="sm:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <Search className="h-5 w-5" />
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors text-xs font-semibold"
            title="Switch language / تغيير اللغة"
          >
            <Languages className="h-4 w-4" />
            <span>{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>

          <Link to="/support" className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <MessageSquare className="h-5 w-5" />
          </Link>

          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-danger text-[10px] font-medium text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && <NotifDropdown onClose={() => setNotifOpen(false)} />}
          </div>

          <div ref={menuRef} className={cn("relative hidden sm:flex items-center gap-2 ml-3 pl-3 border-l border-slate-200", isRTL && "ml-0 pl-0 mr-3 pr-3 border-l-0 border-r flex-row-reverse")}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn("flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors", isRTL && "flex-row-reverse")}
            >
              <Avatar fallback={user?.name} size="sm" className="bg-indigo-100 text-indigo-700" />
              <span className="text-sm font-medium text-slate-700">{user?.name}</span>
            </button>

            {menuOpen && (
              <div className={cn("absolute top-10 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50", isRTL ? "left-0" : "right-0")}>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className={cn("flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50", isRTL && "flex-row-reverse")}
                >
                  <User className="w-4 h-4 text-slate-400" />
                  {t('topbar.profile')}
                </Link>
                <hr className="my-1 border-slate-100" />
                <button
                  onClick={handleLogout}
                  className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50", isRTL && "flex-row-reverse")}
                >
                  <LogOut className="w-4 h-4" />
                  {t('topbar.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none", isRTL ? "right-3" : "left-3")} />
            <input
              type="text"
              placeholder={t('topbar.search')}
              autoFocus
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false); }}
              className={cn(
                "w-full rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
                isRTL ? "pr-9 pl-4 text-right" : "pl-9 pr-4"
              )}
            />
          </div>
        </div>
      )}
    </header>
  );
}
