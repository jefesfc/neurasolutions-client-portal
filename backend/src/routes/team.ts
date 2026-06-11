import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';
import { emitSecurityEvent } from '../lib/securityEvents';

const router = Router();

const VALID_PERMISSIONS = ['leads','crm','calendar','emails','invoicing','usage','ai_systems','analytics','reports','support','team','billing','notifications'] as const;

router.post('/create', requireAuth, async (req: Request, res: Response) => {
  if (req.user!.app_role !== 'admin' && req.user!.app_role !== 'manager') {
    res.status(403).json({ error: 'Admin or Manager required' });
    return;
  }
  const { name, email, role, password, section_permissions } = req.body as {
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'user';
    password: string;
    section_permissions?: string[];
  };

  if (!name || !email || !role || !password) {
    res.status(400).json({ error: 'name, email, role and password are required' });
    return;
  }

  if (!['admin', 'manager', 'user'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  const perms = role === 'admin' ? [] : (section_permissions ?? []);

  if (perms.some((p) => !VALID_PERMISSIONS.includes(p as typeof VALID_PERMISSIONS[number]))) {
    res.status(400).json({ error: 'Invalid permission key' });
    return;
  }

  const tenantId = req.user!.tenant_id;

  try {
    const existing = await db.query(
      `SELECT id FROM aios.users WHERE email = $1 AND tenant_id = $2`,
      [email.toLowerCase(), tenantId]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'A user with this email already exists in your workspace' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO aios.users (tenant_id, email, name, role, password_hash, is_active, section_permissions)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, tenant_id, email, name, role, avatar, phone, is_active, section_permissions`,
      [tenantId, email.toLowerCase(), name, role, password_hash, perms]
    );

    res.status(201).json({ user: result.rows[0] });
    if (role === 'admin') {
      emitSecurityEvent({
        tenant_id: tenantId,
        event_type: 'admin_created',
        severity: 'high',
        actor_user_id: req.user!.user_id,
        actor_ip: req.ip ?? null,
        target_resource: `/team/${result.rows[0].id}`,
        metadata: { new_admin_email: email.toLowerCase(), created_by: req.user!.email },
        admin_email: req.user!.email,
      }).catch(() => {});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const { role, section_permissions } = req.body as {
    role?: 'admin' | 'manager' | 'user';
    section_permissions?: string[];
  };

  const requestingUser = req.user!;
  if (requestingUser.app_role !== 'admin' && requestingUser.app_role !== 'manager') {
    res.status(403).json({ error: 'Only admins and managers can edit members' });
    return;
  }

  if (role && !['admin', 'manager', 'user'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  const perms = role === 'admin' ? [] : (section_permissions ?? []);

  if (perms.some((p) => !VALID_PERMISSIONS.includes(p as typeof VALID_PERMISSIONS[number]))) {
    res.status(400).json({ error: 'Invalid permission key' });
    return;
  }

  try {
    const result = await db.query(
      `UPDATE aios.users SET role = COALESCE($1, role), section_permissions = $2
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, role, section_permissions`,
      [role ?? null, perms, req.params.id, requestingUser.tenant_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });
    if (role === 'admin' && result.rows[0]) {
      emitSecurityEvent({
        tenant_id: requestingUser.tenant_id,
        event_type: 'permission_escalation',
        severity: 'high',
        actor_user_id: requestingUser.user_id,
        actor_ip: req.ip ?? null,
        target_resource: `/team/${req.params.id}`,
        metadata: { target_user_id: req.params.id, new_role: role, changed_by: requestingUser.email },
        admin_email: requestingUser.email,
      }).catch(() => {});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
