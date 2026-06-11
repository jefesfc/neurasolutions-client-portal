import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';

const router = Router();

// GET /support/tickets
router.get('/tickets', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  try {
    const { rows } = await db.query(
      `SELECT t.*, u.name AS user_name
       FROM aios.support_tickets t
       LEFT JOIN aios.users u ON u.id = t.user_id
       WHERE t.tenant_id = $1
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[support/tickets GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /support/tickets
router.post('/tickets', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const userId = req.user!.user_id;
  const { subject, description, category = 'general', priority = 'medium' } =
    req.body as { subject: string; description: string; category?: string; priority?: string };

  if (!subject?.trim() || !description?.trim()) {
    res.status(400).json({ error: 'subject and description are required' });
    return;
  }

  const VALID_CATEGORIES = ['technical', 'billing', 'general', 'feature-request'];
  const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
  if (!VALID_CATEGORIES.includes(category) || !VALID_PRIORITIES.includes(priority)) {
    res.status(400).json({ error: 'Invalid category or priority' });
    return;
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO aios.support_tickets (tenant_id, user_id, subject, description, category, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, userId, subject.trim(), description.trim(), category, priority]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[support/tickets POST]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
