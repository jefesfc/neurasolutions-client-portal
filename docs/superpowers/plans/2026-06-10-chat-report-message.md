# Chat Report Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render structured AI responses (business reports, KPI summaries) as a rich corporate report card in the chat UI instead of plain markdown text.

**Architecture:** GPT-4o returns a JSON payload for structured responses; the backend detects and passes through the JSON with a `response_type: "report"` flag; the frontend conditionally renders a `ReportMessage` component with a dark header and dynamic color-coded sections.

**Tech Stack:** React + TypeScript (frontend), Node.js/Express + TypeScript (backend), GPT-4o (AI), inline styles only (no Tailwind in ReportMessage to avoid conflicts)

**Spec:** `docs/superpowers/specs/2026-06-10-chat-report-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/types/chat.ts` | Shared TypeScript types for report data |
| Modify | `backend/src/routes/chat.ts` | System prompt + JSON detection + response payload |
| Modify | `backend/src/routes/telegram.ts` | Same prompt + plain text fallback |
| Modify | `src/hooks/useChat.ts` | Extend ChatMessage, read new API fields |
| Create | `src/components/chat/ReportMessage.tsx` | Report card component (dark header + dynamic sections) |
| Modify | `src/components/chat/ChatBubble.tsx` | Use ReportMessage conditionally, fix "contacts" text |

---

## Task 1: Create shared TypeScript types

**Files:**
- Create: `src/types/chat.ts`

- [ ] **Step 1: Create `src/types/chat.ts`**

```ts
export interface ReportSubItem {
  label: string;
  value: string;
  highlight?: 'positive' | 'negative';
}

export interface ReportItem {
  label: string;
  value: string;
  highlight?: 'positive' | 'negative';
  sub?: ReportSubItem[];
}

export interface ReportSection {
  label: string;
  icon: string;
  color: string;
  items: ReportItem[];
}

export interface ReportData {
  type: 'report';
  title: string;
  subtitle?: string;
  intro?: string;
  sections: ReportSection[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/chat.ts
git commit -m "feat: add chat report TypeScript types"
```

---

## Task 2: Backend — chat.ts system prompt + JSON detection

**Files:**
- Modify: `backend/src/routes/chat.ts`

- [ ] **Step 1: Update `SYSTEM_PROMPT_BASE` — append REPORT FORMAT after the LANGUAGE RULE**

The current prompt ends with:
```
...NEVER respond in English if the user wrote in another language. Mirror the user's language in every single reply, no exceptions.`;
```

Replace the full `SYSTEM_PROMPT_BASE` constant with:

```ts
const SYSTEM_PROMPT_BASE = `You are AIOS, an intelligent business assistant built by NeuraSolutions.
You help the company's team analyze their business data: leads, clients, calendar events, emails, sales pipeline, team members, security events, invoicing, and AI usage metrics. The CRM module is called "Clients" — always use the word "client" (never "contact") when referring to CRM records.
You have tools to query live business data — always use them when the user asks about numbers, lists, stats, meetings, scheduled events, revenue, or security.
Be concise, professional, and data-driven.

LANGUAGE RULE (mandatory): Detect the language of the user's message and reply in that EXACT same language. Spanish → Spanish. Chinese → Chinese. French → French. Arabic → Arabic. Portuguese → Portuguese. German → German. English → English. NEVER respond in English if the user wrote in another language. Mirror the user's language in every single reply, no exceptions.

REPORT FORMAT (mandatory when your response contains structured data — metrics, KPIs, tables, lists with numbers, financial summaries, or business reports):
Return ONLY a valid JSON object — no markdown code fences, no extra text before or after the JSON:
{"type":"report","title":"<concise title>","subtitle":"<e.g. June 2026, optional>","intro":"<1 sentence intro, optional>","sections":[{"label":"<section name>","icon":"<1 emoji>","color":"<hex color>","items":[{"label":"<metric name>","value":"<formatted value>","highlight":"positive|negative (optional)","sub":[{"label":"<sub-label>","value":"<sub-value>","highlight":"positive|negative (optional)"}]}]}]}
Rules: use "positive" highlight for good results (high sales, revenue gained), "negative" for bad (losses, failures, errors). Omit "highlight", "sub", "subtitle", "intro" when not needed. Choose meaningful emoji and a distinct hex color per section (e.g. #6366f1 for pipeline, #10b981 for clients, #f59e0b for performance, #8b5cf6 for AI usage).
For purely conversational replies with no structured data, reply in plain text as always.`;
```

- [ ] **Step 2: Add JSON post-processing after `assistantReply` is assigned**

Locate this block (around line 115):
```ts
assistantReply = choice.message.content ?? '';
break;
```

After the `for` loop (after `if (!assistantReply) { ... }`), add:

```ts
// Detect structured report response
let response_type: 'text' | 'report' = 'text';
let report_data: Record<string, unknown> | null = null;
const stripped = assistantReply.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
try {
  const parsed = JSON.parse(stripped) as { type?: string };
  if (parsed?.type === 'report') {
    response_type = 'report';
    report_data = parsed as Record<string, unknown>;
  }
} catch { /* plain text response — no action */ }
```

- [ ] **Step 3: Update the `res.json(...)` call to include the new fields**

Replace:
```ts
res.json({
  message: assistantReply,
  conversation_id: convId,
  usage: { tokens_in: totalTokensIn, tokens_out: totalTokensOut, cost_usd: cost.toFixed(6) },
});
```

With:
```ts
res.json({
  message: assistantReply,
  response_type,
  report_data,
  conversation_id: convId,
  usage: { tokens_in: totalTokensIn, tokens_out: totalTokensOut, cost_usd: cost.toFixed(6) },
});
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/chat.ts
git commit -m "feat: chat backend — structured report JSON detection and response_type"
```

---

## Task 3: Backend — telegram.ts prompt + fallback

**Files:**
- Modify: `backend/src/routes/telegram.ts`

- [ ] **Step 1: Update `SYSTEM_PROMPT` constant (lines 19–25)**

Replace the existing `SYSTEM_PROMPT` constant with (note: `Today's date` is already embedded here as a static string — that's acceptable since the server restarts regularly):

```ts
const SYSTEM_PROMPT = `You are AIOS, an intelligent business assistant built by NeuraSolutions.
You help the company's team analyze their business data: leads, clients, calendar events, emails, sales pipeline, team members, security events, invoicing, and AI usage metrics. The CRM module is called "Clients" — always use the word "client" (never "contact") when referring to CRM records.
You have tools to query live business data — always use them when the user asks about numbers, lists, stats, meetings, scheduled events, revenue, or security.
Be concise, professional, and data-driven.
Today's date: ${new Date().toISOString().split('T')[0]}.

LANGUAGE RULE (mandatory): Detect the language of the user's message (text or transcribed voice) and reply in that EXACT same language. Spanish → Spanish. Chinese → Chinese. French → French. Arabic → Arabic. Portuguese → Portuguese. German → German. English → English. NEVER respond in English if the user wrote or spoke in another language. Mirror the user's language in every single reply, no exceptions.

REPORT FORMAT (mandatory when your response contains structured data — metrics, KPIs, tables, lists with numbers, financial summaries, or business reports):
Return ONLY a valid JSON object — no markdown code fences, no extra text before or after the JSON:
{"type":"report","title":"<concise title>","subtitle":"<e.g. June 2026, optional>","intro":"<1 sentence intro, optional>","sections":[{"label":"<section name>","icon":"<1 emoji>","color":"<hex color>","items":[{"label":"<metric name>","value":"<formatted value>","highlight":"positive|negative (optional)","sub":[{"label":"<sub-label>","value":"<sub-value>","highlight":"positive|negative (optional)"}]}]}]}
Rules: use "positive" highlight for good results, "negative" for bad. Omit optional fields when not needed.
For purely conversational replies with no structured data, reply in plain text as always.`;
```

- [ ] **Step 2: Add `replyText` extraction after the agentic loop (after line 334 `return;`)**

The `if (!assistantReply)` block ends at line 334. After it, add:

```ts
// Extract readable text for Telegram (JSON reports can't be rendered in Telegram)
const strippedTg = assistantReply.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
let replyText = assistantReply;
try {
  const parsed = JSON.parse(strippedTg) as { type?: string; intro?: string; title?: string };
  if (parsed?.type === 'report') {
    replyText = parsed.intro
      ? `📊 ${parsed.intro}`
      : `📊 ${parsed.title ?? 'Report generated.'} Open the AIOS web app for the full report.`;
  }
} catch { /* plain text — replyText stays as assistantReply */ }
```

- [ ] **Step 3: Replace `assistantReply` with `replyText` in all send/TTS calls**

Four places to update (the database persist at line 341 keeps `assistantReply` — we want to store the raw JSON):

Line ~357 (TTS input):
```ts
// BEFORE:
input: assistantReply,
// AFTER:
input: replyText,
```

Line ~362 (TTS cost tracking):
```ts
// BEFORE:
[uuidv4(), tenantId, assistantReply.length, ttsCost]
// AFTER:
[uuidv4(), tenantId, replyText.length, ttsCost]
```

Line ~373 (TTS fallback sendMessage):
```ts
// BEFORE:
await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: assistantReply });
// AFTER:
await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: replyText });
```

Line ~376 (main text sendMessage):
```ts
// BEFORE:
await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: assistantReply });
// AFTER:
await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: replyText });
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/telegram.ts
git commit -m "feat: telegram — report format prompt + plain text fallback for JSON reports"
```

---

## Task 4: Extend useChat hook

**Files:**
- Modify: `src/hooks/useChat.ts`

- [ ] **Step 1: Import ReportData and extend ChatMessage**

Replace the top of the file (imports + interface) with:

```ts
import { useState, useRef } from 'react';
import { useAuthStore } from '../store/auth-store';
import type { ReportData } from '../types/chat';

declare global { interface Window { __env__?: { API_URL?: string; POSTGREST_URL?: string } } }
const API_URL = window.__env__?.API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response_type?: 'text' | 'report';
  report_data?: ReportData;
}
```

- [ ] **Step 2: Update the API response type cast in `sendMessage`**

Replace:
```ts
const data = await res.json() as { message?: string; conversation_id?: string; error?: string };
```

With:
```ts
const data = await res.json() as {
  message?: string;
  response_type?: 'text' | 'report';
  report_data?: ReportData;
  conversation_id?: string;
  error?: string;
};
```

- [ ] **Step 3: Pass new fields when pushing assistant message**

Replace:
```ts
setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.message! }]);
```

With:
```ts
setMessages((prev) => [...prev, {
  id: crypto.randomUUID(),
  role: 'assistant',
  content: data.message!,
  response_type: data.response_type,
  report_data: data.report_data,
}]);
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useChat.ts src/types/chat.ts
git commit -m "feat: extend ChatMessage with response_type and report_data"
```

---

## Task 5: Create ReportMessage component

**Files:**
- Create: `src/components/chat/ReportMessage.tsx`

- [ ] **Step 1: Create `src/components/chat/ReportMessage.tsx`**

```tsx
import type { ReportData, ReportSection, ReportItem } from '../../types/chat';

function valueColor(highlight?: 'positive' | 'negative'): string {
  if (highlight === 'positive') return '#10b981';
  if (highlight === 'negative') return '#ef4444';
  return '#1e293b';
}

function SubItems({ sub }: { sub: NonNullable<ReportItem['sub']> }) {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 7, padding: '6px 10px',
      border: '1px solid #e2e8f0', marginTop: 5,
    }}>
      {sub.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: i < sub.length - 1 ? 3 : 0,
          }}
        >
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{s.label}</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: valueColor(s.highlight) }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionBlock({ section, isLast }: { section: ReportSection; isLast: boolean }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
      background: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
        <span style={{ fontSize: 11 }}>{section.icon}</span>
        <span style={{
          fontSize: 9, fontWeight: 800, color: section.color,
          textTransform: 'uppercase' as const, letterSpacing: '0.5px',
        }}>
          {section.label}
        </span>
      </div>
      {section.items.map((item, i) => (
        <div key={i} style={{ marginBottom: i < section.items.length - 1 ? 8 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{item.label}</span>
            <span style={{
              fontSize: 14, fontWeight: 800,
              color: valueColor(item.highlight),
              fontVariantNumeric: 'tabular-nums' as const,
            }}>
              {item.value}
            </span>
          </div>
          {item.sub && item.sub.length > 0 && <SubItems sub={item.sub} />}
        </div>
      ))}
    </div>
  );
}

export function ReportMessage({ report }: { report: ReportData }) {
  return (
    <div style={{
      borderRadius: '3px 14px 14px 14px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      {/* Dark header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '11px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
            Business Report
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'white', fontWeight: 700 }}>
            {report.title}
          </p>
          {report.subtitle && (
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>
              {report.subtitle}
            </p>
          )}
        </div>
        <div style={{
          background: 'rgba(99,102,241,0.2)',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: 6, padding: '4px 8px',
        }}>
          <span style={{ fontSize: 9, color: '#a5b4fc', fontWeight: 700, letterSpacing: '0.5px' }}>AIOS</span>
        </div>
      </div>

      {/* Intro sentence */}
      {report.intro && (
        <div style={{ background: 'white', padding: '8px 14px 4px', borderBottom: '1px solid #f1f5f9' }}>
          <p style={{ margin: 0, fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
            {report.intro}
          </p>
        </div>
      )}

      {/* Dynamic sections */}
      {report.sections.map((section, i) => (
        <SectionBlock
          key={i}
          section={section}
          isLast={i === report.sections.length - 1}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/ReportMessage.tsx
git commit -m "feat: add ReportMessage component — dark header + dynamic sections"
```

---

## Task 6: Wire ReportMessage into ChatBubble

**Files:**
- Modify: `src/components/chat/ChatBubble.tsx`

- [ ] **Step 1: Add import for ReportMessage at the top of ChatBubble.tsx**

After the existing imports, add:
```tsx
import { ReportMessage } from './ReportMessage';
```

- [ ] **Step 2: Replace the messages `map` block**

Find the block that starts with:
```tsx
{messages.map((msg) => (
  <div
    key={msg.id}
    className={cn("flex items-end gap-2", msg.role === "user" && "flex-row-reverse")}
  >
    <div className={cn(
      "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0",
      msg.role === "user" ? "bg-brand-500" : "bg-brand-100"
    )}>
      {msg.role === "user"
        ? <User className="h-3.5 w-3.5 text-white" />
        : <Bot className="h-3.5 w-3.5 text-brand-600" />
      }
    </div>
    <div className={cn(
      "max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm",
      msg.role === "user"
        ? "bg-brand-500 text-white rounded-br-sm"
        : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
    )}>
      {msg.content}
    </div>
  </div>
))}
```

Replace with:
```tsx
{messages.map((msg) => {
  const isReport = msg.role === 'assistant' && msg.response_type === 'report' && !!msg.report_data;
  return (
    <div
      key={msg.id}
      className={cn("flex items-end gap-2", msg.role === "user" && "flex-row-reverse")}
    >
      <div className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0",
        msg.role === "user" ? "bg-brand-500" : "bg-brand-100"
      )}>
        {msg.role === "user"
          ? <User className="h-3.5 w-3.5 text-white" />
          : <Bot className="h-3.5 w-3.5 text-brand-600" />
        }
      </div>
      {isReport ? (
        <div className="max-w-[95%]">
          <ReportMessage report={msg.report_data!} />
        </div>
      ) : (
        <div className={cn(
          "max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm",
          msg.role === "user"
            ? "bg-brand-500 text-white rounded-br-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
        )}>
          {msg.content}
        </div>
      )}
    </div>
  );
})}
```

- [ ] **Step 3: Fix "contacts" → "clients" in the empty state**

Find:
```tsx
Ask about leads, contacts, calendar, or metrics.
```

Replace with:
```tsx
Ask about leads, clients, calendar, or metrics.
```

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/ChatBubble.tsx
git commit -m "feat: ChatBubble — render ReportMessage for structured AI responses"
```

---

## Task 7: Build verification + push

- [ ] **Step 1: TypeScript build — frontend**

```bash
cd AIOS && npm run build
```

Expected: `✓ built in X.Xs` with no TypeScript errors. If errors appear, check that `ReportData` is imported correctly in all files and that `report_data!` non-null assertion in ChatBubble is justified (it is — `isReport` already checks `!!msg.report_data`).

- [ ] **Step 2: TypeScript build — backend**

```bash
cd AIOS/backend && npm run build
```

Expected: exits 0 with no errors.

- [ ] **Step 3: Push to origin**

```bash
cd AIOS && git push origin main
```

- [ ] **Step 4: Redeploy backend in EasyPanel**

The backend changes (prompt + JSON detection) require a redeploy. In EasyPanel, trigger a redeploy for the `xneurasolutions-aios-backend` service. The frontend deploys automatically via the Docker build.

- [ ] **Step 5: Smoke test in production**

Open `https://ios.neurasolutions.cloud`, log in as `ldmrukuae@gmail.com`, open the AI chat, and type:
```
give me the report this month
```

Expected: The response renders as the dark-header report card with sections (Sales Pipeline, Clients, Performance, AI Usage). If it renders as plain JSON text, check the backend deploy completed and the system prompt change is live.
