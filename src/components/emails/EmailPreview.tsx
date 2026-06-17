import { Reply, Send, Tag, Trash2 } from 'lucide-react';
import { useTranslations } from '../../i18n/useT';
import type { Email } from '../../types/aios';

interface EmailPreviewProps {
  email: Email | null;
  onReply?: (email: Email) => void;
  onSendToClient?: (email: Email) => void;
  onDelete?: (id: string) => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return email[0].toUpperCase();
}

export function EmailPreview({ email, onReply, onSendToClient, onDelete }: EmailPreviewProps) {
  const T = useTranslations();

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">{T.email.selectEmail}</p>
        <p className="text-xs text-slate-400 mt-1">{T.email.chooseMessage}</p>
      </div>
    );
  }

  const initials = getInitials(email.from_name ?? null, email.from_email);
  const displayName = email.from_name ?? email.from_email;
  const date = new Date(email.received_at);

  const labels: string[] = Array.isArray(email.labels) ? email.labels : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <h2 className="text-[15px] font-semibold text-slate-900 mb-3 leading-snug">
          {email.subject ?? '(no subject)'}
        </h2>

        <div className="flex items-center justify-between gap-4">
          {/* Sender info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{email.from_email}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-slate-500">
              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-slate-400">
              {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {labels.filter(l => l !== 'INBOX' && l !== 'UNREAD').slice(0, 4).map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium"
              >
                <Tag className="w-2.5 h-2.5" />
                {label.replace('CATEGORY_', '').toLowerCase()}
              </span>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReply?.(email)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
              {T.common.reply}
            </button>
            <button
              onClick={() => onSendToClient?.(email)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {T.email.sendToClient}
            </button>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(email.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
        {email.body_text || email.snippet ? (
          <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap font-sans text-[13.5px]">
            {email.body_text ?? email.snippet}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No content available</p>
        )}
      </div>
    </div>
  );
}
