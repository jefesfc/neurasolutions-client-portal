import React, { useState, useRef } from 'react';
import { useAuthStore } from '../store/auth-store';

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

function fileIcon(type: string) {
  if (type === 'application/pdf') return '📄';
  return '📝';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function KnowledgePage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [docs, setDocs]           = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
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
    if (!allowed.includes(file.type)) {
      setError('Only PDF and TXT files are supported');
      return;
    }
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
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setDocs(prev => prev.filter(d => d.id !== id));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Knowledge Base</h1>
        <p className="text-sm text-surface-500 mt-1">
          Documents indexed here are used by the AI Chief of Staff to answer questions accurately.
        </p>
      </div>

      {isAdmin && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void handleUpload(f); }}
          onClick={() => fileRef.current?.click()}
          className="mb-6 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
          style={{
            borderColor: dragOver ? '#06b6d4' : 'rgba(100,116,139,0.3)',
            background:  dragOver ? 'rgba(6,182,212,0.05)' : 'rgba(248,250,252,0.5)',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ''; }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-surface-500">Indexing document — this may take 10-30 seconds…</p>
            </div>
          ) : (
            <>
              <div className="text-3xl mb-2">📂</div>
              <p className="font-semibold text-surface-700">Drop a file here or click to upload</p>
              <p className="text-xs text-surface-400 mt-1">Supported: PDF, TXT — max 10 MB</p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-surface-400">
          <div className="text-4xl mb-3">🧠</div>
          <p className="font-medium">No documents indexed yet</p>
          {isAdmin && <p className="text-sm mt-1">Upload your first document above to get started</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-surface-400 font-medium uppercase tracking-wider mb-2">
            {docs.length} document{docs.length !== 1 ? 's' : ''} indexed
          </p>
          {docs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-4 p-4 bg-white border border-surface-200 rounded-xl hover:border-brand-300 transition-colors"
            >
              <span className="text-2xl flex-shrink-0">{fileIcon(doc.file_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-800 truncate">{doc.name}</p>
                <p className="text-xs text-surface-400 mt-0.5">
                  {doc.chunk_count} chunks · indexed {fmtDate(doc.created_at)}
                </p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full font-medium flex-shrink-0">
                ✓ Active
              </span>
              {isAdmin && (
                <button
                  onClick={() => void handleDelete(doc.id, doc.name)}
                  className="text-surface-400 hover:text-red-500 transition-colors text-sm flex-shrink-0"
                  title="Remove from knowledge base"
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
