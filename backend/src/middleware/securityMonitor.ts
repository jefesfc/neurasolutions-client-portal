import { Request, Response, NextFunction } from 'express';
import { emitSecurityEvent } from '../lib/securityEvents';

// In-memory 404 counter per IP — resets automatically via Map cleanup
const notFoundCounts = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 5 * 60 * 1000;   // 5 minutes
const THRESHOLD  = 10;

export function securityMonitor(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    if (res.statusCode !== 404) return;

    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = notFoundCounts.get(ip);

    if (!entry || now - entry.windowStart > WINDOW_MS) {
      notFoundCounts.set(ip, { count: 1, windowStart: now });
      return;
    }

    entry.count += 1;

    if (entry.count >= THRESHOLD) {
      notFoundCounts.delete(ip);  // reset after triggering

      // Emit only if we have tenant context (authenticated routes)
      const tenantId = req.user?.tenant_id;
      if (!tenantId) return;

      emitSecurityEvent({
        tenant_id: tenantId,
        event_type: 'unauthorized_route',
        severity: 'high',
        actor_user_id: req.user?.user_id ?? null,
        actor_ip: ip,
        target_resource: req.path,
        metadata: { count: entry.count, window_minutes: 5 },
      }).catch(() => {});
    }
  });

  next();
}
