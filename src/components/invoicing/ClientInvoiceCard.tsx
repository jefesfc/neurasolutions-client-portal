import { Building2, Calendar, FileText, MoreHorizontal, Check, Edit2, Trash2, CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { ClientInvoice } from '../../types/invoicing';
import { STATUS_CONFIG } from '../../types/invoicing';

interface Props {
  invoice: ClientInvoice;
  onMarkPaid: (id: string) => void;
  onEdit: (inv: ClientInvoice) => void;
  onDelete: (id: string) => void;
  onRequestPayment?: (id: string) => Promise<void>;
}

export function ClientInvoiceCard({ invoice, onMarkPaid, onEdit, onDelete, onRequestPayment }: Props) {
  const [menu, setMenu] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const cfg = STATUS_CONFIG[invoice.status];
  const sym = invoice.currency === 'GBP' ? '£' : invoice.currency === 'EUR' ? '€' : invoice.currency === 'AED' ? 'د.إ' : '$';
  const fmt = (v: number) => `${sym}${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const canPay = (invoice.status === 'pending' || invoice.status === 'overdue') && !!onRequestPayment;

  async function handleRequestPayment() {
    if (!onRequestPayment) return;
    setPayLoading(true);
    try { await onRequestPayment(invoice.id); } finally { setPayLoading(false); }
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Building2 size={14} color="#6366f1" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{invoice.client_company ?? 'Unknown client'}</span>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{invoice.client_name}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}>
              <MoreHorizontal size={16} />
            </button>
            {menu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', zIndex: 20,
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 140, overflow: 'hidden',
              }}>
                {invoice.status === 'pending' && (
                  <button onClick={() => { onMarkPaid(invoice.id); setMenu(false); }} style={{ width: '100%', padding: '9px 14px', textAlign: 'left', fontSize: 12, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Check size={13} /> Mark as Paid
                  </button>
                )}
                <button onClick={() => { onEdit(invoice); setMenu(false); }} style={{ width: '100%', padding: '9px 14px', textAlign: 'left', fontSize: 12, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit2 size={13} /> Edit
                </button>
                <button onClick={() => { onDelete(invoice.id); setMenu(false); }} style={{ width: '100%', padding: '9px 14px', textAlign: 'left', fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', fontWeight: 600 }}>AMOUNT</p>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>{fmt(invoice.amount)}</p>
        {invoice.description && <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoice.description}</p>}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 2px', fontWeight: 600 }}>ISSUED</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} color="#6366f1" />
            <span style={{ fontSize: 12, color: '#334155' }}>{new Date(invoice.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
        {invoice.due_date && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 2px', fontWeight: 600 }}>DUE</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} color="#f59e0b" />
              <span style={{ fontSize: 12, color: '#334155' }}>{new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={11} color="#94a3b8" />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{invoice.invoice_number}</span>
        </div>
        {canPay && (
          <button
            onClick={handleRequestPayment}
            disabled={payLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: payLoading ? '#e0e7ff' : '#6366f1', color: '#fff',
              border: 'none', borderRadius: 7, padding: '5px 12px',
              fontSize: 11, fontWeight: 600, cursor: payLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {payLoading
              ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><CreditCard size={11} /> Request Payment</>
            }
          </button>
        )}
      </div>
    </div>
  );
}
