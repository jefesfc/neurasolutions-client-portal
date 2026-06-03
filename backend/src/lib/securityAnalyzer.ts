import { openai } from './openai';
import { db } from '../db';

export interface SecurityAnalysis {
  risk_score: number;
  summary: string;
  is_likely_false_positive: boolean;
  recommended_action: string;
  context: string;
}

// To switch to Claude Opus 4.8 for clinic fork:
// 1. import { anthropic } from './anthropic';
// 2. Replace the openai.chat.completions.create call with:
//    anthropic.messages.create({ model: 'claude-opus-4-8', max_tokens: 400, messages: [...] })
// 3. Read content from response.content[0].text instead of choices[0].message.content
export async function analyzeSecurityEvent(eventId: string): Promise<SecurityAnalysis | null> {
  const eventRes = await db.query(
    `SELECT id, tenant_id, event_type, severity, actor_user_id, actor_ip, target_resource, metadata
     FROM aios.security_events WHERE id = $1`,
    [eventId]
  );
  if (!eventRes.rows[0]) return null;
  const event = eventRes.rows[0];

  let userHistory = 'No prior user activity.';
  if (event.actor_user_id) {
    const histRes = await db.query(
      `SELECT role, content, created_at FROM aios.interactions
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 10`,
      [event.tenant_id, event.actor_user_id]
    );
    if (histRes.rows.length > 0) {
      userHistory = histRes.rows
        .map((r: { role: string; content: string; created_at: string }) =>
          `[${r.created_at}] ${r.role}: ${String(r.content).substring(0, 80)}`
        )
        .join('\n');
    }
  }

  const priorRes = await db.query(
    `SELECT event_type, severity, created_at FROM aios.security_events
     WHERE tenant_id = $1
       AND (actor_ip = $2 OR actor_user_id = $3::uuid)
       AND created_at > NOW() - INTERVAL '24 hours'
       AND id != $4
     ORDER BY created_at DESC LIMIT 5`,
    [
      event.tenant_id,
      event.actor_ip ?? '',
      event.actor_user_id ?? '00000000-0000-0000-0000-000000000000',
      eventId,
    ]
  );
  const priorEvents =
    priorRes.rows.length > 0
      ? priorRes.rows
          .map((r: { event_type: string; severity: string; created_at: string }) =>
            `${r.event_type} (${r.severity}) at ${r.created_at}`
          )
          .join('\n')
      : 'No prior events in last 24h.';

  const prompt = `You are a security analyst for AIOS, an enterprise AI business platform.

Analyze this security event and return a JSON object ONLY (no markdown, no explanation):

Event Type: ${event.event_type}
Severity: ${event.severity}
IP: ${event.actor_ip ?? 'unknown'}
Target: ${event.target_resource ?? 'unknown'}
Metadata: ${JSON.stringify(event.metadata)}

Prior events from same actor (last 24h):
${priorEvents}

Recent user activity (last 10 interactions):
${userHistory}

Return this exact JSON shape:
{
  "risk_score": <integer 0-100>,
  "summary": "<1-2 sentences describing what happened>",
  "is_likely_false_positive": <true or false>,
  "recommended_action": "<specific action admin should take>",
  "context": "<1 sentence about the user or IP pattern>"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 400,
  });

  const raw = response.choices[0].message.content ?? '{}';

  try {
    const analysis = JSON.parse(raw) as SecurityAnalysis;
    await db.query(
      `UPDATE aios.security_events SET ai_analysis = $1 WHERE id = $2`,
      [JSON.stringify(analysis), eventId]
    );
    return analysis;
  } catch {
    return null;
  }
}
