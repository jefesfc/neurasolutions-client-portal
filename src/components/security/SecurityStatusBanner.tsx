import { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, CheckCheck } from 'lucide-react';
import type { SecurityEvent } from '../../types/security';

type SecurityStatus = 'protected' | 'warning' | 'critical';

interface StatusInfo {
  status: SecurityStatus;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalUnresolved: number;
  totalEvents: number;
}

interface Props {
  events: SecurityEvent[];
  loading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onResolveAll?: () => Promise<void>;
}

const STATUS_CONFIG = {
  protected: {
    color: '#22c55e',
    borderColor: 'rgba(34,197,94,0.3)',
    accentBg: 'rgba(34,197,94,0.06)',
    label: 'Sistema Protegido',
    desc: 'No hay amenazas activas — todos los eventos resueltos',
    Icon: ShieldCheck,
    pulse: false,
  },
  warning: {
    color: '#f59e0b',
    borderColor: 'rgba(245,158,11,0.35)',
    accentBg: 'rgba(245,158,11,0.06)',
    label: 'Eventos Pendientes',
    desc: 'Hay eventos sin resolver que requieren revisión',
    Icon: ShieldAlert,
    pulse: true,
  },
  critical: {
    color: '#ef4444',
    borderColor: 'rgba(239,68,68,0.4)',
    accentBg: 'rgba(239,68,68,0.07)',
    label: 'Amenaza Activa',
    desc: 'Eventos de alta severidad detectados sin resolver',
    Icon: ShieldX,
    pulse: true,
  },
};

function computeStatus(events: SecurityEvent[]): StatusInfo {
  const unresolved = events.filter(e => !e.resolved);
  const criticalCount = unresolved.filter(e => e.severity === 'critical').length;
  const highCount     = unresolved.filter(e => e.severity === 'high').length;
  const mediumCount   = unresolved.filter(e => e.severity === 'medium').length;
  const lowCount      = unresolved.filter(e => e.severity === 'low').length;
  const totalUnresolved = criticalCount + highCount + mediumCount + lowCount;

  const status: SecurityStatus =
    criticalCount > 0 || highCount > 0 ? 'critical'
    : mediumCount > 0 || lowCount > 0  ? 'warning'
    : 'protected';

  return { status, criticalCount, highCount, mediumCount, lowCount, totalUnresolved, totalEvents: events.length };
}

function TrafficLight({ status }: { status: SecurityStatus }) {
  const lights = [
    { id: 'critical',  color: '#ef4444', glow: 'rgba(239,68,68,0.6)',  active: status === 'critical' },
    { id: 'warning',   color: '#f59e0b', glow: 'rgba(245,158,11,0.6)', active: status === 'warning' },
    { id: 'protected', color: '#22c55e', glow: 'rgba(34,197,94,0.6)',  active: status === 'protected' },
  ];

  return (
    <div style={{
      background: '#060c18',
      border: '2px solid rgba(255,255,255,0.1)',
      borderRadius: 18,
      padding: '14px 10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      flexShrink: 0,
    }}>
      {lights.map(light => (
        <div key={light.id} style={{
          width: 28, height: 28, borderRadius: '50%',
          background: light.active ? light.color : `${light.color}20`,
          boxShadow: light.active
            ? `0 0 14px ${light.glow}, 0 0 28px ${light.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`
            : 'inset 0 1px 0 rgba(255,255,255,0.04)',
          transition: 'all 0.4s ease',
          ...(light.active && light.id !== 'protected' ? {
            '--sem-color': light.glow,
            animation: 'semaphore-pulse 2s ease-in-out infinite',
          } as React.CSSProperties : {}),
        }} />
      ))}
    </div>
  );
}

function SevPill({ label, count, color }: { label: string; count: number; color: string }) {
  const active = count > 0;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: active ? `${color}18` : 'rgba(255,255,255,0.05)',
      border: `1px solid ${active ? `${color}40` : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 10, padding: '8px 16px', minWidth: 66,
      transition: 'all 0.35s ease',
    }}>
      <span style={{
        fontSize: 24, fontWeight: 800, lineHeight: 1,
        color: active ? color : '#475569',
        fontVariantNumeric: 'tabular-nums',
        transition: 'color 0.35s ease',
      }}>
        {count}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, marginTop: 4,
        textTransform: 'uppercase', letterSpacing: '0.6px',
        color: active ? `${color}cc` : '#64748b',
        transition: 'color 0.35s ease',
      }}>
        {label}
      </span>
    </div>
  );
}

export function SecurityStatusBanner({ events, loading, lastUpdated, onRefresh, onResolveAll }: Props) {
  const info = useMemo(() => computeStatus(events), [events]);
  const cfg  = STATUS_CONFIG[info.status];
  const [resolving, setResolving] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const relativeTime = useMemo(() => {
    if (!lastUpdated) return '—';
    const s = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (s < 10) return 'ahora mismo';
    if (s < 60) return `hace ${s}s`;
    return `hace ${Math.floor(s / 60)}m`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdated, tick]);

  async function handleResolveAll() {
    if (!onResolveAll) return;
    setResolving(true);
    try { await onResolveAll(); }
    finally { setResolving(false); }
  }

  return (
    <div style={{
      /* Always dark background — no transparency bleed */
      background: 'linear-gradient(135deg, #080e1c 0%, #0f1828 60%, #131e2e 100%)',
      border: `1px solid ${cfg.borderColor}`,
      borderRadius: 16,
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap',
      transition: 'border-color 0.5s ease',
      boxShadow: `0 0 0 1px ${cfg.borderColor} inset, 0 4px 24px rgba(0,0,0,0.35)`,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Subtle colored glow in top-left corner */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 220, height: '100%',
        background: `radial-gradient(ellipse at 0% 50%, ${cfg.accentBg} 0%, transparent 70%)`,
        pointerEvents: 'none', transition: 'background 0.5s ease',
      }} />

      {/* Traffic light */}
      <TrafficLight status={info.status} />

      {/* Status text */}
      <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <cfg.Icon size={16} color={cfg.color} />
          <span style={{
            fontSize: 13, fontWeight: 800, color: cfg.color,
            textTransform: 'uppercase', letterSpacing: '1.5px',
          }}>
            {cfg.label}
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px', lineHeight: 1.4 }}>{cfg.desc}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            {info.totalEvents} eventos analizados
          </span>
          {info.totalUnresolved > 0 && (
            <span style={{ fontSize: 11, color: cfg.color, fontWeight: 700 }}>
              · {info.totalUnresolved} sin resolver
            </span>
          )}
          <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>
            Actualizado: {relativeTime}
          </span>
        </div>
      </div>

      {/* Severity breakdown */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <SevPill label="Critical" count={info.criticalCount} color="#ef4444" />
        <SevPill label="High"     count={info.highCount}     color="#f97316" />
        <SevPill label="Medium"   count={info.mediumCount}   color="#f59e0b" />
        <SevPill label="Low"      count={info.lowCount}      color="#3b82f6" />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {/* Resolve All — only when there are unresolved events */}
        {info.totalUnresolved > 0 && onResolveAll && (
          <button
            onClick={() => void handleResolveAll()}
            disabled={resolving}
            title="Marcar todos como resueltos"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: resolving ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.35)',
              color: resolving ? '#166534' : '#22c55e',
              cursor: resolving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.18s',
            }}
          >
            <CheckCheck size={13} style={{ animation: resolving ? 'spin 1s linear infinite' : 'none' }} />
            {resolving ? 'Resolviendo...' : 'Resolver Todo'}
          </button>
        )}

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Actualizar ahora"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '6px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: loading ? '#1e2d3d' : '#475569',
            transition: 'all 0.18s',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
    </div>
  );
}
