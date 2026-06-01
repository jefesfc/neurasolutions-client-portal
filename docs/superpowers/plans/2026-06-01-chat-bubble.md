# Chat Bubble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-page `/chat` route with a floating chat bubble accessible from every authenticated page.

**Architecture:** A new `ChatBubble` component is mounted once in `AppLayout` — it persists across all routes, owning its own `useChat` instance. The `/chat` page, its route, and its sidebar entry are all removed. The bubble button sits fixed at bottom-right and opens a compact 380×520px panel with framer-motion animation.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, framer-motion, lucide-react, existing `useChat` hook.

---

## File Map

| File | Action |
|------|--------|
| `src/components/chat/ChatBubble.tsx` | **Create** — floating button + panel component |
| `src/components/layout/AppLayout.tsx` | **Modify** — mount `<ChatBubble />` |
| `src/config/navigation.ts` | **Modify** — remove AI Chat nav item |
| `src/router/index.tsx` | **Modify** — remove `/chat` route + import |
| `src/pages/ChatPage.tsx` | **Delete** |
| `src/hooks/useChat.ts` | **Modify** — fix 2 Spanish error strings |

---

## Task 1: Fix Spanish error strings in `useChat.ts`

**Files:**
- Modify: `src/hooks/useChat.ts`

- [ ] **Step 1: Open the file and locate the two Spanish strings**

In `src/hooks/useChat.ts`, lines 35 and 40 contain Spanish error messages.

- [ ] **Step 2: Replace both strings**

Change line 35:
```ts
// Before
const data = await res.json() as { message?: string; conversation_id?: string; error?: string };
if (!res.ok) { setError(data.error ?? 'Error al contactar el servidor'); return; }
```
```ts
// After
const data = await res.json() as { message?: string; conversation_id?: string; error?: string };
if (!res.ok) { setError(data.error ?? 'Error contacting the server'); return; }
```

Change line 40:
```ts
// Before
    } catch {
      setError('No se pudo conectar con el servidor');
```
```ts
// After
    } catch {
      setError('Could not connect to the server');
```

- [ ] **Step 3: TypeScript check**

```bash
cd AIOS && npx tsc -b --noEmit
```
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "fix: translate error strings in useChat to English"
```

---

## Task 2: Create `ChatBubble` component

**Files:**
- Create: `src/components/chat/ChatBubble.tsx`

- [ ] **Step 1: Create the file with full implementation**

Create `src/components/chat/ChatBubble.tsx`:

```tsx
import { useState, useRef, useEffect } from "react";
import { Send, Bot, Plus, User, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "../../hooks/useChat";
import { cn } from "../../lib/cn";

const SUGGESTIONS = [
  "How many leads do we have this month?",
  "Show me upcoming calendar events",
  "What's our conversion rate?",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
        <Bot className="h-3.5 w-3.5 text-brand-600" />
      </div>
      <div className="bg-white border border-surface-200 rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-1 h-3.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-surface-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const { messages, loading, error, sendMessage, clearChat } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-20 right-6 z-50 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-surface-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-500 flex-shrink-0">
              <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-none">AIOS</p>
                <p className="text-[11px] text-white/70 mt-0.5">AI Business Assistant</p>
              </div>
              <button
                onClick={clearChat}
                className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                title="New conversation"
              >
                <Plus className="h-3.5 w-3.5 text-white" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-brand-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-900 mb-1">How can I help you?</h3>
                    <p className="text-xs text-surface-400">
                      Ask about leads, contacts, calendar, or metrics.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        className="text-xs px-3 py-2 rounded-xl bg-surface-50 border border-surface-200 text-surface-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
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
                          : "bg-white border border-surface-200 text-surface-800 rounded-bl-sm"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && <TypingIndicator />}
                  {error && (
                    <div className="flex justify-center">
                      <span className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                        {error}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-surface-100 p-3 flex-shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-xs text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors max-h-24 overflow-y-auto"
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || loading}
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                    input.trim() && !loading
                      ? "bg-brand-500 hover:bg-brand-600 text-white"
                      : "bg-surface-100 text-surface-400 cursor-not-allowed"
                  )}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-1.5 pl-0.5">
                Shift+Enter for new line · real-time data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!open && (
          <span className="absolute inset-0 rounded-full bg-brand-400 animate-ping opacity-30" />
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ height: 52, width: 52 }}
          className={cn(
            "relative rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
            open
              ? "bg-surface-700 hover:bg-surface-600"
              : "bg-brand-500 hover:bg-brand-600"
          )}
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-5 w-5 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Bot className="h-5 w-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd AIOS && npx tsc -b --noEmit
```
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatBubble.tsx
git commit -m "feat: add ChatBubble component — floating AI assistant panel"
```

---

## Task 3: Mount `ChatBubble` in `AppLayout`

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add import and mount the component**

Replace the full content of `src/components/layout/AppLayout.tsx` with:

```tsx
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { ChatBubble } from "../chat/ChatBubble";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="p-4 lg:p-6 lg:px-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
      <ChatBubble />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd AIOS && npx tsc -b --noEmit
```
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: mount ChatBubble in AppLayout"
```

---

## Task 4: Remove `/chat` page, route, and sidebar entry

**Files:**
- Modify: `src/config/navigation.ts`
- Modify: `src/router/index.tsx`
- Delete: `src/pages/ChatPage.tsx`

- [ ] **Step 1: Remove AI Chat from navigation**

In `src/config/navigation.ts`, remove the `AI Chat` entry from `mainNavItems`. Also remove the unused `Bot` import if it's no longer used.

The file should look like this after the change:

```ts
import {
  LayoutDashboard,
  Users,
  BookUser,
  CalendarDays,
  Mail,
  Cpu,
  BarChart3,
  FileText,
  LifeBuoy,
  CreditCard,
  Settings,
  Zap,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard",  path: ROUTES.Dashboard, icon: LayoutDashboard },
  { label: "Leads",      path: ROUTES.Leads,     icon: Users           },
  { label: "CRM",        path: ROUTES.Contacts,  icon: BookUser        },
  { label: "Calendar",   path: ROUTES.Calendar,  icon: CalendarDays, permission: "calendar" },
  { label: "Emails",     path: ROUTES.Emails,    icon: Mail,   permission: "emails"   },
  { label: "Usage",      path: ROUTES.Usage,     icon: Zap             },
  { label: "AI Systems", path: ROUTES.AISystems, icon: Cpu             },
  { label: "Analytics",  path: ROUTES.Analytics, icon: BarChart3       },
  { label: "Reports",    path: ROUTES.Reports,   icon: FileText        },
  { label: "Support",    path: ROUTES.Support,   icon: LifeBuoy        },
  { label: "Team",       path: ROUTES.Team,      icon: Users2          },
];

export const bottomNavItems: NavItem[] = [
  { label: "Billing",  path: ROUTES.Billing,  icon: CreditCard },
  { label: "Settings", path: ROUTES.Settings, icon: Settings   },
];
```

- [ ] **Step 2: Remove `/chat` route from router**

In `src/router/index.tsx`, remove the `ChatPage` import and its route entry. The file after changes:

```tsx
import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "../config/routes";
import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { PlatformAdminRoute } from "../components/auth/PlatformAdminRoute";
import LoginPage from "../pages/LoginPage";
import AdminPage from "../pages/admin/AdminPage";
import DashboardPage from "../pages/DashboardPage";
import LeadsPage from "../pages/LeadsPage";
import ContactsPage from "../pages/ContactsPage";
import CalendarPage from "../pages/CalendarPage";
import EmailsPage from "../pages/EmailsPage";
import AISystemsPage from "../pages/AISystemsPage";
import AISystemDetailPage from "../pages/AISystemDetailPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import ReportsPage from "../pages/ReportsPage";
import SupportPage from "../pages/SupportPage";
import BillingPage from "../pages/BillingPage";
import ProfilePage from "../pages/ProfilePage";
import UsagePage from "../pages/UsagePage";
import TeamPage from "../pages/TeamPage";
import SettingsPage from "../pages/SettingsPage";
import NotFoundPage from "../pages/NotFoundPage";

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: ROUTES.Login,
    element: <LoginPage />,
  },
  {
    path: ROUTES.Admin,
    element: (
      <PlatformAdminRoute>
        <AppLayout><AdminPage /></AppLayout>
      </PlatformAdminRoute>
    ),
  },
  {
    path: ROUTES.Dashboard,
    element: <Protected><DashboardPage /></Protected>,
  },
  {
    path: ROUTES.Leads,
    element: <Protected><LeadsPage /></Protected>,
  },
  {
    path: ROUTES.Contacts,
    element: <Protected><ContactsPage /></Protected>,
  },
  {
    path: ROUTES.Calendar,
    element: <Protected><CalendarPage /></Protected>,
  },
  {
    path: ROUTES.Emails,
    element: <Protected><EmailsPage /></Protected>,
  },
  {
    path: ROUTES.AISystems,
    element: <Protected><AISystemsPage /></Protected>,
  },
  {
    path: ROUTES.AISystemDetail,
    element: <Protected><AISystemDetailPage /></Protected>,
  },
  {
    path: ROUTES.Analytics,
    element: <Protected><AnalyticsPage /></Protected>,
  },
  {
    path: ROUTES.Reports,
    element: <Protected><ReportsPage /></Protected>,
  },
  {
    path: ROUTES.Support,
    element: <Protected><SupportPage /></Protected>,
  },
  {
    path: ROUTES.Billing,
    element: <Protected><BillingPage /></Protected>,
  },
  {
    path: ROUTES.Profile,
    element: <Protected><ProfilePage /></Protected>,
  },
  {
    path: ROUTES.Usage,
    element: <Protected><UsagePage /></Protected>,
  },
  {
    path: ROUTES.Team,
    element: <Protected><TeamPage /></Protected>,
  },
  {
    path: ROUTES.Settings,
    element: <Protected><SettingsPage /></Protected>,
  },
  {
    path: "*",
    element: <Protected><NotFoundPage /></Protected>,
  },
]);
```

- [ ] **Step 3: Delete `ChatPage.tsx`**

```bash
rm AIOS/src/pages/ChatPage.tsx
```

- [ ] **Step 4: TypeScript check**

```bash
cd AIOS && npx tsc -b --noEmit
```
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add src/config/navigation.ts src/router/index.tsx
git rm src/pages/ChatPage.tsx
git commit -m "feat: replace /chat page with floating ChatBubble — remove nav entry and route"
```

---

## Task 5: Frontend build verification + push

- [ ] **Step 1: Run full build**

```bash
cd AIOS && npm run build
```
Expected: build completes with no errors. TypeScript strict mode (`tsc -b`) runs as part of this.

- [ ] **Step 2: Smoke-test in dev server**

```bash
cd AIOS && npm run dev
```

Open `http://localhost:5173` and verify:
1. Chat bubble (Bot icon, brand-500) visible bottom-right on every page
2. Clicking bubble opens panel with AIOS header + empty state suggestions
3. Pulse animation visible on bubble when closed
4. Clicking X or bubble again closes panel
5. Clicking "+" clears the conversation
6. "AI Chat" no longer appears in sidebar
7. Navigating to `/chat` shows the NotFound page (expected)
8. Send a message ("How many leads do we have?") — verify AI responds in English with real data

- [ ] **Step 3: Push to origin**

```bash
git push origin main
```
