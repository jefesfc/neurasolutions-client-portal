import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Brain, Upload, Trash2, FileText, FileType, CheckCircle2,
  Sparkles, Filter, X, MessageSquare, Lightbulb, Database,
  ChevronRight, Hash,
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

interface KnowledgeDoc {
  id: string;
  name: string;
  file_type: string;
  chunk_count: number;
  created_at: string;
}

type CategoryKey = 'clinical' | 'memberships' | 'operations' | 'treatments' | 'patients' | 'staff' | 'finance' | 'other';

interface Category {
  key: CategoryKey;
  label: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  border: string;
  text: string;
  badge: string;
  keywords: string[];
}

const CATEGORIES: Category[] = [
  {
    key: 'clinical',
    label: 'Clinical Protocols',
    description: 'Injectable treatments, Botox, fillers, pre & post care',
    Icon: ({ size = 18, className }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
      </svg>
    ),
    color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    keywords: ['injectable', 'botox', 'filler', 'clinical', 'protocol', 'injection', 'pre-care', 'post-care', 'contraindication'],
  },
  {
    key: 'memberships',
    label: 'Memberships & Pricing',
    description: 'VIP packages, Platinum, Gold & Silver tiers',
    Icon: ({ size = 18, className }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200',
    keywords: ['vip', 'membership', 'package', 'platinum', 'gold', 'silver', 'tier', 'subscription'],
  },
  {
    key: 'operations',
    label: 'Policies & Operations',
    description: 'Cancellation policy, deposits, GDPR compliance',
    Icon: ({ size = 18, className }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    color: '#475569', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-600 border-slate-200',
    keywords: ['policy', 'policies', 'procedure', 'gdpr', 'cancellation', 'deposit', 'compliance', 'regulation'],
  },
  {
    key: 'treatments',
    label: 'Treatments & Technology',
    description: 'Non-invasive, laser, HydraFacial, IPL, PRP, IV',
    Icon: ({ size = 18, className }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    color: '#0891b2', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    keywords: ['non-invasive', 'laser', 'hydrafacial', 'ipl', 'co2', 'treatment', 'nd:yag', 'prp', 'iv', 'aesthetic', 'skin'],
  },
  {
    key: 'patients',
    label: 'Patient Care & FAQs',
    description: 'Frequently asked questions, patient guidance',
    Icon: ({ size = 18, className }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
    color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    keywords: ['faq', 'patient', 'question', 'guide', 'care', 'aftercare'],
  },
  {
    key: 'staff',
    label: 'Staff & Emergency',
    description: 'Staff protocols, emergency procedures, GDPR',
    Icon: ({ size = 18, className }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: '#7c3aed', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700 border-violet-200',
    keywords: ['staff', 'emergency', 'team', 'personnel', 'nurse', 'doctor', 'appointment', 'flow'],
  },
  {
    key: 'finance',
    label: 'Payments & Finance',
    description: 'Payment methods, currencies, financial policies',
    Icon: ({ size = 18, className }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    color: '#e11d48', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700 border-rose-200',
    keywords: ['payment', 'currency', 'currencies', 'finance', 'price', 'pricing', 'gbp', 'usd', 'aed', 'usdt', 'crypto'],
  },
  {
    key: 'other',
    label: 'Other Documents',
    description: 'General documents and custom knowledge files',
    Icon: ({ size = 18, className }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    color: '#64748b', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-500 border-slate-200',
    keywords: [],
  },
];

interface DocMeta {
  desc: string;
  topics: string[];
  aiCapabilities: string[];
  highlights: string[];
}

const DOC_META: { keywords: string[]; meta: DocMeta }[] = [
  {
    keywords: ['injectable', 'botox', 'filler'],
    meta: {
      desc: 'Botox & dermal filler procedures, dosing, pre/post-care instructions, contraindications and pricing.',
      topics: ['Botox protocol', 'Filler types', 'Pre-care', 'Post-care', 'Pricing', 'Contraindications'],
      aiCapabilities: [
        'What is the Botox protocol and dosing?',
        'What are the pre-care instructions for fillers?',
        'What are the contraindications for injectable treatments?',
        'What is the pricing for lip or cheek fillers?',
        'How long does post-care recovery take?',
        'What should patients avoid after Botox?',
      ],
      highlights: [
        'Full injectable treatment menu with dosing guides',
        'Pre-care: avoid blood thinners 5 days before',
        'Post-care: no exercise for 24h, avoid heat',
        'Contraindications: pregnancy, autoimmune conditions, certain medications',
        'Pricing schedule included per treatment zone',
      ],
    },
  },
  {
    keywords: ['vip', 'membership', 'package'],
    meta: {
      desc: 'VIP membership tiers — Platinum (£5,200), Gold (£2,800) and Silver (£1,500) — with benefits and inclusions.',
      topics: ['Platinum tier', 'Gold tier', 'Silver tier', 'Benefits', 'Inclusions', '2026 pricing'],
      aiCapabilities: [
        'What does the Platinum membership include?',
        'What is the price of the Gold package?',
        'How many treatments are included in Silver?',
        'What is the difference between VIP tiers?',
        'Are membership packages renewable annually?',
        'What discounts do VIP members receive?',
      ],
      highlights: [
        'Platinum £5,200/yr — unlimited priority treatments',
        'Gold £2,800/yr — 10 treatments + 20% off retail',
        'Silver £1,500/yr — 5 treatments + 10% off retail',
        'All tiers include complimentary consultation',
        'Priority booking for all VIP members',
      ],
    },
  },
  {
    keywords: ['policy', 'policies', 'procedure', 'cancellation'],
    meta: {
      desc: 'Clinic policies: 48h cancellation notice, deposit requirements, no-show fees and GDPR compliance.',
      topics: ['Cancellation (48h)', 'Deposits', 'No-show policy', 'GDPR', 'Refunds'],
      aiCapabilities: [
        'What is the cancellation policy?',
        'How much deposit is required to book?',
        'What happens if I miss my appointment?',
        'How is patient data stored and protected?',
        'Can I get a refund for unused treatments?',
        'How do I request my GDPR data deletion?',
      ],
      highlights: [
        '48h notice required for free cancellation',
        '24h notice: 50% treatment fee charged',
        'No-show: 100% fee applies',
        '20–30% deposit required at booking',
        'GDPR compliant — data deleted on request within 30 days',
      ],
    },
  },
  {
    keywords: ['non-invasive', 'laser', 'hydrafacial', 'treatment'],
    meta: {
      desc: 'Non-invasive & laser treatments: HydraFacial, IPL, CO2 resurfacing, Nd:YAG, IV therapy and PRP.',
      topics: ['HydraFacial', 'IPL', 'CO2 laser', 'Nd:YAG', 'PRP', 'IV therapy'],
      aiCapabilities: [
        'What is HydraFacial and how does it work?',
        'How many IPL sessions are recommended?',
        'What does CO2 laser treat?',
        'What is PRP therapy and who is it for?',
        'Is IV therapy available and what are the options?',
        'What is the downtime for Nd:YAG laser?',
      ],
      highlights: [
        'HydraFacial: 30–45 min, zero downtime, monthly recommended',
        'IPL: 3–6 sessions for pigmentation and hair reduction',
        'CO2 fractional resurfacing: 5–7 days downtime',
        'Nd:YAG: vascular lesions and hair removal on dark skin',
        'PRP: platelet-rich plasma for skin rejuvenation and hair loss',
        'IV therapy: hydration, vitamins, glutathione drips',
      ],
    },
  },
  {
    keywords: ['faq', 'patient'],
    meta: {
      desc: 'Answers to the 12 most frequently asked questions by patients about treatments, safety and aftercare.',
      topics: ['Safety', 'Downtime', 'Results', 'Aftercare', 'Booking', 'Side effects'],
      aiCapabilities: [
        'Is Botox safe?',
        'How long do results last?',
        'What are the side effects?',
        'When will I see results?',
        'Can I combine treatments?',
        'What should I do after my treatment?',
      ],
      highlights: [
        '12 comprehensive Q&A pairs from real patients',
        'Safety profile for all offered treatments',
        'Expected timeline for visible results',
        'Common side effects and how to manage them',
        'Post-treatment do\'s and don\'ts',
        'Guidance on combining multiple treatments',
      ],
    },
  },
  {
    keywords: ['staff', 'emergency'],
    meta: {
      desc: 'Staff appointment flow, emergency response procedures, escalation protocols and GDPR data handling.',
      topics: ['Appointment flow', 'Emergency steps', 'Escalation', 'GDPR', 'Team roles'],
      aiCapabilities: [
        'What is the appointment booking procedure?',
        'What do staff do in an emergency?',
        'Who to escalate to for clinical concerns?',
        'How is patient data handled internally?',
        'What are the team roles and responsibilities?',
        'What is the check-in and check-out process?',
      ],
      highlights: [
        'Full appointment lifecycle: booking → consent → treatment → checkout',
        'Emergency protocol: call 999, administer first aid, notify clinic director',
        '3-tier escalation: receptionist → nurse → clinic director',
        'Patient records stored securely, access logged',
        'Team roles: receptionist, aesthetic nurse, clinic director',
      ],
    },
  },
  {
    keywords: ['payment', 'currency', 'currencies'],
    meta: {
      desc: 'Accepted payment methods: GBP, USD, EUR, AED and USDT (ERC-20 crypto) with transaction policies.',
      topics: ['GBP', 'USD / EUR', 'AED', 'USDT crypto', 'Payment terms'],
      aiCapabilities: [
        'What currencies do you accept?',
        'Do you accept crypto payments?',
        'Can I pay in AED?',
        'How do I pay with USDT?',
        'Are wire transfers accepted?',
        'What is the payment policy for memberships?',
      ],
      highlights: [
        'Primary currency: GBP',
        'International: USD, EUR at current exchange rates',
        'Middle East: AED accepted',
        'Crypto: USDT (ERC-20) — wallet address provided on request',
        'Memberships: annual upfront or quarterly installments',
        'No surcharges on card payments',
      ],
    },
  },
];

function getDocMeta(name: string): DocMeta {
  const lower = name.toLowerCase();
  for (const entry of DOC_META) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.meta;
  }
  return {
    desc: 'Document indexed and available for AI retrieval.',
    topics: [],
    aiCapabilities: [],
    highlights: [],
  };
}

function classifyDoc(name: string): CategoryKey {
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => lower.includes(k))) return cat.key;
  }
  return 'other';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DocTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  if (type === 'application/pdf') return <FileType size={size} className="text-rose-400" />;
  return <FileText size={size} className="text-slate-400" />;
}

/* ── Report Panel (slide-in drawer) ─────────────────────────── */
function DocReportPanel({
  doc,
  cat,
  isAdmin,
  onClose,
  onDelete,
}: {
  doc: KnowledgeDoc | null;
  cat: Category | null;
  isAdmin: boolean;
  onClose: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (doc) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [doc, handleKey]);

  return (
    <AnimatePresence>
      {doc && cat && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex-shrink-0 px-6 py-5 border-b border-slate-100"
              style={{ borderTop: `4px solid ${cat.color}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 border"
                    style={{ background: cat.color + '15', borderColor: cat.color + '30' }}
                  >
                    <cat.Icon size={20} className={cat.text} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-base leading-tight">{doc.name}</p>
                    <span
                      className={`inline-block text-xs font-semibold mt-1 px-2 py-0.5 rounded-full border ${cat.badge}`}
                    >
                      {cat.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isAdmin && (
                    <button
                      onClick={() => { onDelete(doc.id, doc.name); onClose(); }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Status row */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active in RAG
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Hash className="h-3.5 w-3.5 text-slate-400" />
                  {doc.chunk_count} chunks indexed
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Database className="h-3.5 w-3.5 text-slate-400" />
                  Indexed {fmtDate(doc.created_at)}
                </span>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Overview */}
              <ReportSection icon={<FileText className="h-4 w-4" />} title="Document Overview" color={cat.color}>
                <p className="text-sm text-slate-600 leading-relaxed">{getDocMeta(doc.name).desc}</p>
                {getDocMeta(doc.name).topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {getDocMeta(doc.name).topics.map(t => (
                      <span
                        key={t}
                        className="text-xs font-medium px-2 py-0.5 rounded-md border"
                        style={{ background: cat.color + '0d', color: cat.color, borderColor: cat.color + '30' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </ReportSection>

              {/* Key Data Points */}
              {getDocMeta(doc.name).highlights.length > 0 && (
                <ReportSection icon={<Lightbulb className="h-4 w-4" />} title="Key Information Stored" color={cat.color}>
                  <ul className="space-y-2">
                    {getDocMeta(doc.name).highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <ChevronRight
                          className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
                          style={{ color: cat.color }}
                        />
                        <span className="text-sm text-slate-600">{h}</span>
                      </li>
                    ))}
                  </ul>
                </ReportSection>
              )}

              {/* AI Capabilities */}
              {getDocMeta(doc.name).aiCapabilities.length > 0 && (
                <ReportSection icon={<MessageSquare className="h-4 w-4" />} title="Questions the AI Can Answer" color={cat.color}>
                  <p className="text-xs text-slate-400 mb-3">
                    Ask the AI Chief of Staff any of these using chat or Telegram:
                  </p>
                  <div className="space-y-1.5">
                    {getDocMeta(doc.name).aiCapabilities.map((q, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <Sparkles
                          className="h-3 w-3 flex-shrink-0"
                          style={{ color: cat.color }}
                        />
                        <span className="text-xs text-slate-600 italic">"{q}"</span>
                      </div>
                    ))}
                  </div>
                </ReportSection>
              )}

              {/* Technical details */}
              <ReportSection icon={<Database className="h-4 w-4" />} title="Technical Details" color={cat.color}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'File type', value: doc.file_type === 'application/pdf' ? 'PDF' : 'TXT' },
                    { label: 'Chunks', value: String(doc.chunk_count) },
                    { label: 'Indexed', value: fmtDate(doc.created_at) },
                    { label: 'Vector store', value: 'Pinecone' },
                    { label: 'Embedding model', value: 'text-embedding-3-small' },
                    { label: 'Retrieval', value: 'Top-5 cosine' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ReportSection({
  icon, title, color, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function KnowledgePage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [docs, setDocs]               = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryKey | 'all'>('all');
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchDocs() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/knowledge/docs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setDocs(await r.json() as KnowledgeDoc[]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void fetchDocs(); }, []);

  async function handleUpload(file: File) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt') { setError('Only PDF and TXT files are supported'); return; }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch(`${API_URL}/knowledge/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Upload failed');
      }
      await fetchDocs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}" from the knowledge base?\n\nNote: any client records created from this document will NOT be deleted — manage them in the Clients module.`)) return;
    try {
      const r = await fetch(`${API_URL}/knowledge/docs/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? 'Delete failed');
        return;
      }
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch {
      setError('Network error — delete failed');
    }
  }

  const categorised = useMemo(() => {
    const map = new Map<CategoryKey | 'other', KnowledgeDoc[]>();
    for (const doc of docs) {
      const key = classifyDoc(doc.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    }
    return map;
  }, [docs]);

  const totalChunks      = docs.reduce((s, d) => s + d.chunk_count, 0);
  const activeCategories = CATEGORIES.filter(c => categorised.has(c.key));
  const lastIndexed      = docs.length > 0
    ? fmtDate(docs.reduce((a, b) => a.created_at > b.created_at ? a : b).created_at)
    : null;

  const filteredDocs = activeFilter === 'all'
    ? docs
    : docs.filter(d => classifyDoc(d.name) === activeFilter);

  const selectedCat = selectedDoc
    ? (CATEGORIES.find(c => c.key === classifyDoc(selectedDoc.name)) ?? CATEGORIES[2])
    : null;

  return (
    <PageTransition>
      <div className="p-6 space-y-6">

        {/* ── Hero Header ─────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 border border-slate-700/50">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-11 w-11 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Active
                  </span>
                </div>
                <p className="text-sm text-slate-400">AI Chief of Staff answers grounded in your company documents</p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              {[
                { label: 'Documents', value: docs.length },
                { label: 'Chunks', value: totalChunks.toLocaleString() },
                { label: 'Categories', value: activeCategories.length },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-white tabular-nums">{loading ? '—' : value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mt-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              <span className="text-xs text-slate-400">Pinecone · text-embedding-3-small · cosine similarity · top-5 retrieval</span>
            </div>
            {lastIndexed && !loading && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Knowledge current as of {lastIndexed}
              </span>
            )}
          </div>
        </div>

        {/* ── Upload Zone (admin) ──────────────────────────────── */}
        {isAdmin && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void handleUpload(f); }}
            onClick={() => fileRef.current?.click()}
            className="relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer"
            style={{
              borderColor: dragOver ? '#06b6d4' : uploading ? '#6366f1' : '#cbd5e1',
              background: dragOver ? 'rgba(6,182,212,0.04)' : uploading ? 'rgba(99,102,241,0.04)' : '#fafbfc',
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ''; }} />
            <div className="flex items-center gap-4 p-5">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors ${dragOver ? 'bg-cyan-100 border-cyan-200' : uploading ? 'bg-indigo-100 border-indigo-200' : 'bg-slate-100 border-slate-200'}`}>
                {uploading
                  ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  : <Upload className={`h-5 w-5 ${dragOver ? 'text-cyan-600' : 'text-slate-400'}`} />}
              </div>
              <div>
                <p className="font-semibold text-slate-700">
                  {uploading ? 'Indexing document…' : dragOver ? 'Drop to upload' : 'Upload new document'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {uploading ? 'Chunking, embedding and indexing into Pinecone — 10–30 seconds' : 'PDF or TXT · max 10 MB · auto-chunked and embedded'}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* ── Category filter tabs ─────────────────────────────── */}
        {!loading && docs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <button onClick={() => setActiveFilter('all')}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${activeFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
              All ({docs.length})
            </button>
            {activeCategories.map(cat => {
              const count = categorised.get(cat.key)?.length ?? 0;
              const isActive = activeFilter === cat.key;
              return (
                <button key={cat.key} onClick={() => setActiveFilter(isActive ? 'all' : cat.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${isActive ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                  style={isActive ? { background: cat.color, borderColor: cat.color } : {}}>
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* ── Document Grid ────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-36 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600 mb-1">No documents indexed yet</p>
            {isAdmin && <p className="text-sm text-slate-400">Upload your first document above to power the AI</p>}
          </div>
        ) : activeFilter === 'all' ? (
          <div className="space-y-6">
            {activeCategories.map(cat => {
              const catDocs = categorised.get(cat.key) ?? [];
              return (
                <div key={cat.key}>
                  <div className={`flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl ${cat.bg} border ${cat.border}`}>
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: cat.color + '20' }}>
                      <cat.Icon size={15} className={cat.text} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${cat.text}`}>{cat.label}</p>
                      <p className="text-xs text-slate-400">{cat.description}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${cat.badge}`}>
                      {catDocs.length} doc{catDocs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {catDocs.map(doc => (
                      <DocCard key={doc.id} doc={doc} cat={cat} isAdmin={isAdmin}
                        onDelete={handleDelete} onClick={() => setSelectedDoc(doc)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDocs.map(doc => {
              const cat = CATEGORIES.find(c => c.key === classifyDoc(doc.name)) ?? CATEGORIES[2];
              return (
                <DocCard key={doc.id} doc={doc} cat={cat} isAdmin={isAdmin}
                  onDelete={handleDelete} onClick={() => setSelectedDoc(doc)} />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Report Panel ────────────────────────────────────────── */}
      <DocReportPanel
        doc={selectedDoc}
        cat={selectedCat}
        isAdmin={isAdmin}
        onClose={() => setSelectedDoc(null)}
        onDelete={handleDelete}
      />
    </PageTransition>
  );
}

/* ── Doc Card ──────────────────────────────────────────────── */
function DocCard({
  doc, cat, isAdmin, onDelete, onClick,
}: {
  doc: KnowledgeDoc;
  cat: Category;
  isAdmin: boolean;
  onDelete: (id: string, name: string) => void;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meta = getDocMeta(doc.name);

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className="relative flex flex-col bg-white border rounded-xl transition-all duration-150 overflow-hidden cursor-pointer"
      style={{
        borderColor: hovered ? cat.color + '60' : '#e2e8f0',
        boxShadow: hovered ? `0 0 0 3px ${cat.color}12, 0 4px 16px rgba(0,0,0,0.06)` : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="h-0.5 w-full transition-all" style={{ background: hovered ? cat.color : 'transparent' }} />

      <div className="p-4 flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors ${hovered ? cat.bg + ' ' + cat.border : 'bg-slate-50 border-slate-100'}`}>
          <DocTypeIcon type={doc.file_type} size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-slate-800 text-sm leading-tight">{doc.name}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
              {isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); void onDelete(doc.id, doc.name); }}
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{meta.desc}</p>

          {meta.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {meta.topics.map(topic => (
                <span key={topic} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border"
                  style={{ background: cat.color + '0d', color: cat.color, borderColor: cat.color + '30' }}>
                  {topic}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2.5">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${cat.badge}`}>{cat.label}</span>
            <span className="text-xs text-slate-400">{doc.chunk_count} chunks</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">Indexed {fmtDate(doc.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Click hint */}
      <div
        className="px-4 py-2 border-t border-slate-50 flex items-center justify-between transition-colors"
        style={{ background: hovered ? cat.color + '06' : '#fafbfc' }}
      >
        <span className="text-xs" style={{ color: hovered ? cat.color : '#94a3b8' }}>
          {hovered ? 'View full report →' : 'Click to view report'}
        </span>
        <ChevronRight className="h-3.5 w-3.5 transition-colors" style={{ color: hovered ? cat.color : '#cbd5e1' }} />
      </div>
    </div>
  );
}
