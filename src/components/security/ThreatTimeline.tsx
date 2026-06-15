import type { SecurityEvent } from '../../types/security';
import { SEVERITY_CONFIG, EVENT_TYPE_LABELS } from '../../types/security';

interface Props {
  events: SecurityEvent[];
  loading: boolean;
  onSelect: (event: SecurityEvent) => void;
}

export function ThreatTimeline({ events, loading, onSelect }: Props) {
  const last24h = events.filter(
    (e) => new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 h-full overflow-y-auto">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-4 pb-3 border-b border-slate-100">
        Last 24h Timeline ({last24h.length})
      </p>

      {loading && <p className="text-sm text-slate-400">Loading...</p>}
      {!loading && last24h.length === 0 && (
        <p className="text-sm text-slate-400">No events in the last 24 hours.</p>
      )}

      <div className="flex flex-col gap-2">
        {last24h.map((event) => {
          const cfg = SEVERITY_CONFIG[event.severity];
          const time = new Date(event.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit',
          });
          return (
            <button
              key={event.id}
              onClick={() => onSelect(event)}
              className="flex items-start gap-2.5 w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                style={{ backgroundColor: cfg.dot }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {time} · {event.actor_ip ?? 'unknown IP'}
                </p>
              </div>
              <span className="text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ color: cfg.color }}>
                {cfg.label.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
