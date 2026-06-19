import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Bot, Shield, FileText,
  Calendar, Mail, Zap, CheckCircle2, ChevronRight, X, Send
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

const STORAGE_KEY = (userId: string) => `aios_onboarded_${userId}`;

const FEATURES = [
  { icon: LayoutDashboard, label: 'Dashboard', desc: 'Real-time KPIs and business overview', color: 'bg-indigo-500' },
  { icon: Users, label: 'Clients & Leads', desc: 'Full CRM with pipeline management', color: 'bg-violet-500' },
  { icon: Bot, label: 'AI Chief of Staff', desc: 'GPT-4o assistant in Chat & Telegram', color: 'bg-cyan-600' },
  { icon: Shield, label: 'Security Monitor', desc: 'Real-time threat detection & alerts', color: 'bg-rose-500' },
  { icon: Calendar, label: 'Calendar', desc: 'Smart scheduling with recurring events', color: 'bg-emerald-600' },
  { icon: Mail, label: 'Email Hub', desc: 'Gmail inbox + send to clients directly', color: 'bg-amber-600' },
  { icon: FileText, label: 'Reports & Analytics', desc: 'AI-generated business insights on demand', color: 'bg-sky-600' },
  { icon: Zap, label: 'n8n Automation', desc: 'Workflows running 24/7 in the background', color: 'bg-pink-500' },
];

interface StepProps {
  user: { name: string; role: string };
  onNext: () => void;
  onSkip: () => void;
}

function StepWelcome({ user, onNext, onSkip }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center px-4 py-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg">
        <Bot className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Welcome to AIOS, {user.name.split(' ')[0]}!
      </h2>
      <p className="text-slate-500 text-[15px] max-w-sm leading-relaxed mb-6">
        Your AI Operating System is ready. Let's take a 60-second tour so you can get the most out of every feature.
      </p>
      <div className="w-full bg-slate-50 rounded-2xl p-4 mb-6 text-left border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your access level</p>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold capitalize">
            {user.role}
          </span>
          <span className="text-xs text-slate-500">All modules are ready for you</span>
        </div>
      </div>
      <button
        onClick={onNext}
        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
      >
        Let's go <ChevronRight className="w-4 h-4" />
      </button>
      <button onClick={onSkip} className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors">
        Skip for now
      </button>
    </div>
  );
}

function StepFeatures({ onNext, onSkip }: StepProps) {
  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-slate-900 mb-1 text-center">Everything in one place</h2>
      <p className="text-sm text-slate-500 text-center mb-5">8 AI-powered modules built for your business</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {FEATURES.map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-800">{label}</p>
              <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
      >
        Next <ChevronRight className="w-4 h-4" />
      </button>
      <button onClick={onSkip} className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors block mx-auto">
        Skip
      </button>
    </div>
  );
}

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
    <div className="flex flex-col items-center text-center px-4 py-6">
      <div className="w-20 h-20 rounded-2xl bg-sky-500 flex items-center justify-center mb-5 shadow-lg">
        <Send className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Connect Telegram</h2>
      <p className="text-slate-500 text-[14px] max-w-sm leading-relaxed mb-5">
        Talk to your AI Chief of Staff anytime from Telegram — text or voice. Get briefings, reports, and manage your business on the go.
      </p>

      {telegramUrl && (
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-colors shadow-sm mb-4"
        >
          <Send className="w-4 h-4" />
          Open @{botUsername} in Telegram
        </a>
      )}

      <div className="w-full bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-5 text-left">
        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-3">How to connect</p>
        <ol className="space-y-2">
          {[
            telegramUrl
              ? `Click the button above to open @${botUsername}`
              : 'Open Telegram and find your company\'s AIOS bot',
            'Send /start to activate the bot',
            'Ask anything: "Show me today\'s pipeline"',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-500 text-white text-[11px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-[13px] text-slate-700 leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {botUsername && (
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-slate-500 mb-1">Bot username</p>
          <p className="font-mono text-sm font-bold text-sky-700">@{botUsername}</p>
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
      >
        Got it <ChevronRight className="w-4 h-4" />
      </button>
      <button onClick={onSkip} className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors">
        Skip
      </button>
    </div>
  );
}

function StepDone({ onFinish }: { onFinish: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center text-center px-4 py-6">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">You're all set!</h2>
      <p className="text-slate-500 text-[14px] max-w-sm leading-relaxed mb-6">
        AIOS is live and ready. Your AI systems are running — start by checking the Dashboard or chat with your AI Chief of Staff.
      </p>
      <div className="w-full space-y-2 mb-6">
        {[
          { label: 'Dashboard KPIs', route: '/', tip: 'Real-time metrics & business health' },
          { label: 'AI Chat', route: '/chat', tip: 'Ask anything in natural language' },
          { label: 'Knowledge Base', route: '/knowledge', tip: 'Upload your docs for RAG' },
        ].map(({ label, route, tip }) => (
          <button
            key={route}
            onClick={() => { onFinish(); navigate(route); }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group"
          >
            <div className="text-left">
              <p className="text-[13px] font-semibold text-slate-800 group-hover:text-indigo-700">{label}</p>
              <p className="text-[11px] text-slate-400">{tip}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
          </button>
        ))}
      </div>
      <button
        onClick={onFinish}
        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-sm"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

const STEPS = ['welcome', 'features', 'telegram', 'done'] as const;
type Step = (typeof STEPS)[number];

export function OnboardingModal() {
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>('welcome');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem(STORAGE_KEY(user.id));
    if (!done) setVisible(true);
  }, [user]);

  useEffect(() => {
    function onRestart() {
      setStep('welcome');
      setVisible(true);
    }
    window.addEventListener('aios:restart-tour', onRestart);
    return () => window.removeEventListener('aios:restart-tour', onRestart);
  }, []);

  function finish() {
    if (user) localStorage.setItem(STORAGE_KEY(user.id), '1');
    setVisible(false);
  }

  function next() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  if (!user || !visible) return null;

  const stepProps: StepProps = {
    user: { name: user.name, role: user.role },
    onNext: next,
    onSkip: finish,
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={finish}
          />

          {/* Modal */}
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Top bar with progress dots */}
            <div className="flex items-center justify-between px-5 pt-4 pb-0">
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === stepIndex
                        ? 'w-6 bg-indigo-600'
                        : i < stepIndex
                        ? 'w-3 bg-indigo-300'
                        : 'w-3 bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={finish}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                {step === 'welcome' && <StepWelcome {...stepProps} />}
                {step === 'features' && <StepFeatures {...stepProps} />}
                {step === 'telegram' && <StepTelegram {...stepProps} />}
                {step === 'done' && <StepDone onFinish={finish} />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
