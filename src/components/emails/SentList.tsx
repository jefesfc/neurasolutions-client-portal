import { Send } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SentEmail {
  id: string;
  content: string;
  created_at: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getSubject(email: SentEmail): string {
  const first = email.content.split('\n')[0]?.trim() ?? '';
  return first.length > 0 ? first.slice(0, 60) : 'Email sent via AIOS';
}

interface SentListProps {
  emails: SentEmail[];
  selectedId: string | null;
  onSelect: (email: SentEmail) => void;
  search: string;
}

export function SentList({ emails, selectedId, onSelect, search }: SentListProps) {
  const filtered = emails.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.content.toLowerCase().includes(q) || getSubject(e).toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center min-h-[120px]">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Send className="w-5 h-5 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">
          {search ? 'No results found' : 'No sent emails yet'}
        </p>
      </div>
    );
  }

  return (
    <ul className="px-2 py-2 space-y-1.5">
      {filtered.map((email) => {
        const isSelected = selectedId === email.id;
        const recipient = getRecipient(email);
        const subject = getSubject(email);

        return (
          <li
            key={email.id}
            onClick={() => onSelect(email)}
            className={cn(
              'group relative px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-150 border',
              isSelected
                ? 'bg-gradient-to-r from-cyan-50 to-white border-cyan-300 shadow-[0_2px_12px_rgba(6,182,212,0.18)]'
                : 'bg-white border-slate-200/80 hover:border-cyan-200 hover:shadow-[0_2px_10px_rgba(6,182,212,0.10)] hover:bg-cyan-50/20'
            )}
          >
            {isSelected && (
              <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-cyan-500" />
            )}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-sm font-medium text-slate-700 truncate font-semibold">{subject}</span>
                  <span className="flex-shrink-0 text-[11px] text-slate-400 tabular-nums">
                    {formatTime(email.created_at)}
                  </span>
                </div>
                <p className="text-[12px] text-slate-400 truncate leading-snug">
                  {email.content.slice(0, 90).replace(/\n/g, ' ')}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
