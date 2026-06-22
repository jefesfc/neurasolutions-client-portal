import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { useT, useTranslations } from '../i18n/useT';
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

const OPERATIONAL_MODEL_BASE = [
  { icon: Eye,          color: '#818cf8', actionKey: 'monitoring' },
  { icon: AlertTriangle,color: '#fbbf24', actionKey: 'threats'    },
  { icon: Lock,         color: '#34d399', actionKey: 'rls'        },
  { icon: Activity,     color: '#f87171', actionKey: 'incidents'  },
  { icon: Shield,       color: '#60a5fa', actionKey: 'ai'         },
  { icon: CheckCircle2, color: '#a78bfa', actionKey: 'audit'      },
];

export default function SecurityPage() {
  const t = useT();
  const T = useTranslations();
  const { user, token } = useAuthStore();

  const OPERATIONAL_MODEL = [
    { ...OPERATIONAL_MODEL_BASE[0], title: T.security.monitoringTitle, desc: T.security.monitoringDesc, actionLabel: T.security.monitoringAction },
    { ...OPERATIONAL_MODEL_BASE[1], title: T.security.threatTitle,     desc: T.security.threatDesc,     actionLabel: T.security.threatAction     },
    { ...OPERATIONAL_MODEL_BASE[2], title: T.security.rlsTitle,        desc: T.security.rlsDesc,        actionLabel: T.security.rlsAction        },
    { ...OPERATIONAL_MODEL_BASE[3], title: T.security.incidentTitle,   desc: T.security.incidentDesc,   actionLabel: T.security.incidentAction   },
    { ...OPERATIONAL_MODEL_BASE[4], title: T.security.aiTitle,         desc: T.security.aiDesc,         actionLabel: T.security.aiAction         },
    { ...OPERATIONAL_MODEL_BASE[5], title: T.security.auditTitle,      desc: T.security.auditDesc,      actionLabel: T.security.auditAction      },
  ];

  const [range, setRange]               = useState<SecurityTimeRange>('1m');
  const [events, setEvents]             = useState<SecurityEvent[]>([]);
  const [summary, setSummary]           = useState<SecuritySummary | null>(null);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<SecurityEvent | null>(null);
  const [tableFilter, setTableFilter]   = useState<FilterSeverity>('all');
  const [rlsToast, setRlsToast]         = useState(false);
  const [tileHover, setTileHover]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);

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

  if (user && user.role !== 'admin') return <Navigate to="/" replace />;
  if (!token) return null;

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
            title={t('pages.security.title')}
            description={t('pages.security.desc')}
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
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16, padding: '20px 20px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} color="#6366f1" />
            </div>
            <div>
              <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                {T.security.opModel}
              </p>
              <p style={{ color: '#94a3b8', fontSize: 11, margin: '2px 0 0' }}>{T.security.opActiveLayers}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(270px, 100%), 1fr))', gap: 10 }}>
            {OPERATIONAL_MODEL.map(item => {
              const isHovered = tileHover === item.actionKey;
              const c = isHovered ? '#06b6d4' : item.color;
              return (
                <div
                  key={item.title}
                  onClick={() => handleTileAction(item.actionKey)}
                  onMouseEnter={() => setTileHover(item.actionKey)}
                  onMouseLeave={() => setTileHover(null)}
                  style={{
                    background: '#fff',
                    borderTop: `2px solid ${c}`,
                    borderLeft:   `1px solid ${isHovered ? '#06b6d440' : item.color + '25'}`,
                    borderRight:  `1px solid ${isHovered ? '#06b6d440' : item.color + '25'}`,
                    borderBottom: `1px solid ${isHovered ? '#06b6d440' : item.color + '25'}`,
                    borderRadius: '0 0 12px 12px',
                    padding: '14px 16px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: isHovered
                      ? `0 0 0 2px rgba(6,182,212,0.20), 0 6px 20px rgba(6,182,212,0.12)`
                      : '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}
                >
                  {/* Icon + title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: `${c}15`,
                      border: `1px solid ${c}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s',
                    }}>
                      <item.icon size={15} color={c} style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.18s' }} />
                    </div>
                    <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 13, margin: 0 }}>{item.title}</p>
                  </div>

                  {/* Description */}
                  <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{item.desc}</p>

                  {/* Footer action */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    paddingTop: 8, borderTop: `1px solid ${isHovered ? '#06b6d420' : '#f1f5f9'}`,
                    transition: 'border-color 0.18s',
                  }}>
                    {item.actionKey === 'audit' && <Download size={10} color={c} />}
                    <span style={{ color: c, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.18s' }}>
                      {item.actionLabel} →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RLS toast */}
          {rlsToast && (
            <div style={{
              marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderLeft: '3px solid #10b981',
              borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
              animation: 'fadeIn 0.25s ease',
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={13} color="#10b981" />
              </div>
              <div>
                <p style={{ color: '#166534', fontSize: 12, fontWeight: 700, margin: '0 0 2px' }}>{T.security.rlsToastTitle}</p>
                <span style={{ color: '#475569', fontSize: 12 }}>
                  {T.security.rlsToastDesc}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis Panel */}
        <div id="analysis-panel">
          <SecurityAnalysisPanel token={token} range={range} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4" style={{ minHeight: 500 }}>
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
