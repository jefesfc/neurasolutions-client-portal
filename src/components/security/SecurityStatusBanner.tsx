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
    color: '#10b981',
    bg: '#f0fdf4',
    label: 'System Protected',
    desc: 'No active threats — all events resolved',
    Icon: ShieldCheck,
  },
  warning: {
    color: '#f59e0b',
    bg: '#fffbeb',
    label: 'Pending Events',
    desc: 'There are unresolved events that require review',
    Icon: ShieldAlert,
  },
  critical: {
    color: '#ef4444',
    bg: '#fef2f2',
    label: 'Active Threat',
    desc: 'High severity events detected and unresolved',
    Icon: ShieldX,
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
    { id: 'critical',  color: '#ef4444', glow: 'rgba(239,68,68,0.5)',  active: status === 'critical' },
    { id: 'warning',   color: '#f59e0b', glow: 'rgba(245,158,11,0.5)', active: status === 'warning' },
    { id: 'protected', color: '#22c55e', glow: 'rgba(34,197,94,0.5)',  active: status === 'protected' },
  ];

  return (
    <div style={{
      background: '#f8fafc',
      border: '2px solid #e2e8f0',
      borderRadius: 18,
      padding: '14px 10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      flexShrink: 0,
    }}>
      {lights.map(light => (
        <div key={light.id} style={{
          width: 28, height: 28, borderRadius: '50%',
          background: light.active ? light.color : `${light.color}25`,
          boxShadow: light.active
            ? `0 0 12px ${light.glow}, 0 0 24px ${light.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`
            : 'none',
          transition: 'all 0.4s ease',
          ...(light.active && light.id !== 'protected' ? {
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
      background: active ? `${color}10` : '#fff',
      borderTop: `2px solid ${active ? color : '#e2e8f0'}`,
      borderLeft:   `1px solid ${active ? color + '30' : '#e2e8f0'}`,
      borderRight:  `1px solid ${active ? color + '30' : '#e2e8f0'}`,
      borderBottom: `1px solid ${active ? color + '30' : '#e2e8f0'}`,
      borderRadius: '0 0 10px 10px',
      padding: '9px 16px', minWidth: 70,
      transition: 'all 0.35s ease',
      boxShadow: active ? `0 2px 10px ${color}18` : 'none',
    }}>
      <span style={{
        fontSize: 24, fontWeight: 800, lineHeight: 1,
        color: active ? color : '#cbd5e1',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.5px',
        transition: 'color 0.35s ease',
      }}>
        {count}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, marginTop: 5,
        textTransform: 'uppercase', letterSpacing: '0.7px',
        color: active ? `${color}cc` : '#94a3b8',
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
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
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
      background: cfg.bg,
      borderLeft: `4px solid ${cfg.color}`,
      borderTop: `1px solid ${cfg.color}30`,
      borderRight: `1px solid ${cfg.color}30`,
      borderBottom: `1px solid ${cfg.color}30`,
      borderRadius: 14,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap',
      transition: 'background 0.5s ease, border-color 0.5s ease',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <TrafficLight status={info.status} />

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <cfg.Icon size={16} color={cfg.color} />
          <span style={{
            fontSize: 13, fontWeight: 800, color: cfg.color,
            textTransform: 'uppercase', letterSpacing: '1.5px',
          }}>
            {cfg.label}
          </span>
        </div>
        <p style={{ color: '#475569', fontSize: 12, margin: '0 0 8px', lineHeight: 1.4 }}>{cfg.desc}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            {info.totalEvents} events analyzed
          </span>
          {info.totalUnresolved > 0 && (
            <span style={{ fontSize: 11, color: cfg.color, fontWeight: 700 }}>
              · {info.totalUnresolved} unresolved
            </span>
          )}
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
            Updated: {relativeTime}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <SevPill label="Critical" count={info.criticalCount} color="#ef4444" />
        <SevPill label="High"     count={info.highCount}     color="#f97316" />
        <SevPill label="Medium"   count={info.mediumCount}   color="#f59e0b" />
        <SevPill label="Low"      count={info.lowCount}      color="#3b82f6" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {info.totalUnresolved > 0 && onResolveAll && (
          <button
            onClick={() => void handleResolveAll()}
            disabled={resolving}
            title="Mark all as resolved"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: resolving ? '#f0fdf4' : '#10b981',
              border: '1px solid #10b98140',
              color: resolving ? '#166534' : '#fff',
              cursor: resolving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.18s',
            }}
          >
            <CheckCheck size={13} style={{ animation: resolving ? 'spin 1s linear infinite' : 'none' }} />
            {resolving ? 'Resolving...' : 'Resolve All'}
          </button>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh now"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '7px', borderRadius: 8,
            background: '#fff', border: '1px solid #e2e8f0',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: loading ? '#cbd5e1' : '#64748b',
            transition: 'all 0.18s',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
    </div>
  );
}
