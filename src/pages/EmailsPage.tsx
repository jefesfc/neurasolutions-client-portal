import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PenSquare, Mail, Send, ExternalLink,
  CheckCircle2, Inbox, ArrowUpRight, Paperclip,
} from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { postgrest } from '../lib/postgrest';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { useT, useTranslations } from '../i18n/useT';
import { SearchInput } from '../components/shared/SearchInput';
import { Skeleton } from '../components/ui/Skeleton';
import { EmailList } from '../components/emails/EmailList';
import { EmailPreview } from '../components/emails/EmailPreview';
import { SentList, parseSentContent } from '../components/emails/SentList';
import type { SentEmail } from '../components/emails/SentList';
import { ComposeModal } from '../components/emails/ComposeModal';
import { useAuthStore } from '../store/auth-store';
import { ROUTES } from '../config/routes';
import type { Email } from '../types/aios';

declare const window: Window & { __env__?: { API_URL?: string } };
const API_URL = window.__env__?.API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type ComposeMode = 'compose' | 'reply' | 'client';
type ActiveTab = 'inbox' | 'sent';

interface ComposeState {
  open: boolean;
  mode: ComposeMode;
  initialTo: string;
  initialSubject: string;
  initialBody: string;
}

const COMPOSE_CLOSED: ComposeState = {
  open: false, mode: 'compose', initialTo: '', initialSubject: '', initialBody: '',
};

function getInitials(name: string, email: string): string {
  if (name && name !== email) return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return email[0]?.toUpperCase() ?? '?';
}

function SentEmailDetail({ email }: { email: SentEmail | null }) {
  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Send className="w-7 h-7 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">Select a sent email to view</p>
        <p className="text-xs text-slate-400 mt-1">Choose a message from the list</p>
      </div>
    );
  }

  const p = parseSentContent(email.content);
  const date = new Date(email.created_at);
  const displayName = p.toName && p.toName !== p.toEmail ? p.toName : p.toEmail;
  const initials = getInitials(p.toName, p.toEmail);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <h2 className="text-[15px] font-semibold text-slate-900 mb-3 leading-snug">
          {p.subject || '(no subject)'}
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">To: {displayName}</p>
              {p.toName && p.toName !== p.toEmail && (
                <p className="text-xs text-slate-400 truncate">{p.toEmail}</p>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-500">
              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-slate-400">
              {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            Delivered
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Send className="w-3 h-3" />
            Sent via AIOS Agent
          </span>
          {p.attachments > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Paperclip className="w-3 h-3" />
              {p.attachments} attachment{p.attachments > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/40">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subject</p>
            <p className="text-sm font-semibold text-slate-800">{p.subject || '(no subject)'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recipient</p>
            <p className="text-sm text-slate-700">{displayName}</p>
            {p.toName && p.toName !== p.toEmail && (
              <p className="text-xs text-slate-400">{p.toEmail}</p>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Message</p>
            {p.body ? (
              <div className="text-[13.5px] text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                {p.body}
              </div>
            ) : (
              <p className="text-[13px] text-slate-400 italic leading-relaxed">
                Body not available for emails sent before this update.
              </p>
            )}
          </div>
          {p.attachments > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Attachments</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                <Paperclip className="w-3.5 h-3.5" />
                {p.attachments} file{p.attachments > 1 ? 's' : ''} attached
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmailsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedSent, setSelectedSent] = useState<SentEmail | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [search, setSearch] = useState('');
  const [compose, setCompose] = useState<ComposeState>(COMPOSE_CLOSED);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const { data: emails, loading, error } = useQuery<Email>('emails', {
    order: 'received_at.desc',
    limit: 100,
  });

  const { data: sentRaw, loading: sentLoading } = useQuery<SentEmail>('interactions', {
    select: 'id,content,created_at',
    filters: { channel: 'eq.email', role: 'eq.assistant' },
    order: 'created_at.desc',
    limit: 100,
  });

  const handleDelete = useCallback(async (id: string) => {
    setDeletedIds((prev) => new Set([...prev, id]));
    if (selectedEmail?.id === id) setSelectedEmail(null);
    try {
      const r = await fetch(`${API_URL}/emails/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        setDeletedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      }
    } catch {
      setDeletedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [selectedEmail, token]);

  async function handleSelect(email: Email) {
    setSelectedEmail(email);
    setSelectedSent(null);
    if (!email.is_read) {
      await postgrest.patch<Email>('emails', { id: `eq.${email.id}` }, { is_read: true });
    }
  }

  function handleSelectSent(sent: SentEmail) {
    setSelectedSent(sent);
    setSelectedEmail(null);
  }

  function handleReply(email: Email) {
    setCompose({
      open: true,
      mode: 'reply',
      initialTo: email.from_email,
      initialSubject: email.subject ? `Re: ${email.subject}` : '',
      initialBody: `\n\n---\nOn ${new Date(email.received_at).toLocaleDateString()}, ${email.from_name ?? email.from_email} wrote:\n${email.snippet ?? ''}`,
    });
  }

  function handleSendToClient(email: Email) {
    setCompose({
      open: true,
      mode: 'client',
      initialTo: '',
      initialSubject: email.subject ? `Re: ${email.subject}` : '',
      initialBody: '',
    });
  }

  const t = useT();
  const T = useTranslations();
  const canCompose = user?.role === 'admin' || user?.role === 'manager';

  const allEmails = (emails ?? []).filter((e) => !deletedIds.has(e.id));
  const unreadCount = allEmails.filter((e) => !e.is_read).length;
  const totalCount = allEmails.length;
  const sentEmails = sentRaw ?? [];
  const sentCount = sentEmails.length;

  return (
    <PageTransition>
      <PageHeader
        title={t('pages.emails.title')}
        description={T.email.unreadDesc(unreadCount)}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-48">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="Search emails..."
              />
            </div>
            <button
              onClick={() => navigate(ROUTES.BrochureMembership)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Membership
            </button>
            <button
              onClick={() => navigate(ROUTES.BrochureTreatments)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Treatments
            </button>
            {canCompose && (
              <button
                onClick={() => setCompose({ open: true, mode: 'compose', initialTo: '', initialSubject: '', initialBody: '' })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <PenSquare className="w-4 h-4" />
                {t('common.compose')}
              </button>
            )}
          </div>
        }
      />

      {/* Premium stat cards — 2 large premium cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Inbox card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t-2xl" />
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Inbox</p>
                <p className="text-[11px] text-slate-400">Gmail connected</p>
              </div>
            </div>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {unreadCount} unread
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold">
                <CheckCircle2 className="w-3 h-3" />
                All read
              </span>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[42px] font-bold text-slate-900 leading-none tracking-tight">
                {loading ? '—' : totalCount}
              </p>
              <p className="text-sm font-medium text-slate-500 mt-1">Total messages</p>
            </div>
            <div className="text-right pb-0.5">
              <p className="text-xs text-slate-400 mb-0.5">
                <span className="font-semibold text-slate-600">{loading ? '—' : totalCount - unreadCount}</span> read
              </p>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-indigo-600">{loading ? '—' : unreadCount}</span> unread
              </p>
            </div>
          </div>
        </div>

        {/* Sent card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden hover:border-cyan-200 hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500 to-sky-500 rounded-t-2xl" />
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent</p>
                <p className="text-[11px] text-slate-400">via AIOS Agent</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Delivered
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[42px] font-bold text-slate-900 leading-none tracking-tight">
                {sentLoading ? '—' : sentCount}
              </p>
              <p className="text-sm font-medium text-slate-500 mt-1">Emails sent</p>
            </div>
            <ArrowUpRight className="w-6 h-6 text-slate-200 mb-0.5" />
          </div>
        </div>
      </div>

      {/* Main panel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row h-auto md:h-[calc(100vh-22rem)]">
        {loading ? (
          <div className="p-4 space-y-3 w-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 w-full text-sm">{error}</div>
        ) : (
          <>
            {/* Left: tabs + list */}
            <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col flex-shrink-0 max-h-[40vh] md:max-h-none">
              {/* Tab bar */}
              <div className="flex border-b border-slate-200 bg-slate-50/60 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('inbox')}
                  className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                    activeTab === 'inbox'
                      ? 'border-indigo-500 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  Inbox
                  {unreadCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold leading-none">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('sent')}
                  className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                    activeTab === 'sent'
                      ? 'border-cyan-500 text-cyan-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Sent
                  {sentCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-slate-300 text-white text-[10px] font-bold leading-none">
                      {sentCount}
                    </span>
                  )}
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'inbox' ? (
                  <EmailList
                    emails={allEmails}
                    selectedId={selectedEmail?.id ?? null}
                    onSelect={(email) => void handleSelect(email)}
                    onDelete={canCompose ? handleDelete : undefined}
                    search={search}
                  />
                ) : (
                  <SentList
                    emails={sentEmails}
                    selectedId={selectedSent?.id ?? null}
                    onSelect={handleSelectSent}
                    search={search}
                  />
                )}
              </div>
            </div>

            {/* Right: reader panel */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'inbox' ? (
                <EmailPreview
                  email={selectedEmail}
                  onReply={canCompose ? handleReply : undefined}
                  onSendToClient={canCompose ? handleSendToClient : undefined}
                  onDelete={canCompose ? handleDelete : undefined}
                />
              ) : (
                <SentEmailDetail email={selectedSent} />
              )}
            </div>
          </>
        )}
      </div>

      <ComposeModal
        open={compose.open}
        onClose={() => setCompose(COMPOSE_CLOSED)}
        mode={compose.mode}
        initialTo={compose.initialTo}
        initialSubject={compose.initialSubject}
        initialBody={compose.initialBody}
      />
    </PageTransition>
  );
}
