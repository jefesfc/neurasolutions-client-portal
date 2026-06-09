# Emails Module — Design Spec (DRAFT)

**Fecha:** 2026-05-27  
**Estado:** DRAFT — brainstorming en progreso, pendiente completar  
**Proyecto:** AIOS — AI Operating System (NeuraSolutions)

---

## 1. Objetivo

Añadir un módulo de **Emails** al AIOS que permita al CEO y a los usuarios autorizados ver los emails recibidos en la cuenta de empresa, directamente dentro de la plataforma. El agente AI también podrá consultarlos ("muéstrame los últimos emails").

---

## 2. Decisiones confirmadas

| Decisión | Elección |
|----------|---------|
| Fuente de emails | **Gmail** |
| Conector | **n8n workflow** (gestiona el OAuth con Gmail) |
| Almacenamiento | Tabla `aios.emails` en PostgreSQL |
| Acceso frontend | PostgREST con RLS (mismo patrón que Leads/Contacts) |
| Layout UI | **B — Split view** (lista izquierda + preview derecha, estilo Gmail desktop) |
| Filtrado | **Configurable por tenant** — todos los emails O filtrados por etiqueta/carpeta de Gmail |
| AI integration | Nueva tool `get_recent_emails` para el agente GPT-4o |

---

## 3. Arquitectura

```
Gmail (cuenta empresa)
        ↓  OAuth gestionado por n8n
n8n Workflow "AIOS Email Watcher"
   - Trigger: Gmail Trigger (nuevo email) o poll cada X minutos
   - Filter: opcional por etiqueta (configurable en settings)
   - Action: POST a backend AIOS → INSERT en aios.emails
        ↓
PostgreSQL — tabla aios.emails (schema aios, RLS por tenant)
        ↓                          ↓
PostgREST                    agentTools.ts
(frontend Emails module)     (get_recent_emails tool)
        ↓                          ↓
Split View UI              AI Chat responde:
lista + preview            "Los últimos 5 emails son..."
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
  to_email     TEXT,
  subject      TEXT,
  snippet      TEXT,
  body_text    TEXT,
  labels       TEXT[],
  is_read      BOOLEAN DEFAULT false,
  received_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

Con RLS por `tenant_id` (mismo patrón que el resto de tablas).

---

## 5. n8n Workflow — "AIOS Email Watcher"

1. **Gmail Trigger** — nuevo email en inbox (o poll cada 5 min)
2. **IF** — filtro opcional por etiqueta configurada en tenant settings
3. **HTTP Request** — POST `/emails/ingest` al backend AIOS

---

## 6. Frontend — Layout Split View

**Ruta:** `/emails`  
**Archivo:** `src/pages/EmailsPage.tsx`

- **Panel izquierdo:** lista de emails (remitente, asunto, snippet, fecha, badge no leído)
- **Panel derecho:** preview del email seleccionado (header + cuerpo HTML/texto)
- Buscador por remitente/asunto
- Al seleccionar → marca como leído vía PostgREST PATCH
- Ítem en sidebar con icono `Mail` (lucide)

---

## 7. AI Chat — nueva tool

```
get_recent_emails(limit, search?)
→ query aios.emails por tenant_id, ORDER BY received_at DESC
```

El CEO puede preguntar: *"¿Cuáles son los últimos emails?"* y el agente los muestra.

---

## 8. Pendiente de decidir (próxima sesión)

- [ ] ¿Trigger Gmail en tiempo real o poll cada X minutos?
- [ ] ¿Permisos: solo admin/manager, o también user?
- [ ] ¿Límite de emails almacenados por tenant?
- [ ] Tab "Email" en SettingsPage para configurar filtro por etiqueta

---

*Spec creada el 2026-05-27. Brainstorming al ~70% — retomar en próxima sesión.*
