# Emails Module — Design Spec

**Fecha:** 2026-05-28  
**Estado:** APROBADO  
**Proyecto:** AIOS — AI Operating System (NeuraSolutions)

---

## 1. Objetivo

Añadir un módulo de **Emails** al AIOS que permita al equipo autorizado ver los emails recibidos en la cuenta de empresa directamente dentro de la plataforma. El agente AI también puede consultarlos vía chat.

---

## 2. Decisiones confirmadas

| Decisión | Elección |
|----------|---------|
| Fuente de emails | Gmail |
| Conector | n8n workflow con Gmail Trigger (tiempo real) |
| Almacenamiento | Tabla `aios.emails` en PostgreSQL con RLS |
| Acceso frontend | PostgREST con RLS (mismo patrón que Leads/Contacts) |
| Layout UI | Split view — lista izquierda + preview derecha (estilo Gmail desktop) |
| Permisos | Configurable por tenant vía `section_permissions` (admin decide quién accede) |
| Retención | 90 días — purga automática vía scheduled job en n8n |
| Filtrado Gmail | Configurable por tenant (etiqueta/carpeta) desde SettingsPage |
| Activación | NeuraSolutions activa desde AdminPage; tenant admin configura filtro en SettingsPage |
| AI integration | Nueva tool `get_recent_emails` para GPT-4o |

---

## 3. Arquitectura

```
Gmail (cuenta empresa)
        ↓  OAuth gestionado por n8n
n8n Workflow "AIOS Email Watcher" (uno por tenant)
   - Gmail Trigger → email nuevo (tiempo real)
   - IF: label_filter configurado en tenant settings
   - HTTP Request → POST /emails/ingest (service JWT)
        ↓
PostgreSQL — tabla aios.emails (schema aios, RLS por tenant_id)
        ↓                          ↓
PostgREST                    agentTools.ts
(EmailsPage via useQuery)    (get_recent_emails tool)
        ↓                          ↓
Split View UI              AI Chat: "Los últimos emails son..."
lista + preview
```

---

## 4. Base de datos — tabla `aios.emails`

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
  labels       TEXT[],
  is_read      BOOLEAN DEFAULT false,
  received_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, gmail_id)
);

-- RLS
ALTER TABLE aios.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE aios.emails FORCE ROW LEVEL SECURITY;

CREATE POLICY emails_tenant_isolation ON aios.emails
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

GRANT SELECT, INSERT, UPDATE ON aios.emails TO aios_user;
```

**Nota:** `UNIQUE(tenant_id, gmail_id)` evita duplicados si n8n reintenta el POST.

**Purga 90 días:** scheduled job en n8n (cron diario):
```sql
DELETE FROM aios.emails WHERE received_at < now() - interval '90 days';
```
Ejecutado con credenciales de `neura_user` (superuser, no pasa por RLS).

---

## 5. n8n — "AIOS Email Watcher"

Un workflow por tenant. Pasos:

1. **Gmail Trigger** — evento "Message Received" en inbox
2. **IF** — `{{ $json.labelIds.includes(tenantLabelFilter) }}` (si no hay filtro configurado, condición siempre true)
3. **HTTP Request** — `POST https://xneurasolutions-aios-backend.9lagn8.easypanel.host/emails/ingest`
   ```json
   {
     "tenant_id": "{{TENANT_UUID}}",
     "gmail_id": "{{ $json.id }}",
     "from_email": "{{ $json.from }}",
     "from_name": "{{ $json.fromName }}",
     "subject": "{{ $json.subject }}",
     "snippet": "{{ $json.snippet }}",
     "body_text": "{{ $json.text }}",
     "labels": "{{ $json.labelIds }}",
     "received_at": "{{ $json.date }}"
   }
   ```
   Header: `Authorization: Bearer <SERVICE_JWT>`

**SERVICE_JWT:** token firmado con el mismo JWT secret, payload `{ "role": "aios_user", "is_service": true }`. Se genera una vez y se guarda como credencial en n8n.

---

## 6. Backend — `backend/src/routes/emails.ts`

### Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/emails/ingest` | Service JWT | n8n → INSERT en aios.emails (upsert por gmail_id) |
| GET | `/emails/status` | Tenant JWT | Devuelve `{ enabled: bool, label_filter: string \| null }` |

### POST /emails/ingest

- Valida que el JWT tenga `is_service: true`
- Upsert: INSERT ... ON CONFLICT (tenant_id, gmail_id) DO NOTHING
- Responde `{ ok: true }` siempre (idempotente)

### GET /emails/status

- Lee `tenants.settings.email` del tenant del JWT
- Devuelve `{ enabled: bool, label_filter: string | null }`

### Registro en `backend/src/index.ts`

```ts
import emailsRouter from './routes/emails';
app.use('/emails', emailsRouter);
```

---

## 7. Frontend

### Archivos nuevos

```
src/pages/EmailsPage.tsx
src/components/emails/EmailList.tsx
src/components/emails/EmailPreview.tsx
```

### Ruta y sidebar

- Ruta: `/emails`
- Sidebar: ícon `Mail` (lucide), label "Emails", entre Contacts y AI Chat
- Acceso: controlado por `section_permissions`

**Nota:** `section_permissions` existe en el auth store y en la DB pero actualmente NO está implementado en el sidebar — todos los ítems son visibles para todos los roles. El módulo Emails será el primero en usar este control. La implementación añadirá lógica de filtrado en `navigation.ts` o en el componente Sidebar:
- El ítem "Emails" solo aparece si `user.section_permissions.includes('emails')` O si `user.app_role === 'admin'`
- La ruta `/emails` tiene un guard que redirige a `/` si el usuario no tiene permiso

### Layout Split View

```
┌─────────────────────────────────────────────────────┐
│  PageHeader: "Emails"          [🔍 buscar]           │
├──────────────────────┬──────────────────────────────┤
│  EmailList           │  EmailPreview                 │
│  ─────────────────── │  ──────────────────────────── │
│  • [●] De: Ana López │  De: Ana López <ana@emp.com>  │
│    Oferta Q3 - Hola  │  Fecha: 28 may 2026, 10:32    │
│    hace 2h           │  Asunto: Oferta Q3            │
│  ─────────────────── │                               │
│  • De: John Smith    │  Hola, adjunto la propuesta…  │
│    Meeting tomorrow  │  [cuerpo del email]           │
│    ayer              │                               │
└──────────────────────┴──────────────────────────────┘
```

- Panel izquierdo (40%): lista ordenada por `received_at DESC`
  - Badge azul para emails no leídos (`is_read = false`)
  - Remitente, asunto, snippet (truncado), fecha relativa
- Panel derecho (60%): preview del email seleccionado
  - Header: De, Fecha, Asunto
  - Cuerpo: `body_text` (pre-wrap)
  - Estado vacío si ningún email seleccionado
- Al seleccionar email: PATCH `is_read = true` vía PostgREST
- Buscador: filtra por `from_email` y `subject` (client-side sobre los datos cargados)
- Estado vacío global: "No hay emails aún. Conecta tu cuenta de Gmail en Configuración."

### Datos vía PostgREST

```ts
useQuery<Email>('emails', {
  filters: { tenant_id: `eq.${tenantId}` },
  order: 'received_at.desc',
  limit: 100,
})
```

---

## 8. AdminPage — sección Gmail (patrón Telegram)

Nueva sección expandible en cada tenant card, idéntica en estructura a la de Telegram:

- Botón "Configure Gmail" para expandir
- Estado: badge verde "Active" / gris "Inactive"
- Panel expandido muestra instrucciones para que NeuraSolutions configure el workflow n8n para ese tenant
- Toggle para activar/desactivar (`tenants.settings.email.enabled`)

Campos en `tenants.settings`:
```json
{
  "telegram": { ... },
  "email": {
    "enabled": true,
    "label_filter": "INBOX"
  }
}
```

---

## 9. SettingsPage — tab "Email"

Nuevo tab visible solo para usuarios con `app_role = 'admin'`.

Contenido:
- Campo: **Filtro de etiqueta Gmail** — texto libre (ej: `INBOX`, `Label_Clients`)
  - Placeholder: "INBOX (dejar vacío para recibir todos)"
  - Botón "Guardar" → PATCH `tenants.settings.email.label_filter` vía PostgREST
- Sección informativa: instrucciones para vincular Gmail en n8n (contactar con NeuraSolutions)

---

## 10. AI Agent — nueva tool

En `backend/src/lib/agentTools.ts`:

```ts
{
  type: 'function',
  function: {
    name: 'get_recent_emails',
    description: 'Get recent emails received in the company inbox.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max emails to return (default 5, max 20).' },
        search: { type: 'string', description: 'Search by sender or subject.' },
      },
      required: [],
    },
  },
}
```

Implementación:
```sql
SELECT from_name, from_email, subject, snippet, received_at, is_read
FROM aios.emails
WHERE tenant_id = $1
  AND ($2::text IS NULL OR from_email ILIKE '%' || $2 || '%' OR subject ILIKE '%' || $2 || '%')
ORDER BY received_at DESC
LIMIT $3
```

---

## 11. Secuencia de implementación

1. **DB** — crear tabla `aios.emails`, RLS, grant
2. **Backend** — `routes/emails.ts` (ingest + status), registrar en index.ts
3. **n8n** — crear workflow "AIOS Email Watcher" para el tenant demo
4. **Frontend EmailsPage** — lista + preview + buscador + mark as read
5. **Sidebar** — añadir ítem Emails con control de section_permissions
6. **AdminPage** — sección Gmail (toggle + instrucciones)
7. **SettingsPage** — tab Email (label_filter)
8. **agentTools** — añadir get_recent_emails tool + executor
9. **Test end-to-end** — email real → n8n → DB → UI → AI chat
