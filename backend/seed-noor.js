/**
 * Noor Aesthetics (نور للجماليات) — Demo seed data
 * Clears generic tenant data and inserts clinic-specific records
 *
 * Run: node seed-noor.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

const TENANT = '6e621289-e6f3-4a9d-9f3f-c2c4902a9017';
const ADMIN  = 'd8e5fdec-b253-4c8b-821d-7778c265d728';

// Fixed UUIDs so calendar events and invoices can reference clients
const C1 = 'c1a00000-0000-0000-0000-000000000001'; // Lady Sarah Beaumont
const C2 = 'c2a00000-0000-0000-0000-000000000002'; // Mariam Al-Rashidi
const C3 = 'c3a00000-0000-0000-0000-000000000003'; // Charlotte Fairfax
const C4 = 'c4a00000-0000-0000-0000-000000000004'; // Noura Al-Hassan
const C5 = 'c5a00000-0000-0000-0000-000000000005'; // Victoria Blackwood
const C6 = 'c6a00000-0000-0000-0000-000000000006'; // Emma Fitzgerald
const C7 = 'c7a00000-0000-0000-0000-000000000007'; // Dr. Aisha Al-Khalid

async function seed() {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    // ── 1. CLEAR existing tenant data ─────────────────────────────────────
    await db.query(`DELETE FROM aios.client_invoices WHERE tenant_id = '${TENANT}'`);
    await db.query(`DELETE FROM aios.calendar_events  WHERE tenant_id = '${TENANT}'`);
    await db.query(`DELETE FROM aios.clients          WHERE tenant_id = '${TENANT}'`);
    await db.query(`DELETE FROM aios.leads            WHERE tenant_id = '${TENANT}'`);
    await db.query(`DELETE FROM aios.contacts         WHERE tenant_id = '${TENANT}'`);
    await db.query(`DELETE FROM aios.token_usage      WHERE tenant_id = '${TENANT}'`);
    console.log('   Cleared existing data');

    // ── 2. CLIENTS — 7 VIP patients ───────────────────────────────────────
    await db.query(`
      INSERT INTO aios.clients
        (id, tenant_id, name, email, phone, company, industry, contract_value,
         status, stage, notes, assigned_to, address, next_renewal_at,
         admission_date, admission_notes,
         investigation_date, investigation_notes,
         follow_up_date, follow_up_notes,
         discharge_date, discharge_notes,
         created_at)
      VALUES
      ('${C1}','${TENANT}','Lady Sarah Beaumont','sarah.beaumont@thehendersons.co.uk',
       '+44 7700 100001','Beaumont Family','Aesthetics & Wellness',2400.00,
       'active','follow_up',
       'Preference for early morning appointments. Sensitive skin — avoid AHAs.',
       '${ADMIN}','14 Cheyne Walk, Chelsea, London SW3 5QL','2027-04-01',
       '2025-09-10','Initial full-face assessment. Medical history reviewed, no contraindications.',
       '2025-10-02','Fitzpatrick type II. Recommended: Botox 20u forehead + PRF therapy.',
       '2026-03-15','Post-treatment review — excellent results. Mild bruising resolved.',
       null,null,
       NOW()-'90 days'::interval),

      ('${C2}','${TENANT}','Mariam Al-Rashidi','mariam.rashidi@icloud.com',
       '+44 7700 100002','Al-Rashidi Family','Aesthetics & Wellness',1800.00,
       'active','investigation',
       'Speaks Arabic and English. Referred by a close family friend. Prefers female practitioner.',
       '${ADMIN}','8 Knightsbridge Court, London SW1X 7LY','2027-06-15',
       '2026-01-20','First consultation completed. Discussed full skin analysis programme.',
       '2026-04-05','VISIA skin analysis completed. Identified hyperpigmentation and fine lines. Treatment plan drafted.',
       null,null,
       null,null,
       NOW()-'60 days'::interval),

      ('${C3}','${TENANT}','Charlotte Fairfax','c.fairfax@privateemail.co.uk',
       '+44 7700 100003','Fairfax Estate','Aesthetics & Wellness',3600.00,
       'active','active',
       'Annual subscription client. Attends monthly maintenance sessions.',
       '${ADMIN}','Fairfax House, 22 Eaton Square, London SW1W 9BJ','2027-01-10',
       '2024-06-01','Comprehensive new-patient assessment. Full medical and skin history taken.',
       '2024-07-15','Full aesthetic evaluation: Botox, filler mapping, and laser plan designed.',
       '2025-01-20','6-month review — maintaining excellent results. Adjusted Botox dosage slightly.',
       '2025-08-10','Course of treatments fully discharged. Moving to annual maintenance programme.',
       NOW()-'120 days'::interval),

      ('${C4}','${TENANT}','Noura Al-Hassan','noura.hassan@gmail.com',
       '+44 7700 100004','Al-Hassan Family','Aesthetics & Wellness',600.00,
       'active','admission',
       'New patient. Interested in lip filler and skin booster. First-time aesthetics treatment.',
       '${ADMIN}','Flat 3B, 45 Park Lane, London W1K 1PN',null,
       '2026-06-12','Initial consultation booked via website. Consent forms completed. Medical questionnaire pending review.',
       null,null,
       null,null,
       null,null,
       NOW()-'1 day'::interval),

      ('${C5}','${TENANT}','Victoria Blackwood','v.blackwood@outlook.com',
       '+44 7700 100005','Blackwood Family','Aesthetics & Wellness',1200.00,
       'active','discharge',
       'Completed full programme. Very satisfied. Likely to return for annual maintenance.',
       '${ADMIN}','9 Sloane Terrace, Chelsea, London SW1X 9DQ','2026-12-01',
       '2025-05-10','Initial consultation for post-partum skin restoration programme.',
       '2025-06-01','Full skin analysis. Recommended: PRF + hydration therapy course.',
       '2026-01-15','Mid-programme review — excellent skin hydration improvements noted.',
       '2026-05-01','Programme successfully completed. All treatment goals achieved. Discharge summary filed.',
       NOW()-'42 days'::interval),

      ('${C6}','${TENANT}','Emma Fitzgerald','emma.fitz@gmail.com',
       '+44 7700 100006','Fitzgerald Family','Aesthetics & Wellness',2100.00,
       'active','follow_up',
       'Lip and cheek filler programme. Requires 3 sessions. Session 2 of 3 completed.',
       '${ADMIN}','25 King''s Road, Chelsea, London SW3 4RP','2026-09-20',
       '2026-02-14','Consultation for lip and cheek dermal filler. Discussed volume and technique preferences.',
       '2026-03-01','Pre-treatment patch test and detailed mapping session. No adverse reactions.',
       '2026-05-10','Session 2 complete. Volume assessment positive. Final session scheduled.',
       null,null,
       NOW()-'33 days'::interval),

      ('${C7}','${TENANT}','Dr. Aisha Al-Khalid','aisha.khalid@doctoraisha.com',
       '+44 7700 100007','Al-Khalid Family','Medical & Aesthetics',5200.00,
       'active','active',
       'VIP Executive Package. GP — appreciates clinical detail. Annual bespoke treatment plan.',
       '${ADMIN}','The Penthouse, 100 Harley Street, London W1G 7JA','2027-03-01',
       '2024-11-05','Premium package onboarding. Comprehensive health screening completed.',
       '2024-12-10','Full aesthetic & wellness evaluation. 12-month bespoke treatment plan created.',
       '2025-06-20','Mid-year VIP review. All treatments on track. Added laser skin resurfacing.',
       '2026-01-10','Annual programme completed. Renewed into second year with expanded package.',
       NOW()-'155 days'::interval)
    `);
    console.log('   ✓ 7 clients inserted');

    // ── 3. LEADS — 8 enquiries ─────────────────────────────────────────────
    await db.query(`
      INSERT INTO aios.leads (id, tenant_id, name, email, phone, source, status, score, assigned_to, notes, created_at)
      VALUES
      (gen_random_uuid(),'${TENANT}','Layla Mohammed',   'layla.m@gmail.com',          '+44 7700 200001','website', 'new',       72,'${ADMIN}','Enquiry via contact form. Interested in lip filler and skin booster consultation.',NOW()-'2 days'::interval),
      (gen_random_uuid(),'${TENANT}','Sophie Harrison',  'sophie.h@icloud.com',         '+44 7700 200002','ads',     'contacted', 65,'${ADMIN}','Found Noor on Instagram. Interested in Botox for forehead lines. Demo call booked.',NOW()-'5 days'::interval),
      (gen_random_uuid(),'${TENANT}','Amira Al-Qasim',   'amira.q@hotmail.com',         '+44 7700 200003','referral','qualified', 88,'${ADMIN}','Referred directly by Lady Beaumont. Ready to book initial consultation.',NOW()-'8 days'::interval),
      (gen_random_uuid(),'${TENANT}','Rachel Chen',      'rachel.chen@gmail.com',       '+44 7700 200004','website', 'new',       48,'${ADMIN}','Website enquiry about anti-ageing treatments. Has not booked yet.',NOW()-'1 day'::interval),
      (gen_random_uuid(),'${TENANT}','Nadia Al-Farouq',  'nadia.alfarouq@outlook.com',  '+44 7700 200005','referral','won',       95,'${ADMIN}','Referred by Mariam Al-Rashidi. Premium package confirmed. Onboarding in progress.',NOW()-'15 days'::interval),
      (gen_random_uuid(),'${TENANT}','Jessica Palmer',   'j.palmer@yahoo.co.uk',        '+44 7700 200006','linkedin','lost',      28,'${ADMIN}','Enquired about full facial programme. Lost — budget constraints.',NOW()-'22 days'::interval),
      (gen_random_uuid(),'${TENANT}','Hana Yasuda',      'hana.y@gmail.com',            '+44 7700 200007','ads',     'contacted', 61,'${ADMIN}','Instagram ad conversion. Interested in cheek filler. Follow-up scheduled.',NOW()-'3 days'::interval),
      (gen_random_uuid(),'${TENANT}','Claire Dubois',    'claire.dubois@me.com',        '+44 7700 200008','referral','qualified', 82,'${ADMIN}','Referred by Charlotte Fairfax. Looking for full PRF and hydration programme.',NOW()-'6 days'::interval)
    `);
    console.log('   ✓ 8 leads inserted');

    // ── 4. CONTACTS ────────────────────────────────────────────────────────
    await db.query(`
      INSERT INTO aios.contacts (id, tenant_id, name, email, phone, company, status, created_at)
      VALUES
      (gen_random_uuid(),'${TENANT}','Dr. James Harrington','j.harrington@aestheticsboard.co.uk','+44 7700 300001','Aesthetics Regulatory Board','active', NOW()-'90 days'::interval),
      (gen_random_uuid(),'${TENANT}','Camille Martin',       'camille@juvederm.co.uk',             '+44 7700 300002','Juvederm UK Supplies',        'active', NOW()-'60 days'::interval),
      (gen_random_uuid(),'${TENANT}','Dr. Sara Okafor',      's.okafor@medpharma.co.uk',           '+44 7700 300003','MedPharma Aesthetics',        'active', NOW()-'45 days'::interval),
      (gen_random_uuid(),'${TENANT}','Thomas Reed',          't.reed@clinicdesign.co.uk',          '+44 7700 300004','Clinic Interior Design Ltd',  'inactive',NOW()-'120 days'::interval),
      (gen_random_uuid(),'${TENANT}','Farah Al-Sayed',       'farah.sayed@arabicmedia.ae',         '+971 50 300 0005','Gulf Aesthetics Media',       'active', NOW()-'30 days'::interval)
    `);
    console.log('   ✓ 5 contacts inserted');

    // ── 5. CALENDAR EVENTS — 10 appointments ──────────────────────────────
    await db.query(`
      INSERT INTO aios.calendar_events
        (id, tenant_id, created_by, title, description, category, start_at, end_at, all_day, status, linked_type, linked_id)
      VALUES
      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'Initial Consultation — Noura Al-Hassan',
       'First-time patient assessment. Lip filler and skin booster enquiry. Consent forms to be signed.',
       'other',
       NOW()::date + time '10:00', NOW()::date + time '11:00',
       false,'pending','client','${C4}'),

      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'Skin Analysis Session — Mariam Al-Rashidi',
       'VISIA follow-up scan. Review treatment plan and confirm session 1 booking.',
       'other',
       (NOW()+'1 day'::interval)::date + time '14:00', (NOW()+'1 day'::interval)::date + time '15:00',
       false,'pending','client','${C2}'),

      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'Dermal Filler — Session 3 (Final) — Emma Fitzgerald',
       'Session 3 of 3. Lip refinement and cheek symmetry balance. Post-treatment photos required.',
       'other',
       (NOW()+'3 days'::interval)::date + time '11:00', (NOW()+'3 days'::interval)::date + time '12:30',
       false,'pending','client','${C6}'),

      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'VIP Treatment Session — Dr. Aisha Al-Khalid',
       'Quarterly VIP session. Laser skin resurfacing + Botox maintenance. Champagne prepared.',
       'other',
       (NOW()+'4 days'::interval)::date + time '09:00', (NOW()+'4 days'::interval)::date + time '11:00',
       false,'pending','client','${C7}'),

      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'New Patient Consultation — Amira Al-Qasim',
       'Referred by Lady Beaumont. Assess suitability for anti-ageing programme. High-priority lead.',
       'other',
       (NOW()+'5 days'::interval)::date + time '15:00', (NOW()+'5 days'::interval)::date + time '16:00',
       false,'pending',null,null),

      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'Follow-Up Review — Lady Sarah Beaumont',
       '3-month post-treatment review. Assess Botox longevity and PRF outcome. Photos comparison.',
       'other',
       (NOW()+'7 days'::interval)::date + time '10:00', (NOW()+'7 days'::interval)::date + time '11:00',
       false,'pending','client','${C1}'),

      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'Monthly Maintenance — Charlotte Fairfax',
       'Ongoing monthly subscription session. Skin hydration assessment and preventative Botox.',
       'other',
       (NOW()+'14 days'::interval)::date + time '13:00', (NOW()+'14 days'::interval)::date + time '14:00',
       false,'pending','client','${C3}'),

      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'Noor Clinic — Monthly Team Meeting',
       'Review KPIs, patient outcomes, upcoming campaigns, and staff training schedule.',
       'meeting',
       (NOW()+'21 days'::interval)::date + time '09:00', (NOW()+'21 days'::interval)::date + time '10:30',
       false,'pending',null,null),

      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'Botox Consultation — Sophie Harrison',
       'Follow up from Instagram lead. First appointment for forehead Botox assessment.',
       'other',
       (NOW()+'45 days'::interval)::date + time '11:00', (NOW()+'45 days'::interval)::date + time '12:00',
       false,'pending',null,null),

      (gen_random_uuid(),'${TENANT}','${ADMIN}',
       'Contract Renewal — Charlotte Fairfax',
       'Annual VIP subscription renewal. Prepare updated treatment plan and pricing proposal.',
       'contract',
       (NOW()+'180 days'::interval)::date + time '09:00', (NOW()+'180 days'::interval)::date + time '10:00',
       false,'pending','client','${C3}')
    `);
    console.log('   ✓ 10 calendar events inserted');

    // ── 6. INVOICES ────────────────────────────────────────────────────────
    await db.query(`
      INSERT INTO aios.client_invoices
        (id, tenant_id, client_id, invoice_number, amount, currency, status, description, issued_at, due_date, paid_at)
      VALUES
      (gen_random_uuid(),'${TENANT}','${C1}','NOOR-2025-0001',800.00,'GBP','paid',
       'Facial Rejuvenation Programme — Initial deposit (Lady Beaumont)','2025-09-10','2025-09-24','2025-09-18'),
      (gen_random_uuid(),'${TENANT}','${C1}','NOOR-2025-0012',1600.00,'GBP','paid',
       'Facial Rejuvenation Programme — Balance payment (Lady Beaumont)','2025-10-15','2025-10-29','2025-10-22'),
      (gen_random_uuid(),'${TENANT}','${C2}','NOOR-2026-0003',1800.00,'GBP','pending',
       'Premium Skin Analysis & Treatment Programme — Mariam Al-Rashidi','2026-04-05','2026-05-05',null),
      (gen_random_uuid(),'${TENANT}','${C3}','NOOR-2025-0008',3600.00,'GBP','paid',
       'Annual VIP Maintenance Programme — Charlotte Fairfax','2025-01-10','2025-01-25','2025-01-12'),
      (gen_random_uuid(),'${TENANT}','${C4}','NOOR-2026-0015',150.00,'GBP','paid',
       'Initial Consultation Deposit — Noura Al-Hassan','2026-06-12','2026-06-19','2026-06-12'),
      (gen_random_uuid(),'${TENANT}','${C6}','NOOR-2026-0007',700.00,'GBP','paid',
       'Dermal Filler Programme — Session 1 (Emma Fitzgerald)','2026-03-01','2026-03-15','2026-03-10'),
      (gen_random_uuid(),'${TENANT}','${C6}','NOOR-2026-0009',1400.00,'GBP','pending',
       'Dermal Filler Programme — Sessions 2 & 3 (Emma Fitzgerald)','2026-05-10','2026-06-10',null),
      (gen_random_uuid(),'${TENANT}','${C7}','NOOR-2026-0001',5200.00,'GBP','overdue',
       'VIP Executive Package — Annual Subscription (Dr. Aisha Al-Khalid)','2026-01-10','2026-02-10',null)
    `);
    console.log('   ✓ 8 invoices inserted');

    // ── 7. TOKEN USAGE — real agent names matching backend code ────────────────
    await db.query(`
      INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost, created_at)
      VALUES
      (gen_random_uuid(),'${TENANT}','aios-chat',        1840,1120,'gpt-4o',0.044,NOW()-'1 day'::interval),
      (gen_random_uuid(),'${TENANT}','aios-chat',        2200,1400,'gpt-4o',0.053,NOW()-'2 days'::interval),
      (gen_random_uuid(),'${TENANT}','aios-chat',        1500, 900,'gpt-4o',0.036,NOW()-'4 days'::interval),
      (gen_random_uuid(),'${TENANT}','aios-telegram',    1100, 680,'gpt-4o',0.027,NOW()-'1 day'::interval),
      (gen_random_uuid(),'${TENANT}','aios-telegram',     820, 510,'gpt-4o',0.020,NOW()-'3 days'::interval),
      (gen_random_uuid(),'${TENANT}','aios-telegram-tts',   0, 420,'tts-1', 0.013,NOW()-'2 days'::interval),
      (gen_random_uuid(),'${TENANT}','security-analyzer',3400,1800,'gpt-4o',0.068,NOW()-'1 day'::interval),
      (gen_random_uuid(),'${TENANT}','security-analyzer',2600,1400,'gpt-4o',0.052,NOW()-'5 days'::interval)
    `);
    console.log('   ✓ 8 token_usage entries inserted');

    await db.query('COMMIT');
    console.log('');
    console.log('✅  Noor Aesthetics seed completed successfully');
    console.log('');
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('❌  Seed failed:', err.message);
    console.error(err.detail ?? '');
    process.exit(1);
  } finally {
    db.release();
    pool.end();
  }
}

seed();
