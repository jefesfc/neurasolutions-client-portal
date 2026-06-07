import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

type NotifType = 'info' | 'warning' | 'error' | 'success';
type NotifCategory = 'system' | 'billing' | 'report' | 'ticket' | 'general';

interface NotificationRow {
  id: string;
  title: string;
  description: string;
  type: NotifType;
  read: false; // always false from server — read state is localStorage-only on the client
  timestamp: string;
  link?: string;
  category: NotifCategory;
}

const EVENT_TITLE: Record<string, string> = {
  login_failed:             'Failed login attempt',
  brute_force:              'Brute force attack detected',
  login_new_ip:             'New IP login',
  suspicious_email_content: 'Suspicious email detected',
  admin_created:            'New admin account created',
  permission_escalation:    'Permission escalation',
  prompt_injection_attempt: 'Prompt injection attempt',
  unauthorized_route:       'Unauthorized route scan',
};

const SEVERITY_TYPE: Record<string, NotifType> = {
  low:      'info',
  medium:   'warning',
  high:     'error',
  critical: 'error',
};

function formatCalendarDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' at '
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// GET /notifications — role-aware notification list
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const isAdmin  = req.user!.app_role === 'admin';
  const results: NotificationRow[] = [];

  // Source 1: security events (admin only)
  if (isAdmin) {
    try {
      const { rows } = await db.query(
        `SELECT id, event_type, severity, actor_ip, created_at
         FROM aios.security_events
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
         ORDER BY created_at DESC LIMIT 30`,
        [tenantId]
      );
      for (const row of rows) {
        const title = EVENT_TITLE[row.event_type as string] ?? (row.event_type as string);
        const description = row.actor_ip ? `From IP ${row.actor_ip as string}` : 'No source IP recorded';
        results.push({
          id:          row.id as string,
          title,
          description,
          type:        SEVERITY_TYPE[row.severity as string] ?? 'info',
          read:        false,
          timestamp:   (row.created_at as Date).toISOString(),
          link:        '/security',
          category:    'system',
        });
      }
    } catch (err) {
      console.error('[notifications] security_events query failed:', err);
    }
  }

  // Source 2: calendar events in next 48h (all roles)
  try {
    const now     = new Date();
    const horizon = new Date(now.getTime() + 48 * 3600 * 1000);
    const { rows } = await db.query(
      `SELECT id, title, start_at
       FROM aios.calendar_events
       WHERE tenant_id = $1 AND start_at >= $2 AND start_at <= $3
       ORDER BY start_at ASC LIMIT 20`,
      [tenantId, now.toISOString(), horizon.toISOString()]
    );
    for (const row of rows) {
      results.push({
        id:          `cal_${row.id as string}`,
        title:       row.title as string,
        description: `Starting ${formatCalendarDate((row.start_at as Date).toISOString())}`,
        type:        'info',
        read:        false,
        timestamp:   (row.start_at as Date).toISOString(),
        link:        '/calendar',
        category:    'general',
      });
    }
  } catch (err) {
    console.error('[notifications] calendar_events query failed:', err);
  }

  // Sort combined results by timestamp DESC, cap at 30
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(results.slice(0, 30));
});

export default router;
