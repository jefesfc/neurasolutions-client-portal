import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pc     = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const INDEX_NAME = process.env.PINECONE_INDEX ?? 'aios-knowledge';

function getIndex() {
  return pc.index(INDEX_NAME);
}

export function chunkText(text: string, size = 800, overlap = 100): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const chunks: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    chunks.push(cleaned.slice(i, i + size).trim());
    i += size - overlap;
  }
  return chunks.filter(c => c.length > 20);
}

export async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input:  text.slice(0, 8000).replace(/\n+/g, ' '),
  });
  return res.data[0].embedding;
}

export async function upsertDocument(
  tenantId: string,
  docId: string,
  docName: string,
  text: string,
): Promise<number> {
  const chunks  = chunkText(text);
  const ns      = getIndex().namespace(tenantId);
  const vectors: { id: string; values: number[]; metadata: Record<string, string | number> }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const values = await embed(chunks[i]);
    vectors.push({
      id:       `${docId}-${i}`,
      values,
      metadata: { doc_id: docId, doc_name: docName, chunk_index: i, text: chunks[i] },
    });
  }

  for (let b = 0; b < vectors.length; b += 100) {
    await ns.upsert({ records: vectors.slice(b, b + 100) });
  }

  return chunks.length;
}

export async function queryKnowledge(
  tenantId: string,
  question: string,
  topK = 5,
): Promise<{ text: string; docName: string; score: number }[]> {
  const queryVec = await embed(question);
  const ns       = getIndex().namespace(tenantId);

  const res = await ns.query({
    vector:          queryVec,
    topK,
    includeMetadata: true,
  });

  return (res.matches ?? [])
    .filter(m => (m.score ?? 0) > 0.3)
    .map(m => ({
      text:    String(m.metadata?.text    ?? ''),
      docName: String(m.metadata?.doc_name ?? ''),
      score:   m.score ?? 0,
    }));
}

export async function deleteDocument(
  tenantId: string,
  docId: string,
  chunkCount: number,
): Promise<void> {
  const ids = Array.from({ length: chunkCount }, (_, i) => `${docId}-${i}`);
  await getIndex().namespace(tenantId).deleteMany(ids);
}
