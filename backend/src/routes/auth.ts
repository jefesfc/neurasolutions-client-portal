import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { emitSecurityEvent, countRecentEvents, isNewIp } from '../lib/securityEvents';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET!;

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  try {
    // Block IP if brute force was recently detected
    const clientIp = req.ip ?? 'unknown';
    const bruteForceRes = await db.query(
      `SELECT COUNT(*) FROM aios.security_events
       WHERE actor_ip = $1 AND event_type = 'brute_force'
         AND created_at > NOW() - INTERVAL '30 minutes'`,
      [clientIp]
    );
    if (parseInt(bruteForceRes.rows[0].count, 10) > 0) {
      res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
      return;
    }

    const result = await db.query(
      `SELECT id, email, name, role, password_hash, tenant_id, section_permissions, avatar, is_platform_admin
       FROM aios.users WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user?.password_hash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // Emit login_failed and check brute force
      const tenantId: string = user.tenant_id;
      await emitSecurityEvent({
        tenant_id: tenantId,
        event_type: 'login_failed',
        severity: 'low',
        actor_user_id: user.id,
        actor_ip: clientIp,
        target_resource: '/auth/login',
        metadata: { email: email.toLowerCase() },
      });

      const failCount = await countRecentEvents(tenantId, clientIp, 'login_failed', 10);
      if (failCount >= 5) {
        await emitSecurityEvent({
          tenant_id: tenantId,
          event_type: 'brute_force',
          severity: 'high',
          actor_user_id: user.id,
          actor_ip: clientIp,
          target_resource: '/auth/login',
          metadata: { attempts: failCount, window_minutes: 10 },
        });
      }

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      {
        sub: user.id,
        user_id: user.id,
        tenant_id: user.tenant_id,
        role: 'aios_user',
        app_role: user.role,
        email: user.email,
        is_platform_admin: user.is_platform_admin ?? false,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id,
        section_permissions: user.section_permissions ?? [],
        avatar: user.avatar ?? null,
        is_platform_admin: user.is_platform_admin ?? false,
      },
    });

    // Security: check for new IP (async, non-blocking)
    isNewIp(user.tenant_id, user.id, clientIp).then((isNew) => {
      if (!isNew) return;
      emitSecurityEvent({
        tenant_id: user.tenant_id,
        event_type: 'login_new_ip',
        severity: 'medium',
        actor_user_id: user.id,
        actor_ip: clientIp,
        target_resource: '/auth/login',
        metadata: { email: user.email },
      }).catch(() => {});
    }).catch(() => {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }

  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { user_id: string };

    const result = await db.query(
      `SELECT id, email, name, role, tenant_id, section_permissions, avatar, is_platform_admin
       FROM aios.users WHERE id = $1`,
      [payload.user_id]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.patch('/change-password', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { user_id: string };

    const result = await db.query(
      `SELECT id, password_hash FROM aios.users WHERE id = $1`,
      [payload.user_id]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE aios.users SET password_hash = $1 WHERE id = $2`,
      [newHash, user.id]
    );

    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
