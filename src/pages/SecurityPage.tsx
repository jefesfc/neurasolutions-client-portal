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
import type { SecurityEvent, SecuritySummary, SecurityTimeRange } from '../types/security';
import { Shield, Activity, Lock, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const OPERATIONAL_MODEL = [
  { icon: Eye,           color: '#818cf8', title: 'Real-time Monitoring',  desc: 'All user actions, API calls, and login attempts are logged and analyzed continuously.' },
  { icon: AlertTriangle, color: '#fbbf24', title: 'Threat Detection',      desc: 'GPT-4o analyzes patterns: brute force, IP anomalies, prompt injection, permission escalation.' },
  { icon: Lock,          color: '#34d399', title: 'RLS Isolation',          desc: 'PostgreSQL Row-Level Security ensures strict tenant data isolation at the database layer.' },
  { icon: Activity,      color: '#f87171', title: 'Incident Response',      desc: 'Critical events trigger instant alerts. Each event can be reviewed and resolved manually.' },
  { icon: Shield,        color: '#60a5fa', title: 'AI Security Agent',      desc: 'On-demand AI analysis via GPT-4o provides risk scoring and remediation recommendations.' },
  { icon: CheckCircle2,  color: '#a78bfa', title: 'Audit Trail',            desc: 'All security events are persisted with full metadata for compliance and forensic review.' },
];

export default function SecurityPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [range, setRange]       = useState<SecurityTimeRange>('1m');
  const [events, setEvents]     = useState<SecurityEvent[]>([]);
  const [summary, setSummary]   = useState<SecuritySummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<SecurityEvent | null>(null);

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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token, range]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  function handleResolve(id: string) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
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

        <SecurityKPIRow summary={summary} loading={loading} />

        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1a2235 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 14, padding: 20,
        }}>
          <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={15} color="#818cf8" /> Operational Security Model
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {OPERATIONAL_MODEL.map(item => (
              <div key={item.title} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={15} color={item.color} />
                </div>
                <div>
                  <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12, margin: '0 0 3px' }}>{item.title}</p>
                  <p style={{ color: '#64748b', fontSize: 11, margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SecurityAnalysisPanel token={token!} range={range} />

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>
          <ThreatTimeline events={events} loading={loading} onSelect={setSelected} />
          <EventsTable events={events} loading={loading} onSelect={setSelected} onResolve={handleResolve} />
        </div>
      </div>

      <EventDetailModal event={selected} onClose={() => setSelected(null)} />
    </PageTransition>
  );
}
