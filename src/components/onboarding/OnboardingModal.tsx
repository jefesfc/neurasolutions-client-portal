import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Bot, Shield, FileText,
  Calendar, Mail, Zap, CheckCircle2, ChevronRight, X, Send,
  Brain, Sparkles, MessageSquare, ArrowRight, Building2, Upload,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

const STORAGE_KEY = (userId: string) => `aios_onboarded_${userId}`;

const FEATURES = [
  { icon: LayoutDashboard, label: 'Dashboard',         desc: 'Real-time KPIs & business health',      color: '#6366f1' },
  { icon: Users,           label: 'Clients & Leads',   desc: 'Full CRM with pipeline management',     color: '#8b5cf6' },
  { icon: Shield,          label: 'Security Monitor',  desc: 'Real-time threat detection & alerts',   color: '#f43f5e' },
  { icon: Calendar,        label: 'Calendar',          desc: 'Smart scheduling & recurring events',   color: '#10b981' },
  { icon: Mail,            label: 'Email Hub',         desc: 'Gmail inbox + send to clients',         color: '#f59e0b' },
  { icon: FileText,        label: 'Reports',           desc: 'AI-generated business insights',        color: '#0891b2' },
  { icon: Brain,           label: 'Knowledge Base',    desc: 'RAG — AI grounded in your documents',  color: '#7c3aed' },
  { icon: Zap,             label: 'n8n Automation',    desc: 'Workflows running 24/7',                color: '#ec4899' },
];

const AI_PROMPTS = [
  'Show me today\'s pipeline summary',
  'Which leads haven\'t been contacted in 7 days?',
  'Generate a weekly business report',
  'Schedule a follow-up with our top client',
  'What\'s our revenue this month vs last month?',
  'Send the treatment brochure to Sarah',
];

interface StepProps {
  user: { name: string; role: string };
  onNext: () => void;
  onSkip: () => void;
}

/* ── Step 1: Welcome ─────────────────────────────────────────── */
function StepWelcome({ user, onNext, onSkip }: StepProps) {
  return (
    <div className="flex flex-col">
      {/* Dark hero */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 pt-8 pb-7 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-violet-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/50"
          >
            <Bot className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-white mb-1"
          >
            Welcome, {user.name.split(' ')[0]}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-slate-400 text-sm leading-relaxed max-w-xs"
          >
            Your AI Operating System is live. Let's take a quick tour so you get the most out of every feature.
          </motion.p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-5">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Access level</p>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold capitalize">
              {user.role}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            All systems active
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
        >
          Start the tour <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={onSkip} className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors block mx-auto">
          Skip for now
        </button>
      </div>
    </div>
  );
}

/* ── Step 2: Company Profile ─────────────────────────────────── */
interface CompanyData {
  name: string; industry: string; headquarters: string;
  revenue: string; clients: string; services: string;
}

function buildKnowledgeText(d: CompanyData): string {
  return `COMPANY OVERVIEW
Company Name: ${d.name}
Industry: ${d.industry}
Headquarters: ${d.headquarters}

FINANCIALS
Annual Revenue: ${d.revenue}

CLIENTS
Total Active Clients: ${d.clients}

CORE SERVICES
${d.services}

AI SYSTEMS IN USE (powered by AIOS)
- AI Chief of Staff: handles daily briefings, client queries, pipeline reports
- Telegram Bot: CEO receives morning briefing every day at 8am
- RAG Knowledge Base: company documents indexed for instant retrieval
- Security Monitor: access logs, threat detection active 24/7
`;
}

function StepCompanyProfile({ onNext, onSkip }: StepProps) {
  const { token } = useAuthStore();
  const [form, setForm] = useState<CompanyData>({
    name: '', industry: '', headquarters: '', revenue: '', clients: '', services: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (k: keyof CompanyData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const filled = form.name.trim() && form.industry.trim();

  async function handleNext() {
    if (!filled) { onNext(); return; }
    setError(null);
    setUploading(true);
    try {
      const text = buildKnowledgeText(form);
      const file = new File([text], `${form.name.replace(/\s+/g, '-')}-knowledge.txt`, { type: 'text/plain' });
      const fd   = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API_URL}/knowledge/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!r.ok) {
        const b = await r.json().catch(() => ({})) as { error?: string };
        setError(b.error ?? 'Upload failed — you can add it later from Knowledge Base');
      } else {
        setUploaded(true);
      }
    } catch {
      setError('Could not upload — you can add it later from Knowledge Base');
    } finally {
      setUploading(false);
      setTimeout(onNext, uploaded ? 800 : 0);
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-slate-400 transition-all";

  return (
    <div className="flex flex-col">
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 pt-7 pb-6 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Set up your company profile</h2>
            <p className="text-slate-400 text-xs leading-relaxed mt-0.5">
              Your AI will use this to answer questions about your business
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Company Name *</label>
            <input className={inputCls} placeholder="e.g. Acme Ltd" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Industry *</label>
            <input className={inputCls} placeholder="e.g. Healthcare" value={form.industry} onChange={set('industry')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Headquarters</label>
            <input className={inputCls} placeholder="e.g. Dubai, UAE" value={form.headquarters} onChange={set('headquarters')} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Annual Revenue</label>
            <input className={inputCls} placeholder="e.g. £2,000,000" value={form.revenue} onChange={set('revenue')} />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Active Clients</label>
          <input className={inputCls} placeholder="e.g. 12" value={form.clients} onChange={set('clients')} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Core Services</label>
          <textarea className={inputCls} rows={2} placeholder="e.g. Construction, fit-out, renovation…" value={form.services} onChange={set('services')} />
        </div>

        {error && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{error}</p>}

        {uploaded && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Knowledge base updated — AI now knows your company
          </div>
        )}

        <button
          onClick={() => void handleNext()}
          disabled={uploading}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {uploading
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Uploading to AI…</>
            : filled ? <><Upload className="w-4 h-4" /> Save & continue</> : <>Skip <ChevronRight className="w-4 h-4" /></>}
        </button>
        <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600 transition-colors block mx-auto">Skip for now</button>
      </div>
    </div>
  );
}

/* ── Step 3: AI Chief of Staff ───────────────────────────────── */
function StepAI({ onNext, onSkip }: StepProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveIdx(i => (i + 1) % AI_PROMPTS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Dark hero */}
      <div className="relative bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 px-6 pt-8 pb-7 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-900/50">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">AI Chief of Staff</h2>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            GPT-4o powered assistant that knows your business. Ask anything via Chat or Telegram.
          </p>
        </div>
      </div>

      {/* Animated prompts */}
      <div className="px-6 py-5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Try asking:
        </p>
        <div className="space-y-1.5 mb-5">
          {AI_PROMPTS.map((prompt, i) => (
            <motion.div
              key={prompt}
              animate={{
                opacity: i === activeIdx ? 1 : 0.35,
                x: i === activeIdx ? 4 : 0,
                scale: i === activeIdx ? 1.01 : 1,
              }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors"
              style={{
                borderColor: i === activeIdx ? '#6366f1' : '#e2e8f0',
                background: i === activeIdx ? '#eef2ff' : '#fafbfc',
              }}
            >
              <Sparkles
                className="w-3 h-3 flex-shrink-0"
                style={{ color: i === activeIdx ? '#6366f1' : '#94a3b8' }}
              />
              <span className="text-xs text-slate-600 italic">"{prompt}"</span>
            </motion.div>
          ))}
        </div>

        <button onClick={onNext}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors flex items-center justify-center gap-2">
          Next <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={onSkip} className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors block mx-auto">Skip</button>
      </div>
    </div>
  );
}

/* ── Step 3: Features ────────────────────────────────────────── */
function StepFeatures({ onNext, onSkip }: StepProps) {
  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <LayoutDashboard className="w-4 h-4 text-indigo-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">8 modules, one platform</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4 ml-10">Everything you need to run your business</p>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {FEATURES.map(({ icon: Icon, label, desc, color }) => (
          <div
            key={label}
            className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:shadow-sm transition-all"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: color + '18' }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-800 leading-tight">{label}</p>
              <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onNext}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-2">
        Next <ChevronRight className="w-4 h-4" />
      </button>
      <button onClick={onSkip} className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors block mx-auto">Skip</button>
    </div>
  );
}

/* ── Step 4: Telegram ────────────────────────────────────────── */
function StepTelegram({ onNext, onSkip }: StepProps) {
  const { token } = useAuthStore();
  const [botUsername, setBotUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/telegram/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { bot_username?: string | null }) => setBotUsername(d.bot_username ?? null))
      .catch(() => {});
  }, [token]);

  const telegramUrl = botUsername ? `https://t.me/${botUsername}` : null;

  return (
    <div className="flex flex-col">
      <div className="relative bg-gradient-to-br from-sky-900 via-sky-800 to-slate-900 px-6 pt-8 pb-7 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center mb-4 shadow-lg shadow-sky-900/50">
            <Send className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Connect Telegram</h2>
          <p className="text-slate-300 text-sm max-w-xs leading-relaxed">
            Talk to your AI Chief of Staff on the go — text or voice messages.
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        {telegramUrl && (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-colors mb-4"
          >
            <Send className="w-4 h-4" />
            Open @{botUsername} in Telegram
          </a>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">How to connect</p>
          <ol className="space-y-2.5">
            {[
              telegramUrl ? `Tap the button above to open @${botUsername}` : "Open Telegram and find your company's AIOS bot",
              'Send /start to activate',
              'Ask anything — "Show me today\'s pipeline"',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-[12px] text-slate-600 leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <button onClick={onNext}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-2">
          Got it <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={onSkip} className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors block mx-auto">Skip</button>
      </div>
    </div>
  );
}

/* ── Step 5: Done ────────────────────────────────────────────── */
function StepDone({ onFinish }: { onFinish: () => void }) {
  const navigate = useNavigate();

  const actions: { label: string; route?: string; desc: string; action?: string }[] = [
    { label: 'Go to Dashboard',    route: '/',          desc: 'Live KPIs & business overview' },
    { label: 'Try AI Chat',        action: 'open-chat', desc: 'Ask your AI Chief of Staff anything' },
    { label: 'Upload a document',  route: '/knowledge', desc: 'Power the AI with your company docs' },
  ];

  return (
    <div className="flex flex-col">
      <div className="relative bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 px-6 pt-8 pb-7 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-1">You're all set!</h2>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            AIOS is live. Your AI systems are running — where do you want to start?
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Jump to</p>
        <div className="space-y-2 mb-5">
          {actions.map(({ label, route, desc, action }) => (
            <button
              key={label}
              onClick={() => {
                onFinish();
                if (action === 'open-chat') {
                  window.dispatchEvent(new Event('aios:open-chat'));
                } else if (route) {
                  navigate(route);
                }
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:shadow-sm transition-all group"
            >
              <div className="text-left">
                <p className="text-[13px] font-semibold text-slate-800 group-hover:text-slate-900">{label}</p>
                <p className="text-[11px] text-slate-400">{desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </button>
          ))}
        </div>

        <button
          onClick={onFinish}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

/* ── Main Modal ──────────────────────────────────────────────── */
const STEPS = ['welcome', 'company', 'ai', 'features', 'telegram', 'done'] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS = ['Welcome', 'Company', 'AI', 'Features', 'Telegram', 'Done'];
const STEP_COLORS = ['#6366f1', '#475569', '#7c3aed', '#6366f1', '#0ea5e9', '#10b981'];

export function OnboardingModal() {
  const user = useAuthStore((s) => s.user);
  const [step, setStep]       = useState<Step>('welcome');
  const [visible, setVisible] = useState(false);
  const [dir, setDir]         = useState<1 | -1>(1);

  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem(STORAGE_KEY(user.id));
    if (!done) setVisible(true);
  }, [user]);

  useEffect(() => {
    function onRestart() { setStep('welcome'); setVisible(true); }
    window.addEventListener('aios:restart-tour', onRestart);
    return () => window.removeEventListener('aios:restart-tour', onRestart);
  }, []);

  function finish() {
    if (user) localStorage.setItem(STORAGE_KEY(user.id), '1');
    setVisible(false);
  }

  function next() {
    setDir(1);
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  if (!user || !visible) return null;

  const stepIndex  = STEPS.indexOf(step);
  const stepColor  = STEP_COLORS[stepIndex];
  const stepProps: StepProps = { user: { name: user.name, role: user.role }, onNext: next, onSkip: finish };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={finish}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 bg-slate-100">
              <motion.div
                className="h-1 rounded-r-full transition-all"
                style={{ background: stepColor }}
                animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all"
                      style={i <= stepIndex
                        ? { background: stepColor, borderColor: stepColor, color: '#fff' }
                        : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}
                    >
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-4 h-px" style={{ background: i < stepIndex ? stepColor : '#e2e8f0' }} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">{STEP_LABELS[stepIndex]}</span>
                <button onClick={finish} className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: dir * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -24 }}
                transition={{ duration: 0.2 }}
              >
                {step === 'welcome'  && <StepWelcome        {...stepProps} />}
                {step === 'company'  && <StepCompanyProfile {...stepProps} />}
                {step === 'ai'       && <StepAI             {...stepProps} />}
                {step === 'features' && <StepFeatures       {...stepProps} />}
                {step === 'telegram' && <StepTelegram       {...stepProps} />}
                {step === 'done'     && <StepDone onFinish={finish} />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
