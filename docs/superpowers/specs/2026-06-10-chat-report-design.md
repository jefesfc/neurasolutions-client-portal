# Chat Report Message — Design Spec
**Date:** 2026-06-10  
**Status:** Approved

## Problem

The AI chat currently renders all responses as plain `whitespace-pre-wrap` text. When GPT-4o returns structured data (KPIs, metrics, business reports), the result is a wall of raw markdown that looks unprofessional. The goal is a corporate-grade "report card" rendering for structured AI responses.

## Solution Overview

When the user requests structured data (reports, metrics, KPI summaries), GPT-4o returns a JSON payload instead of markdown. The backend detects this JSON, adds a `response_type: "report"` flag, and the frontend renders it as a dark-header report card with dynamic sections.

For plain conversational replies, nothing changes — the existing bubble UI remains.

## Data Contract

GPT-4o returns this JSON when generating a structured report (no markdown code fences):

```json
{
  "type": "report",
  "title": "Monthly Business Report",
  "subtitle": "June 2026",
  "intro": "Here's the business report for the current month:",
  "sections": [
    {
      "label": "Sales Pipeline",
      "icon": "📊",
      "color": "#6366f1",
      "items": [
        {
          "label": "Total Leads",
          "value": "50",
          "sub": [
            { "label": "New", "value": "19" },
            { "label": "Won", "value": "7", "highlight": "positive" },
            { "label": "Lost", "value": "5", "highlight": "negative" }
          ]
        }
      ]
    }
  ]
}
```

**Rules:**
- `highlight: "positive"` → green value, `"negative"` → red, omitted → neutral slate
- `sub` is optional — items without sub render as a single label+value row
- `subtitle` is optional — shown below title in the dark header
- `intro` is optional — shown as a small sentence above sections
- Sections are dynamic: the AI decides how many and what to include based on the query
- If GPT-4o returns plain text (JSON parse fails) → treated as normal text message, no crash

## TypeScript Types

**New file: `src/types/chat.ts`**

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

## Backend Changes

### `backend/src/routes/chat.ts`

**1. System prompt addition** (appended after the existing LANGUAGE RULE):

```
REPORT FORMAT (mandatory when response contains metrics, KPIs, lists with numbers, or structured data):
Return ONLY a valid JSON object matching this exact shape — no markdown code fences, no extra text:
{ "type":"report", "title":"...", "subtitle":"...", "intro":"...", "sections":[{ "label":"...", "icon":"...", "color":"...", "items":[{ "label":"...", "value":"...", "sub":[{ "label":"...", "value":"...", "highlight":"positive|negative" }] }] }] }
For conversational replies with no structured data, reply with plain text as usual.
```

**2. Post-processing after `assistantReply` is set:**

```ts
let response_type: 'text' | 'report' = 'text';
let report_data: ReportData | null = null;
// Strip markdown code fences if GPT-4o wraps the JSON
const stripped = assistantReply.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
try {
  const parsed = JSON.parse(stripped) as { type?: string };
  if (parsed?.type === 'report') {
    response_type = 'report';
    report_data = parsed as ReportData;
  }
} catch { /* plain text, continue as normal */ }
```

**3. Updated response payload:**

```ts
res.json({
  message: assistantReply,
  response_type,
  report_data,
  conversation_id: convId,
  usage: { tokens_in: totalTokensIn, tokens_out: totalTokensOut, cost_usd: cost.toFixed(6) },
});
```

**Storage:** The raw JSON string is saved as-is in `aios.interactions.content` — no schema changes needed.

### `backend/src/routes/telegram.ts`

Same system prompt addition. When a JSON report is detected, send `parsed.intro ?? parsed.title` as the Telegram text message (Telegram cannot render rich UI).

## Frontend Changes

### `src/hooks/useChat.ts`

Extend `ChatMessage` interface:

```ts
import type { ReportData } from '../types/chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response_type?: 'text' | 'report';
  report_data?: ReportData;
}
```

In `sendMessage`, read new fields from the API response:

```ts
const data = await res.json() as {
  message?: string;
  response_type?: 'text' | 'report';
  report_data?: ReportData;
  conversation_id?: string;
  error?: string;
};
// ...
setMessages(prev => [...prev, {
  id: crypto.randomUUID(),
  role: 'assistant',
  content: data.message!,
  response_type: data.response_type,
  report_data: data.report_data,
}]);
```

### `src/components/chat/ReportMessage.tsx` (new)

Self-contained component. Renders the dark-header report card with dynamic sections.

**Visual structure:**
```
┌─────────────────────────────────────┐
│ [dark gradient]  Business Report    │  ← ReportHeader
│                  Monthly Overview   │
│                  June 2026    [AIOS]│
├─────────────────────────────────────┤
│ Here's the business report for...  │  ← intro (optional)
├─────────────────────────────────────┤
│ 📊 SALES PIPELINE                  │  ← SectionBlock (dynamic)
│   Total Leads              50       │
│   ┌─ New ············· 19 ─────┐   │
│   │  Qualified ······· 11      │   │
│   │  Won ············· 7  🟢   │   │
│   └─ Lost ············ 5  🔴   ┘   │
├─────────────────────────────────────┤
│ 👥 CLIENTS                         │
│   Total Clients            20       │
│   ┌─ Active ·········· 15 🟢 ─┐   │
│   └────────────────────────────┘   │
├─────────────────────────────────────┤
│ ⚡ PERFORMANCE  (etc.)             │
└─────────────────────────────────────┘
```

**Highlight colors:**
- `positive` → `#10b981` (green)
- `negative` → `#ef4444` (red)
- none → `#475569` (slate)

The component uses only inline styles (no Tailwind) to avoid conflicts with the existing chat bubble CSS.

### `src/components/chat/ChatBubble.tsx`

In the assistant message render, replace `{msg.content}` with:

```tsx
{msg.response_type === 'report' && msg.report_data
  ? <ReportMessage report={msg.report_data} />
  : <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
}
```

The assistant bubble `div` for report messages uses `max-width: 95%` instead of `max-width: 80%` to give the report card more horizontal space.

Also fix the empty state text: `"Ask about leads, contacts, ..."` → `"Ask about leads, clients, ..."`

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/types/chat.ts` | Create — shared TypeScript types |
| `src/hooks/useChat.ts` | Modify — extend ChatMessage, read new API fields |
| `src/components/chat/ReportMessage.tsx` | Create — report card component |
| `src/components/chat/ChatBubble.tsx` | Modify — use ReportMessage, fix "contacts" text |
| `backend/src/routes/chat.ts` | Modify — system prompt + JSON post-processing |
| `backend/src/routes/telegram.ts` | Modify — system prompt + plain text fallback |

## Error Handling

- **JSON parse fails** → `response_type` stays `'text'`, message renders as plain text bubble. No user-visible error.
- **GPT-4o wraps JSON in markdown fences** → Backend strips ` ```json ... ``` ` before parsing (simple regex strip).
- **Missing fields in JSON** → TypeScript optional fields handle gracefully; sections with no items are skipped in render.

## Out of Scope

- Editing or exporting report messages as PDF (future feature)
- Saving report snapshots to the database in structured form
- Rendering reports in Telegram with rich formatting
