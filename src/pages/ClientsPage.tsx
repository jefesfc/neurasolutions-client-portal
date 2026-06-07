import { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchInput } from '../components/shared/SearchInput';
import { ClientDetailPanel } from '../components/clients/ClientDetailPanel';
import { ClientModal } from '../components/clients/ClientModal';
import { downloadClientsPDF } from '../lib/pdf';
import type { Client } from '../types/aios';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

type ClientStatus = Client['status'] | 'all';

const STATUS_TABS: { key: ClientStatus; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'active',   label: 'Active'   },
  { key: 'inactive', label: 'Inactive' },
  { key: 'churned',  label: 'Churned'  },
];

const STATUS_BADGE: Record<Client['status'], { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  active:   { variant: 'success', label: 'Active'   },
  inactive: { variant: 'warning', label: 'Inactive' },
  churned:  { variant: 'danger',  label: 'Churned'  },
};

export default function ClientsPage() {
  const { data: clients, loading, error, refetch } = useQuery<Client>('clients', { order: 'created_at.desc' });
  const { user, token } = useAuthStore();
  const [activeStatus, setActiveStatus] = useState<ClientStatus>('all');
  const [search, setSearch]             = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalData, setModalData]           = useState<Partial<Client> | undefined>(undefined);

  const canEdit = user?.role !== 'user';

  const filtered = clients.filter((c) => {
    const matchStatus = activeStatus === 'all' || c.status === activeStatus;
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const countFor = (s: ClientStatus) =>
    s === 'all' ? clients.length : clients.filter((c) => c.status === s).length;

  function openCreate() { setModalData(undefined); setModalOpen(true); }
  function openEdit()   { if (!selectedClient) return; setModalData(selectedClient); setModalOpen(true); }

  async function handleDelete() {
    if (!selectedClient) return;
    if (!window.confirm(`Delete "${selectedClient.company}"? This cannot be undone.`)) return;
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
        title="Clients"
        description="Manage your converted accounts and contracts"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void downloadClientsPDF(filtered, activeStatus, search)}
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
            {canEdit && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Add Client
              </Button>
            )}
          </div>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5 flex-wrap">
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
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." />
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
            <div className="p-12 text-center text-slate-400">No clients found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Company</th>
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>}
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>}
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">Renewal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((client) => {
                  const badge = STATUS_BADGE[client.status];
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
                      <td className="px-4 py-3 text-slate-600">
                        {client.contract_value != null
                          ? `£${client.contract_value.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant} dot>{badge.label}</Badge>
                      </td>
                      {!selectedClient && (
                        <td className="px-4 py-3 text-slate-400">
                          {client.next_renewal_at
                            ? new Date(`${client.next_renewal_at}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
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

      {/* Modal — only mount when open */}
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
