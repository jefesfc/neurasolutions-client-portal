require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { default: OpenAI } = require('openai');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const TENANT = '6e621289-e6f3-4a9d-9f3f-c2c4902a9017';
const INDEX  = process.env.PINECONE_INDEX ?? 'aios-knowledge';

const pc     = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pool   = new Pool({ connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core' });

const DOCUMENTS = [
  {
    name: 'Noor Aesthetics — Injectable Treatments Protocol.txt',
    type: 'text/plain',
    content: `NOOR AESTHETICS — INJECTABLE TREATMENTS PROTOCOL

BOTULINUM TOXIN (Botox / Dysport)
Indications: forehead lines, frown lines (glabella), crow's feet, brow lift, lip flip, chin dimpling, neck bands (platysma), hyperhidrosis (excessive sweating).
Units per area: Forehead 10-20u, Glabella 20-25u, Crow's feet 10-15u per side, Brow lift 2-4u per side.
Onset: 3-5 days, full effect at 14 days.
Duration: 3-4 months on average. Longevity improves with repeat treatments (up to 5-6 months over time).
Pre-care: Avoid alcohol 24h prior. Avoid aspirin/ibuprofen 7 days prior unless medically necessary.
Post-care: No exercise for 24 hours. Do not lie flat for 4 hours. No massaging treated areas. No extreme heat (sauna, steam room) for 2 weeks. No makeup on treated areas for 12 hours.
Contraindications: Pregnancy, breastfeeding, neuromuscular disorders (myasthenia gravis), allergy to botulinum toxin or albumin.
Pricing: From £280 (one area), £480 (two areas), £580 (three areas). Full face from £750. Annual membership clients receive 20% discount.

DERMAL FILLERS (Hyaluronic Acid)
Products used: Juvederm (Allergan), Restylane (Galderma).
Areas treated: Lips, nasolabial folds, marionette lines, cheeks/midface, jawline, chin, tear troughs, temples.
Lip augmentation: 0.5ml-1ml Juvederm Ultra or Volbella. Duration 9-12 months. Price from £380 (0.5ml), £580 (1ml).
Cheeks/midface: 1-2ml Juvederm Voluma or Restylane Lyft. Duration 18-24 months. Price from £450/ml.
Nasolabial folds: 0.5-1ml per side. Duration 9-12 months. Price from £320/side.
Jawline definition: 2-4ml total. Duration 12-18 months. Price from £550.
Tear troughs: Specialist procedure only, 0.5ml per side Restylane. Price from £580/side. Requires advanced practitioner assessment.
Chin: 1-2ml for projection. Duration 12-18 months. Price from £380.
Pre-care: No aspirin/ibuprofen/vitamin E 7-10 days before. No alcohol 24h before.
Post-care: Arnica gel recommended for bruising. No extreme temperatures for 2 weeks. No strenuous exercise 24h. No dental work 4 weeks after lip fillers.
Complications: Swelling (expected 24-72h), bruising (7-10 days). Vascular occlusion is a medical emergency — use hyaluronidase (Hylase) immediately, call on-call Dr.
Emergency kit: Hyaluronidase (Hylase), epinephrine 0.5mg/ml, 0.9% saline, oxygen.`
  },
  {
    name: 'Noor Aesthetics — VIP Membership Packages 2026.txt',
    type: 'text/plain',
    content: `NOOR AESTHETICS — VIP MEMBERSHIP PACKAGES 2026

PLATINUM MEMBERSHIP — £5,200/year (or £1,430 quarterly)
Benefits: Unlimited consultations with Dr. (normally £150 each), 20% discount on ALL treatments and retail products, Priority same-day booking, Dedicated patient concierge line, Annual comprehensive aesthetic assessment (full face, skin analysis, treatment plan), 1 complimentary HydraFacial Platinum per quarter (4 per year, value £1,520), Home visit consultations within London (up to 2 per year), Access to exclusive member-only treatment events and product launches, Complimentary annual skincare package (value £380), First access to new treatments.
Best for: Clients spending £2,000+ per year on treatments. ROI positive from month 4.
Upgrade from Gold: Pay difference pro-rated.

GOLD MEMBERSHIP — £2,800/year (or £770 quarterly)
Benefits: Unlimited consultations, 15% discount on all treatments and products, Priority booking (48h advance notice), Annual aesthetic assessment, 2 complimentary HydraFacial Deluxe per year (value £520), Access to member events.
Best for: Clients spending £1,200-£2,000 per year on treatments.

SILVER MEMBERSHIP — £1,500/year (or £412 quarterly)
Benefits: Unlimited consultations, 10% discount on all treatments and products, Priority booking (72h advance notice), Annual aesthetic assessment, 1 complimentary HydraFacial Classic per year (value £185).
Best for: New clients or those with lower treatment frequency.

PAYMENT TERMS: Annual upfront or quarterly payments (quarterly adds 10% surcharge). Auto-renewal 30 days before expiry. 30-day cancellation notice required. Non-refundable after first treatment.
MEMBERSHIP RULES: Non-transferable. One membership per person. Cannot be combined with promotional offers. Discounts apply at time of booking.
CORPORATE PACKAGES: Groups of 3+ staff from same company — contact clinic manager for bespoke rates.`
  },
  {
    name: 'Noor Aesthetics — Clinic Policies & Procedures.txt',
    type: 'text/plain',
    content: `NOOR AESTHETICS — CLINIC POLICIES & PROCEDURES

CONSULTATION FEES
Initial consultation: £150. Redeemable against any treatment booked and performed within 30 days of consultation. Follow-up review appointments: complimentary within 4 weeks of treatment. Platinum and Gold members: all consultations included in membership.

CANCELLATION & RESCHEDULING POLICY
48 hours or more notice: Full refund of deposit or free reschedule. No cancellation charge.
24-48 hours notice: £50 cancellation fee deducted from deposit. Remainder refunded or applied to rescheduled appointment.
Less than 24 hours notice or no-show: Full deposit (up to £150) is forfeited. Treatment must be re-booked and re-deposited.
Repeat no-shows (2 or more): Full prepayment required for all future appointments. This is non-negotiable.
Emergency cancellations (medical): Accepted with same-day notice if supported by documentation.

DEPOSITS
All appointments with treatment value over £200 require a 50% deposit at time of booking. Deposits are taken by card over phone or online. Deposits are non-transferable between different treatments but may be applied to rescheduled same-treatment appointments.

MEDICAL REQUIREMENTS
Full medical history form required before any first treatment. Clients must disclose: all prescription medications, supplements (fish oil, vitamin E, aspirin), known allergies, previous aesthetic treatments (including filler location and product if known), history of cold sores (relevant for lip treatments — prophylactic antivirals prescribed).
Patch test: Mandatory 48 hours before first laser treatment, IPL, and chemical peels. Not required for HA fillers or Botox.

AGE RESTRICTIONS
All injectable treatments (Botox, fillers): 18 years minimum, ID required if under 25.
Skincare consultations only for under-18s, with written parental consent and parent/guardian present.

PREGNANCY & BREASTFEEDING
Contraindicated: Botox, fillers, laser, IPL, chemical peels, microneedling, PRP.
May be considered with GP clearance: HydraFacial (no chemical boosters), LED light therapy, manual facials.

PHOTOGRAPHY
Clinical photographs taken before every treatment as part of medical record. Stored encrypted. Never shared or used for marketing without separate written consent form.

PAYMENT METHODS
Accepted: Cash, Visa, Mastercard, Amex, bank transfer (24h clearance required before appointment).
Finance: Available via Payl8r for treatments over £500. 6-24 month terms, subject to credit approval.
Not accepted: Cryptocurrency, cheques.

COMPLAINTS PROCEDURE
Contact clinic manager within 14 days of treatment. Review appointment offered within 7 days. Written response within 14 working days. Escalation to Dr. available if not resolved. CQC registered — complaints may be escalated to external body if unresolved.`
  },
  {
    name: 'Noor Aesthetics — Non-Invasive Treatments & Laser.txt',
    type: 'text/plain',
    content: `NOOR AESTHETICS — NON-INVASIVE TREATMENTS & LASER PROTOCOLS

HYDRAFACIAL (Signature Treatment)
Protocol: 3-step — (1) Cleanse & Peel: removes dead skin, unclogs pores with salicylic/glycolic acid; (2) Extract & Hydrate: painless suction extraction + hyaluronic acid serum; (3) Fuse & Protect: antioxidants + peptides.
Duration: Classic 45 min, Deluxe 75 min (+ LED + booster), Platinum 90 min (all add-ons).
Results: Immediate radiance, tighter pores, hydration boost. No downtime. Safe all skin types including sensitive and rosacea.
Add-ons: Lymphatic drainage booster (£40), MURAD growth factor booster (£60), Perk eye treatment (£45), Perk lip treatment (£35), LED light therapy (£50).
Frequency: Monthly for maintenance. Fortnightly for 4 sessions for intensive correction (acne, pigmentation, ageing).
Pricing: Classic £185, Deluxe £260, Platinum £380. Course of 3: 10% discount.

LASER TREATMENTS
IPL (Intense Pulsed Light): Targets pigmentation, sun spots, redness, superficial thread veins, diffuse redness. 3-6 sessions recommended, monthly. Price from £200/session, face £350, full face+neck £450. Course of 3: 15% discount.
Pre-care: No sun 4 weeks, no tanning beds 8 weeks, no retinol 5 days.
Post-care: SPF 50 every day minimum 4 weeks. Avoid sun. Healing balm provided. Redness 2-4h normal.

CO2 Fractional Laser: Skin resurfacing, acne scarring, fine lines, texture, enlarged pores. 1-3 sessions, 3 months apart. 5-10 days downtime (swelling, redness, peeling). Price from £450/session. Course of 3 from £1,100.
Pre-care: No retinol 2 weeks, antiviral medication for cold sore history, SPF 50 strict.
Post-care: Healing kit provided (balm, SPF). No makeup 5 days. No sun 3 months.

Nd:YAG 1064nm: Vascular lesions (spider veins, cherry angiomas), hair removal darker skin tones (Fitzpatrick IV-VI). Price from £180/session.

IV VITAMIN THERAPY
All infusions administered by registered nurse. 45-90 minutes in clinic. Drip by GP prescription for first infusion.

Myers Cocktail: Vitamin C 1000mg, B-complex, magnesium, calcium. Immunity, energy, hangover relief, hydration. £185/session.
Glutathione Skin Brightening: High-dose glutathione IV push. Skin lightening, antioxidant, liver support. Very popular with Middle Eastern and South Asian clients. £220/session. Course of 6: 15% discount.
NAD+ Anti-Ageing: Nicotinamide adenine dinucleotide. Cellular repair, cognitive clarity, energy. £350/session. Administered over 90 minutes minimum.
Fat Burner Infusion: L-carnitine, B12, chromium, MIC amino acids. Supports metabolism. £165/session.
Vitamin C High Dose: Immune support, skin brightening, antioxidant. £150/session.

PRP (PLATELET RICH PLASMA)
Procedure: Blood draw (15-20ml) → centrifuge → platelet-rich plasma separated → applied via microneedling or injection.
Applications: Facial rejuvenation (fine lines, texture, radiance), hair loss treatment (scalp injections), combined with microneedling for enhanced collagen stimulation.
Sessions: 3 sessions, 4-6 weeks apart. Maintenance annually.
Results visible: 6-8 weeks after first session. Full results after 3 sessions + 3 months.
Price: Face PRP £480/session, Hair PRP £550/session. Package of 3: 15% discount (face £1,224, hair £1,402).
Pre-care: No NSAIDs 5 days, no alcohol 24h, hydrate well day before.
Post-care: No makeup 24h (face), avoid sun 1 week, gentle shampoo 48h (scalp).`
  },
  {
    name: 'Noor Aesthetics — Patient FAQ.txt',
    type: 'text/plain',
    content: `NOOR AESTHETICS — FREQUENTLY ASKED QUESTIONS

Q: How long does Botox last?
A: Typically 3-4 months for most patients. With regular treatments every 3-4 months, many patients find the effect lasts 5-6 months as the muscles learn to relax. First-time patients may metabolise it faster (2-3 months).

Q: When will I see results from dermal fillers?
A: Results are visible immediately, though swelling for 24-72 hours may make lips appear larger than the final result. Full settled result is visible at 2 weeks when all swelling resolves.

Q: Is the treatment painful?
A: Topical anaesthetic cream is applied 20-30 minutes before all injectable treatments at no extra charge. Most patients rate discomfort 2-3/10. For lip fillers, a dental block anaesthetic is available if needed. IV treatments use a fine cannula with local anaesthetic if requested.

Q: Can I combine multiple treatments in one visit?
A: Yes — Botox and fillers are commonly combined in one session. Laser treatments are not combined with injectables on the same day. HydraFacial can be combined with LED add-on or PRP in one session.

Q: How far in advance should I book before an event (wedding, gala)?
A: Botox: 3-4 weeks before — allows bruising to resolve and toxin to fully settle. Fillers: 4-6 weeks before — allows swelling and any bruising to fully resolve. Laser or chemical peel: minimum 6-8 weeks before. Do not book any new treatment within 2 weeks of an important event.

Q: Do you offer payment plans for treatments?
A: Yes. Finance is available for single treatments over £500 through our finance partner (Payl8r). Terms from 6-24 months, subject to credit approval. Interest-free options for 6-month plans. Please ask at reception or enquire during consultation.

Q: Can I get a refund if I am not happy with the result?
A: If you are not satisfied with your treatment result, contact us within 14 days for a complimentary review appointment. Results vary based on individual anatomy and metabolism. Refunds for aesthetic treatments are assessed case by case per our medical policy. Top-up treatments may be offered at no charge where clinically appropriate.

Q: Do you treat male patients?
A: Yes. Approximately 30% of our clients are male. Popular treatments for men include: Botox (forehead, frown lines), jawline and chin fillers, HydraFacial, hair loss PRP, and IV vitamin therapy.

Q: Can you treat darker skin tones safely?
A: Yes. We use Nd:YAG laser (1064nm), which is specifically safe for Fitzpatrick skin types IV-VI. Our practitioners have extensive experience treating Middle Eastern, South Asian, and African skin tones. We do not offer IPL for darker skin types due to risk of pigmentation changes.

Q: What is the recovery time after treatments?
A: Botox: No downtime. Small needle marks resolve within hours. Fillers: 1-5 days for bruising and swelling. HydraFacial: No downtime, skin may be slightly pink for 1-2 hours. CO2 laser: 7-10 days of redness, peeling, and sensitivity. IPL: 1-3 days of redness. PRP: 24-48 hours redness or mild swelling.

Q: Do you offer home visits or private consultations outside the clinic?
A: Platinum members receive up to 2 home visit consultations per year within London. For private events (corporate wellness days, bridal preparation) please contact the clinic manager to discuss bespoke arrangements. Home treatment visits are not available for injectables due to medical safety regulations (emergency kit requirement).

Q: How do I know which treatment is right for me?
A: Book an initial consultation (£150, redeemable against treatment). Dr. will assess your concerns, medical history, and aesthetic goals and create a personalised treatment plan. We never recommend treatments that are not clinically appropriate, even if requested.`
  },
  {
    name: 'Noor Aesthetics — Staff Protocols & Emergency Procedures.txt',
    type: 'text/plain',
    content: `NOOR AESTHETICS — STAFF PROTOCOLS & EMERGENCY PROCEDURES

APPOINTMENT FLOW — ALL TREATMENTS
1. Reception confirms appointment 24h before (SMS + email).
2. Client arrives: ID check for under-25s, medical history form review, consent form signed.
3. Clinical photographs taken before treatment (mandatory).
4. Treatment room prepared: sterile field, emergency kit checked and accessible.
5. Dr. or nurse delivers treatment. Second staff member present for all injectable procedures.
6. Post-treatment verbal and written aftercare instructions given.
7. Review appointment booked before client leaves if applicable.
8. Notes entered in patient file (EMIS system) within 1 hour.

DR. SIGN-OFF REQUIREMENTS
All botulinum toxin and filler treatments require Dr. prescriber assessment before treatment, even if treatment delivered by nurse. Remote prescribing not permitted — Dr. must be on-site or have seen patient that day.

EMERGENCY PROTOCOLS
Anaphylaxis (signs: urticaria, throat swelling, hypotension, bronchospasm):
  → Call 999 immediately
  → Administer epinephrine 0.5mg IM (outer thigh)
  → Lay patient flat, legs raised
  → Adrenaline auto-injector available in all treatment rooms

Vascular occlusion (filler complication — signs: blanching, pain, slow capillary refill):
  → Do NOT continue treatment
  → Administer hyaluronidase (Hylase) 1500iu dissolved in 1ml saline immediately to affected area
  → Apply warm compress, 2% GTN topical paste
  → Call on-call Dr. immediately (number in emergency folder)
  → If no resolution within 1 hour or visual changes: call 999

Vasovagal syncope (fainting — most common):
  → Lower treatment chair flat, elevate legs
  → Monitor airway and breathing
  → Cold compress to neck
  → Reassure patient
  → Do not leave patient unattended
  → Check blood sugar if diabetic or fasting patient

EQUIPMENT & STOCK
Emergency kit contents checklist (checked weekly):
  ☐ Epinephrine (adrenaline) 1:1000 0.5mg/ml — 3 ampoules — check expiry monthly
  ☐ Hyaluronidase (Hylase) — 2 vials
  ☐ GTN paste 2% (Percutol)
  ☐ Oral antihistamine (chlorphenamine)
  ☐ IV access kit + 0.9% saline bag
  ☐ Pulse oximeter + blood pressure cuff
  ☐ Oxygen cylinder — check pressure weekly
  ☐ AED (defibrillator) — monthly self-test confirmed
  ☐ Emergency contact list (Dr. on-call, nearest A&E: St Mary's Hospital 2 miles)

DATA & GDPR
Patient records retained 8 years (adults), until age 25 (minors). All clinical photographs encrypted. Access restricted to clinical team. Subject access requests responded to within 30 days. Data breach protocol: ICO notification within 72 hours. DPO contact: dpo@nooraesthetics.co.uk.

INFECTION CONTROL
Single-use needles and cannulas. Sterile gloves for all procedures. Surface disinfection between clients (Clinell wipes). Sharps disposed in UN3291 yellow sharps container. Weekly clinical waste collection.`
  },
];

function chunkText(text, size = 800, overlap = 100) {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const chunks = [];
  let i = 0;
  while (i < cleaned.length) {
    chunks.push(cleaned.slice(i, i + size).trim());
    i += size - overlap;
  }
  return chunks.filter(c => c.length > 20);
}

async function embed(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000).replace(/\n+/g, ' '),
  });
  return res.data[0].embedding;
}

async function seed() {
  const index = pc.index(INDEX);
  const db    = await pool.connect();

  try {
    await db.query('BEGIN');

    const { rows: existing } = await db.query(
      `SELECT id, chunk_count FROM aios.knowledge_docs WHERE tenant_id = $1`,
      [TENANT]
    );
    if (existing.length > 0) {
      console.log(`   Clearing ${existing.length} existing docs from Pinecone...`);
      for (const doc of existing) {
        const ids = Array.from({ length: doc.chunk_count }, (_, i) => `${doc.id}-${i}`);
        if (ids.length > 0) await index.namespace(TENANT).deleteMany(ids);
      }
      await db.query(`DELETE FROM aios.knowledge_docs WHERE tenant_id = $1`, [TENANT]);
    }

    for (const doc of DOCUMENTS) {
      console.log(`\n   Indexing: ${doc.name}`);
      const chunks  = chunkText(doc.content);
      const docId   = uuidv4();
      const vectors = [];

      for (let i = 0; i < chunks.length; i++) {
        process.stdout.write(`     chunk ${i + 1}/${chunks.length}...\r`);
        const values = await embed(chunks[i]);
        vectors.push({
          id:       `${docId}-${i}`,
          values,
          metadata: { doc_id: docId, doc_name: doc.name, chunk_index: i, text: chunks[i] },
        });
      }

      for (let b = 0; b < vectors.length; b += 100) {
        await index.namespace(TENANT).upsert({ records: vectors.slice(b, b + 100) });
      }

      await db.query(
        `INSERT INTO aios.knowledge_docs (id, tenant_id, name, file_type, chunk_count) VALUES ($1, $2, $3, $4, $5)`,
        [docId, TENANT, doc.name, doc.type, chunks.length]
      );

      console.log(`   ✓ ${doc.name} — ${chunks.length} chunks indexed`);
    }

    await db.query('COMMIT');
    console.log('\n✅  Noor Aesthetics knowledge base seeded successfully');
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('❌', err.message);
  } finally {
    db.release();
    pool.end();
  }
}

seed();
