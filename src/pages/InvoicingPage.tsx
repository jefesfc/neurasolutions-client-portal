import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, X, Plus, Clock, CheckCircle2, AlertCircle, TrendingUp, Users, Calendar } from 'lucide-react';
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
  metricLabel: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  gradFrom: string;
  gradTo: string;
}[] = [
  { key: 'pending',     label: 'Pending',     metricLabel: 'OUTSTANDING BALANCE', Icon: Clock,        color: '#f59e0b', gradFrom: '#fef3c7', gradTo: '#fffbeb' },
  { key: 'paid',        label: 'Paid',        metricLabel: 'TOTAL COLLECTED',     Icon: CheckCircle2, color: '#10b981', gradFrom: '#d1fae5', gradTo: '#f0fdf4' },
  { key: 'overdue',     label: 'Overdue',     metricLabel: 'OVERDUE BALANCE',     Icon: AlertCircle,  color: '#ef4444', gradFrom: '#fee2e2', gradTo: '#fef2f2' },
  { key: 'projections', label: 'Projections', metricLabel: 'FINANCIAL FORECAST',  Icon: TrendingUp,   color: '#6366f1', gradFrom: '#e0e7ff', gradTo: '#eef2ff' },
];

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';

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
    const t = invoices.filter(i => i.status === key).reduce((s, i) => s + Number(i.amount), 0);
    return `£${t.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function panelInvoices(key: PanelKey): ClientInvoice[] {
    const base = key === 'projections' ? [] : invoices.filter(i => i.status === key);
    if (sort === 'latest') return [...base].sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
    if (sort === 'oldest') return [...base].sort((a, b) => new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime());
    if (sort === 'amount') return [...base].sort((a, b) => Number(b.amount) - Number(a.amount));
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
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* KPI summary row */}
        <InvoicingSummaryCards summary={summary} loading={loading} />

        {/* 4 Panel Cards — 2×2 equal-height grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, alignItems: 'stretch' }}>
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
                  background: '#fff',
                  borderTop: `4px solid ${panel.color}`,
                  borderLeft: `1px solid ${isActive ? panel.color + '60' : '#e8ecf0'}`,
                  borderRight: `1px solid ${isActive ? panel.color + '60' : '#e8ecf0'}`,
                  borderBottom: `1px solid ${isActive ? panel.color + '60' : '#e8ecf0'}`,
                  borderRadius: '0 0 16px 16px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  boxShadow: isActive
                    ? `0 0 0 3px ${panel.color}20, 0 8px 24px rgba(0,0,0,0.10)`
                    : '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  outline: 'none',
                  userSelect: 'none',
                  overflow: 'hidden',
                }}
              >
                {/* Card inner padding wrapper */}
                <div style={{ padding: '20px 22px 0', display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>

                  {/* Header: icon + label + count + chevron */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `linear-gradient(135deg, ${panel.gradFrom}, ${panel.gradTo})`,
                        border: `1px solid ${panel.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <panel.Icon size={20} color={panel.color} />
                      </div>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{panel.label}</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0', lineHeight: 1 }}>
                          {panel.key === 'projections'
                            ? 'Financial forecast'
                            : loading ? '—' : `${count} invoice${count !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: isActive ? panel.color : '#f8fafc',
                      border: `1px solid ${isActive ? panel.color : '#e2e8f0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s', flexShrink: 0,
                    }}>
                      <ChevronDown
                        size={16}
                        color={isActive ? '#fff' : '#94a3b8'}
                        style={{ transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      />
                    </div>
                  </div>

                  {/* Metric block */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: panel.color, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>
                      {panel.metricLabel}
                    </p>
                    {panel.key !== 'projections' ? (
                      <p style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1 }}>
                        {loading ? '—' : total || '£0.00'}
                      </p>
                    ) : (
                      <div style={{ display: 'flex', gap: 24 }}>
                        <div>
                          <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: '0 0 2px' }}>MRR</p>
                          <p style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', margin: 0 }}>
                            {loading ? '—' : projData ? `£${Number(projData.mrr).toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : '—'}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: '0 0 2px' }}>ARR</p>
                          <p style={{ fontSize: 22, fontWeight: 800, color: '#10b981', margin: 0 }}>
                            {loading ? '—' : projData ? `£${Number(projData.arr).toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : '—'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: '#f1f5f9', margin: '0 -22px 14px' }} />

                  {/* Preview section — fills remaining space */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {panel.key !== 'projections' ? (
                      !loading && preview.length > 0 ? (
                        <>
                          {preview.map((inv, idx) => (
                            <div
                              key={inv.id}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '9px 0',
                                borderBottom: idx < preview.length - 1 ? '1px solid #f8fafc' : 'none',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {inv.client_company ?? inv.client_name ?? '—'}
                                </p>
                                <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                                  {inv.status === 'paid'
                                    ? `Paid ${fmtDate(inv.paid_at)}`
                                    : `Due ${fmtDate(inv.due_date)}`}
                                  {' · '}
                                  <span style={{ color: '#cbd5e1' }}>{inv.invoice_number}</span>
                                </p>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: panel.color, margin: 0 }}>
                                  £{Number(inv.amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : !loading ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
                          <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>No {panel.label.toLowerCase()} invoices</p>
                        </div>
                      ) : (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} style={{ height: 36, background: '#f8fafc', borderRadius: 6, margin: '4px 0', animation: 'pulse 1.5s infinite' }} />
                        ))
                      )
                    ) : (
                      /* Projections card extra info */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={14} color="#64748b" />
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Active Clients</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                              {loading ? '—' : projData?.active_clients.length ?? '—'}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={14} color="#64748b" />
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Revenue forecast</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>1 / 3 / 5 / 10 yr</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer strip */}
                <div style={{
                  padding: '10px 22px',
                  marginTop: 12,
                  background: isActive ? `${panel.color}08` : '#fafbfc',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 11, color: isActive ? panel.color : '#94a3b8', fontWeight: isActive ? 600 : 400 }}>
                    {isActive ? 'Panel open — scroll down' : 'Tap to open'}
                  </span>
                  {panel.key !== 'projections' && count > 3 && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>+{count - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded panel */}
        {activePanel && activeMeta && (
          <div style={{
            background: '#fff',
            border: `1px solid ${activeMeta.color}30`,
            borderTop: `3px solid ${activeMeta.color}`,
            borderRadius: '0 0 16px 16px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            animation: 'fadeIn 0.2s ease',
          }}>
            {/* Toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
              padding: '16px 24px',
              background: `linear-gradient(to right, ${activeMeta.gradFrom}, #fff)`,
              borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: activeMeta.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <activeMeta.Icon size={17} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {activeMeta.label}{activePanel !== 'projections' ? ' Invoices' : ''}
                  </p>
                  {activePanel !== 'projections' && (
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                      {panelInvoices(activePanel).length} records · {panelTotal(activePanel)}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {activePanel !== 'projections' && (
                  <div style={{ display: 'flex', gap: 2, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 3 }}>
                    {(['latest', 'oldest', 'amount'] as SortKey[]).map(s => (
                      <button
                        key={s}
                        onClick={e => { e.stopPropagation(); setSort(s); }}
                        style={{
                          padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: sort === s ? 600 : 400,
                          background: sort === s ? '#fff' : 'transparent',
                          color: sort === s ? activeMeta.color : '#94a3b8',
                          boxShadow: sort === s ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.15s', textTransform: 'capitalize',
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
                      boxShadow: `0 2px 8px ${activeMeta.color}40`,
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
                    cursor: 'pointer', color: '#94a3b8',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
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
