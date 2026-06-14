import { Router, Request, Response } from 'express';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { toFile } from 'openai';

const TELEGRAM_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
import { requireAuth } from '../middleware/requireAuth';
import { openai } from '../lib/openai';
import { queryKnowledge } from '../lib/pinecone';
import { toolDefinitions, executeTool } from '../lib/agentTools';
import { db } from '../db';
import type OpenAI from 'openai';

const router = Router();

interface TgReportItem { label: string; value: string; highlight?: string; sub?: Array<{ label: string; value: string; highlight?: string }> }
interface TgReportSection { label: string; icon: string; items: TgReportItem[] }
interface TgReport { type?: string; title?: string; subtitle?: string; intro?: string; sections?: TgReportSection[] }

function formatReportForTelegram(r: TgReport): string {
  const lines: string[] = [];
  const header = r.subtitle ? `📊 ${r.title} — ${r.subtitle}` : `📊 ${r.title}`;
  lines.push(header);
  if (r.intro) { lines.push(''); lines.push(r.intro); }
  for (const section of r.sections ?? []) {
    lines.push('');
    lines.push(`${section.icon} ${section.label.toUpperCase()}`);
    for (const item of section.items ?? []) {
      const badge = item.highlight === 'positive' ? ' ✅' : item.highlight === 'negative' ? ' ❌' : '';
      lines.push(`• ${item.label}: ${item.value}${badge}`);
      for (const s of item.sub ?? []) {
        const sb = s.highlight === 'positive' ? ' ✅' : s.highlight === 'negative' ? ' ❌' : '';
        lines.push(`  ↳ ${s.label}: ${s.value}${sb}`);
      }
    }
  }
  return lines.join('\n');
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '• ')
    .trim();
}

function generateReportCSV(r: TgReport): string {
  const lines: string[] = ['Section,Metric,Value,Flag'];
  for (const section of r.sections ?? []) {
    for (const item of section.items ?? []) {
      lines.push(`"${section.label}","${item.label}","${item.value}","${item.highlight ?? ''}"`);
      for (const s of item.sub ?? []) {
        lines.push(`"${section.label} — ${item.label}","${s.label}","${s.value}","${s.highlight ?? ''}"`);
      }
    }
  }
  return lines.join('\n');
}

async function sendDocumentTelegram(
  botToken: string,
  chatId: number,
  buf: Buffer,
  filename: string
): Promise<void> {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', new Blob([buf], { type: 'text/csv' }), filename);
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`sendDocument failed: ${res.status}`);
}

const BACKEND_URL =
  process.env.BACKEND_URL ?? 'https://xneurasolutions-aios-backend.9lagn8.easypanel.host';
const COST_PER_INPUT_TOKEN = 0.0000025;
const COST_PER_OUTPUT_TOKEN = 0.00001;

const SYSTEM_PROMPT = `You are AIOS, the AI Chief of Staff for the CEO of NeuraSolutions. You have full access to all company data and must answer every question with live data from the tools available to you.
The CRM module is called "Clients" — always use the word "client" (never "contact") when referring to CRM records.
Be concise, professional, and data-driven. Never guess — always call the relevant tools first.
Today's date: ${new Date().toISOString().split('T')[0]}.

TOOL USAGE RULES (mandatory):
- "full report" / "full company report" / "monthly report" / "business overview" / "how is the company": call ALL of these tools before answering: get_business_stats, get_invoicing_summary, query_calendar_events, get_security_overview, get_recent_emails
- "invoicing" / "invoice report" / "revenue" / "payments": call get_invoicing_summary
- "leads" / "pipeline" / "sales report": call get_business_stats + query_leads
- "clients" / "client report": call query_clients
- "calendar" / "events" / "meetings" / "schedule": call query_calendar_events
- "security" / "threats" / "security report": call get_security_overview
- "emails" / "inbox": call get_recent_emails
- "team" / "members" / "staff": call get_team_members
- "AI usage" / "AI cost" / "tokens": included in get_business_stats
- Any question about numbers, stats, or data: always call the relevant tool — never answer from memory
- Every report response automatically includes a downloadable CSV file attachment with all metrics
- "add client" / "create client" / "new client" / "añadir cliente": call create_client with name and email (ask for them if not provided)
- "schedule meeting" / "add event" / "create event" / "add to calendar" / "agenda": call create_calendar_event with title, start_at, and category

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

  let botToken: string | undefined;
  try {
    const tenantRes = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [tenantId]
    );
    const settings = tenantRes.rows[0]?.settings as TenantSettings | undefined;
    botToken = settings?.telegram?.bot_token;
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

    // RAG: retrieve relevant knowledge base context
    let ragBlock = '';
    try {
      const ragResults = await queryKnowledge(tenantId, text);
      if (ragResults.length > 0) {
        ragBlock = '\n\n## COMPANY KNOWLEDGE BASE\nThe following is from official company documents. Use this information to answer accurately and specifically:\n\n' +
          ragResults.map(r => `[Source: ${r.docName}]\n${r.text}`).join('\n\n---\n\n');
      }
    } catch { /* silent */ }

    const LANGUAGE_RULE = `\n\nLANGUAGE RULE (mandatory — highest priority): Detect the language of the user's last message (text or transcribed voice) and reply in that EXACT same language. Examples: user writes in English → reply in English. User writes in Spanish → reply in Spanish. User writes in Arabic → reply in Arabic. NEVER respond in a different language than the one the user used. This overrides everything else.`;

    const systemWithRag = SYSTEM_PROMPT.replace(/Today's date: \d{4}-\d{2}-\d{2}/, `Today's date: ${new Date().toISOString().split('T')[0]}`) + ragBlock + LANGUAGE_RULE;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemWithRag },
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
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>; } catch { /* malformed args — use empty */ }
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

    // Format response for Telegram: expand JSON reports, strip markdown from plain text
    const strippedTg = assistantReply.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
    let replyText: string;
    let parsedReport: TgReport | null = null;
    try {
      const parsed = JSON.parse(strippedTg) as TgReport;
      if (parsed?.type === 'report') {
        parsedReport = parsed;
        replyText = formatReportForTelegram(parsed);
      } else {
        replyText = stripMarkdown(assistantReply);
      }
    } catch {
      replyText = stripMarkdown(assistantReply);
    }

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

    // Auto-attach CSV for every report response
    if (parsedReport) {
      try {
        const csv = generateReportCSV(parsedReport);
        const today = new Date().toISOString().split('T')[0];
        await sendDocumentTelegram(botToken, chatId, Buffer.from(csv, 'utf-8'), `AIOS_Report_${today}.csv`);
      } catch (err) {
        console.error('[telegram/csv]', err);
      }
    }
  } catch (err) {
    console.error('[telegram/webhook]', err);
    if (botToken) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await callTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text: `❌ AIOS error: ${errMsg.slice(0, 200)}`,
      }).catch(() => {});
    }
  }
});

// GET /telegram/webhook-info — platform admin: check Telegram webhook status for a tenant
router.get('/webhook-info/:tenantId', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_platform_admin) {
    res.status(403).json({ error: 'Platform admin required' });
    return;
  }
  try {
    const { rows } = await db.query(`SELECT settings FROM aios.tenants WHERE id = $1`, [req.params.tenantId]);
    const token = (rows[0]?.settings as TenantSettings | undefined)?.telegram?.bot_token;
    if (!token) { res.json({ error: 'No bot token configured' }); return; }
    const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await info.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /telegram/briefing — Service JWT only; collects daily digest and sends to all linked admins
router.post('/briefing', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_service) {
    res.status(403).json({ error: 'Service token required' });
    return;
  }
  const { tenant_id } = req.body as { tenant_id?: string };
  if (!tenant_id) {
    res.status(400).json({ error: 'tenant_id required' });
    return;
  }
  try {
    const tenantRes = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [tenant_id]
    );
    const settings = tenantRes.rows[0]?.settings as TenantSettings | undefined;
    const botToken = settings?.telegram?.bot_token;
    if (!botToken || !settings?.telegram?.enabled) {
      res.status(400).json({ error: 'Telegram not configured for this tenant' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

    const [calRes, leadsRes, clientsRes, secRes, emailsRes, adminsRes] = await Promise.all([
      db.query(
        `SELECT title, start_at FROM aios.calendar_events
         WHERE tenant_id = $1 AND start_at >= $2 AND start_at < $3 AND status != 'cancelled'
         ORDER BY start_at ASC LIMIT 10`,
        [tenant_id, today, tomorrow]
      ),
      db.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS new_today,
                COUNT(*) FILTER (WHERE status = 'qualified') AS qualified,
                COUNT(*) FILTER (WHERE status = 'won') AS won
         FROM aios.leads WHERE tenant_id = $1`,
        [tenant_id]
      ),
      db.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active
         FROM aios.clients WHERE tenant_id = $1`,
        [tenant_id]
      ),
      db.query(
        `SELECT COUNT(*) FILTER (WHERE severity IN ('high','critical') AND resolved = false) AS critical_alerts
         FROM aios.security_events WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
        [tenant_id]
      ),
      db.query(
        `SELECT COUNT(*) FILTER (WHERE is_read = false) AS unread FROM aios.emails WHERE tenant_id = $1`,
        [tenant_id]
      ),
      db.query(
        `SELECT telegram_user_id FROM aios.users
         WHERE tenant_id = $1 AND telegram_user_id IS NOT NULL AND role = 'admin'`,
        [tenant_id]
      ),
    ]);

    if (!adminsRes.rows.length) {
      res.json({ ok: true, sent: 0, message: 'No linked admin accounts' });
      return;
    }

    const dateStr = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const lines: string[] = [];
    lines.push(`☀️ Good morning! AIOS Briefing — ${dateStr}`);

    const events = calRes.rows as Array<{ title: string; start_at: string }>;
    lines.push('');
    lines.push(`📅 TODAY'S SCHEDULE (${events.length} event${events.length !== 1 ? 's' : ''})`);
    if (events.length === 0) {
      lines.push('• No events scheduled today');
    } else {
      for (const e of events) {
        const time = new Date(e.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        lines.push(`• ${time} — ${e.title}`);
      }
    }

    const l = leadsRes.rows[0] as Record<string, string>;
    lines.push('');
    lines.push('📊 PIPELINE');
    lines.push(`• New leads today: ${+l.new_today}`);
    lines.push(`• Qualified: ${+l.qualified} | Won: ${+l.won} | Total: ${+l.total}`);

    const c = clientsRes.rows[0] as Record<string, string>;
    lines.push(`• Active clients: ${+c.active} / ${+c.total}`);

    const critAlerts = +(secRes.rows[0] as Record<string, string>).critical_alerts;
    lines.push('');
    lines.push('🔒 SECURITY');
    lines.push(
      critAlerts === 0
        ? '• ✅ All clear — no critical alerts in the last 24h'
        : `• ⚠️ ${critAlerts} critical alert${critAlerts !== 1 ? 's' : ''} require attention`
    );

    const unread = +(emailsRes.rows[0] as Record<string, string>).unread;
    lines.push('');
    lines.push('📧 INBOX');
    lines.push(`• ${unread} unread email${unread !== 1 ? 's' : ''}`);

    lines.push('');
    lines.push('Have a productive day! 🚀');

    const briefingText = lines.join('\n');

    let sent = 0;
    for (const admin of adminsRes.rows as Array<{ telegram_user_id: string }>) {
      try {
        await callTelegram(botToken, 'sendMessage', {
          chat_id: +admin.telegram_user_id,
          text: briefingText,
        });
        sent++;
      } catch (err) {
        console.error('[telegram/briefing] send error for chat_id', admin.telegram_user_id, err);
      }
    }

    res.json({ ok: true, sent });
  } catch (err) {
    console.error('[telegram/briefing]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
