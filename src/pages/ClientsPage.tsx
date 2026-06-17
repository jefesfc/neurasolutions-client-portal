import { useState } from 'react';
import { Download, Plus } from 'lucide-react';
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

  const canEdit = user?.role !== 'user';

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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{T.clients.colCompany}</th>
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">{T.clients.colName}</th>}
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">{T.clients.colEmail}</th>}
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">{T.clients.colPhone}</th>}
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{T.clients.colValue}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{T.clients.colStage}</th>
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">{T.clients.colStatus}</th>}
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">{T.clients.colRenewal}</th>}
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">Membership</th>}
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">Treatments</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((client) => {
                  const clientStage = (client.stage ?? 'admission') as ClientStage;
                  const stageCfg   = STAGE_TABS.find(s => s.key === clientStage);
                  const isSelected = selectedClient?.id === client.id;
                  return (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClient(isSelected ? null : client)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{client.company}</td>
                      {!selectedClient && <td className="px-4 py-3 text-slate-600">{client.name}</td>}
                      {!selectedClient && <td className="px-4 py-3 text-slate-500">{client.email}</td>}
                      {!selectedClient && <td className="px-4 py-3 text-slate-500">{client.phone ?? '—'}</td>}
                      <td className="px-4 py-3 text-slate-600">
                        {client.contract_value != null
                          ? `£${client.contract_value.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            color:      stageCfg?.color ?? '#64748b',
                            background: `${stageCfg?.color ?? '#64748b'}15`,
                          }}
                        >
                          {STAGE_LABEL[clientStage]}
                        </span>
                      </td>
                      {!selectedClient && (
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_BADGE_VARIANT[client.status]} dot>{STATUS_BADGE_LABEL[client.status]}</Badge>
                        </td>
                      )}
                      {!selectedClient && (
                        <td className="px-4 py-3 text-slate-400">
                          {client.next_renewal_at
                            ? new Date(`${client.next_renewal_at}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                      )}
                      {!selectedClient && (
                        <td className="px-4 py-3">
                          {client.membership_tier ? (() => {
                            const cfg = client.membership_tier === 'platinum'
                              ? { label: 'Platinum', bg: '#eef2ff', color: '#4338ca' }
                              : client.membership_tier === 'gold'
                              ? { label: 'Gold', bg: '#fffbeb', color: '#92400e' }
                              : { label: 'Silver', bg: '#f8fafc', color: '#64748b' };
                            return (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' }}>
                                ✦ {cfg.label}
                              </span>
                            );
                          })() : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      )}
                      {!selectedClient && (
                        <td className="px-4 py-3">
                          {(client.treatments ?? []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(client.treatments ?? []).slice(0, 2).map(id => {
                                const t = NOOR_TREATMENTS.find(x => x.id === id);
                                const label = t ? t.label : id;
                                return (
                                  <span key={id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {label}
                                  </span>
                                );
                              })}
                              {(client.treatments ?? []).length > 2 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                  +{(client.treatments ?? []).length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
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
