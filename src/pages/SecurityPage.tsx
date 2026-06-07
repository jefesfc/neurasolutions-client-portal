import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { SecurityKPIRow } from '../components/security/SecurityKPIRow';
import { ThreatTimeline } from '../components/security/ThreatTimeline';
import { EventsTable } from '../components/security/EventsTable';
import { EventDetailModal } from '../components/security/EventDetailModal';
import type { SecurityEvent, SecuritySummary } from '../types/security';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL
  ?? 'http://localhost:3001';

export default function SecurityPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [events, setEvents]       = useState<SecurityEvent[]>([]);
  const [summary, setSummary]     = useState<SecuritySummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<SecurityEvent | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      void navigate('/');
    }
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [eventsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/security/events`, { headers }),
        fetch(`${API_URL}/security/summary`, { headers }),
      ]);
      const eventsData = await eventsRes.json() as SecurityEvent[];
      const summaryData = await summaryRes.json() as SecuritySummary;
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setSummary(summaryData);
    } catch {
      // silently fail — page shows empty state
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  function handleResolve(id: string) {
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, resolved: true } : e));
    setSummary((prev) => prev
      ? { ...prev, high_unresolved: String(Math.max(0, parseInt(prev.high_unresolved, 10) - 1)) }
      : prev
    );
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Security"
          description="Monitor threats, anomalies, and system integrity events"
        />

        <SecurityKPIRow summary={summary} loading={loading} />

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>
          <ThreatTimeline events={events} loading={loading} onSelect={setSelected} />
          <EventsTable events={events} loading={loading} onSelect={setSelected} onResolve={handleResolve} />
        </div>
      </div>

      <EventDetailModal event={selected} onClose={() => setSelected(null)} />
    </PageTransition>
  );
}
