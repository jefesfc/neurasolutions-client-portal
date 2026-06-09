import { useState } from 'react';
import { ShieldCheck, Cpu, Calendar as CalendarIcon, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { SecurityTimeRange, SecurityAnalysisResult } from '../../types/security';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface Props {
  token: string;
  range: SecurityTimeRange;
}

export function SecurityAnalysisPanel({ token, range }: Props) {
  const [result, setResult]       = useState<SecurityAnalysisResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [expanded, setExpanded]   = useState(true);
  const [schedMode, setSchedMode] = useState<'realtime' | 'scheduled'>('realtime');

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/security/run-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ range, scheduled: schedMode === 'scheduled' }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      setResult(await res.json() as SecurityAnalysisResult);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 14,
      padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={18} color="#818cf8" />
          </div>
          <div>
            <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, margin: 0 }}>AI Security Analysis</p>
            <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>GPT-4o threat assessment</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, gap: 3 }}>
            {(['realtime', 'scheduled'] as const).map(m => (
              <button
                key={m}
                onClick={() => setSchedMode(m)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: schedMode === m ? 'rgba(99,102,241,0.5)' : 'transparent',
                  color: schedMode === m ? '#c7d2fe' : '#64748b',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {m === 'realtime' ? <Cpu size={11} /> : <CalendarIcon size={11} />}
                {m === 'realtime' ? 'Real-time' : 'Scheduled'}
              </button>
            ))}
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: loading ? '#475569' : '#6366f1',
              color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: 12 }}>
          Click "Run Analysis" to get an AI-powered security assessment for the selected time range.
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Analyzed {result.events_analyzed} events · {schedMode === 'realtime' ? 'Real-time' : 'Scheduled'} mode
            </span>
            <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          {expanded && (
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 16, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto',
            }}>
              {result.analysis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
