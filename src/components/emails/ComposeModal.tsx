import { useState, useEffect } from 'react';
import { Send, ChevronDown, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useQuery } from '../../hooks/useQuery';
import { useAuthStore } from '../../store/auth-store';
import { useTranslations } from '../../i18n/useT';
import type { Client } from '../../types/aios';

declare const window: Window & { __env__?: { API_URL?: string } };
const API_URL =
  window.__env__?.API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  mode?: 'compose' | 'reply' | 'client';
}

export function ComposeModal({
  open,
  onClose,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  mode = 'compose',
}: ComposeModalProps) {
  const T = useTranslations();
  const token = useAuthStore((s) => s.token);

  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const { data: clients } = useQuery<Client>('clients', {
    select: 'id,name,email,company,status',
    order: 'name.asc',
    filters: { status: 'eq.active' },
  });

  useEffect(() => {
    if (open) {
      setTo(initialTo);
      setClientSearch('');
      setSubject(initialSubject);
      setBody(initialBody);
      setError('');
      setSuccess(false);
      setShowClientPicker(false);
    }
  }, [open, initialTo, initialSubject, initialBody]);

  const filteredClients = (clients ?? []).filter((c) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  function selectClient(client: Client) {
    setTo(client.email);
    setClientSearch(client.name);
    setShowClientPicker(false);
  }

  async function handleSend() {
    if (!to || !subject || !body) {
      setError(T.email.errorFields);
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, subject, body }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Failed to send email');
        return;
      }
      setSuccess(true);
      setTimeout(() => { onClose(); setSuccess(false); }, 1500);
    } catch {
      setError(T.email.errorServer);
    } finally {
      setSending(false);
    }
  }

  const title =
    mode === 'reply' ? T.email.replyTitle :
    mode === 'client' ? T.email.clientTitle :
    T.email.composeTitle;

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {success ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-800">{T.email.sentOk}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* To field with client picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {T.email.to}
            </label>
            <div className="relative">
              <input
                type="text"
                value={clientSearch || to}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setTo(e.target.value);
                  setShowClientPicker(e.target.value.length > 0);
                }}
                onFocus={() => setShowClientPicker(true)}
                onBlur={() => setTimeout(() => setShowClientPicker(false), 150)}
                placeholder={T.email.placeholder.to}
                className="w-full px-3 py-2.5 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowClientPicker((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Client dropdown */}
              {showClientPicker && filteredClients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {filteredClients.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectClient(c)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 truncate">{c.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{c.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {to && to !== clientSearch && (
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                Sending to: <span className="text-indigo-600 font-medium">{to}</span>
                <button onClick={() => { setTo(''); setClientSearch(''); }} className="ml-1 text-slate-300 hover:text-slate-500">
                  <X className="w-3 h-3" />
                </button>
              </p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {T.email.subject}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={T.email.placeholder.subject}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {T.email.message}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={T.email.placeholder.body}
              rows={7}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none leading-relaxed"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              {T.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !to || !subject || !body}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
              {sending ? T.email.sending : T.common.send}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
