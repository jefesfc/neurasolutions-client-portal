const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

async function main() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.knowledge_docs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id   UUID NOT NULL REFERENCES aios.tenants(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      file_type   TEXT NOT NULL,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE aios.knowledge_docs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS knowledge_docs_tenant ON aios.knowledge_docs;
    CREATE POLICY knowledge_docs_tenant ON aios.knowledge_docs
      USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
    NOTIFY pgrst, 'reload schema';
  `);
  console.log('✅ aios.knowledge_docs created with RLS');
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
