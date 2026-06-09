const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

async function run() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.client_invoices (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id       UUID NOT NULL REFERENCES aios.tenants(id) ON DELETE CASCADE,
      client_id       UUID REFERENCES aios.clients(id) ON DELETE SET NULL,
      invoice_number  TEXT NOT NULL,
      amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency        TEXT NOT NULL DEFAULT 'GBP',
      status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','paid','overdue','cancelled')),
      description     TEXT,
      issued_at       DATE NOT NULL DEFAULT CURRENT_DATE,
      due_date        DATE,
      paid_at         DATE,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`ALTER TABLE aios.client_invoices ENABLE ROW LEVEL SECURITY;`);
  await client.query(`
    DROP POLICY IF EXISTS invoices_tenant_isolation ON aios.client_invoices;
    CREATE POLICY invoices_tenant_isolation ON aios.client_invoices
      USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
  `);

  await client.query(`
    CREATE OR REPLACE FUNCTION aios.set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$;
  `);
  await client.query(`
    DROP TRIGGER IF EXISTS trg_client_invoices_updated_at ON aios.client_invoices;
    CREATE TRIGGER trg_client_invoices_updated_at
      BEFORE UPDATE ON aios.client_invoices
      FOR EACH ROW EXECUTE FUNCTION aios.set_updated_at();
  `);

  await client.query(`NOTIFY pgrst, 'reload schema'`);
  console.log('✅ aios.client_invoices created with RLS');
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
