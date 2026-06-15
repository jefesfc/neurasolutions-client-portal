import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, X, Plus, Clock, CheckCircle2, AlertCircle, TrendingUp, Users, Calendar, Maximize2, Minimize2 } from 'lucide-react';
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
type SortKey  = 'latest' | 'oldest' | 'amount';

const CYAN = '#06b6d4';
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
  const [activePanel, setActivePanel]   = useState<PanelKey | null>(null);
  const [sort, setSort]                 = useState<SortKey>('latest');
  const [invoices, setInvoices]         = useState<ClientInvoice[]>([]);
  const [summary, setSummary]           = useState<InvoicingSummary | null>(null);
  const [projData, setProjData]         = useState<ProjectionData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [hoveredCard, setHoveredCard]   = useState<PanelKey | null>(null);
  const [hoveredRow, setHoveredRow]     = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  /* Prevent body scroll in fullscreen */
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  /* Escape key — exit fullscreen or close panel */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) { setIsFullscreen(false); return; }
        if (activePanel)  { setActivePanel(null); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen, activePanel]);

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

  function panelCount(key: PanelKey)  { return key === 'projections' ? 0 : invoices.filter(i => i.status === key).length; }
  function panelTotal(key: PanelKey)  {
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

  /* ── Expanded panel content ──────────────────────────────────────────── */
  const expandedPanel = activePanel && activeMeta ? (
    <div style={{
      background: '#fff',
      borderTop: `3px solid ${activeMeta.color}`,
      borderLeft:   `1px solid ${activeMeta.color}30`,
      borderRight:  `1px solid ${activeMeta.color}30`,
      borderBottom: `1px solid ${activeMeta.color}30`,
      ...(isFullscreen ? { borderRadius: 20, maxHeight: '92vh', overflowY: 'auto' } : { borderRadius: '0 0 16px 16px', overflow: 'hidden' }),
      boxShadow: isFullscreen ? '0 24px 80px rgba(0,0,0,0.28)' : '0 8px 32px rgba(0,0,0,0.08)',
      animation: 'fadeIn 0.18s ease',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        padding: '16px 24px',
        background: `linear-gradient(to right, ${activeMeta.gradFrom}, #fff)`,
        borderBottom: '1px solid #f1f5f9',
        position: isFullscreen ? 'sticky' : 'static',
        top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: activeMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <activeMeta.Icon size={17} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {activeMeta.label}{activePanel !== 'projections' ? ' ' + T.invoicing.invoices : ''}
            </p>
            {activePanel !== 'projections' && (
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                {panelInvoices(activePanel).length} records · {panelTotal(activePanel)}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activePanel !== 'projections' && (
            <div style={{ display: 'flex', gap: 2, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 3 }}>
              {([
                { key: 'latest' as SortKey, label: T.invoicing.sortLatest },
                { key: 'oldest' as SortKey, label: T.invoicing.sortOldest },
                { key: 'amount' as SortKey, label: T.invoicing.sortAmount },
              ]).map(({ key: s, label }) => (
                <button key={s} onClick={e => { e.stopPropagation(); setSort(s); }} style={{
                  padding: '5px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: sort === s ? 600 : 400,
                  background: sort === s ? '#fff' : 'transparent',
                  color: sort === s ? activeMeta.color : '#94a3b8',
                  boxShadow: sort === s ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>
          )}
          {activePanel !== 'projections' && canEdit && (
            <button onClick={e => e.stopPropagation()} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, border: 'none',
              background: activeMeta.color, color: '#fff',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              boxShadow: `0 2px 8px ${activeMeta.color}40`,
            }}>
              <Plus size={14} /> {T.invoicing.newBtn}
            </button>
          )}
          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(f => !f)}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Expand fullscreen'}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${isFullscreen ? CYAN + '60' : '#e2e8f0'}`,
              background: isFullscreen ? `${CYAN}12` : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: isFullscreen ? CYAN : '#64748b',
              transition: 'all 0.15s',
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          {/* Close */}
          <button
            onClick={() => { setActivePanel(null); setIsFullscreen(false); }}
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
                {T.invoicing.noInvoices(activeMeta.label.toLowerCase())}
              </div>
            ) : (
              panelInvoices(activePanel).map(inv => (
                <ClientInvoiceCard
                  key={inv.id} invoice={inv}
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
  ) : null;

  return (
    <PageTransition>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <PageHeader title={t('pages.invoicing.title')} description={t('pages.invoicing.desc')} />
          <button
            onClick={() => void fetchAll()}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s' }}
          >
            <RefreshCw size={14} /> {T.invoicing.refresh}
          </button>
        </div>

        {/* KPI row */}
        <InvoicingSummaryCards summary={summary} loading={loading} />

        {/* 4 Panel Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, alignItems: 'stretch' }}>
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
                role="button"
                tabIndex={0}
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
                {/* Card content */}
                <div style={{ padding: '20px 22px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `linear-gradient(135deg, ${panel.gradFrom}, ${panel.gradTo})`,
                        border: `1px solid ${panel.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'transform 0.15s',
                        transform: isCyan ? 'scale(1.06)' : 'scale(1)',
                      }}>
                        <panel.Icon size={20} color={isCyan ? CYAN : panel.color} />
                      </div>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{panel.label}</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0', lineHeight: 1 }}>
                          {panel.key === 'projections' ? T.invoicing.financialForecast : loading ? '—' : `${count} ${T.invoicing.invoices.toLowerCase()}`}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: isActive ? panel.color : isCyan ? `${CYAN}12` : '#f8fafc',
                      border: `1px solid ${isActive ? panel.color : isCyan ? CYAN : '#e2e8f0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s', flexShrink: 0,
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

                  {/* Divider */}
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
                            padding: '8px 8px',
                            margin: '0 -8px',
                            borderRadius: 7,
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
                            £{Number(inv.amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          { Icon: Calendar, label: T.invoicing.revenueLabel,   value: '1 / 3 / 5 / 10 yr' },
                        ].map(({ Icon, label, value }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: isCyan ? `${CYAN}10` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
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

                {/* Footer strip */}
                <div style={{
                  padding: '9px 22px', marginTop: 14,
                  background: isActive ? `${panel.color}08` : isCyan ? `${CYAN}06` : '#fafbfc',
                  borderTop: `1px solid ${isCyan ? CYAN + '20' : '#f1f5f9'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.15s, border-color 0.15s',
                }}>
                  <span style={{ fontSize: 11, color: isActive ? panel.color : isCyan ? CYAN : '#94a3b8', fontWeight: isActive || isCyan ? 600 : 400, transition: 'color 0.15s' }}>
                    {isActive ? T.invoicing.panelOpen : isCyan ? T.invoicing.clickOpen : T.invoicing.tapOpen}
                  </span>
                  {panel.key !== 'projections' && count > 3 && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>+{count - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline expanded panel (non-fullscreen) */}
        {!isFullscreen && expandedPanel}

      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && activePanel && (
        <>
          <div
            onClick={() => setIsFullscreen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 999, backdropFilter: 'blur(3px)' }}
          />
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(96vw, 1260px)',
            zIndex: 1000,
          }}>
            {expandedPanel}
          </div>
        </>
      )}
    </PageTransition>
  );
}
