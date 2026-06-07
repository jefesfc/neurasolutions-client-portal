const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core'
});

async function run() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.clients (
      id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id              uuid NOT NULL REFERENCES aios.tenants(id),
      name                   varchar(255) NOT NULL,
      email                  varchar(255) NOT NULL,
      phone                  varchar(100),
      company                varchar(255) NOT NULL,
      industry               varchar(100),
      website                varchar(255),
      contract_value         numeric(12,2),
      status                 varchar(20) NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','inactive','churned')),
      notes                  text,
      assigned_to            uuid REFERENCES aios.users(id) ON DELETE SET NULL,
      address                varchar(500),
      next_renewal_at        date,
      converted_from_lead_id uuid REFERENCES aios.leads(id) ON DELETE SET NULL,
      created_at             timestamptz NOT NULL DEFAULT now(),
      updated_at             timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(`ALTER TABLE aios.clients ENABLE ROW LEVEL SECURITY;`);

  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'clients' AND policyname = 'clients_tenant_isolation'
      ) THEN
        CREATE POLICY clients_tenant_isolation ON aios.clients
          USING (tenant_id = (current_setting('request.jwt.claims',true)::json->>'tenant_id')::uuid);
      END IF;
    END $$;
  `);

  await client.query(`NOTIFY pgrst, 'reload schema'`);

  console.log('✅ aios.clients created + RLS enabled + PostgREST reloaded');
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
