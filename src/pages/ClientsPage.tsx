import { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { useT, useTranslations } from '../i18n/useT';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchInput } from '../components/shared/SearchInput';
import { ClientDetailPanel } from '../components/clients/ClientDetailPanel';
import { ClientModal, NOOR_TREATMENTS } from '../components/clients/ClientModal';
import { downloadClientsPDF } from '../lib/pdf';
import type { Client, ClientStage } from '../types/aios';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

type ClientStatus = Client['status'] | 'all';
type StageFilter  = ClientStage | 'all';

const STAGE_COLORS: Record<StageFilter, string> = {
  all:           '#64748b',
  admission:     '#6366f1',
  investigation: '#f59e0b',
  follow_up:     '#10b981',
  discharge:     '#94a3b8',
  active:        '#06b6d4',
};

const STATUS_BADGE_VARIANT: Record<Client['status'], 'success' | 'warning' | 'danger'> = {
  active:   'success',
  inactive: 'warning',
  churned:  'danger',
};

export default function ClientsPage() {
  const t = useT();
  const T = useTranslations();
  const { data: clients, loading, error, refetch } = useQuery<Client>('clients', { order: 'created_at.desc' });

  const STATUS_TABS: { key: ClientStatus; label: string }[] = [
    { key: 'all',      label: T.clients.statusAll      },
    { key: 'active',   label: T.clients.statusActive   },
    { key: 'inactive', label: T.clients.statusInactive },
    { key: 'churned',  label: T.clients.statusChurned  },
  ];

  const STAGE_TABS: { key: StageFilter; label: string; color: string }[] = [
    { key: 'all',           label: T.clients.stageAll,           color: STAGE_COLORS.all           },
    { key: 'admission',     label: T.clients.stageAdmission,     color: STAGE_COLORS.admission     },
    { key: 'investigation', label: T.clients.stageInvestigation, color: STAGE_COLORS.investigation },
    { key: 'follow_up',     label: T.clients.stageFollowUp,      color: STAGE_COLORS.follow_up     },
    { key: 'discharge',     label: T.clients.stageDischarge,     color: STAGE_COLORS.discharge     },
    { key: 'active',        label: T.clients.stageActive,        color: STAGE_COLORS.active        },
  ];

  const STATUS_BADGE_LABEL: Record<Client['status'], string> = {
    active:   T.clients.statusActive,
    inactive: T.clients.statusInactive,
    churned:  T.clients.statusChurned,
  };

  const STAGE_LABEL: Record<ClientStage, string> = {
    admission:     T.clients.stageAdmission,
    investigation: T.clients.stageInvestigation,
    follow_up:     T.clients.stageFollowUp,
    discharge:     T.clients.stageDischarge,
    active:        T.clients.stageActive,
  };
  const { user, token } = useAuthStore();
  const [activeStatus, setActiveStatus]         = useState<ClientStatus>('all');
  const [activeStage, setActiveStage]           = useState<StageFilter>('all');
  const [search, setSearch]                     = useState('');
  const [selectedClient, setSelectedClient]     = useState<Client | null>(null);
  const [modalOpen, setModalOpen]               = useState(false);
  const [modalData, setModalData]               = useState<Partial<Client> | undefined>(undefined);
  const [selectedIds, setSelectedIds]           = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting]         = useState(false);

  const canEdit = user?.role !== 'user';

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleSelectAll(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds(selectedIds.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(c => c.id)));
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} client${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id =>
        fetch(`${API_URL}/clients/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      ));
      setSelectedIds(new Set());
      setSelectedClient(null);
      refetch();
    } finally {
      setBulkDeleting(false);
    }
  }

  const filtered = clients.filter((c) => {
    const matchStatus = activeStatus === 'all' || c.status === activeStatus;
    const matchStage  = activeStage  === 'all' || (c.stage ?? 'admission') === activeStage;
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchStage && matchSearch;
  });

  const countForStatus = (s: ClientStatus) =>
    s === 'all' ? clients.length : clients.filter((c) => c.status === s).length;

  const countForStage = (s: StageFilter) =>
    s === 'all'
      ? clients.length
      : clients.filter((c) => (c.stage ?? 'admission') === s).length;

  function openCreate() { setModalData(undefined); setModalOpen(true); }
  function openEdit()   { if (!selectedClient) return; setModalData(selectedClient); setModalOpen(true); }

  async function handleDelete() {
    if (!selectedClient) return;
    if (!window.confirm(T.clients.deleteConfirm(selectedClient.company))) return;
    try {
      const res = await fetch(`${API_URL}/clients/${selectedClient.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setSelectedClient(null);
      refetch();
    } catch (err) {
      console.error('[ClientsPage] delete failed', err);
    }
  }

  function handleModalSuccess() {
    setModalOpen(false);
    setModalData(undefined);
    setSelectedClient(null);
    refetch();
  }

  return (
    <PageTransition>
      <PageHeader
        title={t('pages.clients.title')}
        description={t('pages.clients.desc')}
        actions={
          <div className="flex gap-2">
            {selectedIds.size > 0 && canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleBulkDelete()}
                disabled={bulkDeleting}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {bulkDeleting ? 'Deleting…' : `Delete (${selectedIds.size})`}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void downloadClientsPDF(filtered, activeStatus, search)}
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              {T.clients.exportPdf}
            </Button>
            {canEdit && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                {T.clients.addClient}
              </Button>
            )}
          </div>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-3 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeStatus === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${
              activeStatus === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
            }`}>
              {countForStatus(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Stage tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {STAGE_TABS.map((tab) => {
          const isActive = activeStage === tab.key;
          const count = countForStage(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveStage(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={{
                background:  isActive ? tab.color : '#fff',
                color:       isActive ? '#fff' : tab.color,
                borderColor: isActive ? tab.color : `${tab.color}40`,
                boxShadow:   isActive ? `0 2px 8px ${tab.color}30` : 'none',
              }}
            >
              {tab.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: isActive ? 'rgba(255,255,255,0.25)' : `${tab.color}15`, color: isActive ? '#fff' : tab.color }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T.clients.search} />
      </div>

      {/* Split-view grid */}
      <div className={`grid gap-4 ${selectedClient ? 'grid-cols-5' : 'grid-cols-1'}`}>
        {/* Table */}
        <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${selectedClient ? 'col-span-2' : ''}`}>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">{T.clients.notFound}</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  {!selectedClient && canEdit && (
                    <th className="px-4 py-3.5 w-10" onClick={toggleSelectAll}>
                      <input
                        type="checkbox"
                        readOnly
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filtered.length; }}
                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Client</th>
                  {!selectedClient && <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact</th>}
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Value</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stage</th>
                  {!selectedClient && <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>}
                  {!selectedClient && <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Renewal</th>}
                  {!selectedClient && <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Membership</th>}
                  {!selectedClient && <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Treatments</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, idx) => {
                  const clientStage = (client.stage ?? 'admission') as ClientStage;
                  const stageCfg   = STAGE_TABS.find(s => s.key === clientStage);
                  const isSelected = selectedClient?.id === client.id;
                  const initials = client.company.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
                  const avatarColors = [
                    ['#6366f1','#eef2ff'], ['#d97706','#fffbeb'], ['#0891b2','#ecfeff'],
                    ['#059669','#f0fdf4'], ['#7c3aed','#f5f3ff'], ['#db2777','#fdf2f8'],
                  ];
                  const [avatarColor, avatarBg] = avatarColors[idx % avatarColors.length];
                  const tierCfg = client.membership_tier === 'platinum'
                    ? { label: 'Platinum', bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' }
                    : client.membership_tier === 'gold'
                    ? { label: 'Gold', bg: '#fffbeb', color: '#b45309', border: '#fde68a' }
                    : client.membership_tier === 'silver'
                    ? { label: 'Silver', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
                    : null;

                  return (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClient(isSelected ? null : client)}
                      className={`cursor-pointer border-b border-slate-50 transition-all duration-150 ${
                        isSelected
                          ? 'bg-indigo-50/70 shadow-[inset_3px_0_0_#6366f1]'
                          : selectedIds.has(client.id)
                          ? 'bg-red-50/40'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Bulk-select checkbox */}
                      {!selectedClient && canEdit && (
                        <td className="px-4 py-4 w-10" onClick={e => toggleSelect(client.id, e)}>
                          <input
                            type="checkbox"
                            readOnly
                            checked={selectedIds.has(client.id)}
                            className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                          />
                        </td>
                      )}
                      {/* Client: avatar + company + name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: avatarBg, color: avatarColor }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 leading-tight">{client.company}</p>
                            {!selectedClient && <p className="text-xs text-slate-400 mt-0.5">{client.name}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Contact: email + phone */}
                      {!selectedClient && (
                        <td className="px-5 py-4">
                          <p className="text-sm text-slate-600">{client.email}</p>
                          {client.phone && <p className="text-xs text-slate-400 mt-0.5">{client.phone}</p>}
                        </td>
                      )}

                      {/* Value */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800">
                          {client.contract_value != null
                            ? `£${client.contract_value.toLocaleString('en-GB')}`
                            : '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Annual</p>
                      </td>

                      {/* Stage */}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            color:      stageCfg?.color ?? '#64748b',
                            background: `${stageCfg?.color ?? '#64748b'}18`,
                          }}
                        >
                          {STAGE_LABEL[clientStage]}
                        </span>
                      </td>

                      {/* Status */}
                      {!selectedClient && (
                        <td className="px-5 py-4">
                          <Badge variant={STATUS_BADGE_VARIANT[client.status]} dot>
                            {STATUS_BADGE_LABEL[client.status]}
                          </Badge>
                        </td>
                      )}

                      {/* Renewal */}
                      {!selectedClient && (
                        <td className="px-5 py-4">
                          {client.next_renewal_at ? (
                            <>
                              <p className="text-sm text-slate-600">
                                {new Date(`${client.next_renewal_at}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(`${client.next_renewal_at}T00:00:00`).getFullYear()}
                              </p>
                            </>
                          ) : <span className="text-slate-300 text-sm">—</span>}
                        </td>
                      )}

                      {/* Membership */}
                      {!selectedClient && (
                        <td className="px-5 py-4">
                          {tierCfg ? (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border"
                              style={{ background: tierCfg.bg, color: tierCfg.color, borderColor: tierCfg.border }}
                            >
                              ✦ {tierCfg.label}
                            </span>
                          ) : <span className="text-slate-300 text-sm">—</span>}
                        </td>
                      )}

                      {/* Treatments */}
                      {!selectedClient && (
                        <td className="px-5 py-4">
                          {(client.treatments ?? []).length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {(client.treatments ?? []).slice(0, 2).map(id => {
                                const t = NOOR_TREATMENTS.find(x => x.id === id);
                                return (
                                  <span key={id} className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {t ? t.label : id}
                                  </span>
                                );
                              })}
                              {(client.treatments ?? []).length > 2 && (
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                                  +{(client.treatments ?? []).length - 2} more
                                </span>
                              )}
                            </div>
                          ) : <span className="text-slate-300 text-sm">—</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selectedClient && (
          <div className="col-span-3">
            <ClientDetailPanel
              client={selectedClient}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={() => void handleDelete()}
              onClose={() => setSelectedClient(null)}
            />
          </div>
        )}
      </div>

      {modalOpen && (
        <ClientModal
          isOpen={modalOpen}
          initialData={modalData}
          onSuccess={handleModalSuccess}
          onClose={() => { setModalOpen(false); setModalData(undefined); }}
        />
      )}
    </PageTransition>
  );
}
