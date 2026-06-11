import { PoundSterling, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { InvoicingSummary } from '../../types/invoicing';

interface Props { summary: InvoicingSummary | null; loading: boolean; currency?: string; }

export function InvoicingSummaryCards({ summary, loading, currency = 'GBP' }: Props) {
  const sym = currency === 'GBP' ? '£' : '$';
  const fmt = (v: string | undefined) => v ? `${sym}${parseFloat(v).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—';

  const cards = [
    { icon: CheckCircle2, label: 'Collected',     value: fmt(summary?.total_collected), sub: `${summary?.paid_count ?? '0'} paid invoices`,       color: '#10b981' },
    { icon: Clock,        label: 'Pending',        value: fmt(summary?.total_pending),   sub: `${summary?.pending_count ?? '0'} awaiting payment`,  color: '#f59e0b' },
    { icon: AlertCircle,  label: 'Overdue',        value: fmt(summary?.total_overdue),   sub: `${summary?.overdue_count ?? '0'} overdue invoices`,   color: '#ef4444' },
    { icon: PoundSterling,   label: 'Total Invoiced', value: loading ? '—' : (() => {
      const total = parseFloat(summary?.total_collected ?? '0') + parseFloat(summary?.total_pending ?? '0') + parseFloat(summary?.total_overdue ?? '0');
      return `${sym}${total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    })(), sub: `${summary?.total_invoices ?? '0'} total invoices`, color: '#6366f1' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {cards.map(card => (
        <div key={card.label} style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: 18, display: 'flex', alignItems: 'flex-start', gap: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <card.icon size={18} color={card.color} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{card.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{loading ? '—' : card.value}</p>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
