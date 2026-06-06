import { Mail } from 'lucide-react';
import type { Email } from '../../types/aios';

interface EmailPreviewProps {
  email: Email | null;
}

export function EmailPreview({ email }: EmailPreviewProps) {
  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
        <Mail className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">Select an email to read</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-800 mb-2">
          {email.subject ?? '(no subject)'}
        </h2>
        <div className="space-y-1 text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-700">From:</span>{' '}
            {email.from_name
              ? `${email.from_name} <${email.from_email}>`
              : email.from_email}
          </p>
          <p>
            <span className="font-medium text-slate-700">Date:</span>{' '}
            {new Date(email.received_at).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {email.body_text || email.snippet ? (
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
            {email.body_text ?? email.snippet}
          </pre>
        ) : (
          <p className="text-sm text-slate-400 italic">No content available</p>
        )}
      </div>
    </div>
  );
}
