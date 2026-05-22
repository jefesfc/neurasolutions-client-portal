# AIOS Brainstorming Session — 2026-05-14

## Resumen del proyecto

**Producto:** AIOS — AI Operating System  
**Empresa:** NeuraSolutions  
**Objetivo:** Sistema de empresa inteligente vendible como producto, basado en el RAG v4 y la arquitectura de agentes multi-sección.

---

## Decisiones tomadas

### 1. Modelo de despliegue
**Híbrido** — plataforma central de NeuraSolutions, cada cliente ve su propio AIOS branded con datos aislados.

### 2. Stack de agentes
**Híbrido** — el orquestador general es un AI agent nativo (Claude/GPT con tool use), y cada sección dispara workflows especializados de n8n.

### 3. Usuarios de la app
**Dueño + Equipo** — el dueño tiene vista global de todo, cada empleado accede solo a su sección relevante. Sistema de roles: Admin / Manager / User.

### 4. Interfaz del orquestador
**Dual** — chat interno dentro del AIOS (para el equipo) + canal externo WhatsApp/Telegram (para el cliente final de la empresa).

### 5. Modelo de cobro
- NeuraSolutions cobra **suscripción mensual de mantenimiento** al cliente
- Las API keys están internas en los workflows de n8n (gestionadas por NeuraSolutions)
- El cliente solo ve su **consumo de tokens** (informativo, no facturado por separado)

### 6. Módulos — 3 fases

#### Fase 1 — MVP vendible (8 módulos)
1. Dashboard — KPIs del negocio, estado de agentes
2. Leads — Captura, calificación AI, pipeline, scoring
3. Clients / CRM — Clientes activos, historial, notas AI
4. AI Chat / Orquestador — Chat interno + WhatsApp/Telegram (**el diferenciador**)
5. Usage / Tokens — Consumo por agente, gráfica mensual
6. Team — Usuarios, roles y permisos
7. Settings — Integraciones, canales externos, branding
8. Billing — Plan activo, facturas, próximo pago

#### Fase 2 — Alto valor (3 módulos)
9. Emails — Bandeja integrada + respuestas automáticas AI
10. Automations — Vista de workflows n8n activos, logs
11. Analytics — Métricas de agentes, conversiones, ROI

#### Fase 3 — Plataforma completa (2 módulos)
12. Reports — Reportes generados por IA, exportables
13. Tasks — Tareas generadas por agentes, asignadas al equipo

### 7. Módulos existentes en el código actual

| Módulo | Estado | Acción |
|--------|--------|--------|
| Dashboard | Existe | Adaptar contenido |
| AI Systems | Existe | Renombrar → Automations |
| Analytics | Existe | Adaptar contenido |
| Reports | Existe | Adaptar contenido |
| Billing | Existe | Adaptar al modelo suscripción |
| Support | Existe | Adaptar |
| AI Chat | No existe | Construir (prioridad #1) |
| Leads | No existe | Construir |
| Clients/CRM | No existe | Construir |
| Usage/Tokens | No existe | Construir |
| Team | No existe | Construir |
| Settings | No existe | Construir |

### 8. Stack tecnológico

#### Frontend (ya existe)
- React + TypeScript + Vite
- Carpeta: `AIOS/src/`
- Componentes UI base: Button, Card, Badge, Modal, etc.

#### Backend / Infraestructura
- **PostgreSQL** en EasyPanel — fuente de verdad única
- **PostgREST** en EasyPanel — API REST automática para el frontend
- **NocoDB** en EasyPanel — interfaz visual para NeuraSolutions (reemplaza Airtable)
- **n8n** — motor de workflows y automatización (escribe a PostgreSQL)

#### Flujo de datos
```
[Leads / Contactos]
       ↓
     n8n (automatiza, califica, procesa)
       ↓ escribe
  PostgreSQL (EasyPanel) ← fuente de verdad
       ↑ lee/escribe via PostgREST
  AIOS Frontend (React)
  
  NocoDB (EasyPanel) ← NeuraSolutions gestiona datos internamente
```

#### Migración desde sistema actual
- **Airtable** → reemplazado por módulo Clients/Leads sobre PostgreSQL
- **Mirror Airtable→PostgreSQL** → n8n escribe directo a PostgreSQL
- **Metabase** → opcional para uso interno, reemplazado por Analytics del AIOS para el cliente

---

## Infraestructura EasyPanel — COMPLETA ✅

| Servicio | Estado | Detalle |
|----------|--------|---------|
| PostgreSQL `neura_core` | ✅ | Host: `xneurasolutions_postgres-neura`, user: `neura_user` |
| n8n | ✅ | Existente |
| NocoDB | ✅ | Conectado a `neura_core`, uso interno NeuraSolutions |
| PostgREST | ✅ | URL: `https://xneurasolutions-postgrest.9lagn8.easypanel.host/`, schema: `aios` |

**Schema separado:** Se creó schema `aios` en PostgreSQL. PostgREST expone solo `aios`, no las tablas internas de NocoDB (que están en `public`).

**PostgREST config final:**
```
PGRST_DB_URI=postgresql://neura_user:Neura2026Secure@xneurasolutions_postgres-neura:5432/neura_core
PGRST_DB_ANON_ROLE=neura_user
PGRST_DB_SCHEMA=aios
PGRST_JWT_SECRET=neura-postgrest-jwt-secret-2026-min32ch
PGRST_SERVER_HOST=0.0.0.0
PGRST_SERVER_PORT=3000
```

## Arquitectura de Agentes — Decisión pendiente

**3 opciones propuestas:**

- **A) Orquestador LLM + Agentes n8n** ← RECOMENDADO
- **B) Router por reglas + Agentes n8n** (sin LLM en orquestador)
- **C) Multi-agente LLM completo** (LangGraph/CrewAI, abandona n8n)

## Pendiente para la próxima sesión

- [ ] Confirmar opción de arquitectura de agentes (A/B/C)
- [ ] Diseñar el flujo detallado del orquestador
- [ ] Definir herramientas (tools) de cada agente por sección
- [ ] Crear tablas en schema `aios` de PostgreSQL
- [ ] Diseñar el sistema de roles y permisos multi-tenant
- [ ] Escribir spec documento completo
- [ ] Crear plan de implementación (writing-plans)

---

## Contexto NeuraSolutions (RAG v4)

- Sistema 3 del catálogo: AI Operating System desde £10,000 setup
- Mantenimiento desde £400/mes
- Servicios core: AI Agents, Automation, RAG Systems, CRM-lite, Web Integrations
