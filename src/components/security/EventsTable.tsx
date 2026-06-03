import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import type { SecurityEvent } from '../../types/security';
import { SEVERITY_CONFIG, EVENT_TYPE_LABELS } from '../../types/security';
import { useAuthStore } from '../../store/auth-store';

interface Props {
  events: SecurityEvent[];
  loading: boolean;
  onSelect: (event: SecurityEvent) => void;
  onResolve: (id: string) => void;
}

type FilterSeverity = 'all' | SecurityEvent['severity'];

export function EventsTable({ events, loading, onSelect, onResolve }: Props) {
  const [filter, setFilter] = useState<FilterSeverity>('all');
  const [showResolved, setShowResolved] = useState(false);
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
    { value: 'all',      label: 'All' },
    { value: 'critical', label: 'Critical' },
    { value: 'high',     label: 'High' },
    { value: 'medium',   label: 'Medium' },
    { value: 'low',      label: 'Low' },
  ];

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.12)', borderRadius: 12, padding: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 8 }}>
          🛡 Events
        </p>
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: '1px solid',
              borderColor: filter === value ? '#fcd34d' : 'rgba(255,255,255,0.1)',
              background: filter === value ? 'rgba(252,211,77,0.1)' : 'transparent',
              color: filter === value ? '#fcd34d' : '#9ca3af',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      {loading && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading...</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: 13 }}>No events match the current filter.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filtered.map((event) => {
          const cfg = SEVERITY_CONFIG[event.severity];
          const time = new Date(event.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          return (
            <div
              key={event.id}
              onClick={() => onSelect(event)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                opacity: event.resolved ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                </p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 0 0' }}>
                  {time} · {event.actor_ip ?? 'unknown IP'}
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: cfg.color, background: cfg.bg, flexShrink: 0 }}>
                {cfg.label.toUpperCase()}
              </span>
              {!event.resolved && (event.severity === 'high' || event.severity === 'critical') && (
                <button
                  onClick={(e) => handleResolve(e, event.id)}
                  title="Mark as resolved"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
                >
                  <CheckCircle size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
