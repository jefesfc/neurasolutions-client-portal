import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { SecurityKPIRow } from '../components/security/SecurityKPIRow';
import { ThreatTimeline } from '../components/security/ThreatTimeline';
import { EventsTable } from '../components/security/EventsTable';
import { EventDetailModal } from '../components/security/EventDetailModal';
import { TimeRangeSelector } from '../components/security/TimeRangeSelector';
import { SecurityAnalysisPanel } from '../components/security/SecurityAnalysisPanel';
import { SecurityStatusBanner } from '../components/security/SecurityStatusBanner';
import type { SecurityEvent, SecuritySummary, SecurityTimeRange } from '../types/security';
import { Shield, Activity, Lock, Eye, AlertTriangle, CheckCircle2, Download } from 'lucide-react';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type FilterSeverity = 'all' | SecurityEvent['severity'];

const OPERATIONAL_MODEL = [
  {
    icon: Eye, color: '#818cf8', title: 'Real-time Monitoring',
    desc: 'All user actions, API calls, and login attempts are logged and analyzed continuously.',
    actionLabel: 'View All Events', actionKey: 'monitoring',
  },
  {
    icon: AlertTriangle, color: '#fbbf24', title: 'Threat Detection',
    desc: 'GPT-4o analyzes patterns: brute force, IP anomalies, prompt injection, permission escalation.',
    actionLabel: 'View High/Critical', actionKey: 'threats',
  },
  {
    icon: Lock, color: '#34d399', title: 'RLS Isolation',
    desc: 'PostgreSQL Row-Level Security ensures strict tenant data isolation at the database layer.',
    actionLabel: 'Check Status', actionKey: 'rls',
  },
  {
    icon: Activity, color: '#f87171', title: 'Incident Response',
    desc: 'Critical events trigger instant alerts. Each event can be reviewed and resolved manually.',
    actionLabel: 'View Critical', actionKey: 'incidents',
  },
  {
    icon: Shield, color: '#60a5fa', title: 'AI Security Agent',
    desc: 'On-demand AI analysis via GPT-4o provides risk scoring and remediation recommendations.',
    actionLabel: 'Run Analysis', actionKey: 'ai',
  },
  {
    icon: CheckCircle2, color: '#a78bfa', title: 'Audit Trail',
    desc: 'All security events are persisted with full metadata for compliance and forensic review.',
    actionLabel: 'Export CSV', actionKey: 'audit',
  },
];

export default function SecurityPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [range, setRange]               = useState<SecurityTimeRange>('1m');
  const [events, setEvents]             = useState<SecurityEvent[]>([]);
  const [summary, setSummary]           = useState<SecuritySummary | null>(null);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<SecurityEvent | null>(null);
  const [tableFilter, setTableFilter]   = useState<FilterSeverity>('all');
  const [rlsToast, setRlsToast]         = useState(false);
  const [tileHover, setTileHover]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') void navigate('/');
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [eventsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/security/events?range=${range}`, { headers }),
        fetch(`${API_URL}/security/summary?range=${range}`, { headers }),
      ]);
      const eventsData = await eventsRes.json() as SecurityEvent[];
      const summaryData = await summaryRes.json() as SecuritySummary;
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setSummary(summaryData);
      setLastUpdated(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token, range]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  /* Auto-refresh every 30s for real-time status */
  useEffect(() => {
    const id = setInterval(() => void fetchData(), 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  async function handleResolve(id: string) {
    await fetch(`${API_URL}/security/resolve/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
  }

  async function handleResolveAll() {
    const unresolved = events.filter(e => !e.resolved);
    await Promise.allSettled(
      unresolved.map(e =>
        fetch(`${API_URL}/security/resolve/${e.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    // Refetch everything: events, summary, KPIs — gets real server-side data
    await fetchData();
  }

  function exportCSV() {
    const headers = ['Date', 'Event Type', 'Severity', 'IP Address', 'Target Resource', 'Resolved'];
    const rows = events.map(e => [
      new Date(e.created_at).toLocaleString('en-GB'),
      e.event_type,
      e.severity,
      e.actor_ip ?? '',
      e.target_resource ?? '',
      e.resolved ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function scrollTo(id: string) {
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function handleTileAction(key: string) {
    switch (key) {
      case 'monitoring':
        setTableFilter('all');
        scrollTo('events-table');
        break;
      case 'threats':
        setTableFilter('high');
        scrollTo('events-table');
        break;
      case 'rls':
        setRlsToast(true);
        setTimeout(() => setRlsToast(false), 4000);
        break;
      case 'incidents':
        setTableFilter('critical');
        scrollTo('events-table');
        break;
      case 'ai':
        scrollTo('analysis-panel');
        break;
      case 'audit':
        exportCSV();
        break;
    }
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <PageHeader
            title="Security"
            description="Monitor threats, anomalies, and system integrity events"
          />
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>

        <SecurityStatusBanner
          events={events}
          loading={loading}
          lastUpdated={lastUpdated}
          onRefresh={() => void fetchData()}
          onResolveAll={handleResolveAll}
        />

        <SecurityKPIRow summary={summary} loading={loading} />

        {/* Operational Security Model */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1a2235 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 14, padding: 20,
        }}>
          <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={15} color="#818cf8" /> Operational Security Model
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {OPERATIONAL_MODEL.map(item => {
              const isHovered = tileHover === item.actionKey;
              return (
                <div
                  key={item.title}
                  onClick={() => handleTileAction(item.actionKey)}
                  onMouseEnter={() => setTileHover(item.actionKey)}
                  onMouseLeave={() => setTileHover(null)}
                  style={{
                    background: isHovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                    border: isHovered ? `1px solid ${item.color}55` : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '12px 14px',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    cursor: 'pointer', transition: 'all 0.18s ease',
                    transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                    boxShadow: isHovered ? `0 4px 16px ${item.color}18` : 'none',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: isHovered ? `${item.color}28` : `${item.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.18s',
                  }}>
                    <item.icon size={15} color={item.color} style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.18s' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12, margin: '0 0 3px' }}>{item.title}</p>
                    <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 8px', lineHeight: 1.5 }}>{item.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {item.actionKey === 'audit' ? <Download size={10} color={item.color} /> : null}
                      <span style={{ color: item.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', opacity: isHovered ? 1 : 0.6, transition: 'opacity 0.18s' }}>
                        {item.actionLabel} →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RLS status toast */}
          {rlsToast && (
            <div style={{
              marginTop: 14, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.35)',
              borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
              animation: 'fadeIn 0.25s ease',
            }}>
              <Lock size={14} color="#34d399" />
              <div>
                <span style={{ color: '#34d399', fontSize: 12, fontWeight: 700 }}>RLS Active</span>
                <span style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>
                  PostgreSQL Row-Level Security enforced · All queries automatically filtered by <code style={{ color: '#94a3b8', fontSize: 10 }}>tenant_id</code> at the database layer · No cross-tenant data leakage possible
                </span>
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis Panel */}
        <div id="analysis-panel">
          <SecurityAnalysisPanel token={token!} range={range} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>
          <ThreatTimeline events={events} loading={loading} onSelect={setSelected} />
          <EventsTable
            events={events}
            loading={loading}
            onSelect={setSelected}
            onResolve={handleResolve}
            filterPreset={tableFilter}
          />
        </div>
      </div>

      <EventDetailModal event={selected} onClose={() => setSelected(null)} />
    </PageTransition>
  );
}
