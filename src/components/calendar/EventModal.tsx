import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useAuthStore } from '../../store/auth-store';
import { postgrest } from '../../lib/postgrest';
import type { CalendarEvent, CalendarEventInput, EventCategory, EventStatus, RecurrenceFreq } from '../../types/calendar';
import type { Lead, Contact } from '../../types/aios';
import { CATEGORY_CONFIG } from '../../types/calendar';
import { EventBadge } from './EventBadge';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

const CATEGORIES: EventCategory[] = ['meeting', 'invoice', 'contract', 'reminder', 'other'];
const STATUSES: EventStatus[]     = ['pending', 'done', 'cancelled'];
const RECURRENCE_OPTS: { value: RecurrenceFreq | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
];

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
  const isEdit = Boolean(event);

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
  const [linkedType, setLinkedType]   = useState<'lead' | 'contact' | ''>('');
  const [linkedId, setLinkedId]       = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('GBP');
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [contacts, setContacts]       = useState<Contact[]>([]);
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
      postgrest.get<Contact>('contacts', { order: 'name.asc', limit: 200 }).then(setContacts).catch(() => {});
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
    <Modal open={isOpen} onClose={onClose} title={isEdit ? 'Edit Event' : 'New Event'} size="lg">
      {!canEdit && event ? (
        <div className="space-y-3">
          <div><EventBadge category={event.category} size="md" /></div>
          <p className="text-lg font-semibold">{event.title}</p>
          {event.description && <p className="text-sm text-surface-400">{event.description}</p>}
          <p className="text-sm text-surface-300">{new Date(event.start_at).toLocaleString()}</p>
          {event.amount != null && (
            <p className="text-sm font-medium">{event.currency} {event.amount.toLocaleString()}</p>
          )}
          <div className="pt-2"><Button variant="secondary" onClick={onClose}>Close</Button></div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as EventCategory)}
              className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded" />
            <span className="text-sm text-surface-700">All day</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Start *</label>
            <Input
              type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? startAt.split('T')[0] : startAt}
              onChange={e => setStartAt(allDay ? `${e.target.value}T00:00` : e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">End (optional)</label>
            <Input
              type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? (endAt.split('T')[0] ?? '') : endAt}
              onChange={e => setEndAt(allDay ? `${e.target.value}T23:59` : e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Recurrence</label>
            <div className="flex gap-2">
              <select
                value={recurrFreq}
                onChange={e => setRecurrFreq(e.target.value as RecurrenceFreq | '')}
                className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                <label className="block text-xs text-surface-500 mb-1">Until (optional)</label>
                <Input type="date" value={recurrUntil} onChange={e => setRecurrUntil(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Link to (optional)</label>
            <div className="flex gap-2">
              <select
                value={linkedType}
                onChange={e => { setLinkedType(e.target.value as 'lead' | 'contact' | ''); setLinkedId(''); }}
                className="w-32 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">None</option>
                <option value="lead">Lead</option>
                <option value="contact">Contact</option>
              </select>
              {linkedType === 'lead' && (
                <select value={linkedId} onChange={e => setLinkedId(e.target.value)}
                  className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select lead…</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.email}</option>)}
                </select>
              )}
              {linkedType === 'contact' && (
                <select value={linkedId} onChange={e => setLinkedId(e.target.value)}
                  className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select contact…</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company ?? c.email}</option>)}
                </select>
              )}
            </div>
          </div>

          {showAmountField && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-surface-700 mb-1">Amount</label>
                <Input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-surface-700 mb-1">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option>GBP</option><option>EUR</option><option>USD</option>
                </select>
              </div>
            </div>
          )}

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as EventStatus)}
                className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Description (optional)</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Notes…" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            {isEdit && (
              <Button type="button" variant="secondary" loading={deleting} onClick={() => void handleDelete()}>
                Delete
              </Button>
            )}
            <div className={`flex gap-2 ${isEdit ? '' : 'ml-auto'}`}>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={saving}>{isEdit ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
