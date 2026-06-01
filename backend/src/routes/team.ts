import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';

const router = Router();

router.post('/create', requireAuth, async (req: Request, res: Response) => {
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

  const tenantId = req.user!.tenant_id;
  const perms = role === 'admin' ? [] : (section_permissions ?? []);

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
