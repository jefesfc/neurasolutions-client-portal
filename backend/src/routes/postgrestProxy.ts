import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';

const POSTGREST_URL =
  process.env.POSTGREST_URL ?? 'https://xneurasolutions-postgrest.9lagn8.easypanel.host';

const router = Router();

async function proxyToPostgrest(req: Request, res: Response) {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target = `${POSTGREST_URL}/${req.params.table}${qs}`;

  try {
    const headers: Record<string, string> = {
      Authorization: req.headers.authorization as string,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (req.headers.prefer) headers.Prefer = req.headers.prefer as string;

    const fetchOpts: RequestInit = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'DELETE' && req.body) {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const pgRes = await fetch(target, fetchOpts);
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
}

router.get('/:table',    requireAuth, proxyToPostgrest);
router.post('/:table',   requireAuth, proxyToPostgrest);
router.patch('/:table',  requireAuth, proxyToPostgrest);
router.delete('/:table', requireAuth, proxyToPostgrest);

export default router;
