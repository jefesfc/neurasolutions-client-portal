# Emails Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full Emails module to AIOS — Gmail emails ingested via n8n, stored in PostgreSQL, displayed in a split-view UI, and accessible to the GPT-4o agent.

**Architecture:** n8n watches Gmail and POSTs new emails to `/emails/ingest` using a service JWT. Emails are stored in `aios.emails` with RLS, served to the frontend via PostgREST (same pattern as Leads/Contacts), and displayed in a split-view page at `/emails`. Access is controlled per-user via `section_permissions`. A new `get_recent_emails` tool lets the AI agent query emails.

**Tech Stack:** PostgreSQL (RLS), Express/TypeScript backend, React 19 + Zustand frontend, PostgREST, n8n, jsonwebtoken, lucide-react, tailwindcss.

**Spec:** `docs/superpowers/specs/2026-05-28-emails-module-design.md`

---

## File Map

**New files:**
- `backend/src/routes/emails.ts` — POST /emails/ingest, GET /emails/status
- `src/pages/EmailsPage.tsx` — main split-view page
- `src/components/emails/EmailList.tsx` — left panel list
- `src/components/emails/EmailPreview.tsx` — right panel preview

**Modified files:**
- `backend/src/middleware/requireAuth.ts` — add `is_service?: boolean` to JWTPayload
- `backend/src/index.ts` — register emailsRouter
- `backend/src/lib/agentTools.ts` — add `get_recent_emails` tool + executor case
- `src/types/aios.ts` — add `Email` interface
- `src/config/routes.ts` — add `Emails: '/emails'`
- `src/config/navigation.ts` — add `NavItem.permission?` field + Emails nav item
- `src/components/layout/Sidebar.tsx` — filter nav items by `section_permissions`
- `src/router/index.tsx` — add `/emails` route
- `src/pages/admin/AdminPage.tsx` — add Gmail section per tenant card
- `src/pages/SettingsPage.tsx` — add Email tab

---

## Task 1: Database — create `aios.emails` table

**Files:**
- Run SQL directly against the production PostgreSQL (via MCP postgres tool or NocoDB)

- [ ] **Step 1: Run the migration SQL**

```sql
CREATE TABLE aios.emails (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES aios.tenants(id),
  gmail_id     TEXT NOT NULL,
  from_email   TEXT NOT NULL,
  from_name    TEXT,
  subject      TEXT,
  snippet      TEXT,
  body_text    TEXT,
  labels       TEXT[] DEFAULT '{}',
  is_read      BOOLEAN DEFAULT false,
  received_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, gmail_id)
);

ALTER TABLE aios.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE aios.emails FORCE ROW LEVEL SECURITY;

CREATE POLICY emails_tenant_isolation ON aios.emails
  USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

GRANT SELECT, INSERT, UPDATE ON aios.emails TO aios_user;
```

- [ ] **Step 2: Verify table exists**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'aios' AND table_name = 'emails'
ORDER BY ordinal_position;
```

Expected: rows for id, tenant_id, gmail_id, from_email, from_name, subject, snippet, body_text, labels, is_read, received_at, created_at

- [ ] **Step 3: Insert a test row and verify RLS blocks it without a JWT claim**

```sql
-- Insert directly as neura_user (superuser, bypasses RLS) to seed a test email
INSERT INTO aios.emails (tenant_id, gmail_id, from_email, from_name, subject, snippet, body_text, received_at)
VALUES (
  '6e621289-e6f3-4a9d-9f3f-c2c4902a9017',
  'test-gmail-id-001',
  'client@example.com',
  'John Client',
  'Project Update Q3',
  'Hi, just wanted to share the latest update...',
  'Hi, just wanted to share the latest update on the project. Everything is going well and we are on track for the deadline.',
  NOW() - interval '2 hours'
);

-- Verify it's there
SELECT id, from_name, subject, is_read FROM aios.emails LIMIT 5;
```

Expected: 1 row returned.

---

## Task 2: Backend — update auth middleware + generate service token

**Files:**
- Modify: `backend/src/middleware/requireAuth.ts`
- Create temp script: `backend/generate-service-token.js` (delete after use)

- [ ] **Step 1: Add `is_service` to JWTPayload in requireAuth.ts**

In `backend/src/middleware/requireAuth.ts`, change the interface from:

```typescript
interface JWTPayload {
  user_id: string;
  tenant_id: string;
  app_role: string;
  is_platform_admin: boolean;
  email: string;
}
```

To:

```typescript
interface JWTPayload {
  user_id: string;
  tenant_id: string;
  app_role: string;
  is_platform_admin: boolean;
  email: string;
  is_service?: boolean;
}
```

- [ ] **Step 2: Create token generation script**

Create `backend/generate-service-token.js`:

```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { is_service: true },
  'neura-postgrest-jwt-secret-2026-min32ch',
  { expiresIn: '3650d' }
);
console.log('SERVICE JWT:');
console.log(token);
```

- [ ] **Step 3: Run script to generate the token**

```bash
cd AIOS/backend && node generate-service-token.js
```

Expected output: a long JWT string starting with `eyJ...`

Copy this token — you will paste it into n8n as an HTTP header credential.

- [ ] **Step 4: Delete the generation script**

```bash
del AIOS\backend\generate-service-token.js
```

- [ ] **Step 5: Commit**

```bash
git add AIOS/backend/src/middleware/requireAuth.ts
git commit -m "feat(emails): add is_service to JWT payload type"
```

---

## Task 3: Backend — emails route

**Files:**
- Create: `backend/src/routes/emails.ts`

- [ ] **Step 1: Create `backend/src/routes/emails.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';

const router = Router();

// POST /emails/ingest — n8n calls this with a service JWT
router.post('/ingest', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_service) {
    res.status(403).json({ error: 'Service token required' });
    return;
  }
  const {
    tenant_id,
    gmail_id,
    from_email,
    from_name,
    subject,
    snippet,
    body_text,
    labels,
    received_at,
  } = req.body as {
    tenant_id: string;
    gmail_id: string;
    from_email: string;
    from_name?: string;
    subject?: string;
    snippet?: string;
    body_text?: string;
    labels?: string[];
    received_at: string;
  };

  if (!tenant_id || !gmail_id || !from_email || !received_at) {
    res.status(400).json({ error: 'tenant_id, gmail_id, from_email, received_at required' });
    return;
  }

  try {
    await db.query(
      `INSERT INTO aios.emails
         (tenant_id, gmail_id, from_email, from_name, subject, snippet, body_text, labels, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tenant_id, gmail_id) DO NOTHING`,
      [
        tenant_id,
        gmail_id,
        from_email,
        from_name ?? null,
        subject ?? null,
        snippet ?? null,
        body_text ?? null,
        labels ?? [],
        received_at,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[emails/ingest]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /emails/status — tenant user checks if emails are enabled for their tenant
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [req.user!.tenant_id]
    );
    const settings = rows[0]?.settings as
      | { email?: { enabled?: boolean; label_filter?: string } }
      | undefined;
    res.json({
      enabled: settings?.email?.enabled ?? false,
      label_filter: settings?.email?.label_filter ?? null,
    });
  } catch (err) {
    console.error('[emails/status]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

- [ ] **Step 2: Register the router in `backend/src/index.ts`**

Add after the telegram import line:

```typescript
import emailsRouter from './routes/emails';
```

Add after `app.use('/telegram', telegramRouter);`:

```typescript
app.use('/emails', emailsRouter);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd AIOS/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add AIOS/backend/src/routes/emails.ts AIOS/backend/src/index.ts
git commit -m "feat(emails): add /emails/ingest and /emails/status endpoints"
```

---

## Task 4: Backend — add `get_recent_emails` AI tool

**Files:**
- Modify: `backend/src/lib/agentTools.ts`

- [ ] **Step 1: Add tool definition to `toolDefinitions` array in `backend/src/lib/agentTools.ts`**

After the last `}` in the `toolDefinitions` array (after `get_recent_activity`), add:

```typescript
  {
    type: 'function',
    function: {
      name: 'get_recent_emails',
      description: 'Get recent emails received in the company inbox, ordered by date descending.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max emails to return (default 5, max 20).' },
          search: { type: 'string', description: 'Search by sender email or subject.' },
        },
        required: [],
      },
    },
  },
```

- [ ] **Step 2: Add executor case in the `executeTool` switch in `backend/src/lib/agentTools.ts`**

Before the closing `default:` case (or at the end of the switch, before the closing `}`), add:

```typescript
    case 'get_recent_emails': {
      const limit = Math.min(+(args.limit ?? 5), 20);
      const search = args.search as string | undefined;

      let q = `SELECT from_name, from_email, subject, snippet, received_at, is_read
               FROM aios.emails WHERE tenant_id = $1`;
      const params: unknown[] = [tenantId];

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        q += ` AND (LOWER(from_email) LIKE $${params.length} OR LOWER(COALESCE(subject,'')) LIKE $${params.length})`;
      }

      params.push(limit);
      q += ` ORDER BY received_at DESC LIMIT $${params.length}`;

      const emailRes = await db.query(q, params);
      return { count: emailRes.rowCount, emails: emailRes.rows };
    }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd AIOS/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add AIOS/backend/src/lib/agentTools.ts
git commit -m "feat(emails): add get_recent_emails AI agent tool"
```

---

## Task 5: Frontend — types + routes config

**Files:**
- Modify: `src/types/aios.ts`
- Modify: `src/config/routes.ts`

- [ ] **Step 1: Add `Email` interface to `src/types/aios.ts`**

Append to the end of the file:

```typescript
export interface Email {
  id: string;
  tenant_id: string;
  gmail_id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  labels: string[];
  is_read: boolean;
  received_at: string;
  created_at: string;
}
```

- [ ] **Step 2: Add `Emails` route to `src/config/routes.ts`**

Change:

```typescript
export const ROUTES = {
  Login: "/login",
  Admin: "/admin",
  Dashboard: "/",
  Leads: "/leads",
  Contacts: "/contacts",
  AIChat: "/chat",
  AISystems: "/systems",
  AISystemDetail: "/systems/:id",
  Analytics: "/analytics",
  Reports: "/reports",
  Support: "/support",
  Billing: "/billing",
  Profile: "/profile",
  Usage: "/usage",
  Team: "/team",
  Settings: "/settings",
} as const;
```

To:

```typescript
export const ROUTES = {
  Login: "/login",
  Admin: "/admin",
  Dashboard: "/",
  Leads: "/leads",
  Contacts: "/contacts",
  Emails: "/emails",
  AIChat: "/chat",
  AISystems: "/systems",
  AISystemDetail: "/systems/:id",
  Analytics: "/analytics",
  Reports: "/reports",
  Support: "/support",
  Billing: "/billing",
  Profile: "/profile",
  Usage: "/usage",
  Team: "/team",
  Settings: "/settings",
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add AIOS/src/types/aios.ts AIOS/src/config/routes.ts
git commit -m "feat(emails): add Email type and /emails route constant"
```

---

## Task 6: Navigation + Sidebar permission gating

**Files:**
- Modify: `src/config/navigation.ts`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add `permission?` field to `NavItem` interface and Emails item in `src/config/navigation.ts`**

Replace the entire file with:

```typescript
import {
  LayoutDashboard,
  Users,
  BookUser,
  Mail,
  Bot,
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
  { label: "Emails",     path: ROUTES.Emails,    icon: Mail,   permission: "emails" },
  { label: "AI Chat",    path: ROUTES.AIChat,    icon: Bot             },
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

- [ ] **Step 2: Add permission filtering to `src/components/layout/Sidebar.tsx`**

Add `useAuthStore` import after the existing imports (near the top where other imports are):

```typescript
import { useAuthStore } from '../../store/auth-store';
```

Add this line inside the `Sidebar` function body, right after the existing `const isMobile = useIsMobile();` line:

```typescript
const user = useAuthStore((s) => s.user);
const visibleMainNavItems = mainNavItems.filter(
  (item) =>
    !item.permission ||
    user?.role === 'admin' ||
    (user?.section_permissions ?? []).includes(item.permission)
);
```

Replace the `mainNavItems.map` call in the render with `visibleMainNavItems.map`:

Change:
```typescript
          {mainNavItems.map((item) => {
```

To:
```typescript
          {visibleMainNavItems.map((item) => {
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd AIOS && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Verify locally — admin user sees Emails in sidebar**

```bash
cd AIOS && npm run dev
```

Log in as `ldmrukuae@gmail.com` (admin). Confirm "Emails" appears in the sidebar between "CRM" and "AI Chat".

- [ ] **Step 5: Commit**

```bash
git add AIOS/src/config/navigation.ts AIOS/src/components/layout/Sidebar.tsx
git commit -m "feat(emails): add Emails nav item with section_permissions gating"
```

---

## Task 7: EmailList component

**Files:**
- Create: `src/components/emails/EmailList.tsx`

- [ ] **Step 1: Create `src/components/emails/EmailList.tsx`**

```typescript
import { Mail } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/formatters';
import type { Email } from '../../types/aios';

interface EmailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (email: Email) => void;
  search: string;
}

export function EmailList({ emails, selectedId, onSelect, search }: EmailListProps) {
  const filtered = emails.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.from_email.toLowerCase().includes(q) ||
      (e.from_name ?? '').toLowerCase().includes(q) ||
      (e.subject ?? '').toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-400 p-8 text-center">
        <Mail className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">
          {search ? 'No emails match your search' : 'No emails yet'}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-surface-100">
      {filtered.map((email) => (
        <li
          key={email.id}
          onClick={() => onSelect(email)}
          className={cn(
            'px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors',
            selectedId === email.id && 'bg-brand-50 border-l-2 border-brand-500'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {!email.is_read && (
                <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm truncate',
                    !email.is_read
                      ? 'font-semibold text-surface-900'
                      : 'font-medium text-surface-700'
                  )}
                >
                  {email.from_name ?? email.from_email}
                </p>
                <p
                  className={cn(
                    'text-sm truncate',
                    !email.is_read ? 'text-surface-800' : 'text-surface-600'
                  )}
                >
                  {email.subject ?? '(no subject)'}
                </p>
                {email.snippet && (
                  <p className="text-xs text-surface-400 truncate mt-0.5">{email.snippet}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-surface-400 flex-shrink-0 mt-0.5">
              {formatRelative(email.received_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add AIOS/src/components/emails/EmailList.tsx
git commit -m "feat(emails): add EmailList component"
```

---

## Task 8: EmailPreview component

**Files:**
- Create: `src/components/emails/EmailPreview.tsx`

- [ ] **Step 1: Create `src/components/emails/EmailPreview.tsx`**

```typescript
import { Mail } from 'lucide-react';
import type { Email } from '../../types/aios';

interface EmailPreviewProps {
  email: Email | null;
}

export function EmailPreview({ email }: EmailPreviewProps) {
  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-400 p-8 text-center">
        <Mail className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">Select an email to read</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-surface-200 flex-shrink-0">
        <h2 className="text-base font-semibold text-surface-900 mb-2">
          {email.subject ?? '(no subject)'}
        </h2>
        <div className="space-y-1 text-sm text-surface-600">
          <p>
            <span className="font-medium text-surface-700">From:</span>{' '}
            {email.from_name
              ? `${email.from_name} <${email.from_email}>`
              : email.from_email}
          </p>
          <p>
            <span className="font-medium text-surface-700">Date:</span>{' '}
            {new Date(email.received_at).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {email.body_text ? (
          <pre className="text-sm text-surface-700 whitespace-pre-wrap font-sans leading-relaxed">
            {email.body_text}
          </pre>
        ) : (
          <p className="text-sm text-surface-400 italic">No content available</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add AIOS/src/components/emails/EmailPreview.tsx
git commit -m "feat(emails): add EmailPreview component"
```

---

## Task 9: EmailsPage

**Files:**
- Create: `src/pages/EmailsPage.tsx`

- [ ] **Step 1: Create `src/pages/EmailsPage.tsx`**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { useAuthStore } from '../store/auth-store';
import { postgrest } from '../lib/postgrest';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { SearchInput } from '../components/shared/SearchInput';
import { Skeleton } from '../components/ui/Skeleton';
import { EmailList } from '../components/emails/EmailList';
import { EmailPreview } from '../components/emails/EmailPreview';
import type { Email } from '../types/aios';

export default function EmailsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [search, setSearch] = useState('');

  if (
    user &&
    user.role !== 'admin' &&
    !(user.section_permissions ?? []).includes('emails')
  ) {
    void navigate('/');
    return null;
  }

  const { data: emails, loading, error } = useQuery<Email>('emails', {
    order: 'received_at.desc',
    limit: 100,
  });

  async function handleSelect(email: Email) {
    setSelectedEmail(email);
    if (!email.is_read) {
      await postgrest.patch<Email>('emails', { id: `eq.${email.id}` }, { is_read: true });
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Emails"
        description="Company inbox"
        actions={
          <div className="w-64">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emails..."
            />
          </div>
        }
      />

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm flex h-[calc(100vh-13rem)]">
        {loading ? (
          <div className="p-4 space-y-3 w-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-danger w-full">{error}</div>
        ) : (
          <>
            <div className="w-2/5 border-r border-surface-200 overflow-y-auto flex-shrink-0">
              <EmailList
                emails={emails}
                selectedId={selectedEmail?.id ?? null}
                onSelect={(email) => void handleSelect(email)}
                search={search}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <EmailPreview email={selectedEmail} />
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add AIOS/src/pages/EmailsPage.tsx
git commit -m "feat(emails): add EmailsPage with split-view layout"
```

---

## Task 10: Router — register `/emails` route

**Files:**
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Add import and route to `src/router/index.tsx`**

Add import after the existing page imports (e.g., after `import SettingsPage`):

```typescript
import EmailsPage from "../pages/EmailsPage";
```

Add route after the Contacts route:

```typescript
  {
    path: ROUTES.Emails,
    element: <Protected><EmailsPage /></Protected>,
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd AIOS && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Test the route manually**

```bash
cd AIOS && npm run dev
```

Navigate to `http://localhost:5173/emails`. Logged in as admin you should see the split-view layout. The seeded test email from Task 1 should appear in the list.

- [ ] **Step 4: Commit**

```bash
git add AIOS/src/router/index.tsx
git commit -m "feat(emails): register /emails route in router"
```

---

## Task 11: AdminPage — Gmail section per tenant

**Files:**
- Modify: `src/pages/admin/AdminPage.tsx`

- [ ] **Step 1: Add Gmail state variables to `AdminPage`**

In `src/pages/admin/AdminPage.tsx`, add these state variables right after the existing Telegram state declarations (`const [tgError, ...]`):

```typescript
  const [gmailExpandedId, setGmailExpandedId] = useState<string | null>(null);
  const [gmailStatus, setGmailStatus] = useState<Record<string, boolean>>({});
  const [gmailLoading, setGmailLoading] = useState<Record<string, boolean>>({});
```

- [ ] **Step 2: Add Gmail helper functions to `AdminPage`**

Add these functions after the `deactivateTelegram` function:

```typescript
  async function fetchGmailStatus(tenantId: string) {
    try {
      const r = await fetch(`${API_URL}/emails/activate/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await r.json()) as { enabled: boolean };
      setGmailStatus((prev) => ({ ...prev, [tenantId]: data.enabled }));
    } catch {
      setGmailStatus((prev) => ({ ...prev, [tenantId]: false }));
    }
  }

  function toggleGmail(tenantId: string) {
    if (gmailExpandedId === tenantId) {
      setGmailExpandedId(null);
    } else {
      setGmailExpandedId(tenantId);
      void fetchGmailStatus(tenantId);
    }
  }

  async function activateGmail(tenantId: string) {
    setGmailLoading((prev) => ({ ...prev, [tenantId]: true }));
    try {
      await fetch(`${API_URL}/emails/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenant_id: tenantId, enabled: true }),
      });
      setGmailStatus((prev) => ({ ...prev, [tenantId]: true }));
    } finally {
      setGmailLoading((prev) => ({ ...prev, [tenantId]: false }));
    }
  }
```

- [ ] **Step 3: Add `Mail` icon import**

In the lucide-react import line at the top of AdminPage.tsx, add `Mail`:

```typescript
import { Building2, Users, Zap, MessageCircle, Mail } from 'lucide-react';
```

- [ ] **Step 4: Add Gmail section JSX inside each tenant Card**

In the tenant card JSX, right after the closing `</div>` of the Telegram section (the `{/* Telegram section */}` block), add:

```tsx
              {/* Gmail / Emails section */}
              <div className="mt-2 pt-2 border-t border-surface-100">
                <button
                  onClick={() => toggleGmail(tenant.id)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  Gmail {gmailStatus[tenant.id] ? '✅' : '⚪'}
                </button>

                {gmailExpandedId === tenant.id && (
                  <div className="mt-3 space-y-2">
                    {gmailStatus[tenant.id] ? (
                      <span className="text-xs text-positive font-medium">✅ Gmail active</span>
                    ) : (
                      <div className="space-y-2 text-xs text-surface-600">
                        <p className="font-medium">Setup steps:</p>
                        <ol className="space-y-1 list-decimal list-inside text-surface-500">
                          <li>Create n8n workflow "AIOS Email Watcher" for this tenant</li>
                          <li>Configure Gmail Trigger with the tenant's Gmail account</li>
                          <li>Set HTTP Request node → POST /emails/ingest with service JWT</li>
                          <li>Set tenant_id = <code className="bg-surface-100 px-1 rounded font-mono">{tenant.id}</code></li>
                          <li>Activate the workflow</li>
                        </ol>
                        <button
                          onClick={() => void activateGmail(tenant.id)}
                          disabled={gmailLoading[tenant.id]}
                          className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded hover:bg-brand-600 disabled:opacity-50"
                        >
                          {gmailLoading[tenant.id] ? '...' : 'Mark as Active'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
```

- [ ] **Step 5: Add platform-admin endpoints to `backend/src/routes/emails.ts`**

Append to `backend/src/routes/emails.ts` before `export default router`:

```typescript
// GET /emails/activate/:tenantId — platform admin checks Gmail status for a tenant
router.get('/activate/:tenantId', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_platform_admin) {
    res.status(403).json({ error: 'Platform admin required' });
    return;
  }
  try {
    const { rows } = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [req.params.tenantId]
    );
    const settings = rows[0]?.settings as { email?: { enabled?: boolean } } | undefined;
    res.json({ enabled: settings?.email?.enabled ?? false });
  } catch (err) {
    console.error('[emails/activate GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /emails/activate — platform admin marks Gmail as enabled for a tenant
// Uses nested jsonb_set so it only updates settings.email.enabled without touching label_filter or telegram
router.post('/activate', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_platform_admin) {
    res.status(403).json({ error: 'Platform admin required' });
    return;
  }
  const { tenant_id, enabled } = req.body as { tenant_id: string; enabled: boolean };
  if (!tenant_id) {
    res.status(400).json({ error: 'tenant_id required' });
    return;
  }
  try {
    await db.query(
      `UPDATE aios.tenants
       SET settings = jsonb_set(COALESCE(settings, '{}'), '{email,enabled}', $1::jsonb)
       WHERE id = $2`,
      [enabled ? 'true' : 'false', tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[emails/activate POST]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /emails/settings — tenant admin updates label_filter
// Uses nested jsonb_set so it only updates settings.email.label_filter, preserving all other settings
router.patch('/settings', requireAuth, async (req: Request, res: Response) => {
  const { label_filter } = req.body as { label_filter: string | null };
  try {
    await db.query(
      `UPDATE aios.tenants
       SET settings = jsonb_set(COALESCE(settings, '{}'), '{email,label_filter}', $1::jsonb)
       WHERE id = $2`,
      [label_filter ? JSON.stringify(label_filter) : 'null', req.user!.tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[emails/settings PATCH]', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd AIOS && npx tsc --noEmit && cd backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add AIOS/src/pages/admin/AdminPage.tsx AIOS/backend/src/routes/emails.ts
git commit -m "feat(emails): add Gmail section to AdminPage and /emails/activate endpoint"
```

---

## Task 12: SettingsPage — Email tab

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add `EmailTab` function to `src/pages/SettingsPage.tsx`**

Add this function between `TelegramTab` and the default export `SettingsPage`.

Note: EmailTab calls the backend `PATCH /emails/settings` instead of PostgREST directly. Direct PostgREST patch would overwrite the entire `settings` JSON column, destroying Telegram settings and other config. The backend uses `jsonb_set` to safely update only `settings.email.label_filter`.

```typescript
function EmailTab() {
  const { token } = useAuthStore();
  const [labelFilter, setLabelFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_URL}/emails/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label_filter: labelFilter.trim() || null }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-surface-600">
        Configure which Gmail labels are synced to AIOS. Leave blank to receive all incoming emails.
      </p>
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">
            Gmail Label Filter
          </label>
          <Input
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            placeholder="INBOX (leave blank for all emails)"
          />
          <p className="text-xs text-surface-400 mt-1">
            Examples: <code className="bg-surface-100 px-1 rounded">INBOX</code>,{' '}
            <code className="bg-surface-100 px-1 rounded">Label_Clients</code>
          </p>
        </div>
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        {saved && <p className="text-sm text-positive">Saved successfully.</p>}
        <div className="pt-1">
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </div>
      </form>
      <div className="border-t border-surface-200 pt-4">
        <p className="text-xs text-surface-500">
          To connect Gmail, contact NeuraSolutions — we configure the n8n workflow for your account.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the Email tab to the `tabs` array and render it in `SettingsPage`**

In `SettingsPage`, change:

```typescript
  const tabs = [
    { id: "company", label: "Company" },
    { id: "security", label: "Security" },
    ...(user?.role === "admin" ? [{ id: "telegram", label: "Telegram" }] : []),
  ];
```

To:

```typescript
  const tabs = [
    { id: "company", label: "Company" },
    { id: "security", label: "Security" },
    ...(user?.role === "admin"
      ? [
          { id: "telegram", label: "Telegram" },
          { id: "email", label: "Email" },
        ]
      : []),
  ];
```

And add the render line after `{activeTab === "telegram" && <TelegramTab />}`:

```typescript
      {activeTab === "email" && <EmailTab />}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd AIOS && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Test the Settings Email tab manually**

```bash
cd AIOS && npm run dev
```

Log in as `ldmrukuae@gmail.com` (admin). Navigate to Settings. Verify "Email" tab appears. Click it, verify the label filter form renders.

- [ ] **Step 5: Commit**

```bash
git add AIOS/src/pages/SettingsPage.tsx
git commit -m "feat(emails): add Email tab to SettingsPage for label filter config"
```

---

## Task 13: n8n — "AIOS Email Watcher" workflow + 90-day purge cron

**Files:**
- n8n UI (no code files — configuration steps)

### 13a: Email Watcher workflow

- [ ] **Step 1: Open n8n and create a new workflow named "AIOS Email Watcher - Demo"**

- [ ] **Step 2: Add Gmail Trigger node**
  - Node: Gmail Trigger
  - Authentication: OAuth2 (connect with the demo tenant's Gmail account)
  - Event: Message Received
  - Options: Poll Time = Every minute (n8n uses polling for Gmail trigger even though it's called "trigger")

- [ ] **Step 3: Add HTTP Request node**
  - Method: POST
  - URL: `https://xneurasolutions-aios-backend.9lagn8.easypanel.host/emails/ingest`
  - Authentication: Header Auth
    - Name: `Authorization`
    - Value: `Bearer <SERVICE_JWT_FROM_TASK_2>`
  - Body: JSON
    ```json
    {
      "tenant_id": "6e621289-e6f3-4a9d-9f3f-c2c4902a9017",
      "gmail_id": "={{ $json.id }}",
      "from_email": "={{ $json.from }}",
      "from_name": "={{ $json.fromName }}",
      "subject": "={{ $json.subject }}",
      "snippet": "={{ $json.snippet }}",
      "body_text": "={{ $json.text }}",
      "labels": "={{ $json.labelIds }}",
      "received_at": "={{ $json.date }}"
    }
    ```

- [ ] **Step 4: Activate the workflow**

- [ ] **Step 5: Test by sending an email to the demo Gmail account**

Verify a new row appears in `aios.emails` within ~1 minute:

```sql
SELECT from_name, subject, received_at FROM aios.emails
WHERE tenant_id = '6e621289-e6f3-4a9d-9f3f-c2c4902a9017'
ORDER BY received_at DESC LIMIT 3;
```

### 13b: 90-day purge cron

- [ ] **Step 6: Create a new workflow named "AIOS Email Purge - 90 days"**

- [ ] **Step 7: Add Schedule Trigger node**
  - Rule: Every day at 03:00

- [ ] **Step 8: Add Postgres node**
  - Connection: configure with `postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core`
  - Operation: Execute Query
  - Query:
    ```sql
    DELETE FROM aios.emails WHERE received_at < now() - interval '90 days';
    ```

- [ ] **Step 9: Activate the purge workflow**

---

## Task 14: End-to-end verification

- [ ] **Step 1: Verify email appears in the UI**

Open `https://ios.neurasolutions.cloud/emails`. Log in as `ldmrukuae@gmail.com`. Confirm the split-view loads and test emails appear in the list.

- [ ] **Step 2: Verify unread badge + mark as read**

Click on an email with a blue dot. Verify the dot disappears after selection (is_read updated via PostgREST PATCH).

- [ ] **Step 3: Verify search filters the list**

Type part of a sender name in the search box. Verify only matching emails show.

- [ ] **Step 4: Verify AI agent can query emails**

Open AI Chat. Type: "¿Cuáles son los últimos emails recibidos?" Verify the agent uses `get_recent_emails` tool and returns email subjects/senders from the DB.

- [ ] **Step 5: Verify non-admin user without permission cannot access /emails**

Log in as a non-admin user without `emails` in their `section_permissions`. Verify the Emails item does not appear in the sidebar. Try navigating to `/emails` directly — verify redirect to `/`.

- [ ] **Step 6: Final commit — update version string**

In `src/components/layout/Sidebar.tsx`, update the footer version:

Change:
```typescript
            <p>Client Portal v2.4.1</p>
```
To:
```typescript
            <p>Client Portal v2.5.0</p>
```

```bash
git add AIOS/src/components/layout/Sidebar.tsx
git commit -m "chore: bump version to v2.5.0 (emails module)"
```

- [ ] **Step 7: Deploy to production**

```bash
git push origin main
```

EasyPanel will auto-deploy frontend and backend on push to main.
