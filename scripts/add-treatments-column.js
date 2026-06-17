const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

async function main() {
  await client.connect();

  await client.query(`
    ALTER TABLE aios.clients
    ADD COLUMN IF NOT EXISTS treatments text[] DEFAULT '{}';
  `);
  console.log('✅ treatments column added');

  await client.query(`NOTIFY pgrst, 'reload schema'`);
  console.log('✅ PostgREST schema reloaded');

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
