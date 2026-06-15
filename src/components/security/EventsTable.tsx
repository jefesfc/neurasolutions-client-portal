import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import type { SecurityEvent } from '../../types/security';
import { SEVERITY_CONFIG, EVENT_TYPE_LABELS } from '../../types/security';
import { useAuthStore } from '../../store/auth-store';
import { useTranslations } from '../../i18n/useT';

type FilterSeverity = 'all' | SecurityEvent['severity'];

interface Props {
  events: SecurityEvent[];
  loading: boolean;
  onSelect: (event: SecurityEvent) => void;
  onResolve: (id: string) => void;
  filterPreset?: FilterSeverity;
}

export function EventsTable({ events, loading, onSelect, onResolve, filterPreset }: Props) {
  const T = useTranslations();
  const [filter, setFilter] = useState<FilterSeverity>(filterPreset ?? 'all');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    if (filterPreset) setFilter(filterPreset);
  }, [filterPreset]);
  const { token } = useAuthStore();

  const filtered = events.filter((e) => {
    if (filter !== 'all' && e.severity !== filter) return false;
    if (!showResolved && e.resolved) return false;
    return true;
  });

  async function handleResolve(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const win = window as unknown as Record<string, Record<string, string> | undefined>;
    const apiUrl = win.__env__?.['API_URL'] ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
    await fetch(`${apiUrl}/security/resolve/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    onResolve(id);
  }

  const FILTERS: { value: FilterSeverity; label: string }[] = [
    { value: 'all',      label: T.security.filterAll      },
    { value: 'critical', label: T.security.filterCritical },
    { value: 'high',     label: T.security.filterHigh     },
    { value: 'medium',   label: T.security.filterMedium   },
    { value: 'low',      label: T.security.filterLow      },
  ];

  return (
    <div id="events-table" className="bg-white border border-slate-200 rounded-xl p-4">
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mr-2">{T.security.eventsTitle}</p>
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              filter === value
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="accent-indigo-500"
          />
          {T.security.showResolved}
        </label>
      </div>

      {loading && <p className="text-sm text-slate-400">{T.security.loadingEvents}</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-sm text-slate-400">{T.security.noEventsMatch}</p>
      )}

      <div className="flex flex-col gap-0.5">
        {filtered.map((event) => {
          const cfg = SEVERITY_CONFIG[event.severity];
          const time = new Date(event.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          return (
            <div
              key={event.id}
              onClick={() => onSelect(event)}
              className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
              style={{ opacity: event.resolved ? 0.5 : 1 }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {time} · {event.actor_ip ?? 'unknown IP'}
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color: cfg.color, backgroundColor: cfg.bg }}
              >
                {cfg.label.toUpperCase()}
              </span>
              {!event.resolved && (event.severity === 'high' || event.severity === 'critical') && (
                <button
                  onClick={(e) => handleResolve(e, event.id)}
                  title="Mark as resolved"
                  className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                >
                  <CheckCircle size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
