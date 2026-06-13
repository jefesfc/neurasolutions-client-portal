import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { useSidebarStore } from "../../store/sidebar-store";
import { useLanguageStore } from "../../store/language-store";
import { useIsMobile } from "../../hooks/use-media-query";
import { mainNavItems, bottomNavItems } from "../../config/navigation";
import { useAuthStore } from "../../store/auth-store";
import logoWhite from "../../assets/neura-logo-white.png";

export function Sidebar() {
  const { t } = useTranslation();
  const { isCollapsed, toggle, isMobileOpen, close } = useSidebarStore();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isRTL = useLanguageStore((s) => s.lang === 'ar');
  const user = useAuthStore((s) => s.user);

  const visibleMainNavItems = mainNavItems.filter((item) => {
    if (item.adminOnly) return user?.role === 'admin';
    if (!item.permission) return true;
    return user?.role === 'admin' || (user?.section_permissions ?? []).includes(item.permission);
  });
  const visibleBottomNavItems = bottomNavItems.filter(
    (item) =>
      !item.permission ||
      user?.role === 'admin' ||
      (user?.section_permissions ?? []).includes(item.permission)
  );

  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>(null!);
  const [hoverExpanded, setHoverExpanded] = useState(false);

  useEffect(() => {
    if (isMobile) close();
  }, [location.pathname, isMobile, close]);

  const expanded = !isCollapsed || hoverExpanded;

  function handleMouseEnter() {
    if (isCollapsed && !isMobile) {
      hoverTimeout.current = setTimeout(() => setHoverExpanded(true), 150);
    }
  }

  function handleMouseLeave() {
    clearTimeout(hoverTimeout.current);
    setHoverExpanded(false);
  }

  // In RTL: collapse button and active indicator swap sides
  const CollapseIcon = isRTL
    ? isCollapsed ? ChevronLeft : ChevronRight
    : isCollapsed ? ChevronRight : ChevronLeft;

  const sidebarContent = (
    <div
      className={cn(
        "flex flex-col h-full bg-slate-900 text-slate-400 transition-all duration-200",
        isMobile ? "w-64" : expanded ? "w-60" : "w-[72px]"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800">
        <Link to="/" className="flex items-center min-w-0">
          <AnimatePresence mode="wait">
            {!expanded && !isMobile ? (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0 overflow-hidden"
              >
                <img src={logoWhite} className="h-5 w-auto object-contain" alt="Noor Aesthetics" />
              </motion.div>
            ) : (
              <motion.img
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={logoWhite}
                className="h-8 w-auto max-w-[140px] object-contain"
                alt="Noor Aesthetics"
              />
            )}
          </AnimatePresence>
        </Link>
        {!isMobile && (
          <button
            onClick={toggle}
            className={cn(
              "p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0",
              isRTL ? "mr-auto" : "ml-auto"
            )}
          >
            <CollapseIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          {(expanded || isMobile) && (
            <p className={cn(
              "px-3 text-xs font-medium text-slate-500 uppercase tracking-wider mb-2",
              isRTL && "text-right"
            )}>
              {t('sidebar.main')}
            </p>
          )}
          {visibleMainNavItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                  isRTL && "flex-row-reverse",
                  isActive
                    ? "bg-indigo-500/15 text-indigo-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <AnimatePresence>
                  {(expanded || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn("text-sm font-medium whitespace-nowrap", isRTL && "font-['Cairo',sans-serif]")}
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !expanded && !isMobile && (
                  <span className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-brand-500 rounded-full",
                    isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"
                  )} />
                )}
              </Link>
            );
          })}
        </div>

        <div className="space-y-1">
          {(expanded || isMobile) && (
            <p className={cn(
              "px-3 text-xs font-medium text-slate-500 uppercase tracking-wider mb-2",
              isRTL && "text-right"
            )}>
              {t('sidebar.account')}
            </p>
          )}
          {visibleBottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  isRTL && "flex-row-reverse",
                  isActive
                    ? "bg-indigo-500/15 text-indigo-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <AnimatePresence>
                  {(expanded || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn("text-sm font-medium whitespace-nowrap", isRTL && "font-['Cairo',sans-serif]")}
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      {(expanded || isMobile) && (
        <div className={cn("px-4 py-3 border-t border-slate-800", isRTL && "text-right")}>
          <div className="text-xs text-slate-500">
            <p>{t('sidebar.version')}</p>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm z-40"
              onClick={close}
            />
            <motion.div
              initial={{ x: isRTL ? 280 : -280 }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? 280 : -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn("fixed top-0 bottom-0 z-50 shadow-2xl", isRTL ? "right-0" : "left-0")}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return <aside className="flex-shrink-0 h-screen sticky top-0">{sidebarContent}</aside>;
}
