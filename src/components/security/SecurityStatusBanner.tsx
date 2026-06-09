import { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw } from 'lucide-react';
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
}

const STATUS_CONFIG = {
  protected: {
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.06)',
    border: 'rgba(34,197,94,0.25)',
    title: 'SISTEMA PROTEGIDO',
    desc: 'No hay amenazas activas — todos los eventos resueltos',
    Icon: ShieldCheck,
    pulse: false,
  },
  warning: {
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.35)',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.3)',
    title: 'EVENTOS PENDIENTES',
    desc: 'Hay eventos sin resolver que requieren revisión',
    Icon: ShieldAlert,
    pulse: true,
  },
  critical: {
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.4)',
    bg: 'rgba(239,68,68,0.07)',
    border: 'rgba(239,68,68,0.35)',
    title: 'AMENAZA ACTIVA',
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

/* Traffic light: 3 circles in a dark housing */
function TrafficLight({ status }: { status: SecurityStatus }) {
  const lights = [
    { id: 'critical',  color: '#ef4444', glow: 'rgba(239,68,68,0.5)',  active: status === 'critical' },
    { id: 'warning',   color: '#f59e0b', glow: 'rgba(245,158,11,0.5)', active: status === 'warning' },
    { id: 'protected', color: '#22c55e', glow: 'rgba(34,197,94,0.5)',  active: status === 'protected' },
  ];

  return (
    <div style={{
      background: '#0a0f1a',
      border: '2px solid rgba(255,255,255,0.08)',
      borderRadius: 20,
      padding: '14px 10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      flexShrink: 0,
    }}>
      {lights.map(light => (
        <div
          key={light.id}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: light.active ? light.color : `${light.color}22`,
            boxShadow: light.active
              ? `0 0 12px ${light.glow}, 0 0 24px ${light.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`
              : 'inset 0 1px 0 rgba(255,255,255,0.05)',
            transition: 'all 0.4s ease',
            ...(light.active && (status === 'critical' || status === 'warning') ? {
              '--sem-color': light.glow,
              animation: 'semaphore-pulse 2s ease-in-out infinite',
            } as React.CSSProperties : {}),
          }}
        />
      ))}
    </div>
  );
}

/* Severity count pill */
function SevPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: count > 0 ? `${color}14` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${count > 0 ? `${color}35` : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 10, padding: '8px 14px', minWidth: 64,
      transition: 'all 0.3s ease',
    }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: count > 0 ? color : '#475569', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, color: count > 0 ? color : '#334155', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 3 }}>
        {label}
      </span>
    </div>
  );
}

export function SecurityStatusBanner({ events, loading, lastUpdated, onRefresh }: Props) {
  const info = useMemo(() => computeStatus(events), [events]);
  const cfg  = STATUS_CONFIG[info.status];
  const [tick, setTick] = useState(0);

  /* Update relative time display every 10s */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const relativeTime = useMemo(() => {
    if (!lastUpdated) return '—';
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 10) return 'ahora mismo';
    if (seconds < 60) return `hace ${seconds}s`;
    return `hace ${Math.floor(seconds / 60)}m`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdated, tick]);

  return (
    <div style={{
      background: `linear-gradient(135deg, #0c1220 0%, ${cfg.bg} 100%)`,
      border: `1px solid ${cfg.border}`,
      borderRadius: 16,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap',
      transition: 'border-color 0.5s ease, background 0.5s ease',
      boxShadow: `0 0 0 1px ${cfg.border} inset, 0 2px 12px rgba(0,0,0,0.2)`,
    }}>

      {/* Traffic light */}
      <TrafficLight status={info.status} />

      {/* Status text */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <cfg.Icon size={16} color={cfg.color} />
          <span style={{
            fontSize: 13, fontWeight: 800, color: cfg.color,
            textTransform: 'uppercase', letterSpacing: '1.5px',
          }}>
            {info.status === 'protected' ? 'Sistema Protegido' : info.status === 'warning' ? 'Eventos Pendientes' : 'Amenaza Activa'}
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 6px', lineHeight: 1.4 }}>{cfg.desc}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            {info.totalEvents} eventos analizados
          </span>
          {info.totalUnresolved > 0 && (
            <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600 }}>
              · {info.totalUnresolved} sin resolver
            </span>
          )}
          <span style={{ fontSize: 10, color: '#334155', marginLeft: 'auto' }}>
            Actualizado: {relativeTime}
          </span>
        </div>
      </div>

      {/* Severity breakdown */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <SevPill label="Critical" count={info.criticalCount} color="#ef4444" />
        <SevPill label="High"     count={info.highCount}     color="#f97316" />
        <SevPill label="Medium"   count={info.mediumCount}   color="#f59e0b" />
        <SevPill label="Low"      count={info.lowCount}      color="#3b82f6" />
      </div>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        title="Actualizar ahora"
        style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          color: loading ? '#334155' : '#64748b',
          transition: 'all 0.18s',
        }}
      >
        <RefreshCw
          size={14}
          style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
        />
      </button>
    </div>
  );
}
