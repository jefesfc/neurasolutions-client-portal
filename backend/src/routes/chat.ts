import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/requireAuth';
import { openai } from '../lib/openai';
import { toolDefinitions, executeTool } from '../lib/agentTools';
import { db } from '../db';
import type OpenAI from 'openai';
import { emitSecurityEvent } from '../lib/securityEvents';

const router = Router();

const SYSTEM_PROMPT_BASE = `You are AIOS, the AI Chief of Staff for the CEO of NeuraSolutions. You have full access to all company data and must answer every question with live data from the tools available to you.
The CRM module is called "Clients" — always use the word "client" (never "contact") when referring to CRM records.
Be concise, professional, and data-driven. Never guess — always call the relevant tools first.

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
- Every structured report response automatically includes a downloadable CSV with all metrics

LANGUAGE RULE (mandatory): Detect the language of the user's message and reply in that EXACT same language. Spanish → Spanish. Chinese → Chinese. French → French. Arabic → Arabic. Portuguese → Portuguese. German → German. English → English. NEVER respond in English if the user wrote in another language. Mirror the user's language in every single reply, no exceptions.

REPORT FORMAT (mandatory when your response contains structured data — metrics, KPIs, tables, lists with numbers, financial summaries, or business reports):
Return ONLY a valid JSON object — no markdown code fences, no extra text before or after the JSON:
{"type":"report","title":"<concise title>","subtitle":"<e.g. June 2026, optional>","intro":"<1 sentence intro, optional>","sections":[{"label":"<section name>","icon":"<1 emoji>","color":"<hex color>","items":[{"label":"<metric name>","value":"<formatted value>","highlight":"positive|negative (optional)","sub":[{"label":"<sub-label>","value":"<sub-value>","highlight":"positive|negative (optional)"}]}]}]}
Rules: use "positive" highlight for good results (high sales, revenue gained), "negative" for bad (losses, failures, errors). Omit "highlight", "sub", "subtitle", "intro" when not needed. Choose meaningful emoji and a distinct hex color per section (e.g. #6366f1 for pipeline, #10b981 for clients, #f59e0b for performance, #8b5cf6 for AI usage, #06b6d4 for invoicing, #f43f5e for security).
For purely conversational replies with no structured data, reply in plain text as always.`;

// GPT-4o pricing per token
const COST_PER_INPUT_TOKEN = 0.0000025;
const COST_PER_OUTPUT_TOKEN = 0.00001;

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { message, conversation_id } = req.body as { message: string; conversation_id?: string };

  if (!message?.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const tenantId = req.user!.tenant_id;
  const userId = req.user!.user_id;
  const convId = conversation_id ?? uuidv4();

  // Prompt injection guardrail
  const INJECTION_PATTERNS = [
    /ignore\s+(your\s+)?(previous\s+|all\s+)?instructions/i,
    /disregard\s+(your\s+)?(previous\s+|all\s+)?instructions/i,
    /you\s+are\s+now\s+a/i,
    /forget\s+(everything|your\s+role|your\s+instructions)/i,
    /act\s+as\s+(if\s+you\s+are|a\s+different)/i,
    /reveal\s+(other\s+)?(tenant|client|user)\s+data/i,
    /show\s+me\s+(all\s+)?(other\s+tenants|other\s+clients)/i,
  ];

  const isInjection = INJECTION_PATTERNS.some((p) => p.test(message));
  if (isInjection) {
    emitSecurityEvent({
      tenant_id: tenantId,
      event_type: 'prompt_injection_attempt',
      severity: 'high',
      actor_user_id: userId,
      actor_ip: req.ip ?? null,
      target_resource: '/chat',
      metadata: { message_snippet: message.substring(0, 200) },
    }).catch(() => {});
    res.status(403).json({ error: 'Message blocked by security policy.' });
    return;
  }

  try {
    // Load conversation history (last 20 messages)
    const historyRes = await db.query(
      `SELECT role, content FROM aios.interactions
       WHERE tenant_id = $1 AND entity_type = 'conversation' AND entity_id = $2
       ORDER BY created_at ASC LIMIT 20`,
      [tenantId, convId]
    );

    const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = historyRes.rows.map((r) => ({
      role: r.role as 'user' | 'assistant',
      content: r.content as string,
    }));

    const systemPrompt = SYSTEM_PROMPT_BASE + `\nToday's date: ${new Date().toISOString().split('T')[0]}.`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let assistantReply = '';

    // Agentic loop — up to 5 iterations for tool calls
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
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      assistantReply = choice.message.content ?? '';
      break;
    }

    if (!assistantReply) {
      res.status(500).json({ error: 'Agent did not produce a response' });
      return;
    }

    // Detect structured report response
    let response_type: 'text' | 'report' = 'text';
    let report_data: Record<string, unknown> | null = null;
    const stripped = assistantReply.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
    try {
      const parsed = JSON.parse(stripped) as { type?: string };
      if (parsed?.type === 'report') {
        response_type = 'report';
        report_data = parsed as Record<string, unknown>;
      }
    } catch { /* plain text response — no action */ }

    // Persist user + assistant messages
    await db.query(
      `INSERT INTO aios.interactions (id, tenant_id, user_id, channel, role, content, entity_type, entity_id)
       VALUES ($1,$2,$3,'web_chat','user',$4,'conversation',$5),
              ($6,$2,$3,'web_chat','assistant',$7,'conversation',$5)`,
      [uuidv4(), tenantId, userId, message, convId, uuidv4(), assistantReply]
    );

    // Track token usage
    const cost = totalTokensIn * COST_PER_INPUT_TOKEN + totalTokensOut * COST_PER_OUTPUT_TOKEN;
    await db.query(
      `INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost)
       VALUES ($1,$2,'aios-chat',$3,$4,'gpt-4o',$5)`,
      [uuidv4(), tenantId, totalTokensIn, totalTokensOut, cost]
    );

    res.json({
      message: assistantReply,
      response_type,
      report_data,
      conversation_id: convId,
      usage: { tokens_in: totalTokensIn, tokens_out: totalTokensOut, cost_usd: cost.toFixed(6) },
    });
  } catch (err) {
    console.error('[chat]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { conversation_id, limit = '50' } = req.query as { conversation_id?: string; limit?: string };

  try {
    let q = `SELECT id, role, content, entity_id AS conversation_id, created_at
             FROM aios.interactions
             WHERE tenant_id = $1 AND channel = 'web_chat'`;
    const params: unknown[] = [tenantId];

    if (conversation_id) {
      params.push(conversation_id);
      q += ` AND entity_id = $${params.length}`;
    }

    params.push(Math.min(+limit, 100));
    q += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const res2 = await db.query(q, params);
    res.json({ messages: res2.rows.reverse() });
  } catch (err) {
    console.error('[chat/history]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
