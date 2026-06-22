import { Link, useLocation, useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import { cn } from "../../lib/cn";
import { mainNavItems } from "../../config/navigation";
import { useAuthStore } from "../../store/auth-store";
import { useState } from "react";

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [profileOpen, setProfileOpen] = useState(false);

  // First 4 main nav items + profile
  const navItems = mainNavItems.slice(0, 4);

  function handleLogout() {
    setProfileOpen(false);
    logout();
    navigate("/login");
  }

  return (
    <>
      {/* Profile popup */}
      {profileOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
          <div className="fixed bottom-20 right-3 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-56">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name ?? user?.email}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <Link
              to="/profile"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-slate-100"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[56px]",
                  isActive
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                <span className={cn("text-[10px] font-medium leading-none", isActive && "font-semibold")}>{item.label}</span>
              </Link>
            );
          })}

          {/* Profile button */}
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[56px]",
              profileOpen ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-[9px] font-bold text-indigo-700">
                {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
              </span>
            </div>
            <span className={cn("text-[10px] font-medium leading-none", profileOpen && "font-semibold")}>Profile</span>
          </button>
        </div>
      </nav>
    </>
  );
}
