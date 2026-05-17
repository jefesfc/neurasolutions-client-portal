import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET!;

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  try {
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

export default router;
