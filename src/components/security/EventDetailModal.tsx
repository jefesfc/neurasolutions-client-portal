import { X } from 'lucide-react';
import type { SecurityEvent } from '../../types/security';
import { SEVERITY_CONFIG, EVENT_TYPE_LABELS } from '../../types/security';

interface Props {
  event: SecurityEvent | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: Props) {
  if (!event) return null;

  const cfg = SEVERITY_CONFIG[event.severity];
  const analysis = event.ai_analysis;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a2035', border: '1px solid rgba(255,215,0,0.15)',
          borderRadius: 16, padding: 28, maxWidth: 560, width: '100%',
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 10 }}>
              {cfg.label.toUpperCase()}
            </span>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '8px 0 4px' }}>
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
              {new Date(event.created_at).toLocaleString('en-US')}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Event details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'IP Address', value: event.actor_ip ?? 'unknown' },
            { label: 'Target', value: event.target_resource ?? '—' },
            { label: 'Resolved', value: event.resolved ? 'Yes' : 'No' },
            { label: 'Event ID', value: event.id.substring(0, 8) + '...' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
              <p style={{ color: '#e5e7eb', fontSize: 13, margin: 0, wordBreak: 'break-all' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Metadata */}
        {Object.keys(event.metadata).length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px', marginBottom: 20 }}>
            <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px' }}>Metadata</p>
            <pre style={{ color: '#9ca3af', fontSize: 11, margin: 0, overflowX: 'auto' }}>
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* AI Analysis */}
        {analysis ? (
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>🤖 AI Analysis</p>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 10,
                background: analysis.risk_score >= 70 ? 'rgba(239,68,68,0.15)' : analysis.risk_score >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                color: analysis.risk_score >= 70 ? '#ef4444' : analysis.risk_score >= 40 ? '#f59e0b' : '#22c55e',
              }}>
                Risk: {analysis.risk_score}/100
              </span>
            </div>
            <p style={{ color: '#e5e7eb', fontSize: 13, margin: '0 0 8px' }}>{analysis.summary}</p>
            <p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 8px' }}>📌 {analysis.context}</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ color: '#fcd34d', fontSize: 11, fontWeight: 600, margin: '0 0 4px' }}>Recommended Action</p>
              <p style={{ color: '#e5e7eb', fontSize: 13, margin: 0 }}>{analysis.recommended_action}</p>
            </div>
            {analysis.is_likely_false_positive && (
              <p style={{ color: '#6b7280', fontSize: 11, marginTop: 8, margin: '8px 0 0' }}>
                ⚠️ This event may be a false positive.
              </p>
            )}
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
              AI analysis not available for low-severity events.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
