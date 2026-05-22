# Telegram Integration — AIOS Design Spec

**Date:** 2026-05-22  
**Status:** Approved  
**Scope:** Bidirectional chat between tenant admin and GPT-4o agent via Telegram bot (per-tenant bot model). Proactive notifications are out of scope for this phase.

---

## Overview

Each AIOS client (tenant) gets their own dedicated Telegram bot. The tenant's admin can chat with the AIOS AI agent from Telegram, receiving the same GPT-4o agentic responses as the web chat. NeuraSolutions platform admins activate Telegram per tenant by providing the bot token via the admin panel.

---

## Architecture

**Approach:** Webhook per tenant, single backend endpoint.

- Endpoint: `POST /telegram/webhook/:tenantId`
- Each tenant bot registers its webhook pointing to that URL with its own `tenantId`
- The backend identifies the tenant from the URL param, looks up the bot token from `tenants.settings`, and processes the message

**Reused without changes:**
- `backend/src/lib/agentTools.ts` — GPT-4o tool definitions and execution
- `backend/src/lib/openai.ts` — OpenAI client
- `backend/src/db.ts` — database pool

**New file:**
- `backend/src/routes/telegram.ts` — webhook handler + activation endpoint

---

## Database

No new tables required.

### `tenants.settings` (JSONB, existing column)
Stores per-tenant Telegram config:
```json
{
  "telegram": {
    "bot_token": "123456:ABC...",
    "enabled": true
  }
}
```

### `users.telegram_user_id` (TEXT, existing column)
Stores the Telegram `chat_id` of the linked admin. Set automatically on `/start`.

### `aios.interactions` (existing table)
Telegram messages stored with `channel = 'telegram'`. The Telegram `chat_id` is used as `entity_id` (equivalent to `conversation_id` in web chat), preserving conversation context across messages.

### `aios.token_usage` (existing table)
Costs tracked with `agent_name = 'aios-telegram'`.

---

## Activation Flow (Platform Admin)

1. Platform admin opens `/admin` → selects tenant → adds `bot_token` in a new "Telegram" field
2. Backend saves token to `tenants.settings.telegram` and calls Telegram API to register webhook:
   ```
   POST https://api.telegram.org/bot{TOKEN}/setWebhook
   Body: { url: "https://<backend-host>/telegram/webhook/{tenantId}" }
   ```
3. Bot is now active for that tenant. Status shows `Active ✅` in admin panel.

---

## Linking Flow (Tenant Admin)

1. Tenant admin opens their company's Telegram bot and sends `/start`
2. Backend receives webhook for that `tenantId`
3. Looks up `users` for a user with `app_role = 'admin'` in that tenant where `telegram_user_id IS NULL`
4. Saves the incoming `chat_id` to `users.telegram_user_id`
5. Bot replies: "✅ Conectado. Puedes preguntarme sobre tus leads, contactos y métricas de negocio."

If the admin is already linked, `/start` replies with a confirmation that they are already connected.

---

## Chat Flow (Per Message)

For every text message received at `POST /telegram/webhook/:tenantId`:

1. Load tenant's `bot_token` from `tenants.settings`
2. Verify incoming `chat_id` matches the admin's `telegram_user_id` — if not, ignore silently
3. Send `sendChatAction` (typing indicator) to Telegram
4. Run the GPT-4o agentic loop (same as `/chat` route):
   - Load last 20 messages from `interactions` for this `chat_id`
   - Execute tool calls if needed (`get_business_stats`, `query_leads`, `query_contacts`, `get_recent_activity`)
   - Get final assistant reply
5. Persist user + assistant messages to `aios.interactions` with `channel = 'telegram'`
6. Track cost in `aios.token_usage` with `agent_name = 'aios-telegram'`
7. Send reply via Telegram `sendMessage`

**Error handling:** If the agentic loop fails, send a generic error message in the user's language. Never crash silently.

---

## Frontend Changes

### 1. AdminPage (`/admin`) — Telegram activation per tenant
- New "Telegram Bot Token" field in the tenant config panel
- On save: backend stores token + registers webhook automatically
- Status indicator: `Active ✅` or `Inactive`

### 2. SettingsPage (`/settings`) — new "Telegram" tab
- Tab added alongside existing "Company" and "Security" tabs
- **If linked:** Shows `Connected ✅` with a "Disconnect" button (clears `telegram_user_id`)
- **If not linked:** Shows step-by-step instructions:
  1. Find your company bot in Telegram
  2. Send `/start`
  3. The bot will confirm the connection automatically

No codes to copy. Linking is fully automatic via `/start`.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/telegram/webhook/:tenantId` | None (Telegram calls this) | Receive Telegram updates |
| `POST` | `/telegram/activate` | Platform admin JWT | Save bot token + register webhook |
| `DELETE` | `/telegram/activate/:tenantId` | Platform admin JWT | Disable bot + delete webhook |
| `DELETE` | `/telegram/link` | Tenant user JWT | Disconnect admin's Telegram account |

---

## Security

- Webhook endpoint has no JWT auth (Telegram cannot send tokens). Security is by obscurity of the `tenantId` UUID in the URL — sufficient for this use case.
- Only messages from the linked admin `chat_id` are processed; all others are silently ignored.
- Bot tokens stored in `tenants.settings` (encrypted at rest by PostgreSQL server-level encryption if configured).

---

## Out of Scope (This Phase)

- Proactive notifications (new lead alerts, won/lost events) — future phase
- Multiple users per tenant on Telegram (only admin supported)
- WhatsApp integration
- Message formatting (Markdown in Telegram responses) — can be added trivially later
