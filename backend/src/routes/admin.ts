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

export default router;
