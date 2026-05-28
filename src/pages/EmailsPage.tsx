import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { useAuthStore } from '../store/auth-store';
import { postgrest } from '../lib/postgrest';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { SearchInput } from '../components/shared/SearchInput';
import { Skeleton } from '../components/ui/Skeleton';
import { EmailList } from '../components/emails/EmailList';
import { EmailPreview } from '../components/emails/EmailPreview';
import type { Email } from '../types/aios';

export default function EmailsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [search, setSearch] = useState('');

  if (
    user &&
    user.role !== 'admin' &&
    !(user.section_permissions ?? []).includes('emails')
  ) {
    void navigate('/');
    return null;
  }

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

  return (
    <PageTransition>
      <PageHeader
        title="Emails"
        description="Company inbox"
        actions={
          <div className="w-64">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search emails..."
            />
          </div>
        }
      />

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm flex h-[calc(100vh-13rem)]">
        {loading ? (
          <div className="p-4 space-y-3 w-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-danger w-full">{error}</div>
        ) : (
          <>
            <div className="w-2/5 border-r border-surface-200 overflow-y-auto flex-shrink-0">
              <EmailList
                emails={emails}
                selectedId={selectedEmail?.id ?? null}
                onSelect={(email) => void handleSelect(email)}
                search={search}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <EmailPreview email={selectedEmail} />
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
