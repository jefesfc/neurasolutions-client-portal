const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

const TENANT_ID = '6e621289-e6f3-4a9d-9f3f-c2c4902a9017';
const USER_ID   = 'd8e5fdec-b253-4c8b-821d-7778c265d728';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO aios.leads (id, tenant_id, name, email, phone, source, status, score, assigned_to, notes, created_at) VALUES
      (gen_random_uuid(),$1,'Carlos Mendoza',   'cmendoza@techcorp.es',    '+34 612 345 678',  'website', 'new',       82,$2,'Interesado en automatizacion de RRHH',     NOW()-'2 days'::interval),
      (gen_random_uuid(),$1,'Laura Perez',       'lperez@innova.io',        '+34 699 876 543',  'linkedin','contacted', 67,$2,'Demo agendada para el jueves',             NOW()-'5 days'::interval),
      (gen_random_uuid(),$1,'Mohammed Al-Rashid','mrashid@globallogic.com', '+44 7700 900123',  'referral','qualified', 91,$2,'Presupuesto aprobado esperando contrato',  NOW()-'8 days'::interval),
      (gen_random_uuid(),$1,'Sophie Dubois',     'sdubois@fintech.fr',      '+33 6 12 34 56 78','ads',     'new',       45,$2,'Llego por campana Google Ads',              NOW()-'1 day'::interval),
      (gen_random_uuid(),$1,'James Okonkwo',     'jokonkwo@venturesco.ng',  '+234 801 234 5678','referral','won',       95,$2,'Cerrado. Setup en progreso',                NOW()-'15 days'::interval),
      (gen_random_uuid(),$1,'Ana Kovacevic',     'akovacevic@startup.hr',   '+385 91 234 5678', 'website', 'lost',      30,$2,'Eligio competidor por precio',              NOW()-'20 days'::interval),
      (gen_random_uuid(),$1,'Tomas Rivera',      'trivera@manufactura.mx',  '+52 55 1234 5678', 'linkedin','contacted', 58,$2,'Segundo contacto pendiente',               NOW()-'3 days'::interval),
      (gen_random_uuid(),$1,'Priya Sharma',      'psharma@saasplatform.in', '+91 98765 43210',  'ads',     'qualified', 76,$2,'Evaluando AIOS vs solucion interna',         NOW()-'6 days'::interval),
      (gen_random_uuid(),$1,'Henrik Larsson',    'hlarsson@nordictech.se',  '+46 70 123 45 67', 'website', 'new',       50,$2,'Descargo whitepaper sin contacto aun',      NOW()-'12 hours'::interval),
      (gen_random_uuid(),$1,'Fatima Al-Zahrawi', 'falzahrawi@holdings.ae',  '+971 50 123 4567', 'referral','won',       98,$2,'Cliente premium 3 sedes',                  NOW()-'25 days'::interval)
    `, [TENANT_ID, USER_ID]);

    await client.query(`
      INSERT INTO aios.contacts (id, tenant_id, name, email, phone, company, status, created_at) VALUES
      (gen_random_uuid(),$1,'James Okonkwo',     'jokonkwo@venturesco.ng', '+234 801 234 5678','VenturesCo Nigeria', 'active',  NOW()-'14 days'::interval),
      (gen_random_uuid(),$1,'Fatima Al-Zahrawi', 'falzahrawi@holdings.ae', '+971 50 123 4567','Al-Zahrawi Holdings','active',  NOW()-'24 days'::interval),
      (gen_random_uuid(),$1,'Elena Marchetti',   'emarchetti@retail.it',   '+39 02 1234 5678','Marchetti Retail',   'active',  NOW()-'30 days'::interval),
      (gen_random_uuid(),$1,'David Osei',        'dosei@logistics.gh',     '+233 24 123 4567','Osei Logistics',     'active',  NOW()-'45 days'::interval),
      (gen_random_uuid(),$1,'Yuki Tanaka',       'ytanaka@designstudio.jp','+81 3 1234 5678', 'Tanaka Design',      'inactive',NOW()-'60 days'::interval)
    `, [TENANT_ID]);

    await client.query(`
      INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost, created_at) VALUES
      (gen_random_uuid(),$1,'Sales Agent',   1200, 800,'gpt-4o',      0.024,NOW()-'1 day'::interval),
      (gen_random_uuid(),$1,'Sales Agent',    950, 620,'gpt-4o',      0.019,NOW()-'2 days'::interval),
      (gen_random_uuid(),$1,'CRM Agent',     3400,1800,'gpt-4o',      0.068,NOW()-'1 day'::interval),
      (gen_random_uuid(),$1,'CRM Agent',     2100,1200,'gpt-4o',      0.042,NOW()-'3 days'::interval),
      (gen_random_uuid(),$1,'Support Agent',  800, 500,'gpt-4o-mini', 0.004,NOW()-'1 day'::interval),
      (gen_random_uuid(),$1,'Support Agent', 1500, 900,'gpt-4o-mini', 0.007,NOW()-'4 days'::interval),
      (gen_random_uuid(),$1,'Sales Agent',   2200,1400,'gpt-4o',      0.044,NOW()-'5 days'::interval),
      (gen_random_uuid(),$1,'CRM Agent',     1800,1100,'gpt-4o',      0.036,NOW()-'6 days'::interval)
    `, [TENANT_ID]);

    await client.query('COMMIT');
    console.log('Seed completado: 10 leads, 5 contacts, 8 token_usage');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
