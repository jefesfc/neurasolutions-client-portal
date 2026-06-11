import { X, ArrowRightLeft, User as UserIcon, Mail, Phone, Globe, MapPin, Calendar, PoundSterling, Tag, FileText } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Client } from '../../types/aios';

const STATUS_BADGE: Record<Client['status'], { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  active:   { variant: 'success', label: 'Active'   },
  inactive: { variant: 'warning', label: 'Inactive' },
  churned:  { variant: 'danger',  label: 'Churned'  },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number | null): string {
  if (value == null) return '—';
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  client: Client;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ClientDetailPanel({ client, canEdit, onEdit, onDelete, onClose }: Props) {
  const badge = STATUS_BADGE[client.status];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{client.company}</h2>
          <div className="mt-1.5"><Badge variant={badge.variant} dot>{badge.label}</Badge></div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mt-1 -mr-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="p-5 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field icon={<UserIcon className="h-3.5 w-3.5" />}    label="Name"           value={client.name} />
          <Field icon={<Mail className="h-3.5 w-3.5" />}        label="Email"          value={client.email} />
          <Field icon={<Phone className="h-3.5 w-3.5" />}       label="Phone"          value={client.phone} />
          <Field icon={<Globe className="h-3.5 w-3.5" />}       label="Website"        value={client.website} />
          <Field icon={<Tag className="h-3.5 w-3.5" />}         label="Industry"       value={client.industry} />
          <Field icon={<PoundSterling className="h-3.5 w-3.5" />}  label="Contract Value" value={formatCurrency(client.contract_value)} />
          <Field icon={<Calendar className="h-3.5 w-3.5" />}    label="Next Renewal"   value={formatDate(client.next_renewal_at)} />
          <Field icon={<UserIcon className="h-3.5 w-3.5" />}    label="Assigned To"    value={client.assigned_to} />
          <div className="col-span-2">
            <Field icon={<MapPin className="h-3.5 w-3.5" />}    label="Address"        value={client.address} />
          </div>
          <div className="col-span-2">
            <Field icon={<FileText className="h-3.5 w-3.5" />}  label="Notes"          value={client.notes} />
          </div>
        </div>

        {client.converted_from_lead_id && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full w-fit">
            <ArrowRightLeft className="h-3 w-3" />
            Converted from lead
          </div>
        )}
      </div>

      {/* Footer */}
      {canEdit && (
        <div className="flex gap-2 p-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
          <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
        </div>
      )}
    </div>
  );
}

function Field({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm text-slate-700 font-medium break-words">{value || '—'}</p>
    </div>
  );
}
