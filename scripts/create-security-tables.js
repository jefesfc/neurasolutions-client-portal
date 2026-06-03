// scripts/create-security-tables.js
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

async function run() {
  await client.connect();
  console.log('Connected');

  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.security_events (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id     uuid NOT NULL REFERENCES aios.tenants(id) ON DELETE CASCADE,
      event_type    text NOT NULL,
      severity      text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
      actor_user_id uuid REFERENCES aios.users(id) ON DELETE SET NULL,
      actor_ip      text,
      target_resource text,
      metadata      jsonb DEFAULT '{}',
      ai_analysis   jsonb,
      resolved      boolean DEFAULT false,
      created_at    timestamptz DEFAULT NOW()
    );
  `);
  console.log('Table aios.security_events created');

  await client.query(`ALTER TABLE aios.security_events ENABLE ROW LEVEL SECURITY;`);

  await client.query(`DROP POLICY IF EXISTS security_events_tenant_isolation ON aios.security_events;`);
  await client.query(`
    CREATE POLICY security_events_tenant_isolation ON aios.security_events
      USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
  `);
  console.log('RLS policy created');

  await client.query(`GRANT ALL ON aios.security_events TO aios_user;`);

  await client.query(`
    ALTER TABLE aios.emails ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
  `);
  console.log('is_flagged added to aios.emails');

  await client.query(`NOTIFY pgrst, 'reload schema'`);
  console.log('PostgREST cache reloaded');

  await client.end();
  console.log('Migration complete');
}

run().catch((err) => { console.error(err); process.exit(1); });
