# AIOS — Sesión de Diseño Completa
**Fecha:** 2026-05-15  
**Estado:** En progreso — Arquitectura de agentes pendiente de confirmar

---

## 1. Resumen del Proyecto

**Producto:** AIOS — AI Operating System  
**Empresa:** NeuraSolutions  
**Objetivo:** Plataforma de empresa inteligente vendible. Sistema multi-agente donde cada sección del negocio tiene su propio agente especializado, coordinado por un orquestador general que se comunica con el equipo interno y con los clientes finales.

**Precio base:** £10,000 setup + £400/mes mantenimiento (Sistema 3 del catálogo RAG v4)

---

## 2. Decisiones Confirmadas

### Modelo de despliegue
**Híbrido** — plataforma central de NeuraSolutions, cada cliente ve su AIOS branded con datos completamente aislados por tenant.

### Stack de agentes
**Híbrido** — orquestador general como AI agent nativo (Claude/GPT con tool use) + cada sección tiene workflows especializados de n8n como herramientas del agente.

### Usuarios
| Rol | Acceso | Función |
|-----|--------|---------|
| Admin (Dueño) | Todo + configuración | Vista global, KPIs, control de agentes |
| Manager | Módulos asignados | Gestión de su área |
| User (Empleado) | Solo su sección | Trabajo operativo diario |
| NeuraSolutions | NocoDB + Metabase (interno) | Monitoreo de todos los clientes |

### Interfaz del orquestador
**Dual:**
- Chat interno en el AIOS (equipo de la empresa)
- Canal externo WhatsApp / Telegram (clientes finales de la empresa)

### Modelo de cobro
- NeuraSolutions cobra **suscripción mensual** al cliente
- API keys de IA gestionadas internamente por NeuraSolutions en n8n
- El cliente solo ve su **consumo de tokens** (informativo, no facturado por separado)

---

## 3. Módulos — Plan de 3 Fases

### Fase 1 — MVP Vendible (8 módulos)

| # | Módulo | Estado en código | Trabajo |
|---|--------|-----------------|---------|
| 1 | Dashboard | ✅ Existe | Adaptar KPIs a datos reales |
| 2 | Leads | ❌ Nuevo | Pipeline kanban + scoring AI |
| 3 | Clients / CRM | ❌ Nuevo | Perfiles + historial + notas AI |
| 4 | **AI Chat / Orquestador** | ❌ Nuevo ⭐ | Chat + WebSocket + WA/Telegram |
| 5 | Usage / Tokens | ❌ Nuevo | Gráfica consumo por agente |
| 6 | Team | ❌ Nuevo | Usuarios + roles + permisos |
| 7 | Settings | ❌ Nuevo | Integraciones + branding |
| 8 | Billing | ✅ Existe | Adaptar al modelo suscripción |

### Fase 2 — Alto Valor (3 módulos)

| # | Módulo | Estado | Trabajo |
|---|--------|--------|---------|
| 9 | Emails | ❌ Nuevo | Bandeja + respuestas AI + seguimientos |
| 10 | Automations | ✅ Existe (AI Systems) | Renombrar + conectar n8n status |
| 11 | Analytics | ✅ Existe | Adaptar a métricas reales |

### Fase 3 — Plataforma Completa (2 módulos)

| # | Módulo | Estado | Trabajo |
|---|--------|--------|---------|
| 12 | Reports | ✅ Existe | Conectar reportes generados por IA |
| 13 | Tasks | ❌ Nuevo | Tareas creadas por agentes |

### Precio por fase
- **Fase 1 — Plan Starter:** £10,000 setup + £400/mes · hasta 5 usuarios
- **Fase 2 — Plan Growth:** £15,000 setup + £700/mes · hasta 15 usuarios
- **Fase 3 — Plan Enterprise:** £20,000+ setup + £1,200/mes · usuarios ilimitados

---

## 4. Stack Tecnológico Completo

### Frontend
- React + TypeScript + Vite
- Base: `AIOS/src/` — componentes UI ya existentes (Button, Card, Badge, Modal, etc.)

### Infraestructura EasyPanel — COMPLETA ✅

| Servicio | URL / Host | Credenciales | Notas |
|----------|-----------|--------------|-------|
| PostgreSQL | `xneurasolutions_postgres-neura:5432` | user: `neura_user`, db: `neura_core` | Fuente de verdad |
| n8n | Existente | — | Motor de workflows |
| NocoDB | EasyPanel | — | Admin visual interno NeuraSolutions |
| PostgREST | `https://xneurasolutions-postgrest.9lagn8.easypanel.host` | — | API REST para frontend |
| Metabase | Existente | — | Analytics interno NeuraSolutions |

### PostgREST — Config Final
```
PGRST_DB_URI=postgresql://neura_user:Neura2026Secure@xneurasolutions_postgres-neura:5432/neura_core
PGRST_DB_ANON_ROLE=neura_user
PGRST_DB_SCHEMA=aios
PGRST_JWT_SECRET=neura-postgrest-jwt-secret-2026-min32ch
PGRST_SERVER_HOST=0.0.0.0
PGRST_SERVER_PORT=3000
```

### Schemas PostgreSQL
```
neura_core (base de datos)
├── schema: public   ← tablas internas NocoDB + tablas existentes
└── schema: aios     ← TODAS las tablas del AIOS (PostgREST solo expone esto)
```

### Flujo de datos
```
[WhatsApp / Web / Chat / Email]
           ↓
     n8n workflows (automatiza, califica, procesa)
           ↓ escribe en schema aios
     PostgreSQL neura_core
           ↑ lee/escribe via PostgREST (schema aios)
     AIOS Frontend (React)          NocoDB (admin interno)
```

### Migración desde sistema actual
| Sistema actual | Estado | Reemplazado por |
|---------------|--------|-----------------|
| Airtable | Deprecar | Módulos Leads + Clients en PostgreSQL schema aios |
| Mirror Airtable→PostgreSQL | Eliminar | n8n escribe directo a PostgreSQL |
| Metabase | Mantener (interno) | Analytics del AIOS para el cliente |

---

## 5. Arquitectura de Agentes — PENDIENTE DE CONFIRMAR

### Opción A — Orquestador LLM + Agentes n8n ⭐ RECOMENDADA
El orquestador es Claude/GPT con tool use real. Recibe el mensaje, decide qué hacer, y llama a workflows n8n como herramientas. Cada sección = un workflow n8n especializado.

**Flujo:** Usuario → Claude (analiza + decide) → llama tool `n8n_leads_qualify` → n8n ejecuta → respuesta

**Pros:** lenguaje natural real, decisión dinámica, fácil escalar  
**Contras:** costo de tokens, latencia ~1-3s

### Opción B — Router por reglas + Agentes n8n
Sin LLM en el orquestador. Keywords/reglas clasifican el intent y enrutan al workflow correcto.

**Pros:** costo mínimo, respuesta instantánea  
**Contras:** no entiende lenguaje natural, experiencia robótica

### Opción C — Multi-agente LLM completo (LangGraph/CrewAI)
Cada agente es un LLM independiente. Abandona n8n como capa de agentes.

**Pros:** máxima inteligencia  
**Contras:** muy caro, lento, abandona n8n, overkill

---

## 6. Tablas PostgreSQL — Schema `aios` (por crear)

### Fase 1 — tablas necesarias

```sql
-- Multi-tenancy
tenants (id, name, subdomain, plan, settings, created_at)
users (id, tenant_id, email, role, section_permissions, created_at)

-- Módulos core
leads (id, tenant_id, name, email, phone, source, status, score, assigned_to, created_at)
clients (id, tenant_id, name, email, phone, company, status, created_at)
interactions (id, tenant_id, entity_type, entity_id, channel, content, created_at)
token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost, created_at)
```

---

## 7. Pendiente

- [ ] **Confirmar opción de arquitectura de agentes** (A / B / C)
- [ ] Diseñar flujo detallado del orquestador
- [ ] Definir tools de cada agente especializado
- [ ] Crear tablas en schema `aios` de PostgreSQL
- [ ] Diseñar sistema de autenticación y roles multi-tenant
- [ ] Escribir spec documento completo
- [ ] Crear plan de implementación (writing-plans)

---

## 8. Contexto NeuraSolutions (RAG v4)

- Sistema 1 — Lead Engine: desde £2,000
- Sistema 2 — Sales System: desde £4,000
- Sistema 3 — AI Operating System: desde £10,000 ← **este producto**
- Mantenimiento: desde £400/mes
- Servicios: AI Agents, Automation, RAG Systems, CRM-lite, Web Integrations
