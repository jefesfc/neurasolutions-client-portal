import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';

const INACTIVITY_MS    = 30 * 60 * 1000; // 30 min
const WARNING_MS       = 25 * 60 * 1000; // warn at 25 min
const COUNTDOWN_SEC    = 5 * 60;         // 5 min countdown

function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const doLogout = useCallback((reason: 'inactivity' | 'expired') => {
    logout();
    navigate(`/login?reason=${reason}`, { replace: true });
  }, [logout, navigate]);

  // Check JWT expiry on mount and token change
  useEffect(() => {
    if (!token) return;
    const exp = parseJwtExp(token);
    if (exp && Date.now() > exp) {
      doLogout('expired');
    }
  }, [token, doLogout]);

  const clearTimers = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current)    clearTimeout(warningTimer.current);
    if (countdownRef.current)    clearInterval(countdownRef.current);
  }, []);

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true);
    setCountdown(COUNTDOWN_SEC);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          doLogout('inactivity');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [doLogout]);

  const resetTimer = useCallback(() => {
    if (!token) return;
    clearTimers();
    setShowWarning(false);
    setCountdown(COUNTDOWN_SEC);

    warningTimer.current    = setTimeout(startWarningCountdown, WARNING_MS);
    inactivityTimer.current = setTimeout(() => doLogout('inactivity'), INACTIVITY_MS);
  }, [token, clearTimers, startWarningCountdown, doLogout]);

  // Start timers on mount / token change
  useEffect(() => {
    if (!token) return;
    resetTimer();
    return clearTimers;
  }, [token, resetTimer, clearTimers]);

  // Track user activity
  useEffect(() => {
    if (!token) return;
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handle = () => { if (!showWarning) resetTimer(); };
    events.forEach(e => window.addEventListener(e, handle, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handle));
  }, [token, showWarning, resetTimer]);

  function handleStayLoggedIn() {
    resetTimer();
  }

  const mins = Math.floor(countdown / 60);
  const secs = String(countdown % 60).padStart(2, '0');

  return (
    <>
      {children}

      {showWarning && (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center p-4 pointer-events-none">
          <div
            className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            style={{ animation: 'slideUp 0.25s ease-out' }}
          >
            {/* Countdown bar */}
            <div className="h-1 bg-slate-100">
              <div
                className="h-1 bg-amber-500 transition-all duration-1000"
                style={{ width: `${(countdown / COUNTDOWN_SEC) * 100}%` }}
              />
            </div>

            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">Session expiring soon</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    You've been inactive. Auto-logout in{' '}
                    <span className="font-bold text-amber-600 tabular-nums">
                      {mins > 0 ? `${mins}:${secs}` : `${countdown}s`}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleStayLoggedIn}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Stay logged in
                </button>
                <button
                  onClick={() => doLogout('inactivity')}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
