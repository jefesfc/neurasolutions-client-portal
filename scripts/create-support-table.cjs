const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

async function run() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.support_tickets (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id   UUID NOT NULL REFERENCES aios.tenants(id) ON DELETE CASCADE,
      user_id     UUID REFERENCES aios.users(id),
      subject     TEXT NOT NULL,
      description TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'general'
                    CHECK (category IN ('technical','billing','general','feature-request')),
      priority    TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','critical')),
      status      TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in-progress','resolved','closed')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    ALTER TABLE aios.support_tickets ENABLE ROW LEVEL SECURITY;
  `);

  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'support_tickets' AND policyname = 'support_tickets_tenant_isolation'
      ) THEN
        CREATE POLICY support_tickets_tenant_isolation ON aios.support_tickets
          USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
      END IF;
    END $$;
  `);

  await client.query(`NOTIFY pgrst, 'reload schema'`);

  console.log('✅ aios.support_tickets created with RLS');
  await client.end();
}

run().catch((err) => { console.error(err); process.exit(1); });
