import { Router, Request, Response } from 'express';
import multer from 'multer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/requireAuth';
import { upsertDocument, deleteDocument } from '../lib/pinecone';
import { db } from '../db';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    cb(null, allowed.includes(file.mimetype));
  },
});

async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  return buffer.toString('utf-8');
}

// GET /knowledge/docs — list all indexed documents for tenant
router.get('/docs', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { rows } = await db.query(
    `SELECT id, name, file_type, chunk_count, created_at
     FROM aios.knowledge_docs
     WHERE tenant_id = $1
     ORDER BY created_at DESC`,
    [user.tenant_id],
  );
  res.json(rows);
});

// POST /knowledge/upload — upload and index a document (admin only)
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.app_role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  try {
    const text = await extractText(req.file.buffer, req.file.mimetype);
    if (!text.trim()) return res.status(400).json({ error: 'Could not extract text from file' });

    const docId      = uuidv4();
    const chunkCount = await upsertDocument(user.tenant_id, docId, req.file.originalname, text);

    await db.query(
      `INSERT INTO aios.knowledge_docs (id, tenant_id, name, file_type, chunk_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [docId, user.tenant_id, req.file.originalname, req.file.mimetype, chunkCount],
    );

    res.json({ id: docId, name: req.file.originalname, chunk_count: chunkCount });
  } catch (err) {
    console.error('[knowledge/upload]', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /knowledge/docs/:id — remove document from Pinecone + DB (admin only)
router.delete('/docs/:id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.app_role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  try {
    const { rows } = await db.query(
      `SELECT id, chunk_count FROM aios.knowledge_docs WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, user.tenant_id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });

    await deleteDocument(user.tenant_id, rows[0].id, rows[0].chunk_count);
    await db.query(`DELETE FROM aios.knowledge_docs WHERE id = $1`, [req.params.id]);

    res.status(204).send();
  } catch (err) {
    console.error('[knowledge/delete]', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
