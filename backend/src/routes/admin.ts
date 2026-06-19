import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

function requirePlatformAdmin(req: Request, res: Response, next: () => void) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { is_platform_admin?: boolean };
    if (!payload.is_platform_admin) {
      res.status(403).json({ error: 'Platform admin only' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/tenants', requirePlatformAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT t.id, t.name, t.subdomain, t.plan, t.industry, t.created_at,
             COUNT(u.id)::int AS user_count
      FROM aios.tenants t
      LEFT JOIN aios.users u ON u.tenant_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json({ tenants: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/impersonate', requirePlatformAdmin, async (req: Request, res: Response) => {
  const { tenant_id } = req.body as { tenant_id?: string };
  if (!tenant_id) { res.status(400).json({ error: 'tenant_id required' }); return; }
  try {
    const { rows } = await db.query(
      `SELECT id, email, name, role, section_permissions, avatar
       FROM aios.users
       WHERE tenant_id = $1 AND role = 'admin' AND is_active = true
       LIMIT 1`,
      [tenant_id]
    );
    if (!rows[0]) { res.status(404).json({ error: 'No active admin user found for this tenant' }); return; }
    const u = rows[0] as { id: string; email: string; name: string; role: string; section_permissions: string[] | null; avatar: string | null };
    const token = jwt.sign(
      { user_id: u.id, tenant_id, role: 'aios_user', app_role: u.role, email: u.email, is_platform_admin: false },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        tenant_id,
        section_permissions: u.section_permissions ?? [],
        avatar: u.avatar,
        is_platform_admin: false,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
