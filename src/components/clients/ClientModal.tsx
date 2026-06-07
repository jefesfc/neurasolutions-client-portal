import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useAuthStore } from '../../store/auth-store';
import { postgrest } from '../../lib/postgrest';
import type { Client, Lead, User } from '../../types/aios';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
const selectCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

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

  const [company, setCompany]             = useState('');
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [industry, setIndustry]           = useState('');
  const [website, setWebsite]             = useState('');
  const [contractValue, setContractValue] = useState('');
  const [status, setStatus]               = useState<Client['status']>('active');
  const [address, setAddress]             = useState('');
  const [nextRenewalAt, setNextRenewalAt] = useState('');
  const [assignedTo, setAssignedTo]       = useState('');
  const [notes, setNotes]                 = useState('');
  const [users, setUsers]                 = useState<User[]>([]);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    postgrest.get<User>('users', { order: 'name.asc', limit: 200 }).then(setUsers).catch((err) => {
      console.error('[ClientModal] failed to load users:', err);
    });
  }, []);

  useEffect(() => {
    if (convertingFromLead) {
      setName(convertingFromLead.name);
      setEmail(convertingFromLead.email);
      setPhone(convertingFromLead.phone ?? '');
      setCompany('');
      setIndustry(''); setWebsite(''); setContractValue('');
      setStatus('active'); setAddress(''); setNextRenewalAt('');
      setAssignedTo(convertingFromLead.assigned_to ?? '');
      setNotes(convertingFromLead.notes ?? '');
    } else if (initialData) {
      setCompany(initialData.company ?? '');
      setName(initialData.name ?? '');
      setEmail(initialData.email ?? '');
      setPhone(initialData.phone ?? '');
      setIndustry(initialData.industry ?? '');
      setWebsite(initialData.website ?? '');
      setContractValue(initialData.contract_value != null ? String(initialData.contract_value) : '');
      setStatus(initialData.status ?? 'active');
      setAddress(initialData.address ?? '');
      setNextRenewalAt(initialData.next_renewal_at ?? '');
      setAssignedTo(initialData.assigned_to ?? '');
      setNotes(initialData.notes ?? '');
    } else {
      setCompany(''); setName(''); setEmail(''); setPhone('');
      setIndustry(''); setWebsite(''); setContractValue('');
      setStatus('active'); setAddress(''); setNextRenewalAt('');
      setAssignedTo(''); setNotes('');
    }
    setError(null);
  }, [initialData, convertingFromLead, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      company:         company.trim(),
      name:            name.trim(),
      email:           email.trim(),
      phone:           phone.trim() || null,
      industry:        industry.trim() || null,
      website:         website.trim() || null,
      contract_value:  contractValue ? parseFloat(contractValue) : null,
      status,
      address:         address.trim() || null,
      next_renewal_at: nextRenewalAt || null,
      assigned_to:     assignedTo || null,
      notes:           notes.trim() || null,
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

  return (
    <Modal open={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
            <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Technology" />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://acme.com" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Contract Value (£)</label>
            <Input
              type="number" min={0} step="0.01"
              value={contractValue}
              onChange={e => setContractValue(e.target.value)}
              placeholder="0.00"
            />
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
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional notes…" />
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
