import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/cn";
import { mainNavItems, bottomNavItems } from "../../config/navigation";

export function MobileNav() {
  const location = useLocation();
  const allItems = [...mainNavItems.slice(0, 4), bottomNavItems[0]];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {allItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors",
                isActive ? "text-indigo-600" : "text-slate-400"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}