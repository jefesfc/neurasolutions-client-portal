import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/requireAuth';
import { openai } from '../lib/openai';
import { toolDefinitions, executeTool } from '../lib/agentTools';
import { db } from '../db';
import type OpenAI from 'openai';

const router = Router();

const BACKEND_URL =
  process.env.BACKEND_URL ?? 'https://xneurasolutions-aios-backend.9lagn8.easypanel.host';
const COST_PER_INPUT_TOKEN = 0.0000025;
const COST_PER_OUTPUT_TOKEN = 0.00001;

const SYSTEM_PROMPT = `You are AIOS, an intelligent business assistant built by NeuraSolutions.
You help the company's team analyze their business data: leads, contacts, sales pipeline, and AI usage metrics.
You have tools to query live business data — always use them when the user asks about numbers, lists, or stats.
Be concise, professional, and data-driven. Respond in the same language the user writes in.
Today's date: ${new Date().toISOString().split('T')[0]}.`;

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

interface TenantSettings {
  telegram?: { bot_token: string; enabled: boolean };
}

async function callTelegram(
  botToken: string,
  method: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ ok: boolean; description?: string }>;
}

// POST /telegram/activate — platform admin saves bot token and registers webhook
router.post('/activate', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_platform_admin) {
    res.status(403).json({ error: 'Platform admin required' });
    return;
  }
  const { tenant_id, bot_token } = req.body as { tenant_id: string; bot_token: string };
  if (!tenant_id || !bot_token) {
    res.status(400).json({ error: 'tenant_id and bot_token required' });
    return;
  }
  try {
    const webhookUrl = `${BACKEND_URL}/telegram/webhook/${tenant_id}`;
    const tgRes = await callTelegram(bot_token, 'setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    });
    if (!tgRes.ok) {
      res.status(400).json({ error: `Telegram error: ${tgRes.description ?? 'unknown'}` });
      return;
    }
    await db.query(
      `UPDATE aios.tenants
       SET settings = jsonb_set(COALESCE(settings, '{}'), '{telegram}', $1::jsonb)
       WHERE id = $2`,
      [JSON.stringify({ bot_token, enabled: true }), tenant_id]
    );
    res.json({ ok: true, webhook_url: webhookUrl });
  } catch (err) {
    console.error('[telegram/activate]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /telegram/activate/:tenantId — platform admin checks telegram status for a tenant
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
    const settings = rows[0]?.settings as TenantSettings | undefined;
    res.json({ enabled: settings?.telegram?.enabled ?? false });
  } catch (err) {
    console.error('[telegram/activate GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /telegram/activate/:tenantId — platform admin deactivates bot
router.delete('/activate/:tenantId', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_platform_admin) {
    res.status(403).json({ error: 'Platform admin required' });
    return;
  }
  try {
    const { rows } = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [req.params.tenantId]
    );
    const settings = rows[0]?.settings as TenantSettings | undefined;
    const botToken = settings?.telegram?.bot_token;
    if (botToken) {
      await callTelegram(botToken, 'deleteWebhook', {});
    }
    await db.query(
      `UPDATE aios.tenants SET settings = settings - 'telegram' WHERE id = $1`,
      [req.params.tenantId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[telegram/deactivate]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /telegram/status — tenant admin checks their own link status
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT telegram_user_id FROM aios.users WHERE id = $1`,
      [req.user!.user_id]
    );
    res.json({
      linked: !!rows[0]?.telegram_user_id,
      chat_id: (rows[0]?.telegram_user_id as string | null) ?? null,
    });
  } catch (err) {
    console.error('[telegram/status]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /telegram/link — tenant admin unlinks their Telegram account
router.delete('/link', requireAuth, async (req: Request, res: Response) => {
  try {
    await db.query(
      `UPDATE aios.users SET telegram_user_id = NULL WHERE id = $1`,
      [req.user!.user_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[telegram/link DELETE]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /telegram/webhook/:tenantId — Telegram calls this on every message (no JWT auth)
router.post('/webhook/:tenantId', async (req: Request, res: Response) => {
  const tenantId = req.params.tenantId as string;
  const update = req.body as TelegramUpdate;

  // Always respond 200 immediately — Telegram retries if it doesn't get a 2xx
  res.sendStatus(200);

  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  try {
    const tenantRes = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [tenantId]
    );
    const settings = tenantRes.rows[0]?.settings as TenantSettings | undefined;
    const botToken = settings?.telegram?.bot_token;
    if (!botToken || !settings?.telegram?.enabled) return;

    // /start — linking flow
    if (text === '/start') {
      const updateRes = await db.query(
        `UPDATE aios.users SET telegram_user_id = $1
         WHERE tenant_id = $2 AND role = 'admin' AND telegram_user_id IS NULL
         RETURNING id`,
        [String(chatId), tenantId]
      );
      if (!updateRes.rowCount) {
        // Check if already linked to this chat_id
        const existing = await db.query(
          `SELECT telegram_user_id FROM aios.users
           WHERE tenant_id = $1 AND role = 'admin'`,
          [tenantId]
        );
        const alreadyThis = existing.rows[0]?.telegram_user_id === String(chatId);
        await callTelegram(botToken, 'sendMessage', {
          chat_id: chatId,
          text: alreadyThis
            ? '✅ Ya estás conectado a AIOS. Puedes preguntarme sobre tus leads, contactos y métricas.'
            : '❌ No se pudo vincular la cuenta. El admin ya está vinculado o contacta con soporte.',
        });
        return;
      }
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: '✅ Conectado. Puedes preguntarme sobre tus leads, contactos y métricas de negocio.',
      });
      return;
    }

    // Only process messages from the linked admin
    const userRes = await db.query(
      `SELECT id FROM aios.users WHERE tenant_id = $1 AND telegram_user_id = $2`,
      [tenantId, String(chatId)]
    );
    if (!userRes.rows.length) {
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: `⚠️ DEBUG: chat_id recibido = ${chatId}, no coincide con usuario vinculado. Envía /start para reconectar.`,
      });
      return;
    }
    const userId = userRes.rows[0].id as string;

    // Typing indicator
    await callTelegram(botToken, 'sendChatAction', { chat_id: chatId, action: 'typing' });

    // Load last 20 messages for context
    const historyRes = await db.query(
      `SELECT role, content FROM aios.interactions
       WHERE tenant_id = $1 AND channel = 'telegram' AND entity_type = 'conversation' AND entity_id = $2
       ORDER BY created_at ASC LIMIT 20`,
      [tenantId, String(chatId)]
    );
    const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = historyRes.rows.map((r) => ({
      role: r.role as 'user' | 'assistant',
      content: r.content as string,
    }));

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: text },
    ];

    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let assistantReply = '';

    for (let i = 0; i < 5; i++) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: toolDefinitions,
        tool_choice: 'auto',
      });
      const choice = response.choices[0];
      totalTokensIn += response.usage?.prompt_tokens ?? 0;
      totalTokensOut += response.usage?.completion_tokens ?? 0;

      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        messages.push(choice.message);
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
          const result = await executeTool(toolCall.function.name, args, tenantId);
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
        }
        continue;
      }
      assistantReply = choice.message.content ?? '';
      break;
    }

    if (!assistantReply) {
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: '❌ Error procesando tu mensaje. Inténtalo de nuevo.',
      });
      return;
    }

    // Persist conversation
    await db.query(
      `INSERT INTO aios.interactions (id, tenant_id, user_id, channel, role, content, entity_type, entity_id)
       VALUES ($1,$2,$3,'telegram','user',$4,'conversation',$5),
              ($6,$2,$3,'telegram','assistant',$7,'conversation',$5)`,
      [uuidv4(), tenantId, userId, text, String(chatId), uuidv4(), assistantReply]
    );

    // Track cost
    const cost = totalTokensIn * COST_PER_INPUT_TOKEN + totalTokensOut * COST_PER_OUTPUT_TOKEN;
    await db.query(
      `INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost)
       VALUES ($1,$2,'aios-telegram',$3,$4,'gpt-4o',$5)`,
      [uuidv4(), tenantId, totalTokensIn, totalTokensOut, cost]
    );

    await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: assistantReply });
  } catch (err) {
    console.error('[telegram/webhook]', err);
    try {
      const tenantRes2 = await db.query(`SELECT settings FROM aios.tenants WHERE id = $1`, [tenantId]);
      const botToken2 = (tenantRes2.rows[0]?.settings as TenantSettings | undefined)?.telegram?.bot_token;
      if (botToken2) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await callTelegram(botToken2, 'sendMessage', {
          chat_id: message?.chat.id ?? 0,
          text: `⚠️ Error interno: ${errMsg.slice(0, 200)}`,
        });
      }
    } catch (_) { /* ignore */ }
  }
});

export default router;
