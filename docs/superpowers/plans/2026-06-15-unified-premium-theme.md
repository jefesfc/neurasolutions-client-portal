# AIOS Unified Premium Theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a unified light-premium design (Option B2) across all AIOS modules — dark sidebar/topbar, `#f1f5f9` content area, white cards with colored top borders and consistent typography.

**Architecture:** Shared `KPITile` component is implemented first; all modules import it. Security and Dashboard receive full redesigns (dark → light). All remaining modules get minor polish (consistent border-radius, bg, typography). AppLayout already sets `bg-slate-100` — no layout changes needed.

**Tech Stack:** React + TypeScript, Tailwind v4, inline styles (project convention), Lucide icons, Recharts (charts untouched)

---

## File Map

| File | Change |
|---|---|
| `src/components/ui/KPITile.tsx` | **CREATE** — shared KPI tile used by Security, Dashboard, Analytics, Usage, AI Systems |
| `src/components/security/SecurityStatusBanner.tsx` | **MODIFY** — dark gradient → pastel state bg, light housing |
| `src/components/security/SecurityKPIRow.tsx` | **MODIFY** — replace dark tiles with `KPITile` |
| `src/components/security/SecurityAnalysisPanel.tsx` | **MODIFY** — dark bg → white card |
| `src/pages/SecurityPage.tsx` | **MODIFY** — Operational Model block dark → light |
| `src/components/dashboard/HeroBanner.tsx` | **MODIFY** — full dark→light redesign, white cards, KPITile stats |
| `src/pages/AISystemsPage.tsx` | **MODIFY** — dark section headers → white |
| `src/pages/BillingPage.tsx` | **MODIFY** — minor polish, white cards |
| `src/pages/AnalyticsPage.tsx` | **MODIFY** — page bg + card consistency |
| `src/pages/UsagePage.tsx` | **MODIFY** — minor polish |

---

## Task 1: Shared KPITile component

**Files:**
- Create: `src/components/ui/KPITile.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/KPITile.tsx
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  Icon: LucideIcon;
  loading?: boolean;
}

const CYAN = '#06b6d4';

export function KPITile({ label, value, sub, color, Icon, loading }: Props) {
  const [hovered, setHovered] = useState(false);
  const c = hovered ? CYAN : color;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        borderTop: `3px solid ${c}`,
        borderLeft:   `1px solid ${hovered ? CYAN + '40' : color + '20'}`,
        borderRight:  `1px solid ${hovered ? CYAN + '40' : color + '20'}`,
        borderBottom: `1px solid ${hovered ? CYAN + '40' : color + '20'}`,
        borderRadius: '0 0 14px 14px',
        padding: '18px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: 'default',
        transition: 'box-shadow 0.18s, transform 0.18s, border-color 0.18s',
        boxShadow: hovered
          ? `0 0 0 2px ${CYAN}25, 0 6px 22px rgba(6,182,212,0.12)`
          : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Label + Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.8px', color: '#64748b',
        }}>
          {label}
        </span>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: `${c}18`,
          border: `1px solid ${c}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.18s',
        }}>
          <Icon size={15} color={c} />
        </div>
      </div>

      {/* Value + sub */}
      <div>
        <p style={{
          fontSize: 34, fontWeight: 800, color: c,
          margin: 0, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.5px',
          transition: 'color 0.18s',
        }}>
          {loading ? '—' : value}
        </p>
        {sub && (
          <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: '5px 0 0', lineHeight: 1 }}>
            {sub}
          </p>
        )}
      </div>

      {/* Bottom accent bar */}
      <div style={{
        height: 3, borderRadius: 99,
        background: `linear-gradient(to right, ${c}60, transparent)`,
        transition: 'background 0.18s',
      }} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/KPITile.tsx
git commit -m "feat: add shared KPITile component — white, colored top border, hover cyan"
```

---

## Task 2: SecurityKPIRow → use KPITile

**Files:**
- Modify: `src/components/security/SecurityKPIRow.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
// src/components/security/SecurityKPIRow.tsx
import { Activity, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { KPITile } from '../ui/KPITile';
import type { SecuritySummary } from '../../types/security';

interface Props {
  summary: SecuritySummary | null;
  loading: boolean;
}

export function SecurityKPIRow({ summary, loading }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <KPITile
        label="Total Events"
        value={summary?.total_events ?? '—'}
        sub="monitored"
        color="#818cf8"
        Icon={Activity}
        loading={loading}
      />
      <KPITile
        label="High / Critical"
        value={loading ? '—' : `${summary?.high_count ?? '0'} / ${summary?.critical_count ?? '0'}`}
        sub="severity events"
        color="#f87171"
        Icon={AlertTriangle}
        loading={loading}
      />
      <KPITile
        label="Unresolved"
        value={summary?.high_unresolved ?? '—'}
        sub="require action"
        color="#fbbf24"
        Icon={Clock}
        loading={loading}
      />
      <KPITile
        label="Resolved"
        value={summary?.resolved_count ?? '—'}
        sub="cleared"
        color="#34d399"
        Icon={ShieldCheck}
        loading={loading}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/security/SecurityKPIRow.tsx
git commit -m "refactor: SecurityKPIRow uses shared KPITile — light premium"
```

---

## Task 3: SecurityStatusBanner → light pastel

**Files:**
- Modify: `src/components/security/SecurityStatusBanner.tsx`

- [ ] **Step 1: Replace STATUS_CONFIG with light pastel values**

Find and replace the `STATUS_CONFIG` constant:

```tsx
const STATUS_CONFIG = {
  protected: {
    color: '#10b981',
    borderColor: '#10b981',
    bg: '#f0fdf4',
    label: 'System Protected',
    desc: 'No active threats — all events resolved',
    Icon: ShieldCheck,
    pulse: false,
  },
  warning: {
    color: '#f59e0b',
    borderColor: '#f59e0b',
    bg: '#fffbeb',
    label: 'Pending Events',
    desc: 'There are unresolved events that require review',
    Icon: ShieldAlert,
    pulse: true,
  },
  critical: {
    color: '#ef4444',
    borderColor: '#ef4444',
    bg: '#fef2f2',
    label: 'Active Threat',
    desc: 'High severity events detected and unresolved',
    Icon: ShieldX,
    pulse: true,
  },
};
```

- [ ] **Step 2: Replace the banner container and TrafficLight housing**

Replace the `return (` block inside `SecurityStatusBanner`:

```tsx
  return (
    <div style={{
      background: cfg.bg,
      borderLeft: `4px solid ${cfg.color}`,
      borderTop: `1px solid ${cfg.color}30`,
      borderRight: `1px solid ${cfg.color}30`,
      borderBottom: `1px solid ${cfg.color}30`,
      borderRadius: 14,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap',
      transition: 'background 0.5s ease, border-color 0.5s ease',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Traffic light */}
      <TrafficLight status={info.status} />

      {/* Status text */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <cfg.Icon size={16} color={cfg.color} />
          <span style={{
            fontSize: 13, fontWeight: 800, color: cfg.color,
            textTransform: 'uppercase', letterSpacing: '1.5px',
          }}>
            {cfg.label}
          </span>
        </div>
        <p style={{ color: '#475569', fontSize: 12, margin: '0 0 8px', lineHeight: 1.4 }}>{cfg.desc}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            {info.totalEvents} events analyzed
          </span>
          {info.totalUnresolved > 0 && (
            <span style={{ fontSize: 11, color: cfg.color, fontWeight: 700 }}>
              · {info.totalUnresolved} unresolved
            </span>
          )}
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
            Updated: {relativeTime}
          </span>
        </div>
      </div>

      {/* Severity breakdown */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <SevPill label="Critical" count={info.criticalCount} color="#ef4444" />
        <SevPill label="High"     count={info.highCount}     color="#f97316" />
        <SevPill label="Medium"   count={info.mediumCount}   color="#f59e0b" />
        <SevPill label="Low"      count={info.lowCount}      color="#3b82f6" />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {info.totalUnresolved > 0 && onResolveAll && (
          <button
            onClick={() => void handleResolveAll()}
            disabled={resolving}
            title="Mark all as resolved"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: resolving ? '#f0fdf4' : '#10b981',
              border: '1px solid #10b98140',
              color: resolving ? '#166534' : '#fff',
              cursor: resolving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.18s',
            }}
          >
            <CheckCheck size={13} style={{ animation: resolving ? 'spin 1s linear infinite' : 'none' }} />
            {resolving ? 'Resolving...' : 'Resolve All'}
          </button>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh now"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '7px', borderRadius: 8,
            background: '#fff', border: '1px solid #e2e8f0',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: loading ? '#cbd5e1' : '#64748b',
            transition: 'all 0.18s',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
    </div>
  );
```

- [ ] **Step 3: Replace TrafficLight housing to light style**

Replace the `TrafficLight` function:

```tsx
function TrafficLight({ status }: { status: SecurityStatus }) {
  const lights = [
    { id: 'critical',  color: '#ef4444', glow: 'rgba(239,68,68,0.5)',  active: status === 'critical' },
    { id: 'warning',   color: '#f59e0b', glow: 'rgba(245,158,11,0.5)', active: status === 'warning' },
    { id: 'protected', color: '#22c55e', glow: 'rgba(34,197,94,0.5)',  active: status === 'protected' },
  ];

  return (
    <div style={{
      background: '#f8fafc',
      border: '2px solid #e2e8f0',
      borderRadius: 18,
      padding: '14px 10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      flexShrink: 0,
    }}>
      {lights.map(light => (
        <div key={light.id} style={{
          width: 28, height: 28, borderRadius: '50%',
          background: light.active ? light.color : `${light.color}25`,
          boxShadow: light.active
            ? `0 0 12px ${light.glow}, 0 0 24px ${light.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`
            : 'none',
          transition: 'all 0.4s ease',
          ...(light.active && light.id !== 'protected' ? {
            animation: 'semaphore-pulse 2s ease-in-out infinite',
          } as React.CSSProperties : {}),
        }} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Update SevPill to light style**

Replace the `SevPill` function:

```tsx
function SevPill({ label, count, color }: { label: string; count: number; color: string }) {
  const active = count > 0;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: active ? `${color}10` : '#fff',
      borderTop: `2px solid ${active ? color : '#e2e8f0'}`,
      borderLeft:   `1px solid ${active ? color + '30' : '#e2e8f0'}`,
      borderRight:  `1px solid ${active ? color + '30' : '#e2e8f0'}`,
      borderBottom: `1px solid ${active ? color + '30' : '#e2e8f0'}`,
      borderRadius: '0 0 10px 10px',
      padding: '9px 16px', minWidth: 70,
      transition: 'all 0.35s ease',
      boxShadow: active ? `0 2px 10px ${color}18` : 'none',
    }}>
      <span style={{
        fontSize: 24, fontWeight: 800, lineHeight: 1,
        color: active ? color : '#cbd5e1',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.5px',
        transition: 'color 0.35s ease',
      }}>
        {count}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, marginTop: 5,
        textTransform: 'uppercase', letterSpacing: '0.7px',
        color: active ? `${color}cc` : '#94a3b8',
        transition: 'color 0.35s ease',
      }}>
        {label}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/security/SecurityStatusBanner.tsx
git commit -m "feat: SecurityStatusBanner light redesign — pastel bg, colored left border"
```

---

## Task 4: Security Operational Model → light

**Files:**
- Modify: `src/pages/SecurityPage.tsx`

- [ ] **Step 1: Replace the Operational Security Model block**

Find the `{/* Operational Security Model */}` comment and replace the entire block with:

```tsx
        {/* Operational Security Model */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16, padding: '20px 20px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} color="#6366f1" />
            </div>
            <div>
              <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                Operational Security Model
              </p>
              <p style={{ color: '#94a3b8', fontSize: 11, margin: '2px 0 0' }}>6 active security layers</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10 }}>
            {OPERATIONAL_MODEL.map(item => {
              const isHovered = tileHover === item.actionKey;
              const c = isHovered ? '#06b6d4' : item.color;
              return (
                <div
                  key={item.title}
                  onClick={() => handleTileAction(item.actionKey)}
                  onMouseEnter={() => setTileHover(item.actionKey)}
                  onMouseLeave={() => setTileHover(null)}
                  style={{
                    background: '#fff',
                    borderTop: `2px solid ${c}`,
                    borderLeft:   `1px solid ${isHovered ? '#06b6d440' : item.color + '25'}`,
                    borderRight:  `1px solid ${isHovered ? '#06b6d440' : item.color + '25'}`,
                    borderBottom: `1px solid ${isHovered ? '#06b6d440' : item.color + '25'}`,
                    borderRadius: '0 0 12px 12px',
                    padding: '14px 16px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: isHovered
                      ? `0 0 0 2px rgba(6,182,212,0.20), 0 6px 20px rgba(6,182,212,0.12)`
                      : '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}
                >
                  {/* Icon + title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: `${c}15`,
                      border: `1px solid ${c}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s',
                    }}>
                      <item.icon size={15} color={c} style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.18s' }} />
                    </div>
                    <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 13, margin: 0 }}>{item.title}</p>
                  </div>

                  {/* Description */}
                  <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{item.desc}</p>

                  {/* Footer action */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    paddingTop: 8, borderTop: `1px solid ${isHovered ? '#06b6d420' : '#f1f5f9'}`,
                    transition: 'border-color 0.18s',
                  }}>
                    {item.actionKey === 'audit' && <Download size={10} color={c} />}
                    <span style={{ color: c, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.18s' }}>
                      {item.actionLabel} →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RLS toast */}
          {rlsToast && (
            <div style={{
              marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderLeft: '3px solid #10b981',
              borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
              animation: 'fadeIn 0.25s ease',
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={13} color="#10b981" />
              </div>
              <div>
                <p style={{ color: '#166534', fontSize: 12, fontWeight: 700, margin: '0 0 2px' }}>RLS Active — System Protected</p>
                <span style={{ color: '#475569', fontSize: 12 }}>
                  PostgreSQL Row-Level Security enforced · All queries automatically filtered by <code style={{ color: '#0f172a', fontSize: 11, background: '#f1f5f9', padding: '1px 4px', borderRadius: 4 }}>tenant_id</code> at the database layer
                </span>
              </div>
            </div>
          )}
        </div>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/SecurityPage.tsx
git commit -m "feat: Security Operational Model tiles light redesign — white cards, colored top border"
```

---

## Task 5: SecurityAnalysisPanel → light

**Files:**
- Modify: `src/components/security/SecurityAnalysisPanel.tsx`

- [ ] **Step 1: Replace dark outer container**

Replace lines 113-117 (outer div):
```tsx
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 14, padding: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
```

- [ ] **Step 2: Replace dark icon badge**

Replace `background: 'rgba(99,102,241,0.2)'` in the icon div:
```tsx
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={18} color="#6366f1" />
          </div>
```

- [ ] **Step 3: Update panel title and sub text**

```tsx
            <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 14, margin: 0 }}>AI Security Analysis</p>
            <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>GPT-4o threat assessment</p>
```

- [ ] **Step 4: Update mode toggle to light style**

Replace the mode toggle div:
```tsx
          <div style={{ display: 'flex', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 3, gap: 3 }}>
            {(['realtime', 'scheduled'] as const).map(m => (
              <button key={m} onClick={() => setSchedMode(m)} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: schedMode === m ? '#6366f1' : 'transparent',
                color: schedMode === m ? '#fff' : '#64748b',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {m === 'realtime' ? <Cpu size={11} /> : <CalendarIcon size={11} />}
                {m === 'realtime' ? 'Real-time' : 'Scheduled'}
              </button>
            ))}
          </div>
```

- [ ] **Step 5: Update selectStyle constant**

```tsx
  const selectStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 8, color: '#0f172a', fontSize: 12, padding: '6px 10px', outline: 'none', cursor: 'pointer',
  };
```

- [ ] **Step 6: Update scheduled config panel bg**

Replace `background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)'`:
```tsx
          background: '#f8fafc', border: '1px solid #e2e8f0',
```

Replace `color: '#94a3b8'` on the "Schedule Configuration" label with `color: '#64748b'`.

Replace all `color: '#64748b'` labels in selects (already correct).

Replace `color: '#a5b4fc'` next run text with `color: '#6366f1'`.

Replace `color: '#64748b'` last run text — keep as is.

- [ ] **Step 7: Update result display area**

Replace result expanded area:
```tsx
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 10, padding: 16, color: '#334155', fontSize: 13, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto',
            }}>
              {result.analysis}
            </div>
```

Replace error area:
```tsx
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
```

Replace empty state text color:
```tsx
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 12 }}>
```

- [ ] **Step 8: Update Save Schedule button (keep indigo)**

```tsx
              background: saveFlash ? '#10b981' : '#6366f1', color: '#fff',
```

- [ ] **Step 9: Commit**

```bash
git add src/components/security/SecurityAnalysisPanel.tsx
git commit -m "feat: SecurityAnalysisPanel light redesign — white card, indigo accents"
```

---

## Task 6: Dashboard HeroBanner → light redesign

**Files:**
- Modify: `src/components/dashboard/HeroBanner.tsx`

This is a full rewrite of the visual layer. All data-fetching hooks and logic stay identical. Only the JSX/styles change.

- [ ] **Step 1: Replace shared style constants at top of file**

Remove the `glowPanel`, `panelInner`, `panelTitle` constants and replace with light equivalents:

```tsx
// Light card wrapper — used for all chart/info panels
const lightCard: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const cardTitle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: 11,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  borderBottom: '1px solid #f1f5f9',
  paddingBottom: 8,
};
```

- [ ] **Step 2: Rewrite ActiveServicesCard to light style**

```tsx
function ActiveServicesCard({ secSummary }: ServicesCardProps) {
  const highAlerts = parseInt(secSummary?.high_unresolved ?? '0', 10);
  const secStatus: ServiceStatus = secSummary === null ? 'soon' : highAlerts > 0 ? 'alert' : 'active';
  const secDetail = secSummary === null
    ? 'Connecting…'
    : highAlerts > 0 ? `${highAlerts} high alert${highAlerts > 1 ? 's' : ''}` : `${secSummary.total_events} events`;

  const SERVICES: { icon: string; name: string; detail: string; status: ServiceStatus }[] = [
    { icon: "✈️", name: "Telegram Bot",      detail: "@Neura_AIOS_demo_bot", status: "active"  },
    { icon: "🤖", name: "AI Orchestrator",   detail: "GPT-4o",               status: "active"  },
    { icon: "⚙️", name: "n8n Workflows",     detail: "3 running",            status: "active"  },
    { icon: "📧", name: "Gmail Sync",        detail: "last sync 2m ago",     status: "active"  },
    { icon: "📅", name: "Calendar Notifier", detail: "08:00 daily cron",     status: "pending" },
    { icon: "🛡️", name: "Security Agent",    detail: secDetail,              status: secStatus  },
  ];

  const STATUS_LIGHT = {
    active:  { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', dot: '#22c55e', label: 'Active'    },
    pending: { bg: '#fffbeb', border: '#fde68a', color: '#d97706', dot: null,      label: '⚠ Pending' },
    alert:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', dot: '#ef4444', label: '⚠ Alert'   },
    soon:    { bg: '#eef2ff', border: '#c7d2fe', color: '#6366f1', dot: null,      label: 'Soon'      },
  } as const;

  const activeCount = SERVICES.filter(s => s.status === "active").length;

  return (
    <div style={lightCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Active Services
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          color: '#16a34a', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite', display: 'inline-block' }} />
          {activeCount} / {SERVICES.length} Active
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {SERVICES.map(svc => {
          const st = STATUS_LIGHT[svc.status];
          return (
            <div key={svc.name} style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              padding: '8px 10px', borderRadius: 8,
              background: '#f8fafc', border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                <span style={{ fontSize: 13 }}>{svc.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {svc.name}
                </span>
              </div>
              <span style={{ fontSize: 9, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {svc.detail}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3, width: 'fit-content',
                fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
                background: st.bg, border: `1px solid ${st.border}`, color: st.color,
              }}>
                {st.dot && <span style={{ width: 4, height: 4, borderRadius: '50%', background: st.dot, animation: 'pulse 2s infinite', display: 'inline-block' }} />}
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite LeadsStatusChart to light style**

Replace only the JSX inside `LeadsStatusChart` (keep all data logic unchanged):

```tsx
  return (
    <div style={lightCard}>
      <div style={cardTitle}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0, display: 'inline-block' }} />
        Leads by Status
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <svg width={110} height={110} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
          <circle r={14} cx={18} cy={18} fill="none" stroke="#f1f5f9" strokeWidth={6} />
          {segments.map(seg => (
            <circle key={seg.key}
              r={14} cx={18} cy={18} fill="transparent"
              stroke={seg.color} strokeWidth={6}
              strokeDasharray={`${seg.dash} ${circumference}`}
              strokeDashoffset={-seg.offset}
              transform="rotate(-90 18 18)"
            />
          ))}
          <text x={18} y={16.5} textAnchor="middle" fontSize={5.5} fontWeight={900} fill="#0f172a">{total}</text>
          <text x={18} y={21.5} textAnchor="middle" fontSize={3.2} fill="#64748b">leads</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {segments.map(seg => (
            <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#475569', flex: 1 }}>{seg.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{seg.count}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 28, textAlign: 'right' }}>{seg.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 4: Rewrite AICostPanel to light style (keep Recharts unchanged)**

Replace only the outer container and title of `AICostPanel`:

```tsx
  return (
    <div style={lightCard}>
      <div style={cardTitle}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, display: 'inline-block' }} />
        AI Cost by Agent
      </div>
      {/* Recharts ResponsiveContainer stays exactly as-is */}
      ...
    </div>
  );
```

- [ ] **Step 5: Rewrite PlatformHealthPanel to light style**

Replace outer container + title, keep bar logic:

```tsx
  return (
    <div style={lightCard}>
      <div style={cardTitle}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0, display: 'inline-block' }} />
        Platform Health
      </div>
      {/* Bar rows — update label color from #94a3b8 to #475569, bar track from rgba white to #f1f5f9 */}
      ...
    </div>
  );
```

In each bar row:
- Label text: `color: '#475569'`
- Value text: `color: '#0f172a'`
- Track (bg): `background: '#f1f5f9'`

- [ ] **Step 6: Rewrite SecurityHealthPanel to light style**

Replace outer container + title, keep SVG ring:

```tsx
  return (
    <div style={lightCard}>
      <div style={cardTitle}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0, display: 'inline-block' }} />
        Security Health
      </div>
      {/* Keep SVG ring — update text color: score #0f172a, '/100' #64748b */}
      {/* Tiles: bg #f8fafc, border #e2e8f0, text #475569 */}
      ...
    </div>
  );
```

- [ ] **Step 7: Rewrite HeroBanner main return (outer layout)**

Replace the main `return (` of `HeroBanner`:

```tsx
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Greeting row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link to="/reports" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 10,
          background: '#6366f1', color: '#fff',
          fontSize: 12, fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
        }}>
          View Full Report →
        </Link>
      </div>

      {/* KPI tiles row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPITile
          label="Total Leads"
          value={loading ? '—' : String(leads.length)}
          sub="in pipeline"
          color="#818cf8"
          Icon={Users}
          loading={loading}
        />
        <KPITile
          label="Active Clients"
          value={loading ? '—' : String(clients.filter(c => c.status === 'active').length)}
          sub="engaged"
          color="#34d399"
          Icon={Briefcase}
          loading={loading}
        />
        <KPITile
          label="AI Cost (£)"
          value={loading ? '—' : `£${(tokenUsage.reduce((s, t) => s + (Number(t.cost) ?? 0), 0) * USD_GBP).toFixed(2)}`}
          sub="this month"
          color="#fbbf24"
          Icon={Zap}
          loading={loading}
        />
        <KPITile
          label="Security Score"
          value={secSummary ? (secSummary.high_unresolved === '0' ? '85' : '62') : '—'}
          sub="out of 100"
          color="#f87171"
          Icon={ShieldCheck}
          loading={secLoading}
        />
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ActiveServicesCard secSummary={secSummary} />
        <LeadsStatusChart leads={leads} statusCounts={statusCounts} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <AICostPanel tokenUsage={tokenUsage} loading={loading} />
        <PlatformHealthPanel />
        <SecurityHealthPanel />
      </div>

    </div>
  );
```

- [ ] **Step 8: Add missing Lucide imports**

At top of file, ensure these are imported:
```tsx
import { Users, Briefcase, Zap, ShieldCheck } from 'lucide-react';
import { KPITile } from '../ui/KPITile';
```

Remove any unused imports (`BarChart2`, etc.) to avoid TS6133 build errors.

- [ ] **Step 9: Remove BottomKpiRow** (no longer needed — stats are in KPITiles)

Delete the `BottomKpiRow` function and its usage in the return.

- [ ] **Step 10: Verify TypeScript build passes**

```bash
cd AIOS && npx tsc -b --noEmit
```

Fix any TS errors (typically unused imports). Re-run until clean.

- [ ] **Step 11: Commit**

```bash
git add src/components/dashboard/HeroBanner.tsx src/components/ui/KPITile.tsx
git commit -m "feat: Dashboard HeroBanner light redesign — white cards, KPITile stats, no dark bg"
```

---

## Task 7: AI Systems page — remove dark sections

**Files:**
- Modify: `src/pages/AISystemsPage.tsx`

- [ ] **Step 1: Read the file and identify dark hardcoded backgrounds**

```bash
grep -n "0f172a\|0d1524\|111c2e\|1a2235\|background.*linear-gradient.*#0" AIOS/src/pages/AISystemsPage.tsx
```

- [ ] **Step 2: Replace any dark section containers**

For each dark container found, replace with:
```tsx
background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
```

For dark text (`#e2e8f0`, `#cbd5e1`, `#94a3b8` on dark bg) → change to `#0f172a` / `#475569` / `#64748b`.

- [ ] **Step 3: Check AI system cards component**

```bash
grep -rn "0f172a\|dark\|#1a\|#0d" AIOS/src/components/ai-systems/ 2>/dev/null || echo "no dark found"
```

Fix any dark backgrounds found.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AISystemsPage.tsx src/components/ai-systems/
git commit -m "feat: AI Systems page light theme — remove dark section backgrounds"
```

---

## Task 8: Minor polish sweep — remaining modules

**Files:**
- Modify: `src/pages/BillingPage.tsx`, `src/pages/AnalyticsPage.tsx`, `src/pages/UsagePage.tsx`, `src/pages/ReportsPage.tsx`, `src/pages/SupportPage.tsx`, `src/pages/NotificationsPage.tsx`

- [ ] **Step 1: Search for remaining dark backgrounds in page files**

```bash
grep -rn "#0f172a\|#0d1524\|#111c2e\|#1a2235\|linear-gradient.*#08\|linear-gradient.*#0f" AIOS/src/pages/ AIOS/src/components/ --include="*.tsx" | grep -v "SecurityStatusBanner\|HeroBanner\|Sidebar\|TopBar\|LoginPage"
```

- [ ] **Step 2: For each hit, replace dark bg with white card style**

Pattern to apply:
```tsx
// BEFORE (dark)
background: 'linear-gradient(135deg, #0f172a 0%, #1a2235 100%)',
border: '1px solid rgba(99,102,241,0.2)',

// AFTER (light)
background: '#ffffff',
border: '1px solid #e2e8f0',
boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
```

For text on dark bg: `#e2e8f0` → `#0f172a`, `#94a3b8` → `#64748b`, `#64748b` on dark → `#475569`.

- [ ] **Step 3: Verify border-radius consistency**

Any card with `borderRadius: 10` or `borderRadius: 12` → change to `borderRadius: 14`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ src/components/
git commit -m "fix: minor polish sweep — light theme consistency, border-radius 14px, remove remaining dark bg"
```

---

## Task 9: Final build verification + push

- [ ] **Step 1: TypeScript build**

```bash
cd AIOS && npx tsc -b --noEmit 2>&1 | head -40
```

Expected: no errors. Fix any TS6133 (unused import) errors by removing the import.

- [ ] **Step 2: Vite build**

```bash
cd AIOS && npm run build 2>&1 | tail -20
```

Expected: `✓ built in X.Xs` with no errors.

- [ ] **Step 3: Push**

```bash
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ Content bg `#f1f5f9`: Already set in AppLayout (`bg-slate-100`) — no task needed
- ✅ KPITile component (Task 1)
- ✅ SecurityStatusBanner light (Task 3)
- ✅ SecurityKPIRow → KPITile (Task 2)
- ✅ Security Operational Model light (Task 4)
- ✅ SecurityAnalysisPanel light (Task 5)
- ✅ Dashboard HeroBanner light (Task 6)
- ✅ AI Systems (Task 7)
- ✅ Minor sweep remaining modules (Task 8)
- ✅ Sidebar/Topbar unchanged (not in scope)
- ✅ Invoicing unchanged (reference module)

**Type consistency:**
- `KPITile` props: `{ label, value, sub?, color, Icon, loading? }` — used consistently in Tasks 2 and 6
- `lightCard` / `cardTitle` constants defined in Task 6 Step 1 and used in Steps 2-6
- `STATUS_LIGHT` defined inside `ActiveServicesCard` — no external dependency

**Placeholder check:** All steps contain actual code. No TBD. Task 7 Step 1 uses grep to discover actual content before prescribing fixes — appropriate since AISystemsPage hasn't been read in full.
