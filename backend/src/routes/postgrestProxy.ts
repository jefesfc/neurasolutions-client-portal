import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';

const POSTGREST_URL =
  process.env.POSTGREST_URL ?? 'https://xneurasolutions-postgrest.9lagn8.easypanel.host';

const router = Router();

// Proxy all GET requests to PostgREST, forwarding the JWT so RLS applies correctly.
// Mounts at /pg — e.g. GET /pg/clients?order=created_at.desc → PostgREST /clients?...
router.get('/:table', requireAuth, async (req: Request, res: Response) => {
  const target = `${POSTGREST_URL}/${req.params.table}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;

  try {
    const headers: Record<string, string> = {
      Authorization: req.headers.authorization as string,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (req.headers.prefer) headers.Prefer = req.headers.prefer as string;

    const pgRes = await fetch(target, { headers });
    const body  = await pgRes.text();

    res.status(pgRes.status);
    res.setHeader('Content-Type', 'application/json');
    if (pgRes.headers.get('Content-Range')) {
      res.setHeader('Content-Range', pgRes.headers.get('Content-Range')!);
    }
    res.send(body);
  } catch (err) {
    console.error('[postgrestProxy]', err);
    res.status(502).json({ error: 'PostgREST unreachable' });
  }
});

export default router;
