import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/formatters';
import { useTranslations } from '../../i18n/useT';
import type { Email } from '../../types/aios';

interface EmailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (email: Email) => void;
  search: string;
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return email[0].toUpperCase();
}

function getAvatarColor(seed: string): string {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-cyan-600',
    'bg-emerald-600', 'bg-rose-500', 'bg-amber-600',
    'bg-sky-600', 'bg-pink-600',
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

export function EmailList({ emails, selectedId, onSelect, search }: EmailListProps) {
  const T = useTranslations();
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
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {search ? T.email.noMatch : T.email.noEmails}
        </p>
        {search && <p className="text-xs text-slate-400 mt-1">{T.email.tryKeyword}</p>}
      </div>
    );
  }

  return (
    <ul className="px-2 py-2 space-y-1.5">
      {filtered.map((email) => {
        const isSelected = selectedId === email.id;
        const initials = getInitials(email.from_name ?? null, email.from_email);
        const avatarColor = getAvatarColor(email.from_email);
        const displayName = email.from_name ?? email.from_email;

        return (
          <li
            key={email.id}
            onClick={() => onSelect(email)}
            className={cn(
              'group relative px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-150 border',
              isSelected
                ? 'bg-gradient-to-r from-indigo-50 to-white border-indigo-300 shadow-[0_2px_12px_rgba(99,102,241,0.18)]'
                : !email.is_read
                ? 'bg-blue-50/40 border-slate-200/80 hover:border-indigo-200 hover:shadow-[0_2px_10px_rgba(99,102,241,0.10)] hover:bg-indigo-50/30'
                : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-[0_2px_10px_rgba(99,102,241,0.10)] hover:bg-indigo-50/20'
            )}
          >
            {/* Selected accent bar */}
            {isSelected && (
              <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-indigo-500" />
            )}

            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className={cn(
                'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold select-none shadow-sm',
                avatarColor
              )}>
                {initials}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={cn(
                    'text-sm truncate',
                    !email.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'
                  )}>
                    {displayName}
                  </span>
                  <span className="flex-shrink-0 text-[11px] text-slate-400 font-medium tabular-nums">
                    {formatRelative(email.received_at)}
                  </span>
                </div>

                <p className={cn(
                  'text-[13px] truncate mb-0.5',
                  !email.is_read ? 'font-semibold text-slate-800' : 'text-slate-500'
                )}>
                  {email.subject ?? '(no subject)'}
                </p>

                {email.snippet && (
                  <p className="text-[12px] text-slate-400 truncate leading-snug">
                    {email.snippet}
                  </p>
                )}
              </div>

              {/* Unread dot */}
              {!email.is_read && (
                <div className="flex-shrink-0 mt-1.5">
                  <span className="block w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_4px_rgba(99,102,241,0.6)]" />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
