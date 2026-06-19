import { useState, useEffect } from "react";
import { useQuery } from "../hooks/useQuery";
import { postgrest } from "../lib/postgrest";
import { useAuthStore } from "../store/auth-store";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { useT, useTranslations } from "../i18n/useT";
import { Tabs } from "../components/ui/Tabs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { useTheme, type ColorPalette } from "../hooks/useTheme";
import { Layers, Type, Sparkles, Activity, BarChart2, RotateCcw, Save } from "lucide-react";

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

const labelCls  = "block text-sm font-medium text-slate-700 mb-1";
const selectCls = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";

function CompanyTab({ tenantId }: { tenantId: string }) {
  const T = useTranslations();
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
        <label className={labelCls}>{T.settings.companyName}</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" required />
      </div>
      <div>
        <label className={labelCls}>{T.settings.industry}</label>
        <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. SaaS, Real Estate, Finance" />
      </div>
      <div>
        <label className={labelCls}>{T.settings.companySize}</label>
        <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 1-10, 11-50, 51-200" />
      </div>
      <div>
        <label className={labelCls}>{T.settings.website}</label>
        <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
      </div>
      <div>
        <label className={labelCls}>{T.settings.logoUrl}</label>
        <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://example.com/logo.png" />
        {logo && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={logo}
              alt={T.settings.logoPreview}
              className="h-10 object-contain rounded border border-slate-200 bg-white p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-xs text-slate-500">{T.settings.logoPreview}</span>
          </div>
        )}
      </div>
      {saveError && <p className="text-sm text-danger">{saveError}</p>}
      {saved && <p className="text-sm text-positive">{T.settings.changesSaved}</p>}
      <div className="pt-2">
        <Button type="submit" disabled={!isDirty} loading={saving}>{T.settings.saveChanges}</Button>
      </div>

      {/* Demo tour reset */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">{T.settings.productTour}</p>
            <p className="text-xs text-slate-500 mt-0.5">{T.settings.productTourDesc}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              Object.keys(localStorage)
                .filter((k) => k.startsWith('aios_onboarded_'))
                .forEach((k) => localStorage.removeItem(k));
              window.dispatchEvent(new CustomEvent('aios:restart-tour'));
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {T.settings.restartTour}
          </button>
        </div>
      </div>
    </form>
  );
}

function SecurityTab() {
  const T = useTranslations();
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

    if (next !== confirm) { setError("New passwords do not match"); return; }
    if (next.length < 8) { setError("New password must be at least 8 characters"); return; }
    if (next === current) { setError("New password must be different from current password"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update password");
      }
      setSuccess(true);
      setCurrent(""); setNext(""); setConfirm("");
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
        <label className={labelCls}>{T.settings.currentPw}</label>
        <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
      </div>
      <div>
        <label className={labelCls}>{T.settings.newPw}</label>
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
      </div>
      <div>
        <label className={labelCls}>{T.settings.confirmPw}</label>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-positive">{T.settings.pwUpdated}</p>}
      <div className="pt-2">
        <Button type="submit" loading={loading}>{T.settings.updatePw}</Button>
      </div>
    </form>
  );
}

function TelegramTab() {
  const T = useTranslations();
  const { token } = useAuthStore();
  const [status, setStatus] = useState<{ linked: boolean; chat_id: string | null; bot_username: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/telegram/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setStatus(data as { linked: boolean; chat_id: string | null; bot_username: string | null }))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch(`${API_URL}/telegram/link`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setStatus({ linked: false, chat_id: null, bot_username: status?.bot_username ?? null });
    setDisconnecting(false);
  }

  if (loading) return <Skeleton className="h-20 rounded-lg max-w-lg" />;

  if (status?.linked) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg border border-positive/25 bg-positive/8">
          <span className="text-positive text-lg">✓</span>
          <div>
            <p className="font-medium text-slate-800">{T.settings.telegramConnected}</p>
            <p className="text-xs text-slate-500">{T.settings.chatId(status.chat_id ?? '')}</p>
          </div>
        </div>
        <Button variant="secondary" loading={disconnecting} onClick={() => void handleDisconnect()}>
          {T.settings.disconnect}
        </Button>
      </div>
    );
  }

  const botUsername = status?.bot_username ?? null;
  const telegramUrl = botUsername ? `https://t.me/${botUsername}` : null;

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-slate-500">
        {T.settings.telegramDesc}
      </p>

      {botUsername && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-sky-50 border border-sky-200">
          <div>
            <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1">Your AIOS Bot</p>
            <p className="font-mono text-sm font-bold text-sky-800">@{botUsername}</p>
          </div>
          <a
            href={telegramUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors"
          >
            Open in Telegram →
          </a>
        </div>
      )}

      <ol className="space-y-4">
        {[
          botUsername
            ? <span key="1">Click <strong>Open in Telegram</strong> above or search for <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">@{botUsername}</code></span>
            : T.settings.telegramStep1,
          <span key="2">Send the message <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">/start</code></span>,
          T.settings.telegramStep3,
        ].map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-600">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/15 text-brand-400 flex items-center justify-center text-xs font-semibold">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function EmailTab() {
  const T = useTranslations();
  const { token } = useAuthStore();
  const [labelFilter, setLabelFilter] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/emails/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: { label_filter?: string | null; smtp_user?: string | null; smtp_configured?: boolean }) => {
        setLabelFilter(data.label_filter ?? '');
        setSmtpUser(data.smtp_user ?? '');
        setSmtpConfigured(data.smtp_configured ?? false);
      })
      .catch(() => {});
  }, [token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, string | null> = {
        label_filter: labelFilter.trim() || null,
        smtp_user: smtpUser.trim() || null,
      };
      if (smtpPass.trim()) body.smtp_pass = smtpPass.trim();

      const res = await fetch(`${API_URL}/emails/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? 'Failed to save');
      }
      setSaved(true);
      if (smtpPass.trim()) { setSmtpPass(''); setSmtpConfigured(true); }
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-slate-500">{T.settings.gmailDesc}</p>
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">

        {/* Outbound SMTP */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Outbound Email (Gmail)</p>
            {smtpConfigured && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Configured
              </span>
            )}
          </div>
          <div>
            <label className={labelCls}>Gmail Address</label>
            <Input
              type="email"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="you@gmail.com"
            />
          </div>
          <div>
            <label className={labelCls}>
              App Password{smtpConfigured ? ' (leave blank to keep current)' : ''}
            </label>
            <Input
              type="password"
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder={smtpConfigured ? '••••••••••••••••' : 'xxxx xxxx xxxx xxxx'}
              autoComplete="new-password"
            />
            <p className="text-xs text-slate-400 mt-1">
              Generate in Google Account → Security → 2-Step Verification → App passwords
            </p>
          </div>
        </div>

        {/* Gmail label filter */}
        <div>
          <label className={labelCls}>{T.settings.gmailLabelFilter}</label>
          <Input value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} placeholder={T.settings.gmailPh} />
          <p className="text-xs text-slate-500 mt-1">
            Examples:{' '}
            <code className="bg-slate-100 px-1 rounded text-slate-700">INBOX</code>,{' '}
            <code className="bg-slate-100 px-1 rounded text-slate-700">Label_Clients</code>
          </p>
        </div>

        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        {saved && <p className="text-sm text-positive">{T.settings.changesSaved}</p>}
        <div className="pt-1">
          <Button type="submit" loading={saving}>{T.common.save}</Button>
        </div>
      </form>
      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500">{T.settings.gmailNote}</p>
      </div>
    </div>
  );
}

// ── Color editor helpers ────────────────────────────────────────────

function ColorRow({
  label, description, value, onChange,
}: {
  label: string; description?: string;
  value: string; onChange: (v: string) => void;
}) {
  const id = `cp-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const isValidHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className="relative w-9 h-9 rounded-lg flex-shrink-0 cursor-pointer shadow ring-1 ring-slate-200/50"
        style={{ backgroundColor: isValidHex ? value : "#334155" }}
        onClick={() => document.getElementById(id)?.click()}
      >
        <input
          id={id} type="color" value={isValidHex ? value : "#334155"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
        }}
        className="w-24 text-xs font-mono bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
      />
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-brand-400">{icon}</span>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 px-4">
        {children}
      </div>
    </div>
  );
}

function MiniPreview({ p }: { p: ColorPalette }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 w-52 flex-shrink-0 shadow-xl" style={{ backgroundColor: p.appBg }}>
      <div className="h-7 flex items-center px-2 gap-1.5 border-b" style={{ borderColor: p.borderHover }}>
        <div className="w-10 h-2 rounded-sm" style={{ backgroundColor: p.brandAccent }} />
        <div className="flex-1" />
        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: p.cardBg }} />
      </div>
      <div className="flex" style={{ minHeight: 110 }}>
        <div className="w-9 border-r flex flex-col gap-1.5 p-1.5" style={{ borderColor: p.borderHover, backgroundColor: p.appBg }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1.5 rounded-sm"
              style={{ backgroundColor: i === 0 ? p.brandAccent : p.borderHover, opacity: i === 0 ? 1 : 0.6 }} />
          ))}
        </div>
        <div className="flex-1 p-2 space-y-2">
          <div className="rounded-lg p-2 space-y-1" style={{ backgroundColor: p.cardBg, border: `1px solid ${p.borderHover}` }}>
            <div className="h-1.5 w-14 rounded-sm" style={{ backgroundColor: p.textPrimary }} />
            <div className="h-1 w-10 rounded-sm" style={{ backgroundColor: p.textMuted }} />
          </div>
          <div className="rounded-lg p-2" style={{ backgroundColor: p.cardBg, border: `1px solid ${p.borderHover}` }}>
            <div className="h-1 w-10 rounded-sm mb-1.5" style={{ backgroundColor: p.textLabel }} />
            <div className="grid grid-cols-3 gap-1">
              {[p.chart1, p.chart2, p.chart3].map((c, i) => (
                <div key={i} className="h-5 rounded-sm" style={{ backgroundColor: c, opacity: 0.85 }} />
              ))}
            </div>
          </div>
          <div className="rounded-md px-3 py-1.5 text-center" style={{ backgroundColor: p.brandAccent }}>
            <div className="h-1.5 w-10 rounded-sm mx-auto bg-white/80" />
          </div>
        </div>
      </div>
      <div className="px-2 py-1.5 flex gap-1 border-t" style={{ borderColor: p.borderHover }}>
        <div className="h-1 flex-1 rounded-sm" style={{ backgroundColor: p.colorSuccess, opacity: 0.7 }} />
        <div className="h-1 flex-1 rounded-sm" style={{ backgroundColor: p.colorWarning, opacity: 0.7 }} />
        <div className="h-1 flex-1 rounded-sm" style={{ backgroundColor: p.colorDanger, opacity: 0.7 }} />
      </div>
    </div>
  );
}

function AppearanceTab() {
  const T = useTranslations();
  const { palette, setPalette, savePalette, resetPalette } = useTheme();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    savePalette();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const set = (key: keyof ColorPalette) => (v: string) => setPalette({ [key]: v });

  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0 space-y-5">
        <p className="text-sm text-slate-500">{T.settings.appearanceDesc}</p>

        <Section icon={<Layers className="h-4 w-4" />} title={T.settings.bgTitle}>
          <ColorRow label={T.settings.appBg} description={T.settings.appBgDesc} value={palette.appBg} onChange={set("appBg")} />
          <ColorRow label={T.settings.cardsBg} description={T.settings.cardsBgDesc} value={palette.cardBg} onChange={set("cardBg")} />
          <ColorRow label={T.settings.borderHover} description={T.settings.borderHoverDesc} value={palette.borderHover} onChange={set("borderHover")} />
        </Section>

        <Section icon={<Type className="h-4 w-4" />} title={T.settings.typoTitle}>
          <ColorRow label={T.settings.primaryText} description={T.settings.primaryTextDesc} value={palette.textPrimary} onChange={set("textPrimary")} />
          <ColorRow label={T.settings.labelsText} description={T.settings.labelsTextDesc} value={palette.textLabel} onChange={set("textLabel")} />
          <ColorRow label={T.settings.secondaryText} description={T.settings.secondaryTextDesc} value={palette.textSecondary} onChange={set("textSecondary")} />
          <ColorRow label={T.settings.mutedText} description={T.settings.mutedTextDesc} value={palette.textMuted} onChange={set("textMuted")} />
        </Section>

        <Section icon={<Sparkles className="h-4 w-4" />} title={T.settings.brandTitle}>
          <ColorRow label={T.settings.primaryAccent} description={T.settings.primaryAccentDesc} value={palette.brandAccent} onChange={set("brandAccent")} />
        </Section>

        <Section icon={<Activity className="h-4 w-4" />} title={T.settings.statusTitle}>
          <ColorRow label={T.settings.successColor} description={T.settings.successColorDesc} value={palette.colorSuccess} onChange={set("colorSuccess")} />
          <ColorRow label={T.settings.warningColor} description={T.settings.warningColorDesc} value={palette.colorWarning} onChange={set("colorWarning")} />
          <ColorRow label={T.settings.dangerColor} description={T.settings.dangerColorDesc} value={palette.colorDanger} onChange={set("colorDanger")} />
        </Section>

        <Section icon={<BarChart2 className="h-4 w-4" />} title={T.settings.chartTitle}>
          {([1, 2, 3, 4, 5, 6] as const).map((n) => (
            <ColorRow key={n} label={T.settings.chartColor(n)}
              value={palette[`chart${n}` as keyof ColorPalette] as string}
              onChange={set(`chart${n}` as keyof ColorPalette)} />
          ))}
        </Section>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saved ? T.settings.savedOk : T.settings.saveChanges}
          </Button>
          <Button variant="secondary" onClick={resetPalette} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            {T.settings.resetDefaults}
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{T.settings.livePreview}</p>
        <MiniPreview p={palette} />
      </div>
    </div>
  );
}

function CalendarTab() {
  const T = useTranslations();
  const { token } = useAuthStore();
  const [telegramNotify, setTelegramNotify] = useState(false);
  const [emailNotify, setEmailNotify]       = useState(false);
  const [advanceDays, setAdvanceDays]       = useState(1);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [saveError, setSaveError]           = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/calendar/settings-read`, { headers: { Authorization: `Bearer ${token}` } })
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
      <p className="text-sm text-slate-500">{T.settings.calDesc}</p>
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={telegramNotify} onChange={e => setTelegramNotify(e.target.checked)} className="rounded accent-brand-500" />
          <span className="text-sm text-slate-600">{T.settings.telegramReminders}</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={emailNotify} onChange={e => setEmailNotify(e.target.checked)} className="rounded accent-brand-500" />
          <span className="text-sm text-slate-600">{T.settings.emailReminders}</span>
        </label>
        <div>
          <label className={labelCls}>{T.settings.advanceNotice}</label>
          <select
            value={advanceDays}
            onChange={e => setAdvanceDays(parseInt(e.target.value))}
            className={selectCls}
          >
            <option value={1}>{T.settings.day1}</option>
            <option value={3}>{T.settings.day3}</option>
            <option value={7}>{T.settings.week1}</option>
            <option value={30}>{T.settings.month1}</option>
            <option value={90}>{T.settings.months3}</option>
            <option value={180}>{T.settings.months6}</option>
          </select>
        </div>
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        {saved && <p className="text-sm text-positive">{T.settings.changesSaved}</p>}
        <div className="pt-1">
          <Button type="submit" loading={saving}>{T.common.save}</Button>
        </div>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  const t = useT();
  const T = useTranslations();
  const [activeTab, setActiveTab] = useState("company");
  const { user } = useAuthStore();

  const tabs = [
    { id: "appearance", label: T.settings.tabAppearance },
    { id: "company",    label: T.settings.tabCompany    },
    { id: "security",   label: T.settings.tabSecurity   },
    ...(user?.role === "admin"
      ? [
          { id: "telegram", label: T.settings.tabTelegram },
          { id: "email",    label: T.settings.tabEmail    },
          { id: "calendar", label: T.settings.tabCalendar },
        ]
      : []),
  ];

  return (
    <PageTransition>
      <PageHeader title={t('pages.settings.title')} description={t('pages.settings.desc')} />
      <div className="w-fit mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === "appearance" && <AppearanceTab />}
      {activeTab === "company"    && <CompanyTab tenantId={user?.tenant_id ?? ""} />}
      {activeTab === "security"   && <SecurityTab />}
      {activeTab === "telegram"   && <TelegramTab />}
      {activeTab === "email"      && <EmailTab />}
      {activeTab === "calendar"   && <CalendarTab />}
    </PageTransition>
  );
}
