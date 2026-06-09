import { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Calendar as CalendarIcon, Loader2, ChevronDown, ChevronUp, Save, Trash2, Clock } from 'lucide-react';
import type { SecurityTimeRange, SecurityAnalysisResult } from '../../types/security';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const SCHED_KEY = 'aios_security_schedule';
const LAST_RUN_KEY = 'aios_security_last_run';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleConfig { frequency: 'daily' | 'weekly'; time: string; dayOfWeek: number; }

function loadSchedule(): ScheduleConfig | null {
  try { return JSON.parse(localStorage.getItem(SCHED_KEY) ?? '') as ScheduleConfig; }
  catch { return null; }
}

function computeNextRun(cfg: ScheduleConfig): Date {
  const [h, m] = cfg.time.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setSeconds(0, 0);
  next.setHours(h, m);

  if (cfg.frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else {
    let diff = (cfg.dayOfWeek - now.getDay() + 7) % 7;
    if (diff === 0 && next <= now) diff = 7;
    next.setDate(next.getDate() + diff);
  }
  return next;
}

interface Props { token: string; range: SecurityTimeRange; }

export function SecurityAnalysisPanel({ token, range }: Props) {
  const [result, setResult]       = useState<SecurityAnalysisResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [expanded, setExpanded]   = useState(true);
  const [schedMode, setSchedMode] = useState<'realtime' | 'scheduled'>('realtime');

  const [schedCfg, setSchedCfg]   = useState<ScheduleConfig>({ frequency: 'daily', time: '08:00', dayOfWeek: 1 });
  const [savedCfg, setSavedCfg]   = useState<ScheduleConfig | null>(loadSchedule);
  const [nextRun, setNextRun]     = useState<Date | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);

  /* Compute next run whenever savedCfg changes */
  useEffect(() => {
    if (savedCfg) {
      setNextRun(computeNextRun(savedCfg));
    } else {
      setNextRun(null);
    }
  }, [savedCfg]);

  /* Auto-run if a schedule is due on mount */
  useEffect(() => {
    if (!savedCfg) return;
    const lastRun = localStorage.getItem(LAST_RUN_KEY);
    const next = computeNextRun(savedCfg);
    const now = new Date();
    if (!lastRun || new Date(lastRun) < next && now >= next) {
      setSchedMode('scheduled');
      void runAnalysis(true);
    }
  // only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAnalysis(isAuto = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/security/run-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ range, scheduled: schedMode === 'scheduled' || isAuto }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      setResult(await res.json() as SecurityAnalysisResult);
      setExpanded(true);
      localStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
      if (savedCfg) setNextRun(computeNextRun(savedCfg));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function saveSchedule() {
    localStorage.setItem(SCHED_KEY, JSON.stringify(schedCfg));
    setSavedCfg({ ...schedCfg });
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  }

  function clearSchedule() {
    localStorage.removeItem(SCHED_KEY);
    localStorage.removeItem(LAST_RUN_KEY);
    setSavedCfg(null);
    setNextRun(null);
  }

  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, color: '#e2e8f0', fontSize: 12, padding: '6px 10px', outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, padding: 20,
    }}>
      {/* Header */}
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
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, gap: 3 }}>
            {(['realtime', 'scheduled'] as const).map(m => (
              <button key={m} onClick={() => setSchedMode(m)} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: schedMode === m ? 'rgba(99,102,241,0.5)' : 'transparent',
                color: schedMode === m ? '#c7d2fe' : '#64748b',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {m === 'realtime' ? <Cpu size={11} /> : <CalendarIcon size={11} />}
                {m === 'realtime' ? 'Real-time' : 'Scheduled'}
              </button>
            ))}
          </div>
          {/* Run button */}
          <button onClick={() => void runAnalysis()} disabled={loading} style={{
            padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: loading ? '#475569' : '#6366f1', color: '#fff',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={13} />}
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* ── Scheduled config form ───────────────────────────────────── */}
      {schedMode === 'scheduled' && (
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 10, padding: 16, marginBottom: 16,
        }}>
          <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
            Schedule Configuration
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            {/* Frequency */}
            <div>
              <label style={{ color: '#64748b', fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Frequency</label>
              <select value={schedCfg.frequency} onChange={e => setSchedCfg(c => ({ ...c, frequency: e.target.value as 'daily' | 'weekly' }))} style={selectStyle}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            {/* Day of week (weekly only) */}
            {schedCfg.frequency === 'weekly' && (
              <div>
                <label style={{ color: '#64748b', fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Day</label>
                <select value={schedCfg.dayOfWeek} onChange={e => setSchedCfg(c => ({ ...c, dayOfWeek: Number(e.target.value) }))} style={selectStyle}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}

            {/* Time */}
            <div>
              <label style={{ color: '#64748b', fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</label>
              <input
                type="time"
                value={schedCfg.time}
                onChange={e => setSchedCfg(c => ({ ...c, time: e.target.value }))}
                style={{ ...selectStyle, fontFamily: 'monospace' }}
              />
            </div>

            {/* Save / Clear */}
            <button onClick={saveSchedule} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: saveFlash ? '#10b981' : 'rgba(99,102,241,0.6)', color: '#fff',
              transition: 'background 0.2s',
            }}>
              <Save size={13} /> {saveFlash ? 'Saved!' : 'Save Schedule'}
            </button>

            {savedCfg && (
              <button onClick={clearSchedule} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                fontSize: 12, background: 'transparent', color: '#f87171',
              }}>
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>

          {/* Next run + last run info */}
          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {nextRun && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={11} color="#818cf8" />
                <span style={{ color: '#a5b4fc', fontSize: 11 }}>
                  Next run: <strong>{nextRun.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} at {nextRun.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong>
                </span>
              </div>
            )}
            {localStorage.getItem(LAST_RUN_KEY) && (
              <span style={{ color: '#64748b', fontSize: 11 }}>
                Last run: {new Date(localStorage.getItem(LAST_RUN_KEY)!).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: 12 }}>
          {schedMode === 'scheduled' && savedCfg
            ? `Scheduled ${savedCfg.frequency === 'daily' ? 'daily' : `every ${DAYS[savedCfg.dayOfWeek]}`} at ${savedCfg.time}. Click "Run Analysis" to run now.`
            : 'Click "Run Analysis" to get an AI-powered security assessment for the selected time range.'}
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Analyzed {result.events_analyzed} events · {result.scheduled ? 'Scheduled' : 'Real-time'} mode
            </span>
            <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          {expanded && (
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 16, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto',
            }}>
              {result.analysis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
