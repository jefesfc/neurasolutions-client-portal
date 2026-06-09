# Security AI Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Security AI Agent to AIOS that monitors login anomalies, content violations, and system changes — analyzing events with GPT-4o and alerting admins via Telegram + email.

**Architecture:** Backend-centric. A shared `securityEvents` lib emits events from route handlers into `aios.security_events` (PostgreSQL). n8n handles pattern analysis (15-min cron) and alert dispatch (webhook → Telegram + Gmail). Frontend `/security` module reads events via PostgREST. `@anthropic-ai/sdk` is installed but dormant — clinic fork activates it by changing one constant.

**Tech Stack:** Node.js/Express, PostgreSQL, PostgREST, GPT-4o (OpenAI SDK already installed), `@anthropic-ai/sdk` (new), n8n workflows, React + TypeScript, Tailwind CSS, Lucide icons.

---

## File Map

### New backend files
- `scripts/create-security-tables.js` — DB migration (run from `backend/`)
- `backend/src/lib/anthropic.ts` — Anthropic client stub (clinic fork only)
- `backend/src/lib/securityEvents.ts` — `emitSecurityEvent()` + `triggerAlertWebhook()`
- `backend/src/lib/securityAnalyzer.ts` — GPT-4o analysis returning `SecurityAnalysis`
- `backend/src/middleware/securityMonitor.ts` — 404-pattern detector
- `backend/src/routes/security.ts` — 5 security endpoints

### Modified backend files
- `backend/package.json` — add `@anthropic-ai/sdk`
- `backend/src/index.ts` — register securityMonitor + securityRouter
- `backend/src/routes/auth.ts` — login_failed, brute_force, login_new_ip
- `backend/src/routes/chat.ts` — prompt injection guardrail
- `backend/src/routes/emails.ts` — suspicious email guardrail + is_flagged
- `backend/src/routes/team.ts` — admin_created + permission_escalation

### New frontend files
- `src/types/security.ts` — SecurityEvent + SecurityAnalysis interfaces
- `src/components/security/SecurityKPIRow.tsx`
- `src/components/security/ThreatTimeline.tsx`
- `src/components/security/EventsTable.tsx`
- `src/components/security/EventDetailModal.tsx`
- `src/pages/SecurityPage.tsx`

### Modified frontend files
- `src/config/routes.ts` — add `Security: "/security"`
- `src/config/navigation.ts` — add Security nav item + `adminOnly` field on NavItem
- `src/components/layout/Sidebar.tsx` — filter `adminOnly` items
- `src/router/index.tsx` — add `/security` route

---

## Task 1: DB Migration

**Files:**
- Create: `scripts/create-security-tables.js`

- [ ] **Step 1: Create migration script**

```js
// scripts/create-security-tables.js
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

async function run() {
  await client.connect();
  console.log('Connected');

  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.security_events (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id     uuid NOT NULL REFERENCES aios.tenants(id) ON DELETE CASCADE,
      event_type    text NOT NULL,
      severity      text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
      actor_user_id uuid REFERENCES aios.users(id) ON DELETE SET NULL,
      actor_ip      text,
      target_resource text,
      metadata      jsonb DEFAULT '{}',
      ai_analysis   jsonb,
      resolved      boolean DEFAULT false,
      created_at    timestamptz DEFAULT NOW()
    );
  `);
  console.log('Table aios.security_events created');

  await client.query(`ALTER TABLE aios.security_events ENABLE ROW LEVEL SECURITY;`);
  await client.query(`ALTER TABLE aios.security_events FORCE ROW LEVEL SECURITY;`);

  await client.query(`
    DROP POLICY IF EXISTS security_events_tenant_isolation ON aios.security_events;
    CREATE POLICY security_events_tenant_isolation ON aios.security_events
      USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
  `);
  console.log('RLS policy created');

  await client.query(`GRANT ALL ON aios.security_events TO aios_user;`);

  await client.query(`
    ALTER TABLE aios.emails ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
  `);
  console.log('is_flagged added to aios.emails');

  await client.query(`NOTIFY pgrst, 'reload schema'`);
  console.log('PostgREST cache reloaded');

  await client.end();
  console.log('Migration complete');
}

run().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run migration from backend/ directory**

```bash
cd AIOS/backend && node ../scripts/create-security-tables.js
```

Expected output:
```
Connected
Table aios.security_events created
RLS policy created
is_flagged added to aios.emails
PostgREST cache reloaded
Migration complete
```

- [ ] **Step 3: Commit**

```bash
git add scripts/create-security-tables.js
git commit -m "feat: add security_events migration script"
```

---

## Task 2: Install @anthropic-ai/sdk + create stub client

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/lib/anthropic.ts`

- [ ] **Step 1: Install SDK**

```bash
cd AIOS/backend && npm install @anthropic-ai/sdk
```

Expected: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Create Anthropic client stub**

Create `backend/src/lib/anthropic.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';

// Clinic fork: set ANTHROPIC_API_KEY in EasyPanel and switch securityAnalyzer.ts
// to use this client with model 'claude-opus-4-8' instead of GPT-4o.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });
```

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/lib/anthropic.ts
git commit -m "feat: install @anthropic-ai/sdk — ready for clinic fork Opus switch"
```

---

## Task 3: securityEvents.ts — core event emitter

**Files:**
- Create: `backend/src/lib/securityEvents.ts`

- [ ] **Step 1: Create the file**

```ts
import { db } from '../db';

export interface SecurityEventInput {
  tenant_id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actor_user_id?: string | null;
  actor_ip?: string | null;
  target_resource?: string | null;
  metadata?: Record<string, unknown>;
  admin_email?: string | null;  // included in webhook so n8n doesn't need extra query
}

export async function emitSecurityEvent(input: SecurityEventInput): Promise<string> {
  const result = await db.query(
    `INSERT INTO aios.security_events
       (tenant_id, event_type, severity, actor_user_id, actor_ip, target_resource, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.tenant_id,
      input.event_type,
      input.severity,
      input.actor_user_id ?? null,
      input.actor_ip ?? null,
      input.target_resource ?? null,
      input.metadata ?? {},
    ]
  );
  const eventId: string = result.rows[0].id;

  if (input.severity === 'medium' || input.severity === 'high' || input.severity === 'critical') {
    // Fire-and-forget: trigger n8n Security Alerter webhook
    triggerAlertWebhook({ ...input, event_id: eventId }).catch(() => {
      // n8n webhook failure must never break main request
    });

    // Fire-and-forget: trigger GPT-4o analysis
    triggerAnalysis(eventId, input.tenant_id).catch(() => {});
  }

  return eventId;
}

async function triggerAlertWebhook(
  event: SecurityEventInput & { event_id: string }
): Promise<void> {
  const webhookUrl = process.env.N8N_SECURITY_WEBHOOK_URL;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: event.event_id,
      tenant_id: event.tenant_id,
      event_type: event.event_type,
      severity: event.severity,
      actor_ip: event.actor_ip,
      target_resource: event.target_resource,
      metadata: event.metadata,
      admin_email: event.admin_email,
      timestamp: new Date().toISOString(),
    }),
  });
}

async function triggerAnalysis(eventId: string, tenantId: string): Promise<void> {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
  const serviceJwt = process.env.SERVICE_JWT;
  if (!serviceJwt) return;

  await fetch(`${backendUrl}/security/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceJwt}`,
    },
    body: JSON.stringify({ event_id: eventId, tenant_id: tenantId }),
  });
}

export async function countRecentEvents(
  tenantId: string,
  actorIp: string | null,
  eventType: string,
  windowMinutes: number
): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*) FROM aios.security_events
     WHERE tenant_id = $1
       AND actor_ip = $2
       AND event_type = $3
       AND created_at > NOW() - ($4 || ' minutes')::interval`,
    [tenantId, actorIp ?? '', eventType, windowMinutes]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function isNewIp(
  tenantId: string,
  userId: string,
  ip: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT COUNT(*) FROM aios.security_events
     WHERE tenant_id = $1 AND actor_user_id = $2 AND actor_ip = $3
       AND event_type = 'login_new_ip'`,
    [tenantId, userId, ip]
  );
  return parseInt(result.rows[0].count, 10) === 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib/securityEvents.ts
git commit -m "feat: add securityEvents lib — emitSecurityEvent + helpers"
```

---

## Task 4: securityAnalyzer.ts — GPT-4o event analysis

**Files:**
- Create: `backend/src/lib/securityAnalyzer.ts`

- [ ] **Step 1: Create the file**

```ts
import { openai } from './openai';
import { db } from '../db';

export interface SecurityAnalysis {
  risk_score: number;
  summary: string;
  is_likely_false_positive: boolean;
  recommended_action: string;
  context: string;
}

// To switch to Claude Opus 4.8 for clinic fork:
// 1. import { anthropic } from './anthropic';
// 2. Replace the openai.chat.completions.create call with:
//    anthropic.messages.create({ model: 'claude-opus-4-8', max_tokens: 400, messages: [...] })
// 3. Read content from response.content[0].text instead of choices[0].message.content
export async function analyzeSecurityEvent(eventId: string): Promise<SecurityAnalysis | null> {
  const eventRes = await db.query(
    `SELECT id, tenant_id, event_type, severity, actor_user_id, actor_ip, target_resource, metadata
     FROM aios.security_events WHERE id = $1`,
    [eventId]
  );
  if (!eventRes.rows[0]) return null;
  const event = eventRes.rows[0];

  let userHistory = 'No prior user activity.';
  if (event.actor_user_id) {
    const histRes = await db.query(
      `SELECT role, content, created_at FROM aios.interactions
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 10`,
      [event.tenant_id, event.actor_user_id]
    );
    if (histRes.rows.length > 0) {
      userHistory = histRes.rows
        .map((r: { role: string; content: string; created_at: string }) =>
          `[${r.created_at}] ${r.role}: ${String(r.content).substring(0, 80)}`
        )
        .join('\n');
    }
  }

  const priorRes = await db.query(
    `SELECT event_type, severity, created_at FROM aios.security_events
     WHERE tenant_id = $1
       AND (actor_ip = $2 OR actor_user_id = $3::uuid)
       AND created_at > NOW() - INTERVAL '24 hours'
       AND id != $4
     ORDER BY created_at DESC LIMIT 5`,
    [
      event.tenant_id,
      event.actor_ip ?? '',
      event.actor_user_id ?? '00000000-0000-0000-0000-000000000000',
      eventId,
    ]
  );
  const priorEvents =
    priorRes.rows.length > 0
      ? priorRes.rows
          .map((r: { event_type: string; severity: string; created_at: string }) =>
            `${r.event_type} (${r.severity}) at ${r.created_at}`
          )
          .join('\n')
      : 'No prior events in last 24h.';

  const prompt = `You are a security analyst for AIOS, an enterprise AI business platform.

Analyze this security event and return a JSON object ONLY (no markdown, no explanation):

Event Type: ${event.event_type}
Severity: ${event.severity}
IP: ${event.actor_ip ?? 'unknown'}
Target: ${event.target_resource ?? 'unknown'}
Metadata: ${JSON.stringify(event.metadata)}

Prior events from same actor (last 24h):
${priorEvents}

Recent user activity (last 10 interactions):
${userHistory}

Return this exact JSON shape:
{
  "risk_score": <integer 0-100>,
  "summary": "<1-2 sentences describing what happened>",
  "is_likely_false_positive": <true or false>,
  "recommended_action": "<specific action admin should take>",
  "context": "<1 sentence about the user or IP pattern>"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 400,
  });

  const raw = response.choices[0].message.content ?? '{}';

  try {
    const analysis = JSON.parse(raw) as SecurityAnalysis;
    await db.query(
      `UPDATE aios.security_events SET ai_analysis = $1 WHERE id = $2`,
      [JSON.stringify(analysis), eventId]
    );
    return analysis;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib/securityAnalyzer.ts
git commit -m "feat: add securityAnalyzer — GPT-4o event analysis (Opus-ready)"
```

---

## Task 5: security.ts routes

**Files:**
- Create: `backend/src/routes/security.ts`

- [ ] **Step 1: Create the file**

```ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';
import { analyzeSecurityEvent } from '../lib/securityAnalyzer';

const router = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (req.user!.app_role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return false;
  }
  return true;
}

// GET /security/events — list events with optional filters
router.get('/events', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { severity, resolved, from, to } = req.query as Record<string, string>;

  const conditions: string[] = [`tenant_id = $1`];
  const params: unknown[] = [req.user!.tenant_id];
  let idx = 2;

  if (severity) { conditions.push(`severity = $${idx++}`); params.push(severity); }
  if (resolved !== undefined) { conditions.push(`resolved = $${idx++}`); params.push(resolved === 'true'); }
  if (from) { conditions.push(`created_at >= $${idx++}`); params.push(from); }
  if (to) { conditions.push(`created_at <= $${idx++}`); params.push(to); }

  try {
    const { rows } = await db.query(
      `SELECT * FROM aios.security_events
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[security/events]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /security/events/:id — detail with ai_analysis
router.get('/events/:id', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { rows } = await db.query(
      `SELECT * FROM aios.security_events WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user!.tenant_id]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error('[security/events/:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /security/summary — KPIs for dashboard
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { rows } = await db.query(
      `SELECT
         COUNT(*)                                              AS total_today,
         COUNT(*) FILTER (WHERE severity = 'low')             AS low_count,
         COUNT(*) FILTER (WHERE severity = 'medium')          AS medium_count,
         COUNT(*) FILTER (WHERE severity IN ('high','critical') AND resolved = false) AS high_unresolved
       FROM aios.security_events
       WHERE tenant_id = $1 AND created_at >= CURRENT_DATE`,
      [req.user!.tenant_id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[security/summary]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /security/resolve/:id — mark as resolved
router.post('/resolve/:id', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    await db.query(
      `UPDATE aios.security_events SET resolved = true WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user!.tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[security/resolve]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /security/analyze — trigger GPT-4o analysis (called internally via Service JWT)
router.post('/analyze', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_service) { res.status(403).json({ error: 'Service token required' }); return; }
  const { event_id } = req.body as { event_id: string };
  if (!event_id) { res.status(400).json({ error: 'event_id required' }); return; }
  try {
    const analysis = await analyzeSecurityEvent(event_id);
    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('[security/analyze]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/security.ts
git commit -m "feat: add /security routes — events, summary, resolve, analyze"
```

---

## Task 6: securityMonitor.ts middleware (404 detector)

**Files:**
- Create: `backend/src/middleware/securityMonitor.ts`

- [ ] **Step 1: Create the file**

```ts
import { Request, Response, NextFunction } from 'express';
import { emitSecurityEvent } from '../lib/securityEvents';

// In-memory 404 counter per IP — resets automatically via Map cleanup
const notFoundCounts = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 5 * 60 * 1000;   // 5 minutes
const THRESHOLD  = 10;

export function securityMonitor(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    if (res.statusCode !== 404) return;

    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = notFoundCounts.get(ip);

    if (!entry || now - entry.windowStart > WINDOW_MS) {
      notFoundCounts.set(ip, { count: 1, windowStart: now });
      return;
    }

    entry.count += 1;

    if (entry.count >= THRESHOLD) {
      notFoundCounts.delete(ip);  // reset after triggering

      // Emit only if we have tenant context (authenticated routes)
      const tenantId = req.user?.tenant_id;
      if (!tenantId) return;

      emitSecurityEvent({
        tenant_id: tenantId,
        event_type: 'unauthorized_route',
        severity: 'high',
        actor_user_id: req.user?.user_id ?? null,
        actor_ip: ip,
        target_resource: req.path,
        metadata: { count: entry.count, window_minutes: 5 },
      }).catch(() => {});
    }
  });

  next();
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/middleware/securityMonitor.ts
git commit -m "feat: add securityMonitor middleware — 404 pattern detector"
```

---

## Task 7: Modify auth.ts — login events

**Files:**
- Modify: `backend/src/routes/auth.ts`

- [ ] **Step 1: Add imports at top of auth.ts**

After the existing imports (after `import { db } from '../db';`), add:

```ts
import { emitSecurityEvent, countRecentEvents, isNewIp } from '../lib/securityEvents';
```

- [ ] **Step 2: Add brute-force block check at start of login route**

In `router.post('/login', ...)`, after the `if (!email || !password)` block and before the `db.query` for the user, add:

```ts
  // Block IP if brute force was recently detected
  const clientIp = req.ip ?? 'unknown';
  const bruteForceRes = await db.query(
    `SELECT COUNT(*) FROM aios.security_events
     WHERE actor_ip = $1 AND event_type = 'brute_force'
       AND created_at > NOW() - INTERVAL '30 minutes'`,
    [clientIp]
  );
  if (parseInt(bruteForceRes.rows[0].count, 10) > 0) {
    res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
    return;
  }
```

- [ ] **Step 3: Emit login_failed on bad credentials**

Replace the two `res.status(401).json({ error: 'Invalid credentials' })` lines — the first one (user not found) and the second one (wrong password). After each, add an async emit before return. Since we may not have tenant_id when user is not found, only emit when we have the user:

After `if (!user?.password_hash)` block (before `return`):
```ts
      // No tenant context available — skip security event (unknown email)
```

After `if (!valid)` block (before `return`), replace with:
```ts
    if (!valid) {
      // Emit login_failed and check brute force
      const tenantId: string = user.tenant_id;
      await emitSecurityEvent({
        tenant_id: tenantId,
        event_type: 'login_failed',
        severity: 'low',
        actor_user_id: user.id,
        actor_ip: clientIp,
        target_resource: '/auth/login',
        metadata: { email: email.toLowerCase() },
      });

      const failCount = await countRecentEvents(tenantId, clientIp, 'login_failed', 10);
      if (failCount >= 5) {
        await emitSecurityEvent({
          tenant_id: tenantId,
          event_type: 'brute_force',
          severity: 'high',
          actor_user_id: user.id,
          actor_ip: clientIp,
          target_resource: '/auth/login',
          metadata: { attempts: failCount, window_minutes: 10 },
        });
      }

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
```

- [ ] **Step 4: Emit login_new_ip on successful login**

After the `res.json({ token, user: { ... } })` line, add (fire-and-forget):

```ts
    // Security: check for new IP (async, non-blocking)
    isNewIp(user.tenant_id, user.id, clientIp).then((isNew) => {
      if (!isNew) return;
      emitSecurityEvent({
        tenant_id: user.tenant_id,
        event_type: 'login_new_ip',
        severity: 'medium',
        actor_user_id: user.id,
        actor_ip: clientIp,
        target_resource: '/auth/login',
        metadata: { email: user.email },
      }).catch(() => {});
    }).catch(() => {});
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/auth.ts
git commit -m "feat: emit login_failed, brute_force, login_new_ip security events"
```

---

## Task 8: Modify chat.ts — prompt injection guardrail

**Files:**
- Modify: `backend/src/routes/chat.ts`

- [ ] **Step 1: Add import**

After existing imports in `chat.ts`, add:

```ts
import { emitSecurityEvent } from '../lib/securityEvents';
```

- [ ] **Step 2: Add injection detector before message processing**

In `router.post('/', ...)`, after the `if (!message?.trim())` check and before loading conversation history, add:

```ts
  // Prompt injection guardrail
  const INJECTION_PATTERNS = [
    /ignore\s+(your\s+)?(previous\s+|all\s+)?instructions/i,
    /disregard\s+(your\s+)?(previous\s+|all\s+)?instructions/i,
    /you\s+are\s+now\s+a/i,
    /forget\s+(everything|your\s+role|your\s+instructions)/i,
    /act\s+as\s+(if\s+you\s+are|a\s+different)/i,
    /reveal\s+(other\s+)?(tenant|client|user)\s+data/i,
    /show\s+me\s+(all\s+)?(other\s+tenants|other\s+clients)/i,
  ];

  const isInjection = INJECTION_PATTERNS.some((p) => p.test(message));
  if (isInjection) {
    emitSecurityEvent({
      tenant_id: tenantId,
      event_type: 'prompt_injection_attempt',
      severity: 'high',
      actor_user_id: userId,
      actor_ip: req.ip ?? null,
      target_resource: '/chat',
      metadata: { message_snippet: message.substring(0, 200) },
    }).catch(() => {});
    res.status(403).json({ error: 'Message blocked by security policy.' });
    return;
  }
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/chat.ts
git commit -m "feat: add prompt injection guardrail to /chat"
```

---

## Task 9: Modify emails.ts — suspicious email guardrail

**Files:**
- Modify: `backend/src/routes/emails.ts`

- [ ] **Step 1: Add import**

After existing imports, add:

```ts
import { emitSecurityEvent } from '../lib/securityEvents';
```

- [ ] **Step 2: Add flagging logic in /ingest route**

In `router.post('/ingest', ...)`, after the input validation block and before the `db.query` INSERT, add:

```ts
  // Content guardrail: detect suspicious email content
  const SCAM_KEYWORDS = [
    'wire transfer', 'bitcoin', 'crypto payment', 'urgent payment',
    'bank account details', 'send money', 'western union', 'moneygram',
    'lottery winner', 'inheritance', 'prince', 'million dollars',
  ];
  const PHISHING_DOMAINS = ['bit.ly', 'tinyurl.com', 'ow.ly', 'goo.gl'];

  const contentToCheck = `${subject ?? ''} ${body_text ?? ''} ${snippet ?? ''}`.toLowerCase();
  const hasScamKeyword = SCAM_KEYWORDS.some((kw) => contentToCheck.includes(kw));
  const hasPhishingLink = PHISHING_DOMAINS.some((d) => contentToCheck.includes(d));
  const isFlagged = hasScamKeyword || hasPhishingLink;

  if (isFlagged) {
    emitSecurityEvent({
      tenant_id,
      event_type: 'suspicious_email_content',
      severity: 'medium',
      actor_ip: null,
      target_resource: '/emails/ingest',
      metadata: {
        gmail_id,
        from_email,
        subject: subject ?? null,
        reason: hasPhishingLink ? 'phishing_link' : 'scam_keyword',
      },
    }).catch(() => {});
  }
```

- [ ] **Step 3: Add is_flagged to the INSERT query**

Replace the `await db.query(...)` INSERT in /ingest with:

```ts
    await db.query(
      `INSERT INTO aios.emails
         (tenant_id, gmail_id, from_email, from_name, subject, snippet, body_text, labels, received_at, is_flagged)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        isFlagged,
      ]
    );
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/emails.ts
git commit -m "feat: add suspicious email guardrail + is_flagged to emails ingest"
```

---

## Task 10: Modify team.ts — admin_created + permission_escalation

**Files:**
- Modify: `backend/src/routes/team.ts`

- [ ] **Step 1: Add import**

After existing imports, add:

```ts
import { emitSecurityEvent } from '../lib/securityEvents';
```

- [ ] **Step 2: Emit admin_created in POST /create**

In `router.post('/create', ...)`, after `res.status(201).json({ user: result.rows[0] });` add:

```ts
    if (role === 'admin') {
      emitSecurityEvent({
        tenant_id: tenantId,
        event_type: 'admin_created',
        severity: 'high',
        actor_user_id: req.user!.user_id,
        actor_ip: req.ip ?? null,
        target_resource: `/team/${result.rows[0].id}`,
        metadata: { new_admin_email: email.toLowerCase(), created_by: req.user!.email },
      }).catch(() => {});
    }
```

- [ ] **Step 3: Emit permission_escalation in PATCH /:id**

In `router.patch('/:id', ...)`, after `res.json({ user: result.rows[0] });` add:

```ts
    if (role === 'admin' && result.rows[0]) {
      emitSecurityEvent({
        tenant_id: requestingUser.tenant_id,
        event_type: 'permission_escalation',
        severity: 'high',
        actor_user_id: requestingUser.user_id,
        actor_ip: req.ip ?? null,
        target_resource: `/team/${req.params.id}`,
        metadata: { target_user_id: req.params.id, new_role: role, changed_by: requestingUser.email },
      }).catch(() => {});
    }
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/team.ts
git commit -m "feat: emit admin_created + permission_escalation security events"
```

---

## Task 11: Register middleware + routes in index.ts

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add imports**

After existing imports, add:

```ts
import { securityMonitor } from './middleware/securityMonitor';
import securityRouter from './routes/security';
```

- [ ] **Step 2: Register securityMonitor before all routes**

After `app.use(express.json());` and before the first `app.use('/auth', ...)`, add:

```ts
app.use(securityMonitor);
```

- [ ] **Step 3: Register security router**

After `app.use('/calendar', calendarRouter);`, add:

```ts
app.use('/security', securityRouter);
```

- [ ] **Step 4: Add N8N_SECURITY_WEBHOOK_URL and SERVICE_JWT note**

These must be set in EasyPanel backend env vars (Task 20). The code already handles missing values gracefully.

- [ ] **Step 5: Test backend starts without errors**

```bash
cd AIOS/backend && npm run dev
```

Expected: `AIOS Backend running on http://localhost:3001` — no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: register securityMonitor middleware and /security routes"
```

---

## Task 12: Frontend types

**Files:**
- Create: `src/types/security.ts`

- [ ] **Step 1: Create the file**

```ts
export interface SecurityAnalysis {
  risk_score: number;
  summary: string;
  is_likely_false_positive: boolean;
  recommended_action: string;
  context: string;
}

export interface SecurityEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actor_user_id: string | null;
  actor_ip: string | null;
  target_resource: string | null;
  metadata: Record<string, unknown>;
  ai_analysis: SecurityAnalysis | null;
  resolved: boolean;
  created_at: string;
}

export interface SecuritySummary {
  total_today: string;
  low_count: string;
  medium_count: string;
  high_unresolved: string;
}

export const SEVERITY_CONFIG: Record<
  SecurityEvent['severity'],
  { label: string; color: string; bg: string; dot: string }
> = {
  low:      { label: 'Low',      color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#6b7280' },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', dot: '#f59e0b' },
  high:     { label: 'High',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  dot: '#ef4444' },
  critical: { label: 'Critical', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', dot: '#7c3aed' },
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  login_failed:              'Login Failed',
  brute_force:               'Brute Force',
  login_new_ip:              'New IP Login',
  login_unusual_time:        'Unusual Time Login',
  bulk_export:               'Bulk Export',
  admin_created:             'Admin Created',
  permission_escalation:     'Permission Escalation',
  settings_modified:         'Settings Modified',
  unauthorized_route:        'Unauthorized Route',
  prompt_injection_attempt:  'Prompt Injection',
  suspicious_email_content:  'Suspicious Email',
  fake_data_pattern:         'Fake Data Pattern',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types/security.ts
git commit -m "feat: add SecurityEvent + SecurityAnalysis TypeScript types"
```

---

## Task 13: SecurityKPIRow component

**Files:**
- Create: `src/components/security/SecurityKPIRow.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { SecuritySummary } from '../../types/security';

interface Props {
  summary: SecuritySummary | null;
  loading: boolean;
}

const CARDS = [
  { key: 'total_today' as const,    label: 'Events Today',        color: '#6366f1' },
  { key: 'low_count' as const,      label: 'Low Severity',         color: '#6b7280' },
  { key: 'medium_count' as const,   label: 'Medium Severity',      color: '#f59e0b' },
  { key: 'high_unresolved' as const, label: 'High / Unresolved',   color: '#ef4444' },
];

export function SecurityKPIRow({ summary, loading }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
      {CARDS.map(({ key, label, color }) => (
        <div
          key={key}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${color}33`,
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ color, fontSize: 32, fontWeight: 700, margin: 0 }}>
            {loading ? '—' : (summary?.[key] ?? '0')}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/security/SecurityKPIRow.tsx
git commit -m "feat: add SecurityKPIRow component"
```

---

## Task 14: ThreatTimeline component

**Files:**
- Create: `src/components/security/ThreatTimeline.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { SecurityEvent } from '../../types/security';
import { SEVERITY_CONFIG, EVENT_TYPE_LABELS } from '../../types/security';

interface Props {
  events: SecurityEvent[];
  loading: boolean;
  onSelect: (event: SecurityEvent) => void;
}

export function ThreatTimeline({ events, loading, onSelect }: Props) {
  const last24h = events.filter(
    (e) => new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,215,0,0.12)',
        borderRadius: 12,
        padding: 16,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, borderBottom: '1px solid rgba(255,215,0,0.1)', paddingBottom: 8 }}>
        🕐 Last 24h Timeline ({last24h.length})
      </p>

      {loading && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading...</p>}
      {!loading && last24h.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: 13 }}>No events in the last 24 hours.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {last24h.map((event) => {
          const cfg = SEVERITY_CONFIG[event.severity];
          const time = new Date(event.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit',
          });
          return (
            <button
              key={event.id}
              onClick={() => onSelect(event)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: cfg.dot, flexShrink: 0, marginTop: 5,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                </p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 0 0' }}>
                  {time} · {event.actor_ip ?? 'unknown IP'}
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                {cfg.label.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/security/ThreatTimeline.tsx
git commit -m "feat: add ThreatTimeline component"
```

---

## Task 15: EventsTable component

**Files:**
- Create: `src/components/security/EventsTable.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import type { SecurityEvent } from '../../types/security';
import { SEVERITY_CONFIG, EVENT_TYPE_LABELS } from '../../types/security';
import { useAuthStore } from '../../store/auth-store';

interface Props {
  events: SecurityEvent[];
  loading: boolean;
  onSelect: (event: SecurityEvent) => void;
  onResolve: (id: string) => void;
}

type FilterSeverity = 'all' | SecurityEvent['severity'];

export function EventsTable({ events, loading, onSelect, onResolve }: Props) {
  const [filter, setFilter] = useState<FilterSeverity>('all');
  const [showResolved, setShowResolved] = useState(false);
  const { token } = useAuthStore();

  const filtered = events.filter((e) => {
    if (filter !== 'all' && e.severity !== filter) return false;
    if (!showResolved && e.resolved) return false;
    return true;
  });

  async function handleResolve(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const apiUrl = (window as Record<string, unknown>).__env__?.API_URL as string ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
    await fetch(`${apiUrl}/security/resolve/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    onResolve(id);
  }

  const FILTERS: { value: FilterSeverity; label: string }[] = [
    { value: 'all',      label: 'All' },
    { value: 'critical', label: 'Critical' },
    { value: 'high',     label: 'High' },
    { value: 'medium',   label: 'Medium' },
    { value: 'low',      label: 'Low' },
  ];

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.12)', borderRadius: 12, padding: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 8 }}>
          🛡 Events
        </p>
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: '1px solid',
              borderColor: filter === value ? '#fcd34d' : 'rgba(255,255,255,0.1)',
              background: filter === value ? 'rgba(252,211,77,0.1)' : 'transparent',
              color: filter === value ? '#fcd34d' : '#9ca3af',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      {loading && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading...</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: 13 }}>No events match the current filter.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filtered.map((event) => {
          const cfg = SEVERITY_CONFIG[event.severity];
          const time = new Date(event.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          return (
            <div
              key={event.id}
              onClick={() => onSelect(event)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                opacity: event.resolved ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                </p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 0 0' }}>
                  {time} · {event.actor_ip ?? 'unknown IP'}
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: cfg.color, background: cfg.bg, flexShrink: 0 }}>
                {cfg.label.toUpperCase()}
              </span>
              {!event.resolved && (event.severity === 'high' || event.severity === 'critical') && (
                <button
                  onClick={(e) => handleResolve(e, event.id)}
                  title="Mark as resolved"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
                >
                  <CheckCircle size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/security/EventsTable.tsx
git commit -m "feat: add EventsTable component with severity filters"
```

---

## Task 16: EventDetailModal component

**Files:**
- Create: `src/components/security/EventDetailModal.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { X } from 'lucide-react';
import type { SecurityEvent } from '../../types/security';
import { SEVERITY_CONFIG, EVENT_TYPE_LABELS } from '../../types/security';

interface Props {
  event: SecurityEvent | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: Props) {
  if (!event) return null;

  const cfg = SEVERITY_CONFIG[event.severity];
  const analysis = event.ai_analysis;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a2035', border: '1px solid rgba(255,215,0,0.15)',
          borderRadius: 16, padding: 28, maxWidth: 560, width: '100%',
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 10 }}>
              {cfg.label.toUpperCase()}
            </span>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '8px 0 4px' }}>
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
              {new Date(event.created_at).toLocaleString('en-US')}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Event details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'IP Address', value: event.actor_ip ?? 'unknown' },
            { label: 'Target', value: event.target_resource ?? '—' },
            { label: 'Resolved', value: event.resolved ? 'Yes' : 'No' },
            { label: 'Event ID', value: event.id.substring(0, 8) + '...' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
              <p style={{ color: '#e5e7eb', fontSize: 13, margin: 0, wordBreak: 'break-all' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Metadata */}
        {Object.keys(event.metadata).length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px', marginBottom: 20 }}>
            <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px' }}>Metadata</p>
            <pre style={{ color: '#9ca3af', fontSize: 11, margin: 0, overflowX: 'auto' }}>
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* AI Analysis */}
        {analysis ? (
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>🤖 AI Analysis</p>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 10,
                background: analysis.risk_score >= 70 ? 'rgba(239,68,68,0.15)' : analysis.risk_score >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                color: analysis.risk_score >= 70 ? '#ef4444' : analysis.risk_score >= 40 ? '#f59e0b' : '#22c55e',
              }}>
                Risk: {analysis.risk_score}/100
              </span>
            </div>
            <p style={{ color: '#e5e7eb', fontSize: 13, margin: '0 0 8px' }}>{analysis.summary}</p>
            <p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 8px' }}>📌 {analysis.context}</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ color: '#fcd34d', fontSize: 11, fontWeight: 600, margin: '0 0 4px' }}>Recommended Action</p>
              <p style={{ color: '#e5e7eb', fontSize: 13, margin: 0 }}>{analysis.recommended_action}</p>
            </div>
            {analysis.is_likely_false_positive && (
              <p style={{ color: '#6b7280', fontSize: 11, marginTop: 8, margin: '8px 0 0' }}>
                ⚠️ This event may be a false positive.
              </p>
            )}
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
              AI analysis not available for low-severity events.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/security/EventDetailModal.tsx
git commit -m "feat: add EventDetailModal with AI analysis display"
```

---

## Task 17: SecurityPage

**Files:**
- Create: `src/pages/SecurityPage.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { SecurityKPIRow } from '../components/security/SecurityKPIRow';
import { ThreatTimeline } from '../components/security/ThreatTimeline';
import { EventsTable } from '../components/security/EventsTable';
import { EventDetailModal } from '../components/security/EventDetailModal';
import type { SecurityEvent, SecuritySummary } from '../types/security';

const API_URL = (window as Record<string, unknown>).__env__?.API_URL as string
  ?? import.meta.env.VITE_API_URL
  ?? 'http://localhost:3001';

export default function SecurityPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [events, setEvents]       = useState<SecurityEvent[]>([]);
  const [summary, setSummary]     = useState<SecuritySummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<SecurityEvent | null>(null);

  // Admin-only guard — after hooks
  if (user && user.role !== 'admin') {
    void navigate('/');
    return null;
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [eventsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/security/events`, { headers }),
        fetch(`${API_URL}/security/summary`, { headers }),
      ]);
      const eventsData = await eventsRes.json() as SecurityEvent[];
      const summaryData = await summaryRes.json() as SecuritySummary;
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setSummary(summaryData);
    } catch {
      // silently fail — page shows empty state
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  function handleResolve(id: string) {
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, resolved: true } : e));
    setSummary((prev) => prev
      ? { ...prev, high_unresolved: String(Math.max(0, parseInt(prev.high_unresolved, 10) - 1)) }
      : prev
    );
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Security"
          subtitle="Monitor threats, anomalies, and system integrity events"
        />

        <SecurityKPIRow summary={summary} loading={loading} />

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>
          <ThreatTimeline events={events} loading={loading} onSelect={setSelected} />
          <EventsTable events={events} loading={loading} onSelect={setSelected} onResolve={handleResolve} />
        </div>
      </div>

      <EventDetailModal event={selected} onClose={() => setSelected(null)} />
    </PageTransition>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/SecurityPage.tsx
git commit -m "feat: add SecurityPage — KPI row + timeline + events table"
```

---

## Task 18: Routes, navigation, sidebar, router

**Files:**
- Modify: `src/config/routes.ts`
- Modify: `src/config/navigation.ts`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Add Security to routes.ts**

In `src/config/routes.ts`, add `Security: "/security"` to the ROUTES object:

```ts
export const ROUTES = {
  Login: "/login",
  Admin: "/admin",
  Dashboard: "/",
  Leads: "/leads",
  Contacts: "/contacts",
  Calendar: "/calendar",
  Emails: "/emails",
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
  Security: "/security",
} as const;
```

- [ ] **Step 2: Add adminOnly to NavItem + Security item in navigation.ts**

Replace the `NavItem` interface and add Security item:

```ts
import {
  LayoutDashboard, Users, BookUser, CalendarDays, Mail, Cpu,
  BarChart3, FileText, LifeBuoy, CreditCard, Settings, Zap,
  Users2, ShieldCheck, type LucideIcon,
} from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard",  path: ROUTES.Dashboard, icon: LayoutDashboard },
  { label: "Leads",      path: ROUTES.Leads,     icon: Users,        permission: "leads"      },
  { label: "CRM",        path: ROUTES.Contacts,  icon: BookUser,     permission: "crm"        },
  { label: "Calendar",   path: ROUTES.Calendar,  icon: CalendarDays, permission: "calendar"   },
  { label: "Emails",     path: ROUTES.Emails,    icon: Mail,         permission: "emails"     },
  { label: "Usage",      path: ROUTES.Usage,     icon: Zap,          permission: "usage"      },
  { label: "AI Systems", path: ROUTES.AISystems, icon: Cpu,          permission: "ai_systems" },
  { label: "Analytics",  path: ROUTES.Analytics, icon: BarChart3,    permission: "analytics"  },
  { label: "Reports",    path: ROUTES.Reports,   icon: FileText,     permission: "reports"    },
  { label: "Support",    path: ROUTES.Support,   icon: LifeBuoy,     permission: "support"    },
  { label: "Team",       path: ROUTES.Team,      icon: Users2,       permission: "team"       },
  { label: "Security",   path: ROUTES.Security,  icon: ShieldCheck,  adminOnly: true          },
];

export const bottomNavItems: NavItem[] = [
  { label: "Billing",  path: ROUTES.Billing,  icon: CreditCard, permission: "billing" },
  { label: "Settings", path: ROUTES.Settings, icon: Settings   },
];
```

- [ ] **Step 3: Update Sidebar.tsx filter for adminOnly**

In `src/components/layout/Sidebar.tsx`, change the `visibleMainNavItems` filter from:

```ts
  const visibleMainNavItems = mainNavItems.filter(
    (item) =>
      !item.permission ||
      user?.role === 'admin' ||
      (user?.section_permissions ?? []).includes(item.permission)
  );
```

To:

```ts
  const visibleMainNavItems = mainNavItems.filter(
    (item) => {
      if (item.adminOnly) return user?.role === 'admin';
      if (!item.permission) return true;
      return user?.role === 'admin' || (user?.section_permissions ?? []).includes(item.permission);
    }
  );
```

- [ ] **Step 4: Add /security route to router/index.tsx**

Add import at top:
```ts
import SecurityPage from "../pages/SecurityPage";
```

Add route after the Team route:
```tsx
  {
    path: ROUTES.Security,
    element: <Protected><SecurityPage /></Protected>,
  },
```

- [ ] **Step 5: Verify TypeScript build**

```bash
cd AIOS && npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/config/routes.ts src/config/navigation.ts src/components/layout/Sidebar.tsx src/router/index.tsx
git commit -m "feat: add /security route + Security nav item (admin-only)"
```

---

## Task 19: n8n Workflow 1 — Security Pattern Analyzer

This task is manual setup in the n8n UI.

- [ ] **Step 1: Create new workflow named "AIOS - Security Pattern Analyzer"**

In n8n UI → New Workflow.

- [ ] **Step 2: Add Schedule Trigger node**
- Mode: `Every X Minutes`
- Minutes: `15`

- [ ] **Step 3: Add HTTP Request node — fetch recent low events**
- Method: `GET`
- URL: `https://xneurasolutions-aios-backend.9lagn8.easypanel.host/security/events`
- Authentication: `Generic Credential Type` → Header Auth
- Header Name: `Authorization`
- Header Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc19zZXJ2aWNlIjp0cnVlLCJpYXQiOjE3Nzk5NjAwNTcsImV4cCI6MjA5NTMyMDA1N30.H2RQIX32fIz9DjVAXee8bEO8cg8cdBbqNSJ44YsRnWs`
- Add Query Parameter: `severity` = `low`
- Add Query Parameter: `resolved` = `false`

- [ ] **Step 4: Add Code node — detect repeated actor patterns**

```javascript
const items = $input.all();
const events = items.map(i => i.json);

// Group by actor_ip — count events per IP in last 15 min
const ipCounts = {};
const now = Date.now();
for (const e of events) {
  const age = now - new Date(e.created_at).getTime();
  if (age > 15 * 60 * 1000) continue;  // only last 15 min
  const key = e.actor_ip ?? 'unknown';
  if (!ipCounts[key]) ipCounts[key] = { count: 0, tenant_id: e.tenant_id, actor_ip: e.actor_ip };
  ipCounts[key].count++;
}

// Only return IPs with 3+ events
const suspicious = Object.values(ipCounts).filter(v => v.count >= 3);
return suspicious.map(v => ({ json: v }));
```

- [ ] **Step 5: Add IF node — check if any suspicious actors found**
- Condition: `{{ $json.count }}` `number` `>=` `3` (singleValue: true)

- [ ] **Step 6: Add HTTP Request node (true branch) — trigger analyze**
- Method: `POST`
- URL: `https://xneurasolutions-aios-backend.9lagn8.easypanel.host/security/analyze`
- Authentication: same Header Auth as Step 3
- Body (JSON):
```json
{
  "event_id": "={{ $json.event_id }}",
  "tenant_id": "={{ $json.tenant_id }}"
}
```

- [ ] **Step 7: Activate workflow and test**

---

## Task 20: n8n Workflow 2 — Security Alerter (Webhook)

This task is manual setup in the n8n UI.

- [ ] **Step 1: Create new workflow named "AIOS - Security Alerter"**

- [ ] **Step 2: Add Webhook trigger node**
- Method: `POST`
- Path: `aios-security-alert`
- Authentication: `None` (backend calls internally — protected by network)
- Copy the webhook URL — it will look like: `https://n8n.yourdomain.com/webhook/aios-security-alert`

- [ ] **Step 3: Add Code node — format messages**

```javascript
const event = $input.first().json;

const SEVERITY_EMOJI = {
  medium: '⚠️',
  high: '🚨',
  critical: '🔴',
};

const emoji = SEVERITY_EMOJI[event.severity] || '⚠️';
const telegram_msg = `${emoji} [AIOS Security] ${event.event_type.replace(/_/g, ' ').toUpperCase()}

Severity: ${event.severity.toUpperCase()}
IP: ${event.actor_ip || 'unknown'}
Target: ${event.target_resource || 'unknown'}
Time: ${event.timestamp}
Tenant: ${event.tenant_id}`;

const email_subject = event.severity === 'critical'
  ? `🔴 CRITICAL - AIOS system at risk`
  : event.severity === 'high'
    ? `🚨 [AIOS] Action required - Security alert`
    : `⚠️ [AIOS Security] Event detected`;

return [{ json: { ...event, telegram_msg, email_subject } }];
```

- [ ] **Step 4: Add two parallel branches using a Split node or direct parallel connections**

**Branch A — Telegram:**
- Add Telegram node
- Credential: "Telegram account" (existing)
- Operation: `Send Message`
- Chat ID: `={{ $json.telegram_chat_id }}` (or hardcode the admin Telegram ID)
- Text: `={{ $json.telegram_msg }}`

**Branch B — Gmail Send:**
- Add Gmail node
- Credential: "Neura account" (existing — neurasolutionscloud@gmail.com)
- Operation: `Send`
- To: `={{ $json.admin_email }}`
- Subject: `={{ $json.email_subject }}`
- Message: `={{ $json.telegram_msg }}`

- [ ] **Step 5: Copy webhook URL and set in EasyPanel backend env**

Add env var to backend service in EasyPanel:
```
N8N_SECURITY_WEBHOOK_URL=<paste webhook URL here>
```

Also ensure these exist:
```
SERVICE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc19zZXJ2aWNlIjp0cnVlLCJpYXQiOjE3Nzk5NjAwNTcsImV4cCI6MjA5NTMyMDA1N30.H2RQIX32fIz9DjVAXee8bEO8cg8cdBbqNSJ44YsRnWs
BACKEND_URL=https://xneurasolutions-aios-backend.9lagn8.easypanel.host
```

- [ ] **Step 6: Activate workflow, redeploy backend, and test**

Test by attempting 5+ failed logins → verify:
1. `brute_force` event appears in DB
2. Telegram message received
3. Email received
4. `/security` frontend shows the event with AI analysis

---

## Self-Review Notes

- **Spec coverage:** All 7 sections covered. Content guardrail (Section 2) split across Tasks 8 (chat), 9 (emails). Brute force DB-based counter (spec fix) implemented in Task 7.
- **Type consistency:** `SecurityEvent.ai_analysis` is `SecurityAnalysis | null` in types.ts; `analyzeSecurityEvent` returns `SecurityAnalysis | null`; stored as jsonb in DB — consistent throughout.
- **No placeholders:** All tasks contain complete code.
- **Import consistency:** All backend files use `import { db } from '../db'` and `import { requireAuth } from '../middleware/requireAuth'` — matches existing pattern.
