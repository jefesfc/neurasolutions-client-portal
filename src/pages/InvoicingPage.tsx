import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { InvoicingSummaryCards } from '../components/invoicing/InvoicingSummaryCards';
import { ClientInvoiceCard } from '../components/invoicing/ClientInvoiceCard';
import { FinancialProjections } from '../components/invoicing/FinancialProjections';
import { useAuthStore } from '../store/auth-store';
import type { ClientInvoice, InvoicingSummary, ProjectionData } from '../types/invoicing';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const TABS = [
  { id: 'all',         label: 'All' },
  { id: 'pending',     label: 'Pending' },
  { id: 'paid',        label: 'Paid' },
  { id: 'overdue',     label: 'Overdue' },
  { id: 'projections', label: 'Projections' },
];

export default function InvoicingPage() {
  const { token, user } = useAuthStore();
  const [tab, setTab]             = useState('all');
  const [invoices, setInvoices]   = useState<ClientInvoice[]>([]);
  const [summary, setSummary]     = useState<InvoicingSummary | null>(null);
  const [projData, setProjData]   = useState<ProjectionData | null>(null);
  const [loading, setLoading]     = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [invRes, sumRes, projRes] = await Promise.all([
        fetch(`${API_URL}/invoicing`, { headers }),
        fetch(`${API_URL}/invoicing/summary`, { headers }),
        fetch(`${API_URL}/invoicing/projections`, { headers }),
      ]);
      setInvoices(await invRes.json() as ClientInvoice[]);
      setSummary(await sumRes.json() as InvoicingSummary);
      setProjData(await projRes.json() as ProjectionData);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function handleMarkPaid(id: string) {
    await fetch(`${API_URL}/invoicing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString().split('T')[0] }),
    });
    void fetchAll();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice?')) return;
    await fetch(`${API_URL}/invoicing/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    void fetchAll();
  }

  const filtered = tab === 'all' || tab === 'projections'
    ? invoices
    : invoices.filter(inv => inv.status === tab);

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <PageHeader
            title="Invoicing"
            description="Client invoices, revenue tracking, and financial projections"
          />
          <button onClick={() => void fetchAll()} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <InvoicingSummaryCards summary={summary} loading={loading} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.id ? '#6366f1' : '#64748b',
                borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'projections' ? (
          <FinancialProjections data={projData} loading={loading} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 220, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }} />
              ))
            ) : filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
                No invoices found.
              </div>
            ) : (
              filtered.map(inv => (
                <ClientInvoiceCard
                  key={inv.id}
                  invoice={inv}
                  onMarkPaid={canEdit ? handleMarkPaid : () => {}}
                  onEdit={canEdit ? () => {} : () => {}}
                  onDelete={canEdit ? handleDelete : () => {}}
                />
              ))
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
