# Security AI Agent — Estado del Proyecto
**Fecha:** 2026-06-03  
**Estado:** Código completo y pusheado a `main`. Pendiente: n8n + EasyPanel env vars.

---

## ✅ Completado (17 commits en production)

### Backend
| Commit | Descripción |
|--------|-------------|
| `1a3caff` | feat: add security_events migration script |
| `b5a7c02` | fix: split policy drop+create into separate queries |
| `6a0cb72` | feat: install @anthropic-ai/sdk — ready for clinic fork |
| `d21733f` | feat: add securityEvents lib — emitSecurityEvent + helpers |
| `338ad86` | feat: add securityAnalyzer — GPT-4o event analysis (Opus-ready) |
| `b17cd43` | feat: add /security routes — events, summary, resolve, analyze |
| `5b8f523` | feat: add securityMonitor middleware — 404 pattern detector |
| `557ff0a` | feat: emit login_failed, brute_force, login_new_ip security events |
| `c41a2a2` | feat: add prompt injection guardrail to /chat |
| `16000bd` | feat: add suspicious email guardrail + is_flagged to emails ingest |
| `298635d` | feat: emit admin_created + permission_escalation security events |
| `773e582` | feat: register securityMonitor middleware and /security routes |

### Frontend
| Commit | Descripción |
|--------|-------------|
| `9c3e0a6` | feat: add SecurityEvent + SecurityAnalysis TypeScript types |
| `2231ed4` | feat: add Security UI components — KPIRow, Timeline, EventsTable, Modal |
| `acc977b` | feat: add SecurityPage — KPI row + timeline + events table |
| `e945941` | feat: add /security route + Security nav item (admin-only) |

### Fixes post-review
| Commit | Descripción |
|--------|-------------|
| `5cb9e8c` | fix: remove FORCE RLS, populate admin_email, guard login emit from DB failures |

### DB (ya ejecutado en producción)
- Tabla `aios.security_events` creada con RLS (ENABLE, NO FORCE)
- Columna `is_flagged boolean DEFAULT false` añadida a `aios.emails`
- PostgREST notificado (`NOTIFY pgrst`)

---

## 🔄 Pendiente — Orden de ejecución

### Paso 1: Deploy backend en EasyPanel
- Ir a EasyPanel → servicio backend → Deploy
- El backend carga el nuevo código (security routes, middleware, guardrails)
- **No rompe nada** — las env vars opcionales tienen graceful fallback

### Paso 2: Crear Workflow 2 en n8n UI — "AIOS - Security Alerter"
1. New Workflow → nombre: **"AIOS - Security Alerter"**
2. **Webhook trigger**
   - Method: POST
   - Path: `aios-security-alert`
   - Auth: None
   - ⚠️ **Copiar la webhook URL generada** → la necesitas para el Paso 3
3. **Code node** — formatear mensaje:
```javascript
const event = $input.first().json;

const SEVERITY_EMOJI = { medium: '⚠️', high: '🚨', critical: '🔴' };
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
4. **Branch A — Telegram node**
   - Credential: "Telegram account" (existente)
   - Operation: Send Message
   - Chat ID: ID del admin en Telegram
   - Text: `={{ $json.telegram_msg }}`
5. **Branch B — Gmail node**
   - Credential: "Neura account" (neurasolutionscloud@gmail.com, existente)
   - Operation: Send
   - To: `={{ $json.admin_email }}`
   - Subject: `={{ $json.email_subject }}`
   - Message: `={{ $json.telegram_msg }}`
6. **Activar workflow**

### Paso 3: Añadir env vars en EasyPanel (backend)
```
N8N_SECURITY_WEBHOOK_URL=<URL copiada del Paso 2>
SERVICE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc19zZXJ2aWNlIjp0cnVlLCJpYXQiOjE3Nzk5NjAwNTcsImV4cCI6MjA5NTMyMDA1N30.H2RQIX32fIz9DjVAXee8bEO8cg8cdBbqNSJ44YsRnWs
BACKEND_URL=https://xneurasolutions-aios-backend.9lagn8.easypanel.host
```
→ Guardar → **Redeploy**

### Paso 4: Crear Workflow 1 en n8n UI — "AIOS - Security Pattern Analyzer"
1. New Workflow → nombre: **"AIOS - Security Pattern Analyzer"**
2. **Schedule Trigger** — Every 15 minutes
3. **HTTP Request node** — fetch eventos recientes
   - Method: GET
   - URL: `https://xneurasolutions-aios-backend.9lagn8.easypanel.host/security/events`
   - Auth: Generic Credential Type → Header Auth
   - Header Name: `Authorization`
   - Header Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc19zZXJ2aWNlIjp0cnVlLCJpYXQiOjE3Nzk5NjAwNTcsImV4cCI6MjA5NTMyMDA1N30.H2RQIX32fIz9DjVAXee8bEO8cg8cdBbqNSJ44YsRnWs`
   - Query params: `severity=low`, `resolved=false`
4. **Code node** — detectar patrones:
```javascript
const items = $input.all();
const events = items.map(i => i.json);

const ipCounts = {};
const now = Date.now();
for (const e of events) {
  const age = now - new Date(e.created_at).getTime();
  if (age > 15 * 60 * 1000) continue;
  const key = e.actor_ip ?? 'unknown';
  if (!ipCounts[key]) ipCounts[key] = { count: 0, tenant_id: e.tenant_id, actor_ip: e.actor_ip };
  ipCounts[key].count++;
}

const suspicious = Object.values(ipCounts).filter(v => v.count >= 3);
return suspicious.map(v => ({ json: v }));
```
5. **IF node** — `{{ $json.count }}` number >= 3 (singleValue: true)
6. **HTTP Request node** (true branch) — trigger analyze
   - Method: POST
   - URL: `https://xneurasolutions-aios-backend.9lagn8.easypanel.host/security/analyze`
   - Auth: mismo Header Auth
   - Body JSON: `{ "event_id": "={{ $json.event_id }}", "tenant_id": "={{ $json.tenant_id }}" }`
7. **Activar workflow**

### Paso 5: Test end-to-end
1. Intentar 5+ logins fallidos → verificar evento `brute_force` en DB
2. Abrir `/security` en AIOS (admin) → ver el evento con AI analysis
3. Comprobar que llega Telegram + email
4. Mandar un mensaje de chat con "ignore your instructions" → verificar `prompt_injection_attempt`

---

## Archivos clave del proyecto

| Archivo | Descripción |
|---------|-------------|
| `docs/superpowers/specs/2026-06-03-security-agent-design.md` | Spec completo aprobado |
| `docs/superpowers/plans/2026-06-03-security-agent.md` | Plan de 20 tareas |
| `backend/src/lib/securityEvents.ts` | Core event emitter |
| `backend/src/lib/securityAnalyzer.ts` | GPT-4o analysis (Opus-ready) |
| `backend/src/lib/anthropic.ts` | Client stub para clinic fork |
| `backend/src/routes/security.ts` | 5 endpoints /security/* |
| `backend/src/middleware/securityMonitor.ts` | 404 detector |
| `src/pages/SecurityPage.tsx` | Dashboard de seguridad |
| `scripts/create-security-tables.js` | Migración DB (ya ejecutada) |

---

## Nota para clinic fork (cuando llegue el momento)

1. Fork del repo actual
2. En `backend/src/lib/securityAnalyzer.ts`, descomentar las 3 líneas marcadas con `// Clinic fork:`
3. Cambiar `model: 'gpt-4o'` → `model: 'claude-opus-4-8'`
4. Añadir `ANTHROPIC_API_KEY=sk-ant-...` en EasyPanel del fork
5. La dependencia `@anthropic-ai/sdk` ya está instalada — no hay que añadir nada más
