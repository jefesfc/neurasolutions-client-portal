# AIOS — Changes Implemented · 2026-06-01

Summary of all changes made in the development session before the module improvements plan.

---

## 1. Calendar Tool for AI Agent

**Problem:** The AI orchestrator (GPT-4o) had no access to the calendar module when queried via Telegram or the AI Chat bubble.

**File changed:** `backend/src/lib/agentTools.ts`

**What was added:**
- New tool definition `query_calendar_events` added to `toolDefinitions` array
- New executor function for that tool added to `executeTool` switch
- The agent now has **6 tools** total: `get_business_stats`, `query_leads`, `query_contacts`, `get_recent_activity`, `get_recent_emails`, `query_calendar_events`

**Tool parameters:**
| Parameter | Type | Description |
|---|---|---|
| `from` | ISO date string | Start of range (default: today) |
| `to` | ISO date string | End of range (default: +30 days) |
| `category` | enum | Optional filter by event category |
| `status` | enum | Optional filter by event status |
| `limit` | number | Max results (capped at 50) |

**SQL query:** `SELECT * FROM aios.calendar_events WHERE tenant_id = $1 AND start_at BETWEEN $2 AND $3 [+ optional filters] ORDER BY start_at ASC LIMIT $n`

---

## 2. English-Only App

**Problem:** Both the Telegram bot and AI Chat page were responding in Spanish (or matching the user's language). All responses must always be in English.

### 2a. Backend system prompts

**Files changed:** `backend/src/routes/chat.ts`, `backend/src/routes/telegram.ts`

**Change:** `SYSTEM_PROMPT` updated in both files from:
```
"Respond in the same language the user writes in"
```
To:
```
"Be concise, professional, and data-driven. Always respond in English."
```

Both prompts now explicitly include calendar events and emails in the list of data the agent can query.

### 2b. Telegram hardcoded messages

**File changed:** `backend/src/routes/telegram.ts`

Four hardcoded Spanish strings translated to English:

| Trigger | Before | After |
|---|---|---|
| `/start` — already linked | (Spanish) | `"✅ You are already connected to AIOS. You can ask me about your leads, contacts, calendar, and metrics."` |
| `/start` — link failed | (Spanish) | `"❌ Could not link the account. The admin is already linked or please contact support."` |
| `/start` — success | (Spanish) | `"✅ Connected. You can ask me about your leads, contacts, calendar events, emails, and business metrics."` |
| Not linked warning | (Spanish) | `"⚠️ Your Telegram account is not linked. Send /start to connect."` |
| Error message | (Spanish) | `"❌ Error processing your message. Please try again."` |

### 2c. Frontend error strings

**File changed:** `src/hooks/useChat.ts`

Two Spanish error strings fixed:

| Before | After |
|---|---|
| `'Error al contactar el servidor'` | `'Error contacting the server'` |
| `'No se pudo conectar con el servidor'` | `'Could not connect to the server'` |

---

## 3. Chat Bubble — Replace `/chat` Page

**Decision made:** Option A — the floating bubble fully replaces the `/chat` page. No duplicate entry points.

### 3a. New component: `src/components/chat/ChatBubble.tsx`

Self-contained floating chat bubble mounted once in `AppLayout`. Features:

- **FAB button:** `fixed bottom-6 right-6 z-50`, 52×52px circle, `bg-brand-500`, `animate-ping` pulse ring when closed, Bot ↔ X icon swap animation via framer-motion
- **Panel:** `fixed bottom-20 right-6 w-[380px] h-[520px]`, framer-motion scale+opacity animation from bottom-right origin
- **Header:** brand gradient, Bot avatar, "AIOS" / "AI Business Assistant", "+" (new chat) and "✕" (close) buttons
- **Messages:** user bubbles right (brand-500), AI bubbles left (white/border), `TypingIndicator` with 3 bouncing dots
- **Empty state:** Bot icon + "How can I help you?" + 3 suggestion chips
- **Input:** `textarea` with auto-grow, Enter to send, Shift+Enter for newline
- **Data access:** reuses `useChat` hook → calls `/chat` backend endpoint → full GPT-4o agentic loop with all 6 tools

**Quality fixes applied (caught by code reviewer):**
- `setTimeout` for focus had no cleanup → added `return () => clearTimeout(id)`
- Scroll effect fired when panel was closed → added `if (!open) return` guard + `open` in deps
- 3 icon-only buttons were missing `aria-label` → added to FAB, "+" button, "✕" button
- Template literal in className → replaced with `cn()` utility

### 3b. `src/components/layout/AppLayout.tsx`

Added:
```tsx
import { ChatBubble } from "../chat/ChatBubble";
// ...
<ChatBubble />   {/* last child, after <MobileNav /> */}
```

The bubble appears on every authenticated page. It does NOT appear on `/login` or `/admin` (those use different layouts).

### 3c. Removed: `/chat` page and all references

| File | Change |
|---|---|
| `src/pages/ChatPage.tsx` | **Deleted** |
| `src/router/index.tsx` | Removed `/chat` route import and entry |
| `src/config/navigation.ts` | Removed "AI Chat" nav item (`Bot` icon, `ROUTES.AIChat`) |
| `src/config/routes.ts` | Removed `AIChat: "/chat"` constant (caught in spec review) |

---

## Commits

| Commit | Description |
|---|---|
| `d0303ab` | Fix Spanish error strings in `useChat.ts` → English |
| (chat bubble) | `ChatBubble.tsx` + `AppLayout.tsx` mount |
| `565e942` | Remove `/chat` route, `ChatPage`, nav entry, `ROUTES.AIChat` |

All changes pushed to `origin/main`.

---

## Pending: EasyPanel Redeploy

Both services need a manual redeploy in EasyPanel for changes to go live at `ios.neurasolutions.cloud`:

- **Backend** — for `query_calendar_events` tool + English SYSTEM_PROMPTs in `chat.ts` and `telegram.ts`
- **Frontend** — for `ChatBubble` component + all Spanish→English fixes
