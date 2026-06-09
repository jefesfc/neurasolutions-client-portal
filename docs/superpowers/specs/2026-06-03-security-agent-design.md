# Security AI Agent — Design Spec
**Date:** 2026-06-03  
**Status:** Approved  
**Scope:** AIOS demo + foundation for clinic fork

---

## Overview

A Security AI Agent that monitors the AIOS platform for threats across three dimensions: unauthorized access, internal anomalies, and system integrity. The agent uses a backend-centric architecture (Option B): real-time event capture in the backend, n8n for pattern analysis and alert dispatch, GPT-4o for contextual analysis (demo) / Claude Opus 4.8 (clinic fork), and a dedicated `/security` frontend module.

---

## Section 1: Data Layer

### New table `aios.security_events`

| Field | Type | Description |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants |
| `event_type` | text | event type (see below) |
| `severity` | text | `low` / `medium` / `high` / `critical` |
| `actor_user_id` | uuid | user who triggered the event (nullable) |
| `actor_ip` | text | origin IP |
| `target_resource` | text | what was accessed/modified |
| `metadata` | jsonb | extra details (attempt counts, timestamps, etc.) |
| `ai_analysis` | jsonb | GPT-4o/Opus analysis (nullable, medium+ only) |
| `resolved` | boolean | reviewed/resolved by admin |
| `created_at` | timestamptz | event timestamp |

### Event types

| Type | Base Severity |
|---|---|
| `login_failed` | low |
| `brute_force` (≥5 failures in 10min) | high |
| `login_unusual_time` | low (opt-in only) |
| `login_new_ip` | medium |
| `bulk_export` (>100 records) | medium |
| `admin_created` | high |
| `permission_escalation` | high |
| `settings_modified` | medium |
| `unauthorized_route` | high |
| `prompt_injection_attempt` | high |
| `suspicious_email_content` | medium |
| `fake_data_pattern` | medium |

### Tenant settings extension

Add to `tenants.settings` jsonb:
```json
{
  "security": {
    "business_hours_start": 9,
    "business_hours_end": 21
  }
}
```
`login_unusual_time` only fires when `security.business_hours_*` is configured. Opt-in, never default.

---

## Section 2: Content Moderation Guardrails

Preventive layer — acts **before** content reaches the AI or DB. Three vectors:

### Vector 1: AI Chat — Prompt Injection
Middleware on `POST /chat` before invoking GPT-4o:
- Detects system prompt override attempts ("ignore your instructions...")
- Detects cross-tenant data exfiltration attempts
- Detects inappropriate content via **OpenAI Moderation API** (free, key already available)
- On violation → `403` response + creates `security_event` type `prompt_injection_attempt`

### Vector 2: Ingested Emails — Spam/Scam/Phishing
On `POST /emails/ingest`:
- Detects phishing links (suspicious domains in body_text)
- Detects scam patterns (keywords: "urgent", "wire transfer", "Bitcoin", etc.)
- Flagged emails are still stored with `is_flagged: boolean` field
- Creates `security_event` type `suspicious_email_content`

### Vector 3: Leads/Contacts — Fake Data
On lead/contact creation routes:
- Detects bulk injection (>20 records in <60 seconds, same user)
- Detects fake data patterns (all same email domain, sequential phone numbers)
- Creates `security_event` type `fake_data_pattern`

**Note:** Guardrails use heuristic rules + OpenAI Moderation API only. Opus/GPT-4o is not invoked here — that happens in Section 5 after events are already recorded.

---

## Section 3: Backend Middleware and Routes

### New file: `backend/src/middleware/securityMonitor.ts`

Intercepts existing routes and emits events to `security_events`. Non-blocking (except brute_force and prompt_injection which do block):

| Intercepted route | Event emitted |
|---|---|
| `POST /auth/login` (failure) | `login_failed` → accumulates → `brute_force` if ≥5 in 10min |
| `POST /auth/login` (success, new IP) | `login_new_ip` |
| `POST /auth/login` (success, unusual time) | `login_unusual_time` (if tenant opt-in) |
| `POST /team/create` with `role: admin` | `admin_created` |
| `PATCH /auth/change-password` | `settings_modified` |
| `PATCH /calendar/settings` | `settings_modified` |
| `GET /leads` + `GET /contacts` with export | `bulk_export` |
| Repeated unknown route (≥10 in 5min) | `unauthorized_route` |

### New file: `backend/src/routes/security.ts`

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/security/events` | Admin JWT | List events with filters (severity, resolved, date) |
| `GET` | `/security/events/:id` | Admin JWT | Detail + Opus/GPT-4o analysis |
| `GET` | `/security/summary` | Admin JWT | KPIs: total today, by severity, unresolved count |
| `POST` | `/security/resolve/:id` | Admin JWT | Mark event as resolved |
| `POST` | `/security/analyze` | Service JWT | Invokes GPT-4o/Opus — called internally |

### Registration in `backend/src/index.ts`
```ts
app.use(securityMonitor);   // before all routes
app.use('/security', securityRouter);
```

---

## Section 4: Severity Thresholds and Automated Response

| Event | Condition | Severity | Automated Response |
|---|---|---|---|
| `login_failed` | 1-4 attempts | `low` | Log only |
| `login_unusual_time` | outside business hours (opt-in) | `low` | Log only |
| `login_new_ip` | IP never seen before | `medium` | Telegram + Email + GPT-4o analysis |
| `bulk_export` | >100 records | `medium` | Telegram + Email + GPT-4o analysis |
| `settings_modified` | any critical change | `medium` | Telegram + Email + GPT-4o analysis |
| `suspicious_email_content` | phishing/scam detected | `medium` | Telegram + Email + GPT-4o analysis |
| `fake_data_pattern` | bulk injection | `medium` | Telegram + Email + GPT-4o analysis |
| `brute_force` | ≥5 failures in 10min | `high` | Telegram urgent + Email + **block user 30min** + GPT-4o |
| `admin_created` | new admin user | `high` | Telegram urgent + Email + GPT-4o |
| `permission_escalation` | role changed | `high` | Telegram urgent + Email + GPT-4o |
| `prompt_injection_attempt` | override detected | `high` | Telegram urgent + Email + **block request** + GPT-4o |
| `unauthorized_route` | ≥10 attempts in 5min | `critical` | Telegram urgent + Email + **block IP** + GPT-4o |

### Telegram format by severity
- `low` → no notification (DB only)
- `medium` → `⚠️ [AIOS Security] Event detected: ...`
- `high` → `🚨 [AIOS ALERT] Action required: ...`
- `critical` → `🔴 [AIOS CRITICAL] System at risk: ...`

---

## Section 5: AI Analysis Integration

### Demo (AIOS): GPT-4o
### Clinic fork: Claude Opus 4.8

**New file: `backend/src/lib/securityAnalyzer.ts`**

Triggered only for `medium`, `high`, `critical` events via `POST /security/analyze`.

Context sent to the model per event:
- Event type, severity, IP, affected resource
- User history (last 30 days from `interactions`)
- Previous events from same user/IP (last 24h from `security_events`)
- Tenant configuration (plan, industry, size)

Structured output stored in `security_events.ai_analysis`:
```json
{
  "risk_score": 75,
  "summary": "Login from Romanian IP never seen before. User normally active from UK.",
  "is_likely_false_positive": false,
  "recommended_action": "Contact user to verify identity",
  "context": "User has had 0 prior security events in 30 days."
}
```

### Switching from GPT-4o to Opus (clinic fork)
Change one constant in `securityAnalyzer.ts` + add `ANTHROPIC_API_KEY` to EasyPanel. Interface is identical.

### New dependency
```bash
cd AIOS/backend && npm install @anthropic-ai/sdk
```
Added now to `package.json` so clinic fork inherits it automatically.

### New EasyPanel env var (clinic only)
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Section 6: n8n Workflows

### Workflow 1: "AIOS Security Pattern Analyzer"
```
Cron every 15min
  → GET /security/events?from=last15min&severity=low (Service JWT)
  → Code node: group low events by same user/IP
  → IF: same actor has ≥3 low events in 15min
      → POST /security/analyze (escalates severity to medium)
```
Detects patterns that are individually low but suspicious when combined.

### Workflow 2: "AIOS Security Alerter"
```
Webhook (called from backend when severity=medium/high/critical)
  → Code node: format message + include admin email from event payload
  → Parallel split:
      Branch A → Telegram node → tenant admin
      Branch B → Gmail Send → admin email (credential "Neura account")
```

**Email subjects by severity:**
- `medium` → `⚠️ [AIOS Security] Event detected`
- `high` → `🚨 [AIOS] Action required - Security alert`
- `critical` → `🔴 CRITICAL - AIOS system at risk`

**Note:** Backend calls n8n webhook async — does not await response. Events are in DB regardless of n8n availability.

**Admin email** is included in the webhook payload by the backend (from `users` table where `role='admin'` and matching `tenant_id`) — no extra query needed from n8n.

---

## Section 7: Frontend `/security` Module

### New files
```
src/pages/SecurityPage.tsx
src/components/security/SecurityKPIRow.tsx      ← 4 KPIs: total today, low/medium/high unresolved
src/components/security/EventsTable.tsx          ← table with severity badges + resolve action
src/components/security/EventDetailModal.tsx     ← full detail + formatted AI analysis
src/components/security/ThreatTimeline.tsx       ← last 24h as visual timeline
```

### Layout
- Top row: `SecurityKPIRow` — 4 cards (Total today / Low / Medium / High+Critical unresolved)
- Center left: `ThreatTimeline` — 24h timeline by severity
- Center right: `EventsTable` — filterable by severity/type/resolved status
- Click event → `EventDetailModal` with `ai_analysis` parsed to show `risk_score`, `summary`, `recommended_action`

### Permissions
- Admin-only — not gated by `section_permissions`, protected same as `/admin`
- Sidebar entry only visible when `user.role === 'admin'`

### Navigation (`src/config/navigation.ts`)
```ts
{ name: 'Security', path: '/security', icon: ShieldCheckIcon, adminOnly: true }
```

### Data source
PostgREST reads `security_events` directly via `src/lib/postgrest.ts`. The `ai_analysis` jsonb field is parsed in `EventDetailModal`.

---

## Implementation Order

1. DB migration — create `security_events` table + RLS policy + add `is_flagged boolean default false` to `aios.emails`
2. Install `@anthropic-ai/sdk` in backend
3. `securityAnalyzer.ts` — GPT-4o analysis function
4. `securityMonitor.ts` — middleware (login, export, admin, settings)
5. Guardrails — prompt injection in `/chat`, email flagging in `/emails/ingest`, fake data in leads/contacts
6. `security.ts` routes — all 5 endpoints
7. Register middleware + routes in `index.ts`
8. n8n Workflow 1: Pattern Analyzer (cron 15min)
9. n8n Workflow 2: Security Alerter (webhook + Telegram + Email)
10. Frontend: `SecurityPage` + 4 components
11. Add Security to sidebar + router

---

## Key Technical Rules

- `security_events` RLS: same policy as all other tables (`tenant_id = jwt.tenant_id`)
- `securityMonitor` middleware registered **before** all routes in `index.ts`
- Backend calls n8n webhook **async** (fire-and-forget) — never blocks the main request
- `login_unusual_time` only fires when `tenants.settings.security.business_hours_*` is set
- Brute force counter queried live from `security_events` table: `COUNT(*) WHERE actor_ip=$1 AND event_type='login_failed' AND created_at > NOW() - INTERVAL '10 minutes'` — survives backend restarts and multi-instance deployments
- `ai_analysis` is jsonb in DB but typed as `SecurityAnalysis` interface in frontend
- Demo uses GPT-4o — switch to Opus by changing model constant + ANTHROPIC_API_KEY env var
