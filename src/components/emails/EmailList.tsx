import { Mail } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/formatters';
import type { Email } from '../../types/aios';

interface EmailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (email: Email) => void;
  search: string;
}

export function EmailList({ emails, selectedId, onSelect, search }: EmailListProps) {
  const filtered = emails.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.from_email.toLowerCase().includes(q) ||
      (e.from_name ?? '').toLowerCase().includes(q) ||
      (e.subject ?? '').toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-400 p-8 text-center">
        <Mail className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">
          {search ? 'No emails match your search' : 'No emails yet'}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-surface-100">
      {filtered.map((email) => (
        <li
          key={email.id}
          onClick={() => onSelect(email)}
          className={cn(
            'px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors',
            selectedId === email.id && 'bg-brand-50 border-l-2 border-brand-500'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {!email.is_read && (
                <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm truncate',
                    !email.is_read
                      ? 'font-semibold text-surface-900'
                      : 'font-medium text-surface-700'
                  )}
                >
                  {email.from_name ?? email.from_email}
                </p>
                <p
                  className={cn(
                    'text-sm truncate',
                    !email.is_read ? 'text-surface-800' : 'text-surface-600'
                  )}
                >
                  {email.subject ?? '(no subject)'}
                </p>
                {email.snippet && (
                  <p className="text-xs text-surface-400 truncate mt-0.5">{email.snippet}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-surface-400 flex-shrink-0 mt-0.5">
              {formatRelative(email.received_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
