import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronRight, X, Plus, Clock, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { InvoicingSummaryCards } from '../components/invoicing/InvoicingSummaryCards';
import { ClientInvoiceCard } from '../components/invoicing/ClientInvoiceCard';
import { FinancialProjections } from '../components/invoicing/FinancialProjections';
import { useAuthStore } from '../store/auth-store';
import type { ClientInvoice, InvoicingSummary, ProjectionData } from '../types/invoicing';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type PanelKey = 'pending' | 'paid' | 'overdue' | 'projections';
type SortKey  = 'latest' | 'oldest' | 'amount';

const PANELS: {
  key: PanelKey;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bg: string;
}[] = [
  { key: 'pending',     label: 'Pending',     Icon: Clock,        color: '#f59e0b', bg: '#fffbeb' },
  { key: 'paid',        label: 'Paid',        Icon: CheckCircle2, color: '#10b981', bg: '#f0fdf4' },
  { key: 'overdue',     label: 'Overdue',     Icon: AlertCircle,  color: '#ef4444', bg: '#fef2f2' },
  { key: 'projections', label: 'Projections', Icon: TrendingUp,   color: '#6366f1', bg: '#eef2ff' },
];

export default function InvoicingPage() {
  const { token, user } = useAuthStore();
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [sort, setSort]               = useState<SortKey>('latest');
  const [invoices, setInvoices]       = useState<ClientInvoice[]>([]);
  const [summary, setSummary]         = useState<InvoicingSummary | null>(null);
  const [projData, setProjData]       = useState<ProjectionData | null>(null);
  const [loading, setLoading]         = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [invRes, sumRes, projRes] = await Promise.all([
        fetch(`${API_URL}/invoicing`, { headers: h }),
        fetch(`${API_URL}/invoicing/summary`, { headers: h }),
        fetch(`${API_URL}/invoicing/projections`, { headers: h }),
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
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    void fetchAll();
  }

  function panelCount(key: PanelKey): number {
    return key === 'projections' ? 0 : invoices.filter(i => i.status === key).length;
  }

  function panelTotal(key: PanelKey): string {
    if (key === 'projections') return '';
    const t = invoices.filter(i => i.status === key).reduce((s, i) => s + i.amount, 0);
    return `£${t.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  }

  function panelInvoices(key: PanelKey): ClientInvoice[] {
    const base = key === 'projections' ? [] : invoices.filter(i => i.status === key);
    if (sort === 'latest')  return [...base].sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
    if (sort === 'oldest')  return [...base].sort((a, b) => new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime());
    if (sort === 'amount')  return [...base].sort((a, b) => b.amount - a.amount);
    return base;
  }

  const activeMeta = PANELS.find(p => p.key === activePanel);

  return (
    <PageTransition>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <PageHeader title="Invoicing" description="Client invoices, revenue tracking, and financial projections" />
          <button
            onClick={() => void fetchAll()}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* KPI row */}
        <InvoicingSummaryCards summary={summary} loading={loading} />

        {/* 4 Panel Cards — 2×2 tablet grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {PANELS.map(panel => {
            const isActive = activePanel === panel.key;
            const count    = panelCount(panel.key);
            const total    = panelTotal(panel.key);
            const preview  = invoices.filter(i => i.status === panel.key).slice(0, 3);

            return (
              <div
                key={panel.key}
                role="button"
                tabIndex={0}
                onClick={() => setActivePanel(isActive ? null : panel.key)}
                onKeyDown={e => e.key === 'Enter' && setActivePanel(isActive ? null : panel.key)}
                style={{
                  background: isActive ? panel.bg : '#fff',
                  border: `2px solid ${isActive ? panel.color : '#e2e8f0'}`,
                  borderRadius: 20,
                  padding: 24,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                  boxShadow: isActive
                    ? `0 0 0 4px ${panel.color}18, 0 4px 20px rgba(0,0,0,0.08)`
                    : '0 1px 4px rgba(0,0,0,0.05)',
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                  userSelect: 'none',
                  outline: 'none',
                }}
              >
                {/* Card header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: isActive ? panel.color : `${panel.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}>
                      <panel.Icon size={22} color={isActive ? '#fff' : panel.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{panel.label}</p>
                      {panel.key !== 'projections' && (
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                          {loading ? '—' : `${count} invoice${count !== 1 ? 's' : ''}`}
                        </p>
                      )}
                      {panel.key === 'projections' && (
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Financial forecast</p>
                      )}
                    </div>
                  </div>

                  {/* Chevron toggle */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isActive ? panel.color : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}>
                    <ChevronRight
                      size={18}
                      color={isActive ? '#fff' : '#64748b'}
                      style={{ transform: isActive ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    />
                  </div>
                </div>

                {/* Total amount */}
                {panel.key !== 'projections' && (
                  <p style={{ fontSize: 30, fontWeight: 800, color: panel.color, margin: 0, lineHeight: 1 }}>
                    {loading ? '—' : total}
                  </p>
                )}

                {/* Projections MRR/ARR preview */}
                {panel.key === 'projections' && (
                  <div style={{ display: 'flex', gap: 28 }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>MRR</p>
                      <p style={{ fontSize: 24, fontWeight: 800, color: '#6366f1', margin: 0 }}>
                        {loading ? '—' : projData ? `£${projData.mrr.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>ARR</p>
                      <p style={{ fontSize: 24, fontWeight: 800, color: '#10b981', margin: 0 }}>
                        {loading ? '—' : projData ? `£${projData.arr.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mini invoice preview rows */}
                {panel.key !== 'projections' && !loading && preview.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {preview.map(inv => (
                      <div
                        key={inv.id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '7px 12px',
                          background: isActive ? 'rgba(255,255,255,0.65)' : '#f8fafc',
                          borderRadius: 9,
                          border: '1px solid',
                          borderColor: isActive ? `${panel.color}30` : '#f1f5f9',
                        }}
                      >
                        <span style={{ fontSize: 12, color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                          {inv.client_company ?? inv.client_name ?? '—'}
                        </span>
                        <span style={{ fontSize: 12, color: panel.color, fontWeight: 700, flexShrink: 0 }}>
                          £{inv.amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                    {count > 3 && (
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textAlign: 'center', paddingTop: 2 }}>
                        +{count - 3} more — tap to view all
                      </p>
                    )}
                  </div>
                )}

                {/* Empty state mini */}
                {panel.key !== 'projections' && !loading && count === 0 && (
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>No {panel.label.toLowerCase()} invoices</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Expanded panel */}
        {activePanel && activeMeta && (
          <div style={{
            background: '#fff',
            border: `1px solid ${activeMeta.color}40`,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            animation: 'fadeIn 0.2s ease',
          }}>
            {/* Panel toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              background: activeMeta.bg,
            }}>
              {/* Left: icon + label + count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: activeMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <activeMeta.Icon size={18} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {activeMeta.label} {activePanel !== 'projections' ? 'Invoices' : ''}
                  </p>
                  {activePanel !== 'projections' && (
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                      {panelInvoices(activePanel).length} record{panelInvoices(activePanel).length !== 1 ? 's' : ''} · {panelTotal(activePanel)}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: sort pills + new + close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {activePanel !== 'projections' && (
                  <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.8)', border: '1px solid #e2e8f0', borderRadius: 10, padding: 3 }}>
                    {(['latest', 'oldest', 'amount'] as SortKey[]).map(s => (
                      <button
                        key={s}
                        onClick={e => { e.stopPropagation(); setSort(s); }}
                        style={{
                          padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: sort === s ? 600 : 400,
                          background: sort === s ? '#fff' : 'transparent',
                          color: sort === s ? activeMeta.color : '#64748b',
                          boxShadow: sort === s ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s',
                          textTransform: 'capitalize',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {activePanel !== 'projections' && canEdit && (
                  <button
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', borderRadius: 10, border: 'none',
                      background: activeMeta.color, color: '#fff',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      boxShadow: `0 2px 8px ${activeMeta.color}50`,
                    }}
                  >
                    <Plus size={14} /> New
                  </button>
                )}

                <button
                  onClick={() => setActivePanel(null)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: '1px solid #e2e8f0', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#64748b', flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div style={{ padding: 24 }}>
              {activePanel === 'projections' ? (
                <FinancialProjections data={projData} loading={loading} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ height: 200, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', animation: 'pulse 1.5s infinite' }} />
                    ))
                  ) : panelInvoices(activePanel).length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 14 }}>
                      No {activeMeta.label.toLowerCase()} invoices found.
                    </div>
                  ) : (
                    panelInvoices(activePanel).map(inv => (
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
          </div>
        )}

      </div>
    </PageTransition>
  );
}
