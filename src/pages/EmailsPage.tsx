import { useState } from 'react';
import { PenSquare } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { postgrest } from '../lib/postgrest';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { SearchInput } from '../components/shared/SearchInput';
import { Skeleton } from '../components/ui/Skeleton';
import { EmailList } from '../components/emails/EmailList';
import { EmailPreview } from '../components/emails/EmailPreview';
import { ComposeModal } from '../components/emails/ComposeModal';
import { useAuthStore } from '../store/auth-store';
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
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [search, setSearch] = useState('');
  const [compose, setCompose] = useState<ComposeState>(COMPOSE_CLOSED);

  const { data: emails, loading, error } = useQuery<Email>('emails', {
    order: 'received_at.desc',
    limit: 100,
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

  const canCompose = user?.role === 'admin' || user?.role === 'manager';

  const unreadCount = (emails ?? []).filter((e) => !e.is_read).length;

  return (
    <PageTransition>
      <PageHeader
        title="Emails"
        description={unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'Company inbox'}
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
            {canCompose && (
              <button
                onClick={() => setCompose({ open: true, mode: 'compose', initialTo: '', initialSubject: '', initialBody: '' })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <PenSquare className="w-4 h-4" />
                Compose
              </button>
            )}
          </div>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex h-[calc(100vh-13rem)]">
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
                  Inbox
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
