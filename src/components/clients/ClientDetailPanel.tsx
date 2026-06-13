import { X, ArrowRightLeft, User as UserIcon, Mail, Phone, Globe, MapPin, Calendar, PoundSterling, Tag, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Client, ClientStage } from '../../types/aios';

const STATUS_BADGE: Record<Client['status'], { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  active:   { variant: 'success', label: 'Active'   },
  inactive: { variant: 'warning', label: 'Inactive' },
  churned:  { variant: 'danger',  label: 'Churned'  },
};

const STAGE_CONFIG: Record<ClientStage, { label: string; color: string; bg: string; border: string }> = {
  admission:     { label: 'Admission',     color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  investigation: { label: 'Investigation', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  follow_up:     { label: 'Follow Up',     color: '#10b981', bg: '#f0fdf4', border: '#a7f3d0' },
  discharge:     { label: 'Discharge',     color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  active:        { label: 'Active',        color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
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
  const badge     = STATUS_BADGE[client.status];
  const stageCfg  = STAGE_CONFIG[client.stage ?? 'admission'];

  const journeyStages: { key: ClientStage; label: string; date: string | null; notes: string | null }[] = [
    { key: 'admission',     label: 'Admission',     date: client.admission_date,     notes: client.admission_notes     },
    { key: 'investigation', label: 'Investigation', date: client.investigation_date, notes: client.investigation_notes },
    { key: 'follow_up',     label: 'Follow Up',     date: client.follow_up_date,     notes: client.follow_up_notes     },
    { key: 'discharge',     label: 'Discharge',     date: client.discharge_date,     notes: client.discharge_notes     },
  ];

  const completedStages = journeyStages.filter(s => s.date);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{client.company}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant={badge.variant} dot>{badge.label}</Badge>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full border"
              style={{ color: stageCfg.color, background: stageCfg.bg, borderColor: stageCfg.border }}
            >
              {stageCfg.label}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mt-1 -mr-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="p-5 flex-1 overflow-y-auto space-y-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field icon={<UserIcon className="h-3.5 w-3.5" />}       label="Name"           value={client.name} />
          <Field icon={<Mail className="h-3.5 w-3.5" />}           label="Email"          value={client.email} />
          <Field icon={<Phone className="h-3.5 w-3.5" />}          label="Phone"          value={client.phone} />
          <Field icon={<Globe className="h-3.5 w-3.5" />}          label="Website"        value={client.website} />
          <Field icon={<Tag className="h-3.5 w-3.5" />}            label="Industry"       value={client.industry} />
          <Field icon={<PoundSterling className="h-3.5 w-3.5" />}  label="Contract Value" value={formatCurrency(client.contract_value)} />
          <Field icon={<Calendar className="h-3.5 w-3.5" />}       label="Next Renewal"   value={formatDate(client.next_renewal_at)} />
          <Field icon={<UserIcon className="h-3.5 w-3.5" />}       label="Assigned To"    value={client.assigned_to} />
          <div className="col-span-2">
            <Field icon={<MapPin className="h-3.5 w-3.5" />}       label="Address"        value={client.address} />
          </div>
          <div className="col-span-2">
            <Field icon={<FileText className="h-3.5 w-3.5" />}     label="Notes"          value={client.notes} />
          </div>
        </div>

        {/* ── Clinical Journey ── */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Journey</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Timeline */}
          <div className="relative pl-5">
            {journeyStages.map((s, idx) => {
              const cfg       = STAGE_CONFIG[s.key];
              const isDone    = Boolean(s.date);
              const isCurrent = client.stage === s.key;
              const isLast    = idx === journeyStages.length - 1;

              return (
                <div key={s.key} className="relative pb-4">
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className="absolute left-[-13px] top-5 w-0.5 bottom-0"
                      style={{ background: isDone ? cfg.color + '40' : '#e2e8f0' }}
                    />
                  )}

                  {/* Dot */}
                  <div
                    className="absolute left-[-18px] top-1.5 w-3 h-3 rounded-full border-2 bg-white flex items-center justify-center"
                    style={{
                      borderColor: isDone ? cfg.color : '#cbd5e1',
                      background:  isDone ? cfg.bg : '#f8fafc',
                    }}
                  >
                    {isDone && <CheckCircle2 className="w-2 h-2" style={{ color: cfg.color }} />}
                  </div>

                  <div
                    className="rounded-lg border p-3"
                    style={{
                      borderColor: isCurrent ? cfg.color : isDone ? `${cfg.color}30` : '#f1f5f9',
                      background:  isCurrent ? cfg.bg : isDone ? `${cfg.bg}80` : '#fafbfc',
                      boxShadow:   isCurrent ? `0 0 0 1px ${cfg.color}30` : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: isDone || isCurrent ? cfg.color : '#94a3b8' }}>
                        {s.label}
                        {isCurrent && <span className="ml-2 text-[10px] font-medium opacity-70">● current</span>}
                      </span>
                      <span className="text-[11px] text-slate-400">{formatDate(s.date)}</span>
                    </div>
                    {s.notes ? (
                      <p className="text-xs text-slate-600 leading-relaxed">{s.notes}</p>
                    ) : (
                      <p className="text-xs text-slate-300 italic">No notes recorded</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {completedStages.length > 0 && (
            <p className="text-[11px] text-slate-400 mt-1 text-right">
              {completedStages.length} of {journeyStages.length} stages completed
            </p>
          )}
        </div>

        {client.converted_from_lead_id && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full w-fit">
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
