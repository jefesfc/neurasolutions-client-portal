import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, X, ChevronRight, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';

const KEY = (uid: string) => `aios_getting_started_${uid}`;
const DISMISS_KEY = (uid: string) => `aios_gs_dismissed_${uid}`;

interface ChecklistItem {
  id: string;
  label: string;
  desc: string;
  route?: string;
  action?: string;
}

const ITEMS: ChecklistItem[] = [
  { id: 'tour',      label: 'Complete the tour',           desc: 'Take the 2-minute product walkthrough' },
  { id: 'telegram',  label: 'Connect Telegram',            desc: 'Chat with your AI on the go',           route: '/settings', action: 'telegram' },
  { id: 'knowledge', label: 'Upload your first document',  desc: 'Power the AI with your company docs',   route: '/knowledge' },
  { id: 'chat',      label: 'Try the AI Chat',             desc: 'Ask anything in natural language',      route: '/chat' },
  { id: 'client',    label: 'Add your first client',       desc: 'Start building your CRM pipeline',      route: '/clients' },
];

export function useGettingStarted() {
  const user = useAuthStore(s => s.user);
  const uid = user?.id ?? '';

  function getState(): Record<string, boolean> {
    try { return JSON.parse(localStorage.getItem(KEY(uid)) ?? '{}'); } catch { return {}; }
  }

  function markDone(id: string) {
    const s = getState();
    s[id] = true;
    localStorage.setItem(KEY(uid), JSON.stringify(s));
    window.dispatchEvent(new Event('aios:gs-update'));
  }

  return { getState, markDone };
}

export function GettingStartedWidget() {
  const user     = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const uid      = user?.id ?? '';

  const [state, setState]       = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);

  function load() {
    try { setState(JSON.parse(localStorage.getItem(KEY(uid)) ?? '{}')); } catch { setState({}); }
  }

  useEffect(() => {
    if (!uid) return;
    const gone = localStorage.getItem(DISMISS_KEY(uid)) === '1';
    setDismissed(gone);
    load();

    // Mark tour done if onboarding was completed
    const toured = localStorage.getItem(`aios_onboarded_${uid}`);
    if (toured) {
      const s = JSON.parse(localStorage.getItem(KEY(uid)) ?? '{}');
      if (!s.tour) { s.tour = true; localStorage.setItem(KEY(uid), JSON.stringify(s)); }
    }

    window.addEventListener('aios:gs-update', load);
    return () => window.removeEventListener('aios:gs-update', load);
  }, [uid]);

  if (dismissed) return null;

  const completed = ITEMS.filter(i => state[i.id]).length;
  const total     = ITEMS.length;
  const allDone   = completed === total;
  const pct       = Math.round((completed / total) * 100);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY(uid), '1');
    setDismissed(true);
  }

  function toggle(id: string) {
    const next = { ...state, [id]: !state[id] };
    setState(next);
    localStorage.setItem(KEY(uid), JSON.stringify(next));
  }

  function handleAction(item: ChecklistItem) {
    toggle(item.id);
    if (item.route) {
      if (item.action === 'telegram') {
        navigate(item.route + '?tab=telegram');
      } else {
        navigate(item.route);
      }
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Rocket className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {allDone ? '🎉 All done! You\'re set up.' : 'Getting Started'}
            </p>
            <p className="text-xs text-slate-400">
              {completed}/{total} completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress ring */}
          <div className="relative w-9 h-9">
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke={allDone ? '#10b981' : '#6366f1'}
                strokeWidth="3"
                strokeDasharray={`${pct * 0.942} 100`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.4s ease' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600">
              {pct}%
            </span>
          </div>
          <button
            onClick={dismiss}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-slate-100">
        <div
          className="h-0.5 transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: allDone ? '#10b981' : '#6366f1',
          }}
        />
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-50">
        {ITEMS.map(item => {
          const done = !!state[item.id];
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
            >
              <button
                onClick={() => toggle(item.id)}
                className="flex-shrink-0 transition-transform hover:scale-110"
              >
                {done
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  : <Circle className="h-5 w-5 text-slate-300 group-hover:text-slate-400" />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>

              {!done && item.route && (
                <button
                  onClick={() => handleAction(item)}
                  className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Go <ChevronRight className="h-3 w-3" />
                </button>
              )}

              {!done && item.id === 'tour' && (
                <button
                  onClick={() => { window.dispatchEvent(new Event('aios:restart-tour')); toggle('tour'); }}
                  className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Start <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
