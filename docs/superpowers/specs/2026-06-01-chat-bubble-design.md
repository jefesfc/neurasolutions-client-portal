# Chat Bubble — Design Spec
**Date:** 2026-06-01  
**Status:** Approved

## Overview

Replace the full-page `/chat` route with a floating chat bubble accessible from every authenticated page. The bubble opens a compact panel (380×520px) anchored to the bottom-right corner. It reuses the existing `useChat` hook and `/chat` backend endpoint with no new API code needed.

## Goals

- AI assistant always one click away, without leaving the current page
- Remove the dedicated `/chat` page and its sidebar entry
- Fix remaining Spanish strings in `useChat.ts`

## Architecture

### New component: `src/components/chat/ChatBubble.tsx`

Self-contained component mounted once in `AppLayout`. Owns:
- Open/closed toggle state
- The full chat UI (header, messages, input, empty state)
- Instantiates `useChat()` locally — conversation lives in component state

**Key behaviors:**
- Conversation persists while navigating between pages (component never unmounts)
- Clears on browser refresh or when user clicks "+" (new chat)
- No persistence to DB beyond what `useChat` already does (backend stores interactions normally)

### Mount point: `AppLayout.tsx`

Add `<ChatBubble />` as last child inside the outer `div`, after `<MobileNav />`. Since AppLayout wraps all protected routes, the bubble appears on every authenticated page automatically. It does NOT appear on `/login` or `/admin` (those use different layouts).

### Removed: `ChatPage.tsx` and its route/nav entry

- Remove "AI Chat" (`Bot` icon, `ROUTES.AIChat`) from `mainNavItems` in `navigation.ts`
- Remove the `/chat` route from `router/index.tsx`
- Delete `src/pages/ChatPage.tsx`

## Component Design: `ChatBubble`

### Bubble button (always visible)
- `fixed bottom-6 right-6 z-50`
- 52px circle, `bg-brand-500` gradient, Bot icon from lucide
- Pulse ring animation (`animate-ping` variant) when panel is closed
- When open: shows X icon, muted dark background — no pulse

### Panel (open state)
- `fixed bottom-20 right-6 w-[380px] h-[520px]`
- Opens with framer-motion: `scale` from 0.95 + `opacity` 0→1, origin bottom-right
- `z-50`, `rounded-2xl`, `shadow-2xl`

**Header:**
- Brand gradient background (matching bubble button)
- Bot avatar icon (small rounded square)
- "AIOS" title + "AI Business Assistant" subtitle
- "+" icon button → calls `clearChat()` (new conversation)
- "✕" icon button → closes panel

**Messages area:**
- `flex-1 overflow-y-auto` with `space-y-4 p-4`
- User bubbles: right-aligned, brand-500 bg, white text
- AI bubbles: left-aligned, white bg, surface-800 text, border
- Typing indicator: 3 bouncing dots (same as current ChatPage)
- Error display: small red banner centered

**Empty state:**
- Bot icon centered
- "How can I help you?" heading
- 3 suggestion chips (quick prompts):
  1. "How many leads do we have this month?"
  2. "Show me upcoming calendar events"
  3. "What's our conversion rate?"

**Input area:**
- `border-t` separator
- `textarea` (1 row, auto-grows up to 3 rows), `resize-none`
- Placeholder: "Ask anything..."
- Enter to send, Shift+Enter for newline
- Send button: brand-500, disabled when empty or loading
- Footer hint: "Shift+Enter for new line · real-time data"

## useChat.ts fixes

Two Spanish error strings need translating:
- `'Error al contactar el servidor'` → `'Error contacting the server'`
- `'No se pudo conectar con el servidor'` → `'Could not connect to the server'`

## Files changed

| File | Change |
|---|---|
| `src/components/chat/ChatBubble.tsx` | **Create** — new component |
| `src/components/layout/AppLayout.tsx` | Add `<ChatBubble />` |
| `src/config/navigation.ts` | Remove AI Chat nav item |
| `src/router/index.tsx` | Remove `/chat` route + import |
| `src/pages/ChatPage.tsx` | **Delete** |
| `src/hooks/useChat.ts` | Fix 2 Spanish error strings |
