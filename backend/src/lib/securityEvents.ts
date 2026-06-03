import { db } from '../db';

export interface SecurityEventInput {
  tenant_id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actor_user_id?: string | null;
  actor_ip?: string | null;
  target_resource?: string | null;
  metadata?: Record<string, unknown>;
  admin_email?: string | null;  // included in webhook so n8n doesn't need extra query
}

export async function emitSecurityEvent(input: SecurityEventInput): Promise<string> {
  const result = await db.query(
    `INSERT INTO aios.security_events
       (tenant_id, event_type, severity, actor_user_id, actor_ip, target_resource, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.tenant_id,
      input.event_type,
      input.severity,
      input.actor_user_id ?? null,
      input.actor_ip ?? null,
      input.target_resource ?? null,
      input.metadata ?? {},
    ]
  );
  const eventId: string = result.rows[0].id;

  if (input.severity === 'medium' || input.severity === 'high' || input.severity === 'critical') {
    // Fire-and-forget: trigger n8n Security Alerter webhook
    triggerAlertWebhook({ ...input, event_id: eventId }).catch(() => {
      // n8n webhook failure must never break main request
    });

    // Fire-and-forget: trigger GPT-4o analysis
    triggerAnalysis(eventId, input.tenant_id).catch(() => {});
  }

  return eventId;
}

async function triggerAlertWebhook(
  event: SecurityEventInput & { event_id: string }
): Promise<void> {
  const webhookUrl = process.env.N8N_SECURITY_WEBHOOK_URL;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: event.event_id,
      tenant_id: event.tenant_id,
      event_type: event.event_type,
      severity: event.severity,
      actor_ip: event.actor_ip,
      target_resource: event.target_resource,
      metadata: event.metadata,
      admin_email: event.admin_email,
      timestamp: new Date().toISOString(),
    }),
  });
}

async function triggerAnalysis(eventId: string, tenantId: string): Promise<void> {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
  const serviceJwt = process.env.SERVICE_JWT;
  if (!serviceJwt) return;

  await fetch(`${backendUrl}/security/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceJwt}`,
    },
    body: JSON.stringify({ event_id: eventId, tenant_id: tenantId }),
  });
}

export async function countRecentEvents(
  tenantId: string,
  actorIp: string | null,
  eventType: string,
  windowMinutes: number
): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*) FROM aios.security_events
     WHERE tenant_id = $1
       AND actor_ip = $2
       AND event_type = $3
       AND created_at > NOW() - ($4 || ' minutes')::interval`,
    [tenantId, actorIp ?? '', eventType, windowMinutes]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function isNewIp(
  tenantId: string,
  userId: string,
  ip: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT COUNT(*) FROM aios.security_events
     WHERE tenant_id = $1 AND actor_user_id = $2 AND actor_ip = $3
       AND event_type = 'login_new_ip'`,
    [tenantId, userId, ip]
  );
  return parseInt(result.rows[0].count, 10) === 0;
}
