const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core'
});

async function run() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.calendar_events (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id       uuid NOT NULL REFERENCES aios.tenants(id) ON DELETE CASCADE,
      created_by      uuid NOT NULL REFERENCES aios.users(id),
      title           text NOT NULL,
      description     text,
      category        text NOT NULL CHECK (category IN ('meeting','invoice','contract','reminder','other')),
      start_at        timestamptz NOT NULL,
      end_at          timestamptz,
      all_day         boolean DEFAULT false,
      status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','cancelled')),
      recurrence_rule jsonb,
      linked_type     text CHECK (linked_type IN ('lead','contact')),
      linked_id       uuid,
      amount          numeric(10,2),
      currency        text DEFAULT 'GBP',
      created_at      timestamptz DEFAULT now(),
      updated_at      timestamptz DEFAULT now()
    );
  `);

  await client.query(`ALTER TABLE aios.calendar_events ENABLE ROW LEVEL SECURITY;`);

  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'calendar_events' AND policyname = 'tenant_isolation'
      ) THEN
        CREATE POLICY tenant_isolation ON aios.calendar_events
          USING (tenant_id = (current_setting('request.jwt.claims',true)::json->>'tenant_id')::uuid);
      END IF;
    END $$;
  `);

  await client.query(`NOTIFY pgrst, 'reload schema'`);

  console.log('✅ aios.calendar_events created + RLS enabled + PostgREST reloaded');
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
