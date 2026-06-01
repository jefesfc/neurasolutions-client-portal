import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/requireAuth';
import { openai } from '../lib/openai';
import { toolDefinitions, executeTool } from '../lib/agentTools';
import { db } from '../db';
import type OpenAI from 'openai';

const router = Router();

const SYSTEM_PROMPT = `You are AIOS, an intelligent business assistant built by NeuraSolutions.
You help the company's team analyze their business data: leads, contacts, calendar events, emails, sales pipeline, and AI usage metrics.
You have tools to query live business data — always use them when the user asks about numbers, lists, stats, meetings, or scheduled events.
Be concise, professional, and data-driven. Always respond in English.
Today's date: ${new Date().toISOString().split('T')[0]}.`;

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

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
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
