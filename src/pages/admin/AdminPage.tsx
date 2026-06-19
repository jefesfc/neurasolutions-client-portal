import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../../components/shared/PageTransition';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/auth-store';
import type { AuthUser } from '../../store/auth-store';
import { Building2, Users, Zap, MessageCircle, Mail, Copy, Check, LogIn } from 'lucide-react';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
  industry: string | null;
  created_at: string;
  user_count?: number;
}

const planVariant: Record<string, 'success' | 'warning' | 'info'> = {
  starter: 'info',
  growth: 'warning',
  enterprise: 'success',
};

export default function AdminPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyId(id: string) {
    void navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }
  const [botTokens, setBotTokens] = useState<Record<string, string>>({});
  const [tgStatus, setTgStatus] = useState<Record<string, boolean>>({});
  const [tgLoading, setTgLoading] = useState<Record<string, boolean>>({});
  const [tgError, setTgError] = useState<Record<string, string>>({});

  const [gmailExpandedId, setGmailExpandedId] = useState<string | null>(null);
  const [gmailStatus, setGmailStatus] = useState<Record<string, boolean>>({});
  const [gmailLoading, setGmailLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`${API_URL}/admin/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setTenants((data as { tenants?: Tenant[] }).tenants ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  async function fetchTgStatus(tenantId: string) {
    const r = await fetch(`${API_URL}/telegram/activate/${tenantId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await r.json()) as { enabled: boolean };
    setTgStatus((prev) => ({ ...prev, [tenantId]: data.enabled }));
  }

  function toggleTelegram(tenantId: string) {
    if (expandedTenantId === tenantId) {
      setExpandedTenantId(null);
    } else {
      setExpandedTenantId(tenantId);
      void fetchTgStatus(tenantId);
    }
  }

  async function activateTelegram(tenantId: string) {
    const botToken = botTokens[tenantId];
    if (!botToken) return;
    setTgLoading((prev) => ({ ...prev, [tenantId]: true }));
    setTgError((prev) => ({ ...prev, [tenantId]: '' }));
    try {
      const r = await fetch(`${API_URL}/telegram/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenant_id: tenantId, bot_token: botToken }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setTgStatus((prev) => ({ ...prev, [tenantId]: true }));
        setBotTokens((prev) => ({ ...prev, [tenantId]: '' }));
      } else {
        setTgError((prev) => ({ ...prev, [tenantId]: data.error ?? 'Activation failed' }));
      }
    } finally {
      setTgLoading((prev) => ({ ...prev, [tenantId]: false }));
    }
  }

  async function deactivateTelegram(tenantId: string) {
    setTgLoading((prev) => ({ ...prev, [tenantId]: true }));
    try {
      await fetch(`${API_URL}/telegram/activate/${tenantId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setTgStatus((prev) => ({ ...prev, [tenantId]: false }));
    } finally {
      setTgLoading((prev) => ({ ...prev, [tenantId]: false }));
    }
  }

  async function fetchGmailStatus(tenantId: string) {
    try {
      const r = await fetch(`${API_URL}/emails/activate/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await r.json()) as { enabled: boolean };
      setGmailStatus((prev) => ({ ...prev, [tenantId]: data.enabled }));
    } catch {
      setGmailStatus((prev) => ({ ...prev, [tenantId]: false }));
    }
  }

  function toggleGmail(tenantId: string) {
    if (gmailExpandedId === tenantId) {
      setGmailExpandedId(null);
    } else {
      setGmailExpandedId(tenantId);
      void fetchGmailStatus(tenantId);
    }
  }

  async function activateGmail(tenantId: string) {
    setGmailLoading((prev) => ({ ...prev, [tenantId]: true }));
    try {
      await fetch(`${API_URL}/emails/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenant_id: tenantId, enabled: true }),
      });
      setGmailStatus((prev) => ({ ...prev, [tenantId]: true }));
    } finally {
      setGmailLoading((prev) => ({ ...prev, [tenantId]: false }));
    }
  }

  async function enterTenant(tenantId: string) {
    setImpersonating(tenantId);
    try {
      const r = await fetch(`${API_URL}/admin/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      const data = (await r.json()) as { token?: string; user?: AuthUser; error?: string };
      if (!data.token || !data.user) { alert(data.error ?? 'Failed'); return; }
      // Save original admin session so TopBar can restore it
      localStorage.setItem('aios_admin_session', JSON.stringify({ token, user }));
      login(data.token, data.user);
      navigate('/');
    } finally {
      setImpersonating(null);
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Platform Admin"
        description="All tenants on the NeuraSolutions platform"
      />

      {loading ? (
        <div className="text-slate-400 text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {tenant.name || <span className="text-slate-400 italic">No name</span>}
                    </p>
                    <p className="text-xs text-slate-400">{tenant.subdomain || '—'}</p>
                    <button
                      onClick={() => copyId(tenant.id)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-brand-600 mt-0.5 font-mono"
                    >
                      {copiedId === tenant.id
                        ? <><Check className="w-2.5 h-2.5 text-positive" /><span className="text-positive">Copied!</span></>
                        : <><Copy className="w-2.5 h-2.5" />{tenant.id.slice(0, 8)}…</>}
                    </button>
                  </div>
                </div>
                <Badge variant={planVariant[tenant.plan] ?? 'neutral'}>
                  {tenant.plan}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                {tenant.industry && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {tenant.industry}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {tenant.user_count ?? 0} users
                </span>
              </div>

              {/* Telegram section */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => toggleTelegram(tenant.id)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  Telegram {tgStatus[tenant.id] ? '✅' : '⚪'}
                </button>

                {expandedTenantId === tenant.id && (
                  <div className="mt-3 space-y-2">
                    {tgStatus[tenant.id] ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-positive font-medium">✅ Bot active</span>
                        <button
                          onClick={() => void deactivateTelegram(tenant.id)}
                          disabled={tgLoading[tenant.id]}
                          className="text-xs text-danger hover:underline disabled:opacity-50"
                        >
                          {tgLoading[tenant.id] ? '...' : 'Deactivate'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="Bot token from BotFather"
                            value={botTokens[tenant.id] ?? ''}
                            onChange={(e) =>
                              setBotTokens((prev) => ({ ...prev, [tenant.id]: e.target.value }))
                            }
                            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                          <button
                            onClick={() => void activateTelegram(tenant.id)}
                            disabled={tgLoading[tenant.id] || !botTokens[tenant.id]}
                            className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded hover:bg-brand-600 disabled:opacity-50 whitespace-nowrap"
                          >
                            {tgLoading[tenant.id] ? '...' : 'Activate'}
                          </button>
                        </div>
                        {tgError[tenant.id] && (
                          <p className="text-xs text-danger">{tgError[tenant.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Enter tenant dashboard */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => void enterTenant(tenant.id)}
                  disabled={impersonating === tenant.id || !tenant.user_count}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {impersonating === tenant.id ? 'Entering…' : 'Enter Dashboard'}
                </button>
              </div>

              {/* Gmail / Emails section */}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => toggleGmail(tenant.id)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  Gmail {gmailStatus[tenant.id] ? '✅' : '⚪'}
                </button>

                {gmailExpandedId === tenant.id && (
                  <div className="mt-3 space-y-2">
                    {gmailStatus[tenant.id] ? (
                      <span className="text-xs text-positive font-medium">✅ Gmail active</span>
                    ) : (
                      <div className="space-y-2 text-xs text-slate-600">
                        <p className="font-medium">Setup steps:</p>
                        <ol className="space-y-1 list-decimal list-inside text-slate-500">
                          <li>Create n8n workflow "AIOS Email Watcher" for this tenant</li>
                          <li>Configure Gmail Trigger with the tenant's Gmail account</li>
                          <li>Set HTTP Request node → POST /emails/ingest with service JWT</li>
                          <li>
                            Set tenant_id ={' '}
                            <code className="bg-slate-100 px-1 rounded font-mono">{tenant.id}</code>
                          </li>
                          <li>Activate the workflow in n8n</li>
                        </ol>
                        <button
                          onClick={() => void activateGmail(tenant.id)}
                          disabled={gmailLoading[tenant.id]}
                          className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded hover:bg-brand-600 disabled:opacity-50"
                        >
                          {gmailLoading[tenant.id] ? '...' : 'Mark as Active'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
