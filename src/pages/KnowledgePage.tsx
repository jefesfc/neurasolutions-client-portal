import React, { useState, useRef, useMemo } from 'react';
import { Brain, Upload, Trash2, FileText, FileType, CheckCircle2, Sparkles, Filter } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';

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
];

function classifyDoc(name: string): CategoryKey {
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => lower.includes(k))) return cat.key;
  }
  return 'other';
}

const DOC_DESCRIPTIONS: { keywords: string[]; desc: string; topics: string[] }[] = [
  {
    keywords: ['injectable', 'botox', 'filler'],
    desc: 'Botox & dermal filler procedures, dosing, pre/post-care instructions, contraindications and pricing.',
    topics: ['Botox protocol', 'Filler types', 'Pre-care', 'Post-care', 'Pricing', 'Contraindications'],
  },
  {
    keywords: ['vip', 'membership', 'package'],
    desc: 'VIP membership tiers — Platinum (£5,200), Gold (£2,800) and Silver (£1,500) — with benefits and inclusions.',
    topics: ['Platinum tier', 'Gold tier', 'Silver tier', 'Benefits', 'Inclusions', '2026 pricing'],
  },
  {
    keywords: ['policy', 'policies', 'procedure', 'cancellation'],
    desc: 'Clinic policies: 48h cancellation notice, deposit requirements, no-show fees and GDPR compliance.',
    topics: ['Cancellation (48h)', 'Deposits', 'No-show policy', 'GDPR', 'Refunds'],
  },
  {
    keywords: ['non-invasive', 'laser', 'hydrafacial', 'treatment'],
    desc: 'Non-invasive & laser treatments: HydraFacial, IPL, CO2 resurfacing, Nd:YAG, IV therapy and PRP.',
    topics: ['HydraFacial', 'IPL', 'CO2 laser', 'Nd:YAG', 'PRP', 'IV therapy'],
  },
  {
    keywords: ['faq', 'patient'],
    desc: 'Answers to the 12 most frequently asked questions by patients about treatments, safety and aftercare.',
    topics: ['Safety', 'Downtime', 'Results', 'Aftercare', 'Booking', 'Side effects'],
  },
  {
    keywords: ['staff', 'emergency'],
    desc: 'Staff appointment flow, emergency response procedures, escalation protocols and GDPR data handling.',
    topics: ['Appointment flow', 'Emergency steps', 'Escalation', 'GDPR', 'Team roles'],
  },
  {
    keywords: ['payment', 'currency', 'currencies'],
    desc: 'Accepted payment methods: GBP, USD, EUR, AED and USDT (ERC-20 crypto) with transaction policies.',
    topics: ['GBP', 'USD / EUR', 'AED', 'USDT crypto', 'Payment terms'],
  },
];

function getDocMeta(name: string): { desc: string; topics: string[] } {
  const lower = name.toLowerCase();
  for (const entry of DOC_DESCRIPTIONS) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return { desc: entry.desc, topics: entry.topics };
    }
  }
  return { desc: 'Document indexed and available for AI retrieval.', topics: [] };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DocTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  if (type === 'application/pdf') return <FileType size={size} className="text-rose-400" />;
  return <FileText size={size} className="text-slate-400" />;
}

export default function KnowledgePage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [docs, setDocs]           = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryKey | 'all'>('all');
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
    const allowed = ['application/pdf', 'text/plain'];
    if (!allowed.includes(file.type)) { setError('Only PDF and TXT files are supported'); return; }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch(`${API_URL}/knowledge/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
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
    if (!confirm(`Remove "${name}" from the knowledge base?`)) return;
    await fetch(`${API_URL}/knowledge/docs/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setDocs(prev => prev.filter(d => d.id !== id));
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

  const totalChunks = docs.reduce((s, d) => s + d.chunk_count, 0);
  const activeCategories = CATEGORIES.filter(c => categorised.has(c.key));
  const lastIndexed = docs.length > 0
    ? fmtDate(docs.reduce((a, b) => a.created_at > b.created_at ? a : b).created_at)
    : null;

  const filteredDocs = activeFilter === 'all'
    ? docs
    : docs.filter(d => classifyDoc(d.name) === activeFilter);

  return (
    <PageTransition>
      <div className="p-6 space-y-6">

        {/* ── Hero Header ─────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 border border-slate-700/50">
          {/* Decorative glow */}
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

            {/* Stats */}
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

          {/* RAG indicator row */}
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
            className="relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden"
            style={{
              borderColor: dragOver ? '#06b6d4' : uploading ? '#6366f1' : '#cbd5e1',
              background: dragOver ? 'rgba(6,182,212,0.04)' : uploading ? 'rgba(99,102,241,0.04)' : '#fafbfc',
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ''; }}
            />
            <div className="flex items-center gap-4 p-5">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${dragOver ? 'bg-cyan-100' : uploading ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                {uploading
                  ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  : <Upload className={`h-5 w-5 ${dragOver ? 'text-cyan-600' : 'text-slate-400'}`} />
                }
              </div>
              <div>
                <p className="font-semibold text-slate-700">
                  {uploading ? 'Indexing document…' : dragOver ? 'Drop to upload' : 'Upload new document'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {uploading
                    ? 'Chunking, embedding and indexing into Pinecone — 10-30 seconds'
                    : 'PDF or TXT · max 10 MB · auto-chunked and embedded'}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Category filter tabs ─────────────────────────────── */}
        {!loading && docs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <button
              onClick={() => setActiveFilter('all')}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                activeFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              All ({docs.length})
            </button>
            {activeCategories.map(cat => {
              const count = categorised.get(cat.key)?.length ?? 0;
              const isActive = activeFilter === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveFilter(isActive ? 'all' : cat.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    isActive
                      ? `text-white border-transparent`
                      : `bg-white text-slate-500 border-slate-200 hover:border-slate-300`
                  }`}
                  style={isActive ? { background: cat.color, borderColor: cat.color } : {}}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* ── Document Grid ────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
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
          /* ── Category sections ── */
          <div className="space-y-6">
            {activeCategories.map(cat => {
              const catDocs = categorised.get(cat.key) ?? [];
              return (
                <div key={cat.key}>
                  {/* Category header */}
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

                  {/* Doc cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {catDocs.map(doc => (
                      <DocCard
                        key={doc.id}
                        doc={doc}
                        cat={cat}
                        isAdmin={isAdmin}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Filtered view ── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDocs.map(doc => {
              const cat = CATEGORIES.find(c => c.key === classifyDoc(doc.name)) ?? CATEGORIES[2];
              return (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  cat={cat}
                  isAdmin={isAdmin}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        )}

      </div>
    </PageTransition>
  );
}

function DocCard({
  doc, cat, isAdmin, onDelete,
}: {
  doc: KnowledgeDoc;
  cat: Category;
  isAdmin: boolean;
  onDelete: (id: string, name: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meta = getDocMeta(doc.name);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col bg-white border rounded-xl transition-all duration-150 overflow-hidden"
      style={{
        borderColor: hovered ? cat.color + '60' : '#e2e8f0',
        boxShadow: hovered ? `0 0 0 3px ${cat.color}12, 0 4px 16px rgba(0,0,0,0.06)` : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Top color strip */}
      <div className="h-0.5 w-full transition-all" style={{ background: hovered ? cat.color : 'transparent' }} />

      <div className="p-4 flex items-start gap-3">
        {/* File type icon */}
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors ${hovered ? cat.bg + ' ' + cat.border : 'bg-slate-50 border-slate-100'}`}>
          <DocTypeIcon type={doc.file_type} size={18} />
        </div>

        {/* Content */}
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
                  onClick={() => onDelete(doc.id, doc.name)}
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove from knowledge base"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{meta.desc}</p>

          {/* Topic chips */}
          {meta.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {meta.topics.map(topic => (
                <span
                  key={topic}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border"
                  style={{ background: cat.color + '0d', color: cat.color, borderColor: cat.color + '30' }}
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Footer meta */}
          <div className="flex items-center gap-2 mt-2.5">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${cat.badge}`}>
              {cat.label}
            </span>
            <span className="text-xs text-slate-400">{doc.chunk_count} chunks</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">Indexed {fmtDate(doc.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
