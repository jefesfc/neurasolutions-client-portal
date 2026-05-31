import { useState, useEffect } from "react";
import { useQuery } from "../hooks/useQuery";
import { postgrest } from "../lib/postgrest";
import { useAuthStore } from "../store/auth-store";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Tabs } from "../components/ui/Tabs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";

interface Tenant {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  website: string | null;
  logo: string | null;
}

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

function CompanyTab({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useQuery<Tenant>("tenants", {
    filters: { id: `eq.${tenantId}` },
  });
  const tenant = data[0];

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name ?? "");
      setIndustry(tenant.industry ?? "");
      setSize(tenant.size ?? "");
      setWebsite(tenant.website ?? "");
      setLogo(tenant.logo ?? "");
    }
  }, [tenant]);

  const isDirty =
    tenant &&
    (name !== (tenant.name ?? "") ||
      industry !== (tenant.industry ?? "") ||
      size !== (tenant.size ?? "") ||
      website !== (tenant.website ?? "") ||
      logo !== (tenant.logo ?? ""));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await postgrest.patch<Tenant>(
        "tenants",
        { id: `eq.${tenantId}` },
        {
          name: name.trim(),
          industry: industry.trim() || null,
          size: size.trim() || null,
          website: website.trim() || null,
          logo: logo.trim() || null,
        }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="space-y-4 max-w-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  if (error) return <div className="text-danger text-sm">{error}</div>;

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Company Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Corp"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Industry</label>
        <Input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. SaaS, Real Estate, Finance"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Company Size</label>
        <Input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="e.g. 1-10, 11-50, 51-200"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Website</label>
        <Input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Logo URL</label>
        <Input
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
        {logo && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={logo}
              alt="Logo preview"
              className="h-10 object-contain rounded border border-surface-200 bg-surface-50 p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="text-xs text-surface-400">Preview</span>
          </div>
        )}
      </div>
      {saveError && <p className="text-sm text-danger">{saveError}</p>}
      {saved && <p className="text-sm text-positive">Changes saved successfully.</p>}
      <div className="pt-2">
        <Button type="submit" disabled={!isDirty} loading={saving}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

function SecurityTab() {
  const { token } = useAuthStore();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next !== confirm) {
      setError("New passwords do not match");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (next === current) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update password");
      }

      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Current Password</label>
        <Input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">New Password</label>
        <Input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">
          Confirm New Password
        </label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-positive">Password updated successfully.</p>}
      <div className="pt-2">
        <Button type="submit" loading={loading}>
          Update Password
        </Button>
      </div>
    </form>
  );
}

function TelegramTab() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<{ linked: boolean; chat_id: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/telegram/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setStatus(data as { linked: boolean; chat_id: string | null }))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch(`${API_URL}/telegram/link`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setStatus({ linked: false, chat_id: null });
    setDisconnecting(false);
  }

  if (loading) return <Skeleton className="h-20 rounded-lg max-w-lg" />;

  if (status?.linked) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50">
          <span className="text-green-600 text-lg">✅</span>
          <div>
            <p className="font-medium text-surface-900">Telegram connected</p>
            <p className="text-xs text-surface-500">Chat ID: {status.chat_id}</p>
          </div>
        </div>
        <Button variant="secondary" loading={disconnecting} onClick={() => void handleDisconnect()}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-surface-600">
        Connect your Telegram account to chat with AIOS directly from your phone.
      </p>
      <ol className="space-y-4">
        <li className="flex gap-3 text-sm text-surface-700">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-semibold">
            1
          </span>
          Open Telegram and find your company's AIOS bot
        </li>
        <li className="flex gap-3 text-sm text-surface-700">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-semibold">
            2
          </span>
          Send the message{" "}
          <code className="bg-surface-100 px-1.5 py-0.5 rounded text-xs font-mono">/start</code>
        </li>
        <li className="flex gap-3 text-sm text-surface-700">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-semibold">
            3
          </span>
          The bot will confirm your connection automatically
        </li>
      </ol>
    </div>
  );
}

function EmailTab() {
  const { token } = useAuthStore();
  const [labelFilter, setLabelFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_URL}/emails/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label_filter: labelFilter.trim() || null }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-surface-600">
        Configure which Gmail labels are synced to AIOS. Leave blank to receive all incoming emails.
      </p>
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">
            Gmail Label Filter
          </label>
          <Input
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            placeholder="INBOX (leave blank for all emails)"
          />
          <p className="text-xs text-surface-400 mt-1">
            Examples:{' '}
            <code className="bg-surface-100 px-1 rounded">INBOX</code>,{' '}
            <code className="bg-surface-100 px-1 rounded">Label_Clients</code>
          </p>
        </div>
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        {saved && <p className="text-sm text-positive">Saved successfully.</p>}
        <div className="pt-1">
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </div>
      </form>
      <div className="border-t border-surface-200 pt-4">
        <p className="text-xs text-surface-500">
          To connect Gmail, contact NeuraSolutions — we configure the n8n workflow for your account.
        </p>
      </div>
    </div>
  );
}

function CalendarTab() {
  const { token } = useAuthStore();
  const [telegramNotify, setTelegramNotify] = useState(false);
  const [emailNotify, setEmailNotify]       = useState(false);
  const [advanceDays, setAdvanceDays]       = useState(1);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [saveError, setSaveError]           = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/calendar/settings-read`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { telegram_notify?: boolean; email_notify?: boolean; advance_days?: number }) => {
        setTelegramNotify(data.telegram_notify ?? false);
        setEmailNotify(data.email_notify ?? false);
        setAdvanceDays(data.advance_days ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_URL}/calendar/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ telegram_notify: telegramNotify, email_notify: emailNotify, advance_days: advanceDays }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-32 rounded-lg max-w-lg" />;

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-surface-600">
        Configure how AIOS notifies your team about upcoming calendar events.
      </p>
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={telegramNotify} onChange={e => setTelegramNotify(e.target.checked)} className="rounded" />
          <span className="text-sm text-surface-700">Send Telegram reminders</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={emailNotify} onChange={e => setEmailNotify(e.target.checked)} className="rounded" />
          <span className="text-sm text-surface-700">Send Email reminders</span>
        </label>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Advance notice</label>
          <select
            value={advanceDays}
            onChange={e => setAdvanceDays(parseInt(e.target.value))}
            className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value={1}>1 day before</option>
            <option value={3}>3 days before</option>
            <option value={7}>1 week before</option>
          </select>
        </div>
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        {saved && <p className="text-sm text-positive">Saved successfully.</p>}
        <div className="pt-1">
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const { user } = useAuthStore();

  const tabs = [
    { id: "company", label: "Company" },
    { id: "security", label: "Security" },
    ...(user?.role === "admin"
      ? [
          { id: "telegram", label: "Telegram" },
          { id: "email", label: "Email" },
          { id: "calendar", label: "Calendar" },
        ]
      : []),
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Settings"
        description="Manage your account and company preferences"
      />
      <div className="w-fit mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === "company" && <CompanyTab tenantId={user?.tenant_id ?? ""} />}
      {activeTab === "security" && <SecurityTab />}
      {activeTab === "telegram" && <TelegramTab />}
      {activeTab === "email" && <EmailTab />}
      {activeTab === "calendar" && <CalendarTab />}
    </PageTransition>
  );
}
