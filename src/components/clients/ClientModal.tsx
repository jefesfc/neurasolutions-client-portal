import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Plus, X as XIcon } from 'lucide-react';

export const NOOR_TREATMENTS = [
  // Injectable
  { id: 'anti-wrinkle',   label: 'Anti-Wrinkle Injections',    category: 'Injectable' },
  { id: 'dermal-fillers', label: 'Dermal Fillers',              category: 'Injectable' },
  { id: 'lip-augmentation', label: 'Lip Augmentation',         category: 'Injectable' },
  { id: 'jaw-slimming',   label: 'Jaw / Face Slimming',         category: 'Injectable' },
  { id: 'skin-booster',   label: 'Skin Boosters (Profhilo)',    category: 'Injectable' },
  { id: 'prp',            label: 'PRP Therapy',                 category: 'Injectable' },
  // Laser & Light
  { id: 'co2-laser',      label: 'CO2 Laser Resurfacing',       category: 'Laser & Light' },
  { id: 'ipl',            label: 'IPL Photofacial',             category: 'Laser & Light' },
  { id: 'laser-hair',     label: 'Laser Hair Removal',          category: 'Laser & Light' },
  // Skin
  { id: 'hydrafacial',    label: 'HydraFacial',                 category: 'Skin Treatments' },
  { id: 'chemical-peel',  label: 'Chemical Peel',               category: 'Skin Treatments' },
  { id: 'microneedling',  label: 'Microneedling',               category: 'Skin Treatments' },
  { id: 'microneedling-prp', label: 'Microneedling + PRP',      category: 'Skin Treatments' },
  // Body
  { id: 'body-contouring', label: 'Non-Invasive Body Contouring', category: 'Body' },
  { id: 'thread-lift',    label: 'Thread Lift',                 category: 'Body' },
] as const;

const TREATMENT_PRICES: Record<string, number> = {
  'anti-wrinkle':    250,
  'dermal-fillers':  350,
  'lip-augmentation':299,
  'jaw-slimming':    350,
  'skin-booster':    450,
  'prp':             400,
  'co2-laser':       800,
  'ipl':             350,
  'laser-hair':      100,
  'hydrafacial':     160,
  'chemical-peel':   180,
  'microneedling':   250,
  'microneedling-prp':450,
  'body-contouring': 300,
  'thread-lift':     1200,
};

const MEMBERSHIP_PRICES: Record<string, number> = {
  silver:   1500,
  gold:     2800,
  platinum: 5200,
};

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useAuthStore } from '../../store/auth-store';
import { postgrest } from '../../lib/postgrest';
import type { Client, ClientStage, Lead, User } from '../../types/aios';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
const selectCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

const STAGE_CONFIG: Record<ClientStage, { label: string; color: string; bg: string }> = {
  admission:    { label: 'Admission',    color: '#6366f1', bg: '#eef2ff' },
  investigation:{ label: 'Investigation',color: '#f59e0b', bg: '#fffbeb' },
  follow_up:    { label: 'Follow Up',    color: '#10b981', bg: '#f0fdf4' },
  discharge:    { label: 'Discharge',    color: '#94a3b8', bg: '#f8fafc' },
  active:       { label: 'Active',       color: '#06b6d4', bg: '#ecfeff' },
};

interface Props {
  isOpen: boolean;
  initialData?: Partial<Client>;
  convertingFromLead?: Lead;
  onSuccess: () => void;
  onClose: () => void;
}

export function ClientModal({ isOpen, initialData, convertingFromLead, onSuccess, onClose }: Props) {
  const { token } = useAuthStore();
  const isEdit = Boolean(initialData?.id);

  const [company, setCompany]                       = useState('');
  const [name, setName]                             = useState('');
  const [email, setEmail]                           = useState('');
  const [phone, setPhone]                           = useState('');
  const [industry, setIndustry]                     = useState('');
  const [website, setWebsite]                       = useState('');
  const [contractValue, setContractValue]           = useState('');
  const [status, setStatus]                         = useState<Client['status']>('active');
  const [stage, setStage]                           = useState<ClientStage>('admission');
  const [address, setAddress]                       = useState('');
  const [nextRenewalAt, setNextRenewalAt]           = useState('');
  const [assignedTo, setAssignedTo]                 = useState('');
  const [notes, setNotes]                           = useState('');
  // Clinical journey
  const [admissionDate, setAdmissionDate]           = useState('');
  const [admissionNotes, setAdmissionNotes]         = useState('');
  const [investigationDate, setInvestigationDate]   = useState('');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [followUpDate, setFollowUpDate]             = useState('');
  const [followUpNotes, setFollowUpNotes]           = useState('');
  const [dischargeDate, setDischargeDate]           = useState('');
  const [dischargeNotes, setDischargeNotes]         = useState('');

  const [treatments, setTreatments] = useState<string[]>([]);
  const [membership, setMembership] = useState<'silver' | 'gold' | 'platinum' | null>(null);
  const [customTreatment, setCustomTreatment] = useState('');

  const [users, setUsers]         = useState<User[]>([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [autoCalc, setAutoCalc]   = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [treatmentsOpen, setTreatmentsOpen] = useState(false);
  const toggleJourney = useCallback(() => setJourneyOpen(v => !v), []);
  const toggleTreatments = useCallback(() => setTreatmentsOpen(v => !v), []);

  useEffect(() => {
    postgrest.get<User>('users', { order: 'name.asc', limit: 200 }).then(setUsers).catch((err) => {
      console.error('[ClientModal] failed to load users:', err);
    });
  }, []);

  // Auto-calculate contract value from selected treatments + membership
  useEffect(() => {
    const treatmentSum = treatments.reduce((sum, id) => sum + (TREATMENT_PRICES[id] ?? 0), 0);
    const membershipFee = membership ? (MEMBERSHIP_PRICES[membership] ?? 0) : 0;
    const total = treatmentSum + membershipFee;
    if (total > 0) {
      setContractValue(String(total));
      setAutoCalc(true);
    } else {
      setAutoCalc(false);
    }
  }, [treatments, membership]);

  useEffect(() => {
    if (convertingFromLead) {
      setName(convertingFromLead.name);
      setEmail(convertingFromLead.email);
      setPhone(convertingFromLead.phone ?? '');
      setCompany(''); setIndustry(''); setWebsite(''); setContractValue('');
      setStatus('active'); setStage('admission');
      setAddress(''); setNextRenewalAt('');
      setAssignedTo(convertingFromLead.assigned_to ?? '');
      setNotes(convertingFromLead.notes ?? '');
      setTreatments([]); setMembership(null); setCustomTreatment('');
      setAdmissionDate(''); setAdmissionNotes('');
      setInvestigationDate(''); setInvestigationNotes('');
      setFollowUpDate(''); setFollowUpNotes('');
      setDischargeDate(''); setDischargeNotes('');
    } else if (initialData) {
      setCompany(initialData.company ?? '');
      setName(initialData.name ?? '');
      setEmail(initialData.email ?? '');
      setPhone(initialData.phone ?? '');
      setIndustry(initialData.industry ?? '');
      setWebsite(initialData.website ?? '');
      setContractValue(initialData.contract_value != null ? String(initialData.contract_value) : '');
      setStatus(initialData.status ?? 'active');
      setStage(initialData.stage ?? 'admission');
      setAddress(initialData.address ?? '');
      setNextRenewalAt(initialData.next_renewal_at ?? '');
      setAssignedTo(initialData.assigned_to ?? '');
      setNotes(initialData.notes ?? '');
      setTreatments(initialData.treatments ?? []);
      setMembership(initialData.membership_tier ?? null);
      setCustomTreatment('');
      setAutoCalc(false);
      setAdmissionDate(initialData.admission_date ?? '');
      setAdmissionNotes(initialData.admission_notes ?? '');
      setInvestigationDate(initialData.investigation_date ?? '');
      setInvestigationNotes(initialData.investigation_notes ?? '');
      setFollowUpDate(initialData.follow_up_date ?? '');
      setFollowUpNotes(initialData.follow_up_notes ?? '');
      setDischargeDate(initialData.discharge_date ?? '');
      setDischargeNotes(initialData.discharge_notes ?? '');
    } else {
      setCompany(''); setName(''); setEmail(''); setPhone('');
      setIndustry(''); setWebsite(''); setContractValue('');
      setStatus('active'); setStage('admission');
      setAddress(''); setNextRenewalAt(''); setAssignedTo(''); setNotes('');
      setTreatments([]); setMembership(null); setCustomTreatment('');
      setAdmissionDate(''); setAdmissionNotes('');
      setInvestigationDate(''); setInvestigationNotes('');
      setFollowUpDate(''); setFollowUpNotes('');
      setDischargeDate(''); setDischargeNotes('');
    }
    setError(null);
  }, [initialData, convertingFromLead, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      company:              company.trim(),
      name:                 name.trim(),
      email:                email.trim(),
      phone:                phone.trim() || null,
      industry:             industry.trim() || null,
      website:              website.trim() || null,
      contract_value:       contractValue ? parseFloat(contractValue) : null,
      status,
      stage,
      address:              address.trim() || null,
      next_renewal_at:      nextRenewalAt || null,
      assigned_to:          assignedTo || null,
      notes:                notes.trim() || null,
      treatments,
      membership_tier:      membership,
      admission_date:       admissionDate || null,
      admission_notes:      admissionNotes.trim() || null,
      investigation_date:   investigationDate || null,
      investigation_notes:  investigationNotes.trim() || null,
      follow_up_date:       followUpDate || null,
      follow_up_notes:      followUpNotes.trim() || null,
      discharge_date:       dischargeDate || null,
      discharge_notes:      dischargeNotes.trim() || null,
    };
    if (convertingFromLead) body.converted_from_lead_id = convertingFromLead.id;

    try {
      const url    = isEdit ? `${API_URL}/clients/${initialData!.id}` : `${API_URL}/clients`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to save');
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  const title = convertingFromLead
    ? `Convert "${convertingFromLead.name}" to Client`
    : isEdit ? 'Edit Client' : 'New Client';

  const JOURNEY_STAGES: { key: ClientStage; label: string; date: string; setDate: (v: string) => void; noteVal: string; setNote: (v: string) => void }[] = [
    { key: 'admission',     label: 'Admission',     date: admissionDate,     setDate: setAdmissionDate,     noteVal: admissionNotes,     setNote: setAdmissionNotes },
    { key: 'investigation', label: 'Investigation',  date: investigationDate, setDate: setInvestigationDate, noteVal: investigationNotes, setNote: setInvestigationNotes },
    { key: 'follow_up',     label: 'Follow Up',     date: followUpDate,      setDate: setFollowUpDate,      noteVal: followUpNotes,      setNote: setFollowUpNotes },
    { key: 'discharge',     label: 'Discharge',     date: dischargeDate,     setDate: setDischargeDate,     noteVal: dischargeNotes,     setNote: setDischargeNotes },
  ];

  return (
    <Modal open={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">

        {/* ── Basic info ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Company *</label>
            <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Ltd" required />
          </div>
          <div>
            <label className={labelCls}>Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email *</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@acme.com" required />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 000000" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Industry</label>
            <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Aesthetics" />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls} style={{ marginBottom: 0 }}>Contract Value (£)</label>
              {autoCalc && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  ✦ Auto-calculated
                </span>
              )}
            </div>
            <Input
              type="number" min={0} step="0.01"
              value={contractValue}
              onChange={e => { setContractValue(e.target.value); setAutoCalc(false); }}
              placeholder="0.00"
            />
            {autoCalc && (() => {
              const treatmentSum = treatments.reduce((s, id) => s + (TREATMENT_PRICES[id] ?? 0), 0);
              const membershipFee = membership ? (MEMBERSHIP_PRICES[membership] ?? 0) : 0;
              return (
                <p className="text-[10px] text-slate-400 mt-1">
                  {treatmentSum > 0 && `Treatments £${treatmentSum.toLocaleString()}`}
                  {treatmentSum > 0 && membershipFee > 0 && ' + '}
                  {membershipFee > 0 && `${membership ? membership.charAt(0).toUpperCase() + membership.slice(1) : ''} membership £${membershipFee.toLocaleString()}`}
                </p>
              );
            })()}
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as Client['status'])} className={selectCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Address</label>
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, London" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Next Renewal</label>
            <Input type="date" value={nextRenewalAt} onChange={e => setNextRenewalAt(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Assigned To</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={selectCls}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="General notes…" />
        </div>

        {/* ── Membership ── */}
        <div>
          <label className={labelCls}>Membership Tier</label>
          <div className="flex gap-2 mt-1">
            {([null, 'silver', 'gold', 'platinum'] as const).map(tier => {
              const cfg = tier === null
                ? { label: 'None', bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0', selBg: '#e2e8f0', selColor: '#64748b' }
                : tier === 'silver'
                ? { label: '✦ Silver', bg: '#f8fafc', color: '#64748b', border: '#cbd5e1', selBg: '#475569', selColor: '#fff' }
                : tier === 'gold'
                ? { label: '✦ Gold', bg: '#fffbeb', color: '#92400e', border: '#fde68a', selBg: '#d97706', selColor: '#fff' }
                : { label: '✦ Platinum', bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', selBg: '#6366f1', selColor: '#fff' };
              const selected = membership === tier;
              return (
                <button
                  key={String(tier)}
                  type="button"
                  onClick={() => setMembership(selected ? null : tier)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                  style={{
                    background:  selected ? cfg.selBg : cfg.bg,
                    color:       selected ? cfg.selColor : cfg.color,
                    borderColor: selected ? cfg.selBg : cfg.border,
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Treatments ── */}
        <div>
          <button type="button" onClick={toggleTreatments} className="w-full flex items-center gap-3 py-2 group">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Treatments
              {treatments.length > 0 && (
                <span className="ml-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {treatments.length}
                </span>
              )}
              {treatmentsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </button>

          {treatmentsOpen && (() => {
            const knownIds = new Set(NOOR_TREATMENTS.map(t => t.id));
            const customOnes = treatments.filter(id => !knownIds.has(id as never));
            const categories = [...new Set(NOOR_TREATMENTS.map(t => t.category))];
            return (
              <div className="mt-2 space-y-3">
                {categories.map(cat => (
                  <div key={cat}>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {NOOR_TREATMENTS.filter(t => t.category === cat).map(t => {
                        const selected = treatments.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTreatments(prev =>
                              selected ? prev.filter(x => x !== t.id) : [...prev, t.id]
                            )}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                            style={{
                              background:  selected ? '#6366f1' : '#f8fafc',
                              color:       selected ? '#fff' : '#475569',
                              borderColor: selected ? '#6366f1' : '#e2e8f0',
                            }}
                          >
                            {selected && '✓ '}{t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Custom treatments */}
                {customOnes.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Custom</p>
                    <div className="flex flex-wrap gap-2">
                      {customOnes.map(name => (
                        <span key={name} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                          {name}
                          <button type="button" onClick={() => setTreatments(prev => prev.filter(x => x !== name))}>
                            <XIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add custom treatment */}
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={customTreatment}
                    onChange={e => setCustomTreatment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = customTreatment.trim();
                        if (v && !treatments.includes(v)) setTreatments(prev => [...prev, v]);
                        setCustomTreatment('');
                      }
                    }}
                    placeholder="Add custom treatment…"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = customTreatment.trim();
                      if (v && !treatments.includes(v)) setTreatments(prev => [...prev, v]);
                      setCustomTreatment('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Clinical Journey ── */}
        <div>
          <button
            type="button"
            onClick={toggleJourney}
            className="w-full flex items-center gap-3 py-2 group"
          >
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors flex items-center gap-1.5">
              Clinical Journey
              {journeyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </button>

          {journeyOpen && (
            <>
              {/* Current stage selector */}
              <div className="mb-4 mt-2">
                <label className={labelCls}>Current Stage</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(STAGE_CONFIG) as [ClientStage, typeof STAGE_CONFIG[ClientStage]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStage(key)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                      style={{
                        background:   stage === key ? cfg.color : cfg.bg,
                        color:        stage === key ? '#fff' : cfg.color,
                        borderColor:  stage === key ? cfg.color : `${cfg.color}40`,
                      }}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage milestones */}
              <div className="space-y-3">
                {JOURNEY_STAGES.map(({ key, label, date, setDate, noteVal, setNote }) => {
                  const cfg = STAGE_CONFIG[key];
                  return (
                    <div
                      key={key}
                      className="rounded-xl border p-3"
                      style={{ borderColor: `${cfg.color}30`, background: cfg.bg }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                        <span className="text-xs font-bold" style={{ color: cfg.color }}>{label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Date</label>
                          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Notes</label>
                          <Input value={noteVal} onChange={e => setNote(e.target.value)} placeholder={`${label} notes…`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>
            {convertingFromLead ? 'Convert to Client' : isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
