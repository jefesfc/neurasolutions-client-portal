import { Router, Request, Response } from 'express';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { toFile } from 'openai';

const TELEGRAM_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
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
You help the company's team analyze their business data: leads, clients, calendar events, emails, sales pipeline, team members, security events, invoicing, and AI usage metrics. The CRM module is called "Clients" — always use the word "client" (never "contact") when referring to CRM records.
You have tools to query live business data — always use them when the user asks about numbers, lists, stats, meetings, scheduled events, revenue, or security.
Be concise, professional, and data-driven.
Today's date: ${new Date().toISOString().split('T')[0]}.

LANGUAGE RULE (mandatory): Detect the language of the user's message (text or transcribed voice) and reply in that EXACT same language. Spanish → Spanish. Chinese → Chinese. French → French. Arabic → Arabic. Portuguese → Portuguese. German → German. English → English. NEVER respond in English if the user wrote or spoke in another language. Mirror the user's language in every single reply, no exceptions.

REPORT FORMAT (mandatory when your response contains structured data — metrics, KPIs, tables, lists with numbers, financial summaries, or business reports):
Return ONLY a valid JSON object — no markdown code fences, no extra text before or after the JSON:
{"type":"report","title":"<concise title>","subtitle":"<e.g. June 2026, optional>","intro":"<1 sentence intro, optional>","sections":[{"label":"<section name>","icon":"<1 emoji>","color":"<hex color>","items":[{"label":"<metric name>","value":"<formatted value>","highlight":"positive|negative (optional)","sub":[{"label":"<sub-label>","value":"<sub-value>","highlight":"positive|negative (optional)"}]}]}]}
Rules: use "positive" highlight for good results, "negative" for bad. Omit optional fields when not needed.
For purely conversational replies with no structured data, reply in plain text as always.`;

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    voice?: { file_id: string; duration: number; mime_type?: string };
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

async function sendVoiceTelegram(
  botToken: string,
  chatId: number,
  buf: Buffer
): Promise<void> {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('voice', new Blob([buf], { type: 'audio/mpeg' }), 'reply.mp3');
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    throw new Error(`sendVoice failed: ${res.status} ${res.statusText}`);
  }
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
      allowed_updates: ['message'],  // 'message' already includes voice, text, etc.
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
  if (!message?.text && !message?.voice) return;
  const isVoiceInput = !!message.voice;

  const chatId = message.chat.id;
  const conversationId = uuidv5(String(chatId), TELEGRAM_NS);

  try {
    const tenantRes = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [tenantId]
    );
    const settings = tenantRes.rows[0]?.settings as TenantSettings | undefined;
    const botToken = settings?.telegram?.bot_token;
    if (!botToken || !settings?.telegram?.enabled) return;

    // Resolve text: transcribe voice if needed
    let text: string;
    if (message.voice) {
      const fileRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${message.voice.file_id}`
      );
      const fileData = (await fileRes.json()) as { ok: boolean; result?: { file_path: string } };
      if (!fileData.ok || !fileData.result?.file_path) return;

      const audioRes = await fetch(
        `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
      );
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      const voiceFile = await toFile(audioBuffer, 'voice.ogg', { type: 'audio/ogg' });

      const transcription = await openai.audio.transcriptions.create({
        file: voiceFile,
        model: 'whisper-1',
      });
      text = transcription.text.trim();
      if (!text) return;

      // Let the user know AIOS heard them
      await callTelegram(botToken, 'sendChatAction', { chat_id: chatId, action: 'typing' });
    } else {
      text = message.text!.trim();
    }

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
            ? '✅ You are already connected to AIOS. You can ask me about your leads, clients, calendar, and metrics.'
            : '❌ Could not link the account. The admin is already linked or please contact support.',
        });
        return;
      }
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: '✅ Connected. You can ask me about your leads, clients, calendar events, emails, and business metrics.',
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
        text: '⚠️ Your Telegram account is not linked. Send /start to connect.',
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
      [tenantId, conversationId]
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
        text: '❌ Error processing your message. Please try again.',
      });
      return;
    }

    // Extract readable text for Telegram (JSON reports can't be rendered in Telegram)
    const strippedTg = assistantReply.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
    let replyText = assistantReply;
    try {
      const parsed = JSON.parse(strippedTg) as { type?: string; intro?: string; title?: string };
      if (parsed?.type === 'report') {
        replyText = parsed.intro
          ? `📊 ${parsed.intro}`
          : `📊 ${parsed.title ?? 'Report generated.'} Open the AIOS web app for the full report.`;
      }
    } catch { /* plain text — replyText stays as assistantReply */ }

    // Persist conversation
    await db.query(
      `INSERT INTO aios.interactions (id, tenant_id, user_id, channel, role, content, entity_type, entity_id)
       VALUES ($1,$2,$3,'telegram','user',$4,'conversation',$5),
              ($6,$2,$3,'telegram','assistant',$7,'conversation',$5)`,
      [uuidv4(), tenantId, userId, text, conversationId, uuidv4(), assistantReply]
    );

    // Track cost
    const cost = totalTokensIn * COST_PER_INPUT_TOKEN + totalTokensOut * COST_PER_OUTPUT_TOKEN;
    await db.query(
      `INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost)
       VALUES ($1,$2,'aios-telegram',$3,$4,'gpt-4o',$5)`,
      [uuidv4(), tenantId, totalTokensIn, totalTokensOut, cost]
    );

    if (isVoiceInput) {
      try {
        const tts = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'alloy',
          input: replyText,
        });
        const audioBuffer = Buffer.from(await tts.arrayBuffer());

        // Track TTS cost (character-based: $0.015 / 1K chars)
        const ttsCost = (replyText.length / 1000) * 0.015;
        await db.query(
          `INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost)
           VALUES ($1,$2,'aios-telegram-tts',$3,0,'tts-1',$4)`,
          [uuidv4(), tenantId, replyText.length, ttsCost]
        );

        await sendVoiceTelegram(botToken, chatId, audioBuffer);
      } catch (err) {
        console.error('[telegram/tts]', err);
        // Fallback: send text so the bot never goes silent
        await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: replyText });
      }
    } else {
      await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: replyText });
    }
  } catch (err) {
    console.error('[telegram/webhook]', err);
  }
});

export default router;
