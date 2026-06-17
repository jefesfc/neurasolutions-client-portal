import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenSquare, Mail, MailOpen, MailCheck, Send, ExternalLink } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { postgrest } from '../lib/postgrest';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { useT, useTranslations } from '../i18n/useT';
import { SearchInput } from '../components/shared/SearchInput';
import { Skeleton } from '../components/ui/Skeleton';
import { EmailList } from '../components/emails/EmailList';
import { EmailPreview } from '../components/emails/EmailPreview';
import { ComposeModal } from '../components/emails/ComposeModal';
import { useAuthStore } from '../store/auth-store';
import { ROUTES } from '../config/routes';
import type { Email } from '../types/aios';

type ComposeMode = 'compose' | 'reply' | 'client';

interface ComposeState {
  open: boolean;
  mode: ComposeMode;
  initialTo: string;
  initialSubject: string;
  initialBody: string;
}

const COMPOSE_CLOSED: ComposeState = {
  open: false,
  mode: 'compose',
  initialTo: '',
  initialSubject: '',
  initialBody: '',
};

export default function EmailsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [search, setSearch] = useState('');
  const [compose, setCompose] = useState<ComposeState>(COMPOSE_CLOSED);

  const { data: emails, loading, error } = useQuery<Email>('emails', {
    order: 'received_at.desc',
    limit: 100,
  });

  const { data: sentInteractions } = useQuery<{ id: string }>('interactions', {
    select: 'id',
    filters: { channel: 'eq.email', role: 'eq.assistant' },
    limit: 500,
  });

  async function handleSelect(email: Email) {
    setSelectedEmail(email);
    if (!email.is_read) {
      await postgrest.patch<Email>('emails', { id: `eq.${email.id}` }, { is_read: true });
    }
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

  const allEmails = emails ?? [];
  const unreadCount = allEmails.filter((e) => !e.is_read).length;
  const readCount = allEmails.filter((e) => e.is_read).length;
  const totalCount = allEmails.length;
  const sentCount = (sentInteractions ?? []).length;

  const STAT_CARDS = [
    { label: T.email.totalInbox, value: totalCount, icon: Mail, gradient: 'from-indigo-600 to-violet-600', shadow: 'shadow-indigo-500/25' },
    { label: T.email.unread, value: unreadCount, icon: MailOpen, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/25' },
    { label: T.email.read, value: readCount, icon: MailCheck, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/25' },
    { label: T.email.sent, value: sentCount, icon: Send, gradient: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/25' },
  ];

  return (
    <PageTransition>
      <PageHeader
        title={t('pages.emails.title')}
        description={T.email.unreadDesc(unreadCount)}
        actions={
          <div className="flex items-center gap-3">
            <div className="w-56">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="Search emails..."
              />
            </div>
            <button
              onClick={() => navigate(ROUTES.BrochureMembership)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Membership Brochure
            </button>
            <button
              onClick={() => navigate(ROUTES.BrochureTreatments)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Treatments Brochure
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

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        {STAT_CARDS.map(({ label, value, icon: Icon, gradient, shadow }) => (
          <div key={label} className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 text-white shadow-lg ${shadow}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            </div>
            <p className="text-2xl font-bold leading-none mb-1">{loading ? '—' : value}</p>
            <p className="text-[11px] text-white/70 font-medium uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex h-[calc(100vh-20rem)]">
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
            {/* Left: email list */}
            <div className="w-2/5 border-r border-slate-200 overflow-y-auto flex-shrink-0">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {T.email.inbox}
                </span>
                <span className="text-xs text-slate-400">{(emails ?? []).length} messages</span>
              </div>
              <EmailList
                emails={emails ?? []}
                selectedId={selectedEmail?.id ?? null}
                onSelect={(email) => void handleSelect(email)}
                search={search}
              />
            </div>

            {/* Right: email preview */}
            <div className="flex-1 overflow-hidden">
              <EmailPreview
                email={selectedEmail}
                onReply={canCompose ? handleReply : undefined}
                onSendToClient={canCompose ? handleSendToClient : undefined}
              />
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
