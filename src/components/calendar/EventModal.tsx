import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useAuthStore } from '../../store/auth-store';
import { postgrest } from '../../lib/postgrest';
import type { CalendarEvent, CalendarEventInput, EventCategory, EventStatus, RecurrenceFreq } from '../../types/calendar';
import type { Lead, Client } from '../../types/aios';
import { CATEGORY_CONFIG } from '../../types/calendar';
import { EventBadge } from './EventBadge';
import { useTranslations } from '../../i18n/useT';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

const CATEGORIES: EventCategory[] = ['meeting', 'invoice', 'contract', 'reminder', 'other'];
const STATUSES: EventStatus[]     = ['pending', 'done', 'cancelled'];

const selectCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";
const labelCls  = "block text-sm font-medium text-slate-700 mb-1";

interface Props {
  event: CalendarEvent | null;
  defaultDate?: Date | null;
  isOpen: boolean;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function toDatetimeLocal(iso: string): string {
  return iso ? iso.slice(0, 16) : '';
}

export function EventModal({ event, defaultDate, isOpen, canEdit, onClose, onSaved }: Props) {
  const { token } = useAuthStore();
  const T = useTranslations();
  const isEdit = Boolean(event);

  const RECURRENCE_OPTS: { value: RecurrenceFreq | ''; label: string }[] = [
    { value: '',        label: T.calendar.recNone    },
    { value: 'daily',   label: T.calendar.recDaily   },
    { value: 'weekly',  label: T.calendar.recWeekly  },
    { value: 'monthly', label: T.calendar.recMonthly },
    { value: 'yearly',  label: T.calendar.recYearly  },
  ];

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]       = useState<EventCategory>('meeting');
  const [startAt, setStartAt]         = useState('');
  const [endAt, setEndAt]             = useState('');
  const [allDay, setAllDay]           = useState(false);
  const [status, setStatus]           = useState<EventStatus>('pending');
  const [recurrFreq, setRecurrFreq]   = useState<RecurrenceFreq | ''>('');
  const [recurrInterval, setRecurrInterval] = useState(1);
  const [recurrUntil, setRecurrUntil] = useState('');
  const [linkedType, setLinkedType]   = useState<'lead' | 'client' | ''>('');
  const [linkedId, setLinkedId]       = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('GBP');
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [clients, setClients]         = useState<Client[]>([]);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? '');
      setCategory(event.category);
      setStartAt(toDatetimeLocal(event.start_at));
      setEndAt(event.end_at ? toDatetimeLocal(event.end_at) : '');
      setAllDay(event.all_day);
      setStatus(event.status);
      setRecurrFreq(event.recurrence_rule?.freq ?? '');
      setRecurrInterval(event.recurrence_rule?.interval ?? 1);
      setRecurrUntil(event.recurrence_rule?.until ?? '');
      setLinkedType(event.linked_type ?? '');
      setLinkedId(event.linked_id ?? '');
      setAmount(event.amount != null ? String(event.amount) : '');
      setCurrency(event.currency ?? 'GBP');
    } else {
      setTitle(''); setDescription(''); setCategory('meeting');
      const d = defaultDate ?? new Date();
      setStartAt(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T09:00`);
      setEndAt(''); setAllDay(false); setStatus('pending');
      setRecurrFreq(''); setRecurrInterval(1); setRecurrUntil('');
      setLinkedType(''); setLinkedId(''); setAmount(''); setCurrency('GBP');
    }
    setError(null);
  }, [event, defaultDate, isOpen]);

  useEffect(() => {
    if (!linkedType) return;
    if (linkedType === 'lead') {
      postgrest.get<Lead>('leads', { order: 'name.asc', limit: 200 }).then(setLeads).catch(() => {});
    } else {
      postgrest.get<Client>('clients', { order: 'name.asc', limit: 200 }).then(setClients).catch(() => {});
    }
  }, [linkedType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError(null);

    const body: CalendarEventInput & { status?: EventStatus } = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      start_at: allDay ? `${startAt.split('T')[0]}T00:00:00Z` : new Date(startAt).toISOString(),
      end_at: endAt ? (allDay ? `${endAt.split('T')[0]}T23:59:59Z` : new Date(endAt).toISOString()) : undefined,
      all_day: allDay,
      recurrence_rule: recurrFreq ? { freq: recurrFreq, interval: recurrInterval, until: recurrUntil || undefined } : undefined,
      linked_type: linkedType || undefined,
      linked_id: linkedId || undefined,
      amount: amount ? parseFloat(amount) : undefined,
      currency,
      ...(isEdit ? { status } : {}),
    };

    try {
      const url = isEdit ? `${API_URL}/calendar/${event!.id}` : `${API_URL}/calendar`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to save');
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canEdit || !event) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/calendar/${event.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const showAmountField = category === 'invoice' || category === 'contract';

  return (
    <Modal open={isOpen} onClose={onClose} title={isEdit ? T.calendar.editEvent : T.calendar.newEvent} size="lg">
      {!canEdit && event ? (
        <div className="space-y-3">
          <div><EventBadge category={event.category} size="md" /></div>
          <p className="text-lg font-semibold text-slate-800">{event.title}</p>
          {event.description && <p className="text-sm text-slate-500">{event.description}</p>}
          <p className="text-sm text-slate-600">{new Date(event.start_at).toLocaleString()}</p>
          {event.amount != null && (
            <p className="text-sm font-medium text-slate-700">{event.currency} {event.amount.toLocaleString()}</p>
          )}
          <div className="pt-2"><Button variant="secondary" onClick={onClose}>{T.common.close}</Button></div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className={labelCls}>{T.calendar.titleLabel} *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={T.calendar.titleLabel} required />
          </div>

          <div>
            <label className={labelCls}>{T.calendar.category} *</label>
            <select value={category} onChange={e => setCategory(e.target.value as EventCategory)} className={selectCls}>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded accent-brand-500" />
            <span className="text-sm text-slate-600">{T.calendar.allDay}</span>
          </label>

          <div>
            <label className={labelCls}>{T.calendar.start} *</label>
            <Input
              type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? startAt.split('T')[0] : startAt}
              onChange={e => setStartAt(allDay ? `${e.target.value}T00:00` : e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelCls}>{T.calendar.end}</label>
            <Input
              type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? (endAt.split('T')[0] ?? '') : endAt}
              onChange={e => setEndAt(allDay ? `${e.target.value}T23:59` : e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>{T.calendar.recurrence}</label>
            <div className="flex gap-2">
              <select
                value={recurrFreq}
                onChange={e => setRecurrFreq(e.target.value as RecurrenceFreq | '')}
                className={`flex-1 ${selectCls}`}
              >
                {RECURRENCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {recurrFreq && (
                <Input
                  type="number" min={1} max={99}
                  value={recurrInterval}
                  onChange={e => setRecurrInterval(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
              )}
            </div>
            {recurrFreq && (
              <div className="mt-2">
                <label className="block text-xs text-slate-500 mb-1">{T.calendar.until}</label>
                <Input type="date" value={recurrUntil} onChange={e => setRecurrUntil(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>{T.calendar.linkTo}</label>
            <div className="flex gap-2">
              <select
                value={linkedType}
                onChange={e => { setLinkedType(e.target.value as 'lead' | 'client' | ''); setLinkedId(''); }}
                className={`w-32 ${selectCls}`}
              >
                <option value="">{T.calendar.linkNone}</option>
                <option value="lead">{T.calendar.linkLead}</option>
                <option value="client">{T.calendar.linkContact}</option>
              </select>
              {linkedType === 'lead' && (
                <select value={linkedId} onChange={e => setLinkedId(e.target.value)} className={`flex-1 ${selectCls}`}>
                  <option value="">{T.calendar.selectLead}</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.email}</option>)}
                </select>
              )}
              {linkedType === 'client' && (
                <select value={linkedId} onChange={e => setLinkedId(e.target.value)} className={`flex-1 ${selectCls}`}>
                  <option value="">{T.calendar.selectContact}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company} — {c.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {showAmountField && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>{T.calendar.amount}</label>
                <Input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="w-24">
                <label className={labelCls}>{T.calendar.currency}</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectCls}>
                  <option>GBP</option><option>EUR</option><option>USD</option>
                </select>
              </div>
            </div>
          )}

          {isEdit && (
            <div>
              <label className={labelCls}>{T.calendar.statusLabel}</label>
              <select value={status} onChange={e => setStatus(e.target.value as EventStatus)} className={selectCls}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>{T.calendar.description}</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Notes…" />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            {isEdit && (
              <Button type="button" variant="danger" loading={deleting} onClick={() => void handleDelete()}>
                Delete
              </Button>
            )}
            <div className={`flex gap-2 ${isEdit ? '' : 'ml-auto'}`}>
              <Button type="button" variant="secondary" onClick={onClose}>{T.common.cancel}</Button>
              <Button type="submit" loading={saving}>{isEdit ? T.common.save : T.common.new}</Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
