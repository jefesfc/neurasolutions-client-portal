import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, Plus, Clock, CheckCircle2, AlertCircle, TrendingUp, Users, Calendar, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { useT, useTranslations } from '../i18n/useT';
import { InvoicingSummaryCards } from '../components/invoicing/InvoicingSummaryCards';
import { ClientInvoiceCard } from '../components/invoicing/ClientInvoiceCard';
import { FinancialProjections } from '../components/invoicing/FinancialProjections';
import { useAuthStore } from '../store/auth-store';
import type { ClientInvoice, InvoicingSummary, ProjectionData } from '../types/invoicing';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type PanelKey = 'pending' | 'paid' | 'overdue' | 'projections';
type SortKey  = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

const CYAN   = '#06b6d4';
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';

export default function InvoicingPage() {
  const t = useT();
  const T = useTranslations();
  const { token, user } = useAuthStore();

  const PANELS: {
    key: PanelKey; label: string; metricLabel: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
    color: string; gradFrom: string; gradTo: string;
  }[] = [
    { key: 'pending',     label: T.invoicing.panelPending,     metricLabel: T.invoicing.metricOutstanding, Icon: Clock,        color: '#f59e0b', gradFrom: '#fef3c7', gradTo: '#fffbeb' },
    { key: 'paid',        label: T.invoicing.panelPaid,        metricLabel: T.invoicing.metricCollected,   Icon: CheckCircle2, color: '#10b981', gradFrom: '#d1fae5', gradTo: '#f0fdf4' },
    { key: 'overdue',     label: T.invoicing.panelOverdue,     metricLabel: T.invoicing.metricOverdue,     Icon: AlertCircle,  color: '#ef4444', gradFrom: '#fee2e2', gradTo: '#fef2f2' },
    { key: 'projections', label: T.invoicing.panelProjections, metricLabel: T.invoicing.metricForecast,    Icon: TrendingUp,   color: '#6366f1', gradFrom: '#e0e7ff', gradTo: '#eef2ff' },
  ];

  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [sort, setSort]               = useState<SortKey>('date_desc');
  const [invoices, setInvoices]       = useState<ClientInvoice[]>([]);
  const [summary, setSummary]         = useState<InvoicingSummary | null>(null);
  const [projData, setProjData]       = useState<ProjectionData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [hoveredCard, setHoveredCard] = useState<PanelKey | null>(null);
  const [hoveredRow, setHoveredRow]   = useState<string | null>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  /* Escape closes drawer */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActivePanel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Lock body scroll when drawer open */
  useEffect(() => {
    document.body.style.overflow = activePanel ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [activePanel]);

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

  /* Refresh after Stripe redirect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid')) {
      void fetchAll();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchAll]);

  async function handleMarkPaid(id: string) {
    await fetch(`${API_URL}/invoicing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString().split('T')[0] }),
    });
    void fetchAll();
  }

  async function handleRequestPayment(id: string) {
    const res = await fetch(`${API_URL}/stripe/checkout/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      alert(err.error ?? 'Failed to create payment link');
      return;
    }
    const { url } = await res.json() as { url: string };
    window.location.href = url;
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice?')) return;
    await fetch(`${API_URL}/invoicing/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    void fetchAll();
  }

  function panelCount(key: PanelKey)  { return key === 'projections' ? 0 : invoices.filter(i => i.status === key).length; }
  function panelTotal(key: PanelKey)  {
    if (key === 'projections') return '';
    const total = invoices.filter(i => i.status === key).reduce((s, i) => s + Number(i.amount), 0);
    return `£${total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  function panelInvoices(key: PanelKey): ClientInvoice[] {
    const base = key === 'projections' ? [] : invoices.filter(i => i.status === key);
    switch (sort) {
      case 'date_desc':   return [...base].sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
      case 'date_asc':    return [...base].sort((a, b) => new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime());
      case 'amount_desc': return [...base].sort((a, b) => Number(b.amount) - Number(a.amount));
      case 'amount_asc':  return [...base].sort((a, b) => Number(a.amount) - Number(b.amount));
    }
  }

  const activeMeta = PANELS.find(p => p.key === activePanel);

  /* Sort toggle helpers */
  function toggleDateSort()   { setSort(s => s === 'date_desc'   ? 'date_asc'   : 'date_desc'); }
  function toggleAmountSort() { setSort(s => s === 'amount_desc' ? 'amount_asc' : 'amount_desc'); }

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 500, transition: 'all 0.15s',
  };

  return (
    <PageTransition>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <PageHeader title={t('pages.invoicing.title')} description={t('pages.invoicing.desc')} />
          <button
            onClick={() => void fetchAll()}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <RefreshCw size={14} /> {T.invoicing.refresh}
          </button>
        </div>

        {/* KPI row */}
        <InvoicingSummaryCards summary={summary} loading={loading} />

        {/* 4 Panel Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {PANELS.map(panel => {
            const isActive = activePanel === panel.key;
            const isCyan   = hoveredCard === panel.key && !isActive;
            const count    = panelCount(panel.key);
            const total    = panelTotal(panel.key);
            const preview  = invoices.filter(i => i.status === panel.key).slice(0, 3);
            const borderColor = isActive ? panel.color + '60' : isCyan ? CYAN : '#e8ecf0';

            return (
              <div
                key={panel.key}
                role="button" tabIndex={0}
                onClick={() => setActivePanel(isActive ? null : panel.key)}
                onKeyDown={e => e.key === 'Enter' && setActivePanel(isActive ? null : panel.key)}
                onMouseEnter={() => setHoveredCard(panel.key)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: '#fff',
                  borderTop: `4px solid ${isCyan ? CYAN : panel.color}`,
                  borderLeft:   `1px solid ${borderColor}`,
                  borderRight:  `1px solid ${borderColor}`,
                  borderBottom: `1px solid ${borderColor}`,
                  borderRadius: '0 0 16px 16px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.18s, border-color 0.18s',
                  boxShadow: isActive
                    ? `0 0 0 3px ${panel.color}20, 0 8px 24px rgba(0,0,0,0.10)`
                    : isCyan
                      ? `0 0 0 2px ${CYAN}30, 0 6px 22px rgba(6,182,212,0.18)`
                      : '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex', flexDirection: 'column',
                  outline: 'none', userSelect: 'none', overflow: 'hidden',
                }}
              >
                <div style={{ padding: '20px 22px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>

                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `linear-gradient(135deg, ${panel.gradFrom}, ${panel.gradTo})`,
                        border: `1px solid ${panel.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transform: isCyan ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.15s',
                      }}>
                        <panel.Icon size={20} color={isCyan ? CYAN : panel.color} />
                      </div>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{panel.label}</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>
                          {panel.key === 'projections' ? T.invoicing.financialForecast : loading ? '—' : `${count} ${T.invoicing.invoices.toLowerCase()}`}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: isActive ? panel.color : isCyan ? `${CYAN}12` : '#f8fafc',
                      border: `1px solid ${isActive ? panel.color : isCyan ? CYAN : '#e2e8f0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s',
                    }}>
                      <ChevronDown size={16}
                        color={isActive ? '#fff' : isCyan ? CYAN : '#94a3b8'}
                        style={{ transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      />
                    </div>
                  </div>

                  {/* Metric */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: isCyan ? CYAN : panel.color, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px', transition: 'color 0.15s' }}>
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

                  <div style={{ height: 1, background: isCyan ? `${CYAN}20` : '#f1f5f9', margin: '0 -22px 12px', transition: 'background 0.15s' }} />

                  {/* Preview rows */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {panel.key !== 'projections' ? (
                      !loading && preview.length > 0 ? preview.map((inv, idx) => (
                        <div
                          key={inv.id}
                          onMouseEnter={e => { e.stopPropagation(); setHoveredRow(inv.id); }}
                          onMouseLeave={e => { e.stopPropagation(); setHoveredRow(null); }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px', margin: '0 -8px', borderRadius: 7,
                            borderBottom: idx < preview.length - 1 ? '1px solid #f8fafc' : 'none',
                            background: hoveredRow === inv.id ? `${CYAN}08` : 'transparent',
                            transition: 'background 0.12s',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {inv.client_company ?? inv.client_name ?? '—'}
                            </p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                              {inv.status === 'paid' ? T.invoicing.paidOn(fmtDate(inv.paid_at)) : T.invoicing.dueOn(fmtDate(inv.due_date))}
                              {' · '}<span style={{ color: '#cbd5e1' }}>{inv.invoice_number}</span>
                            </p>
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: hoveredRow === inv.id ? CYAN : panel.color, margin: 0, flexShrink: 0, transition: 'color 0.12s' }}>
                            £{Number(inv.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )) : !loading ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>{T.invoicing.noInvoices(panel.label.toLowerCase())}</p>
                        </div>
                      ) : Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{ height: 34, background: '#f8fafc', borderRadius: 6, margin: '4px 0', animation: 'pulse 1.5s infinite' }} />
                      ))
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { Icon: Users,    label: T.invoicing.activeClients, value: loading ? '—' : String(projData?.active_clients.length ?? '—') },
                          { Icon: Calendar, label: T.invoicing.revenueLabel,  value: '1 / 3 / 5 / 10 yr' },
                        ].map(({ Icon, label, value }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: isCyan ? `${CYAN}10` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon size={14} color={isCyan ? CYAN : '#64748b'} />
                            </div>
                            <div>
                              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{label}</p>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div style={{
                  padding: '9px 22px', marginTop: 14,
                  background: isActive ? `${panel.color}08` : isCyan ? `${CYAN}06` : '#fafbfc',
                  borderTop: `1px solid ${isCyan ? CYAN + '20' : '#f1f5f9'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.15s',
                }}>
                  <span style={{ fontSize: 11, color: isActive ? panel.color : isCyan ? CYAN : '#94a3b8', fontWeight: isActive || isCyan ? 600 : 400 }}>
                    {isActive ? '✓ Open' : isCyan ? 'Click to open →' : T.invoicing.tapOpen}
                  </span>
                  {panel.key !== 'projections' && count > 3 && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>+{count - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Drawer ─────────────────────────────────────────────────────── */}
      {activePanel && activeMeta && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setActivePanel(null)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15,23,42,0.28)',
              zIndex: 300,
              backdropFilter: 'blur(2px)',
              animation: 'fadeOverlay 0.2s ease',
            }}
          />

          {/* Drawer panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0,
            height: '100dvh',
            width: 'min(580px, 97vw)',
            background: '#fff',
            zIndex: 301,
            boxShadow: '-4px 0 48px rgba(0,0,0,0.14)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.24s cubic-bezier(0.22,1,0.36,1)',
          }}>

            {/* Color accent bar */}
            <div style={{ height: 4, background: `linear-gradient(to right, ${activeMeta.color}, ${activeMeta.color}80)`, flexShrink: 0 }} />

            {/* Sticky header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid #f1f5f9',
              flexShrink: 0,
              background: `linear-gradient(160deg, ${activeMeta.gradFrom} 0%, #fff 100%)`,
            }}>
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: activePanel !== 'projections' ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: activeMeta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${activeMeta.color}40`,
                  }}>
                    <activeMeta.Icon size={20} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {activeMeta.label}{activePanel !== 'projections' ? ' Invoices' : ''}
                    </p>
                    {activePanel !== 'projections' && (
                      <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                        {panelInvoices(activePanel).length} records
                        {panelTotal(activePanel) ? ` · ${panelTotal(activePanel)}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setActivePanel(null)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: '1px solid #e2e8f0', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#94a3b8',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Sort + New (non-projections) */}
              {activePanel !== 'projections' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Sort buttons */}
                  <div style={{ display: 'flex', gap: 4, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 4, flex: 1 }}>
                    {/* Date sort */}
                    <button
                      onClick={toggleDateSort}
                      style={{
                        ...btnBase,
                        flex: 1, justifyContent: 'center',
                        background: sort.startsWith('date') ? '#fff' : 'transparent',
                        color: sort.startsWith('date') ? activeMeta.color : '#94a3b8',
                        fontWeight: sort.startsWith('date') ? 600 : 400,
                        boxShadow: sort.startsWith('date') ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      Date
                      {sort === 'date_desc' && <ArrowDown size={12} />}
                      {sort === 'date_asc'  && <ArrowUp   size={12} />}
                    </button>
                    {/* Amount sort */}
                    <button
                      onClick={toggleAmountSort}
                      style={{
                        ...btnBase,
                        flex: 1, justifyContent: 'center',
                        background: sort.startsWith('amount') ? '#fff' : 'transparent',
                        color: sort.startsWith('amount') ? activeMeta.color : '#94a3b8',
                        fontWeight: sort.startsWith('amount') ? 600 : 400,
                        boxShadow: sort.startsWith('amount') ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      Amount
                      {sort === 'amount_desc' && <ArrowDown size={12} />}
                      {sort === 'amount_asc'  && <ArrowUp   size={12} />}
                    </button>
                  </div>

                  {/* New invoice */}
                  {canEdit && (
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 10, border: 'none',
                      background: activeMeta.color, color: '#fff',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      boxShadow: `0 2px 8px ${activeMeta.color}40`,
                      flexShrink: 0,
                    }}>
                      <Plus size={14} /> {T.invoicing.newBtn}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable invoice list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {activePanel === 'projections' ? (
                <FinancialProjections data={projData} loading={loading} />
              ) : loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ height: 140, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              ) : panelInvoices(activePanel).length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: `${activeMeta.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <activeMeta.Icon size={24} color={activeMeta.color} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', margin: 0 }}>
                    {T.invoicing.noInvoices(activeMeta.label.toLowerCase())}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn 0.18s ease' }}>
                  {panelInvoices(activePanel).map(inv => (
                    <ClientInvoiceCard
                      key={inv.id}
                      invoice={inv}
                      onMarkPaid={canEdit ? handleMarkPaid : () => {}}
                      onEdit={canEdit ? () => {} : () => {}}
                      onDelete={canEdit ? handleDelete : () => {}}
                      onRequestPayment={canEdit ? handleRequestPayment : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </PageTransition>
  );
}
