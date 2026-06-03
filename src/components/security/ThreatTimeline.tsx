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
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,215,0,0.12)',
        borderRadius: 12,
        padding: 16,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, borderBottom: '1px solid rgba(255,215,0,0.1)', paddingBottom: 8 }}>
        🕐 Last 24h Timeline ({last24h.length})
      </p>

      {loading && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading...</p>}
      {!loading && last24h.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: 13 }}>No events in the last 24 hours.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {last24h.map((event) => {
          const cfg = SEVERITY_CONFIG[event.severity];
          const time = new Date(event.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit',
          });
          return (
            <button
              key={event.id}
              onClick={() => onSelect(event)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: cfg.dot, flexShrink: 0, marginTop: 5,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                </p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 0 0' }}>
                  {time} · {event.actor_ip ?? 'unknown IP'}
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                {cfg.label.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
