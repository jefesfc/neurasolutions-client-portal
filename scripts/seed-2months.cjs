const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

const TENANT_ID = '6e621289-e6f3-4a9d-9f3f-c2c4902a9017';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function run() {
  await client.connect();

  // ── LEADS (40 over 2 months) ──
  const leadSources = ['website', 'linkedin', 'referral', 'ads', 'other'];
  const leadStatuses = ['new', 'new', 'new', 'contacted', 'contacted', 'qualified', 'qualified', 'won', 'lost'];
  const leadNames = [
    'James Whitfield', 'Sofia Morales', 'Ryan Okafor', 'Emma Larsson', 'Luca Bianchi',
    'Hannah Schmidt', 'Ethan Patel', 'Isabella Rossi', 'Caleb Nkrumah', 'Olivia Chen',
    'Mohammed Al-Farsi', 'Priya Sharma', 'Lucas Fernandez', 'Charlotte Dupont', 'Amir Hassan',
    'Grace Kim', 'Noah Bergstrom', 'Amara Diallo', 'Daniel Petrov', 'Yuki Tanaka',
    'Benjamin Walsh', 'Fatima Al-Rashid', 'Carlos Mendoza', 'Sarah Johansson', 'Ahmed Khalil',
    'Elena Volkov', 'Jack OBrien', 'Nia Williams', 'Max Hofmann', 'Claire Martin',
    'Ravi Nair', 'Zara Ahmed', 'Tom Patterson', 'Mei Lin', 'Oscar Lindgren',
    'Layla Mustafa', 'Finn McCarthy', 'Ayesha Butt', 'Marco Reyes', 'Ingrid Svensson',
  ];

  console.log('Seeding leads...');
  for (let i = 0; i < leadNames.length; i++) {
    const name = leadNames[i];
    const email = name.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.{2,}/g, '.') + '@example.com';
    const company = pick(['TechCore Ltd', 'Apex Solutions', 'BrightPath Inc', 'Vega Systems', 'Nexus Group', 'Orion Digital', 'Stellar Ops', 'Summit Ventures', 'Clarity Works', 'Horizon AI']);
    await client.query(
      `INSERT INTO aios.leads (id, tenant_id, name, email, phone, source, status, score, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), TENANT_ID, name, email, `+44 7${randomBetween(100,999)} ${randomBetween(100000,999999)}`,
       pick(leadSources), pick(leadStatuses), randomBetween(30, 95),
       pick(['Interested in full platform', 'Needs demo first', 'Budget confirmed', 'Referred by partner', null, null]),
       daysAgo(randomBetween(0, 60))]
    );
  }

  // ── CLIENTS (10 over 2 months) ──
  console.log('Seeding clients...');
  const clientData = [
    { name: 'Andrew Blake',    company: 'TechCore Ltd',       industry: 'Technology',        contract_value: 14000, status: 'active' },
    { name: 'Sarah Mitchell',  company: 'Apex Solutions',     industry: 'Consulting',         contract_value: 12500, status: 'active' },
    { name: 'James Thornton',  company: 'BrightPath Inc',     industry: 'Marketing',          contract_value: 9800,  status: 'active' },
    { name: 'Priya Kapoor',    company: 'Vega Systems',       industry: 'Technology',         contract_value: 16000, status: 'active' },
    { name: 'David Laurent',   company: 'Nexus Group',        industry: 'Financial Services', contract_value: 22000, status: 'active' },
    { name: 'Emma Harrison',   company: 'Orion Digital',      industry: 'E-commerce',         contract_value: 11000, status: 'active' },
    { name: 'Carlos Ruiz',     company: 'Summit Ventures',    industry: 'Venture Capital',    contract_value: 18500, status: 'inactive' },
    { name: 'Yuki Nakamura',   company: 'Clarity Works',      industry: 'Healthcare',         contract_value: 13200, status: 'active' },
    { name: 'Fatima Al-Zahra', company: 'Horizon AI',         industry: 'AI / ML',            contract_value: 25000, status: 'active' },
    { name: 'Tom Bradshaw',    company: 'Stellar Ops',        industry: 'Operations',         contract_value: 8500,  status: 'churned' },
  ];

  for (let i = 0; i < clientData.length; i++) {
    const c = clientData[i];
    const email = c.name.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.{2,}/g, '.') + '@' + c.company.toLowerCase().replace(/[^a-z]/g, '') + '.com';
    const renewal = new Date(); renewal.setMonth(renewal.getMonth() + randomBetween(1, 11));
    await client.query(
      `INSERT INTO aios.clients (id, tenant_id, name, email, phone, company, industry, contract_value, status, next_renewal_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), TENANT_ID, c.name, email, `+44 7${randomBetween(100,999)} ${randomBetween(100000,999999)}`,
       c.company, c.industry, c.contract_value, c.status,
       renewal.toISOString().split('T')[0],
       daysAgo(randomBetween(0, 55))]
    );
  }

  // ── SECURITY EVENTS (60 over 2 months) ──
  console.log('Seeding security events...');
  const eventTypes = [
    'login_failed', 'login_failed', 'login_failed',
    'brute_force', 'login_new_ip', 'login_new_ip',
    'login_unusual_time', 'unauthorized_route',
    'prompt_injection_attempt', 'settings_modified',
    'admin_created', 'bulk_export', 'permission_escalation',
  ];
  const severities = ['low', 'low', 'low', 'medium', 'medium', 'high', 'critical'];
  const ips = ['192.168.1.45', '10.0.0.23', '176.32.103.14', '52.86.201.9', '185.234.21.88', null, null, null];

  for (let i = 0; i < 60; i++) {
    const evType = pick(eventTypes);
    const sev = evType === 'brute_force' ? 'high' : evType === 'prompt_injection_attempt' ? 'high' : evType === 'permission_escalation' ? 'critical' : pick(severities);
    await client.query(
      `INSERT INTO aios.security_events (id, tenant_id, event_type, severity, actor_ip, target_resource, metadata, resolved, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), TENANT_ID, evType, sev, pick(ips),
       pick(['/api/leads', '/api/clients', '/login', '/api/chat', '/api/admin', '/api/team']),
       JSON.stringify({ attempt: randomBetween(1, 8), user_agent: 'Mozilla/5.0' }),
       Math.random() > 0.4,
       daysAgo(randomBetween(0, 60))]
    );
  }

  // ── CALENDAR EVENTS (40 over 2 months) ──
  console.log('Seeding calendar events...');
  const calCategories = ['meeting', 'invoice', 'contract', 'reminder', 'other'];
  const calTitles = {
    meeting:  ['Q2 Review Call', 'Onboarding Session', 'Strategy Planning', 'Client Check-in', 'Demo Presentation'],
    invoice:  ['Invoice Due - TechCore', 'Invoice Due - Apex', 'Monthly Invoice Review', 'Payment Reminder'],
    contract: ['Contract Renewal - Nexus', 'Contract Review', 'SLA Review Meeting', 'Annual Contract Sign-off'],
    reminder: ['Follow up with lead', 'Send proposal', 'Check payment status', 'Update CRM records'],
    other:    ['Team sync', 'Internal review', 'Platform maintenance', 'Backup verification'],
  };

  // users table uses 'role' column (not 'app_role')
  const adminRes = await client.query(
    `SELECT id FROM aios.users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`,
    [TENANT_ID]
  );
  const adminId = adminRes.rows[0]?.id;

  if (adminId) {
    for (let i = 0; i < 40; i++) {
      const cat = pick(calCategories);
      const title = pick(calTitles[cat]);
      const daysOffset = randomBetween(-60, 30);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + daysOffset);
      startDate.setHours(randomBetween(8, 17), 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
      await client.query(
        `INSERT INTO aios.calendar_events (id, tenant_id, created_by, title, category, start_at, end_at, all_day, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), TENANT_ID, adminId, title, cat, startDate.toISOString(), endDate.toISOString(), false,
         daysOffset < 0 ? pick(['done', 'done', 'cancelled']) : 'pending',
         daysAgo(randomBetween(0, 60))]
      );
    }
  } else {
    console.warn('No admin user found — skipping calendar events');
  }

  // ── TOKEN USAGE (200 records over 2 months) ──
  console.log('Seeding token_usage...');
  const agents = ['aios-chat', 'aios-chat', 'aios-telegram', 'aios-telegram-tts', 'security-analyzer', 'aios-reports'];
  const models = { 'aios-chat': 'gpt-4o', 'aios-telegram': 'gpt-4o', 'aios-telegram-tts': 'tts-1', 'security-analyzer': 'gpt-4o', 'aios-reports': 'gpt-4o' };

  for (let i = 0; i < 200; i++) {
    const agent = pick(agents);
    const tokIn  = randomBetween(200, 2000);
    const tokOut = randomBetween(100, 800);
    const cost   = (tokIn * 0.0000025) + (tokOut * 0.00001);
    await client.query(
      `INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), TENANT_ID, agent, tokIn, tokOut, models[agent] || 'gpt-4o', cost, daysAgo(randomBetween(0, 60))]
    );
  }

  // ── CLIENT INVOICES (20 records) ──
  console.log('Seeding client invoices...');
  const clientsRes = await client.query(
    `SELECT id, company, contract_value FROM aios.clients WHERE tenant_id = $1 AND status = 'active' LIMIT 8`,
    [TENANT_ID]
  );

  const invStatuses = ['paid', 'paid', 'paid', 'pending', 'pending', 'overdue'];
  let invCounter = 100;
  for (const cl of clientsRes.rows) {
    for (let m = 0; m < 2; m++) {
      const issuedDays = (2 - m) * 30 + randomBetween(0, 10);
      const issued = new Date(); issued.setDate(issued.getDate() - issuedDays);
      const due = new Date(issued); due.setDate(due.getDate() + 30);
      const status = issuedDays > 35 ? 'paid' : pick(invStatuses);
      invCounter++;
      await client.query(
        `INSERT INTO aios.client_invoices (id, tenant_id, client_id, invoice_number, amount, currency, status, description, issued_at, due_date, paid_at)
         VALUES ($1,$2,$3,$4,$5,'GBP',$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), TENANT_ID, cl.id, `INV-2026-${invCounter}`,
         parseFloat(cl.contract_value) / 12,
         status,
         `Monthly service fee - ${cl.company}`,
         issued.toISOString().split('T')[0],
         due.toISOString().split('T')[0],
         status === 'paid' ? issued.toISOString().split('T')[0] : null]
      );
    }
  }

  const clientCount = (await client.query(`SELECT COUNT(*) FROM aios.clients WHERE tenant_id = $1`, [TENANT_ID])).rows[0].count;
  const leadCount = (await client.query(`SELECT COUNT(*) FROM aios.leads WHERE tenant_id = $1`, [TENANT_ID])).rows[0].count;
  const secCount = (await client.query(`SELECT COUNT(*) FROM aios.security_events WHERE tenant_id = $1`, [TENANT_ID])).rows[0].count;
  const invCount = (await client.query(`SELECT COUNT(*) FROM aios.client_invoices WHERE tenant_id = $1`, [TENANT_ID])).rows[0].count;

  console.log('Seed complete');
  console.log(`   Clients: ${clientCount} | Leads: ${leadCount} | Security: ${secCount} | Invoices: ${invCount}`);
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
