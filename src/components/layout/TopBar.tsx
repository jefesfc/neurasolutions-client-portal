import { Link, useNavigate } from "react-router-dom";
import { Bell, MessageSquare, Search, Menu, LogOut, User } from "lucide-react";
import { useNotificationStore } from "../../store/notification-store";
import { useAuthStore } from "../../store/auth-store";
import { useSidebarStore } from "../../store/sidebar-store";
import { Avatar } from "../ui/Avatar";
import { useState, useRef, useEffect } from "react";

export function TopBar() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-30 bg-surface-900/80 backdrop-blur-xl border-b border-surface-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-800 text-surface-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 rounded-lg border border-surface-700 bg-surface-800 pl-9 pr-4 py-2 text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2 rounded-lg hover:bg-surface-800 text-surface-500"
          >
            <Search className="h-5 w-5" />
          </button>

          <Link to="/support" className="relative p-2 rounded-lg hover:bg-surface-800 text-surface-500 transition-colors">
            <MessageSquare className="h-5 w-5" />
          </Link>

          <Link to="/" className="relative p-2 rounded-lg hover:bg-surface-800 text-surface-500 transition-colors">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-danger text-[10px] font-medium text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>

          <div ref={menuRef} className="relative hidden sm:flex items-center gap-2 ml-3 pl-3 border-l border-surface-700">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-800 transition-colors"
            >
              <Avatar fallback={user?.name} size="sm" className="bg-brand-100 text-brand-700" />
              <span className="text-sm font-medium text-surface-200">{user?.name}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 w-44 bg-surface-800 rounded-xl shadow-lg border border-surface-700 py-1 z-50">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700"
                >
                  <User className="w-4 h-4 text-surface-400" />
                  Profile
                </Link>
                <hr className="my-1 border-surface-700" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search..."
              autoFocus
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
              className="w-full rounded-lg border border-surface-700 bg-surface-800 pl-9 pr-4 py-2 text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>
      )}
    </header>
  );
}
