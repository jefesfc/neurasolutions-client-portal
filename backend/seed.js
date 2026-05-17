// Crea un tenant y usuario admin de prueba
// Ejecutar: node seed.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

async function seed() {
  const password = 'Admin1234!';
  const hash = await bcrypt.hash(password, 10);

  // Crear tenant de prueba
  const tenantResult = await db.query(
    `INSERT INTO aios.tenants (name, subdomain, industry, plan)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['NeuraSolutions Demo', 'demo', 'Technology', 'starter']
  );
  const tenantId = tenantResult.rows[0].id;

  // Crear usuario admin
  await db.query(
    `INSERT INTO aios.users (tenant_id, email, name, role, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [tenantId, 'admin@demo.com', 'Admin AIOS', 'admin', hash]
  );

  console.log('✅ Tenant y usuario creados:');
  console.log('   Email:    admin@demo.com');
  console.log('   Password: Admin1234!');
  console.log('   Tenant:   NeuraSolutions Demo');
  await db.end();
}

seed().catch(console.error);
