export interface TreatmentInfo {
  id: string;
  name: string;
  category: string;
  price: string;
  duration: string;
  description: string;
  benefits: string[];
  recovery: string;
  ideal_for: string;
  emoji: string;
}

export interface MembershipInfo {
  id: string;
  tier: string;
  price: string;
  features: string[];
  ideal_for: string;
  savings: string;
  emoji: string;
}

export const TREATMENTS: TreatmentInfo[] = [
  {
    id: 'anti-wrinkle',
    name: 'Anti-Wrinkle Injections',
    category: 'Injectable Treatments',
    price: 'from £250',
    duration: '15–30 min',
    description: 'Botulinum toxin injections to relax targeted facial muscles, smoothing dynamic wrinkles caused by expression. Results appear within 3–7 days and last 3–4 months.',
    benefits: ['Smooths forehead lines & crow\'s feet', 'Prevents deepening of expression lines', 'Natural-looking, refreshed appearance', 'No downtime required'],
    recovery: 'No downtime. Avoid strenuous exercise and alcohol for 24h.',
    ideal_for: 'Adults with dynamic wrinkles, frown lines, or crow\'s feet.',
    emoji: '✨',
  },
  {
    id: 'dermal-fillers',
    name: 'Dermal Fillers',
    category: 'Injectable Treatments',
    price: 'from £350',
    duration: '30–60 min',
    description: 'Hyaluronic acid-based fillers to restore volume, define contours, and smooth deep lines. Ideal for cheeks, nasolabial folds, chin, and jawline.',
    benefits: ['Restores lost facial volume', 'Defines and lifts facial contours', 'Immediate visible results', 'Lasts 9–18 months'],
    recovery: 'Mild swelling for 24–72h. Avoid intense heat and exercise for 48h.',
    ideal_for: 'Anyone seeking facial volume restoration or contouring.',
    emoji: '💉',
  },
  {
    id: 'lip-augmentation',
    name: 'Lip Augmentation',
    category: 'Injectable Treatments',
    price: 'from £299',
    duration: '30–45 min',
    description: 'Precision hyaluronic acid filler to add volume, define the lip border, and create a naturally beautiful shape — avoiding the "overfilled" look.',
    benefits: ['Natural volume enhancement', 'Defined Cupid\'s bow and vermillion border', 'Hydrated, plump lips', 'Results last 6–12 months'],
    recovery: 'Swelling for 24–48h. Avoid kissing and straws for 24h.',
    ideal_for: 'Anyone seeking fuller, more defined lips.',
    emoji: '💋',
  },
  {
    id: 'jaw-slimming',
    name: 'Jaw / Face Slimming',
    category: 'Injectable Treatments',
    price: 'from £350',
    duration: '20–30 min',
    description: 'Botulinum toxin injections into the masseter muscle to slim the jawline, reduce teeth grinding (bruxism), and create a more oval facial silhouette.',
    benefits: ['Slimmer, more defined jawline', 'Reduces jaw tension and grinding', 'Non-surgical face contouring', 'Results last 4–6 months'],
    recovery: 'No downtime. Avoid chewing hard foods for 24h.',
    ideal_for: 'Clients with a wide or square jawline, or bruxism.',
    emoji: '🔶',
  },
  {
    id: 'skin-booster',
    name: 'Skin Boosters (Profhilo)',
    category: 'Injectable Treatments',
    price: 'from £450',
    duration: '30–45 min',
    description: 'High-concentration hyaluronic acid injected at specific bio-aesthetic points to deeply hydrate skin, stimulate collagen and elastin production.',
    benefits: ['Deep skin hydration', 'Improved skin tone and elasticity', 'Reduces fine lines', 'Natural bio-remodelling effect'],
    recovery: 'Small bumps for 24h. Two sessions 4 weeks apart recommended.',
    ideal_for: 'Anyone with dull, dehydrated or lax skin aged 30+.',
    emoji: '💧',
  },
  {
    id: 'prp',
    name: 'PRP Therapy',
    category: 'Injectable Treatments',
    price: 'from £400',
    duration: '60–75 min',
    description: 'Platelet-Rich Plasma therapy uses your own blood\'s growth factors to stimulate collagen production, accelerate healing, and rejuvenate skin naturally.',
    benefits: ['100% natural — uses your own blood', 'Stimulates collagen and cell renewal', 'Improves skin texture and tone', 'Effective for hair loss'],
    recovery: 'Mild redness for 24–48h. Avoid sun exposure for 48h.',
    ideal_for: 'Clients seeking natural skin regeneration or hair restoration.',
    emoji: '🩸',
  },
  {
    id: 'co2-laser',
    name: 'CO2 Laser Resurfacing',
    category: 'Laser & Resurfacing',
    price: 'from £800',
    duration: '30–60 min',
    description: 'Fractional CO2 laser removes damaged skin layers, stimulating intense collagen remodelling. One of the most effective treatments for scars, wrinkles, and skin laxity.',
    benefits: ['Dramatic wrinkle reduction', 'Scar and acne scar improvement', 'Tighter, firmer skin', 'Long-lasting results 1–3 years'],
    recovery: '5–10 days of redness and peeling. Strict sun protection required.',
    ideal_for: 'Clients with significant sun damage, scars, or skin laxity.',
    emoji: '🔬',
  },
  {
    id: 'ipl',
    name: 'IPL Photofacial',
    category: 'Laser & Resurfacing',
    price: 'from £350',
    duration: '30–45 min',
    description: 'Intense Pulsed Light targets pigmentation, broken capillaries, rosacea, and sun damage while stimulating collagen for an overall skin refresh.',
    benefits: ['Reduces pigmentation and age spots', 'Clears rosacea and redness', 'Improves overall skin tone', 'Minimal downtime'],
    recovery: 'Mild redness for 4–6h. Darkening of pigment spots before they shed.',
    ideal_for: 'Clients with sun damage, pigmentation, or rosacea.',
    emoji: '💡',
  },
  {
    id: 'laser-hair',
    name: 'Laser Hair Removal',
    category: 'Laser & Resurfacing',
    price: 'from £100 / session',
    duration: '15–60 min',
    description: 'Diode laser targets hair follicles to achieve permanent hair reduction across the face and body. Safe on all skin types.',
    benefits: ['Permanent hair reduction', 'Smooth, bump-free skin', 'Treats all body areas', 'Increasingly fine regrowth over sessions'],
    recovery: 'Mild redness for 24h. Avoid sun exposure between sessions.',
    ideal_for: 'Anyone seeking permanent hair reduction on any body area.',
    emoji: '⚡',
  },
  {
    id: 'hydrafacial',
    name: 'HydraFacial',
    category: 'Skin Treatments',
    price: 'from £160',
    duration: '45–60 min',
    description: 'A multi-step medical-grade facial using vortex technology to cleanse, extract, and hydrate skin simultaneously — leaving an instant visible glow. No discomfort, no downtime.',
    benefits: ['Deep cleanse and hydration', 'Unclogs pores painlessly', 'Immediate skin glow', 'Suitable for all skin types'],
    recovery: 'No downtime. Skin is glowing immediately after.',
    ideal_for: 'All skin types. Ideal as a monthly maintenance treatment.',
    emoji: '🌊',
  },
  {
    id: 'chemical-peel',
    name: 'Chemical Peel',
    category: 'Skin Treatments',
    price: 'from £180',
    duration: '30–45 min',
    description: 'Medically-graded acids exfoliate damaged surface skin, revealing a brighter, smoother complexion. Available in light, medium, and deep strengths.',
    benefits: ['Brighter, more even skin tone', 'Reduces acne and pigmentation', 'Smooths fine lines', 'Stimulates cell turnover'],
    recovery: 'Light: 1–2 days. Medium: 3–5 days of peeling. Avoid sun.',
    ideal_for: 'Uneven skin tone, acne, dullness, or mild sun damage.',
    emoji: '🧪',
  },
  {
    id: 'microneedling',
    name: 'Microneedling',
    category: 'Skin Treatments',
    price: 'from £250',
    duration: '60–75 min',
    description: 'Controlled micro-injuries from fine needles trigger the skin\'s natural healing response, producing new collagen and elastin for firmer, smoother skin.',
    benefits: ['Reduces fine lines and wrinkles', 'Improves skin texture and pores', 'Fades acne scars', 'Tightens lax skin'],
    recovery: 'Redness for 24–48h, similar to mild sunburn.',
    ideal_for: 'Fine lines, acne scars, enlarged pores, skin texture.',
    emoji: '🔩',
  },
  {
    id: 'microneedling-prp',
    name: 'Microneedling + PRP',
    category: 'Skin Treatments',
    price: 'from £450',
    duration: '75–90 min',
    description: 'Microneedling channels allow PRP growth factors to penetrate deeply, amplifying collagen stimulation for transformative results.',
    benefits: ['Amplified collagen production', 'Superior scar improvement', 'Deeper skin regeneration', 'Natural, long-lasting results'],
    recovery: '48–72h redness. Skin continues to improve over 3 months.',
    ideal_for: 'Advanced signs of ageing, deep scars, significant skin laxity.',
    emoji: '🔬',
  },
  {
    id: 'body-contouring',
    name: 'Non-Invasive Body Contouring',
    category: 'Body Treatments',
    price: 'from £300',
    duration: '45–60 min',
    description: 'Advanced technology combining radiofrequency and ultrasound to target stubborn fat deposits, tighten skin, and sculpt the body — no surgery, no downtime.',
    benefits: ['Reduces stubborn fat', 'Tightens and firms skin', 'Sculpts body contours', 'No anaesthesia required'],
    recovery: 'No downtime. Mild warmth or redness for a few hours.',
    ideal_for: 'Stubborn fat areas resistant to diet and exercise.',
    emoji: '💪',
  },
  {
    id: 'thread-lift',
    name: 'Thread Lift',
    category: 'Body Treatments',
    price: 'from £1,200',
    duration: '60–90 min',
    description: 'Biodegradable PDO threads inserted under the skin lift sagging tissue and stimulate collagen production — the non-surgical alternative to a facelift.',
    benefits: ['Immediate visible lift', 'Stimulates long-term collagen', 'Treats jowls, brows, and neck', 'Results last 12–18 months'],
    recovery: '3–5 days of mild swelling and bruising. Avoid massage for 2 weeks.',
    ideal_for: 'Mild to moderate skin laxity, sagging jowls or brows.',
    emoji: '🪡',
  },
];

export const MEMBERSHIPS: MembershipInfo[] = [
  {
    id: 'silver',
    tier: 'Silver',
    price: '£1,500 / year',
    features: [
      '2 Anti-Wrinkle treatments per year',
      '1 HydraFacial every month',
      '10% discount on all additional treatments',
      'Priority booking',
    ],
    ideal_for: 'Clients starting their aesthetic journey or seeking monthly maintenance.',
    savings: 'Save over £500 vs pay-as-you-go',
    emoji: '🥈',
  },
  {
    id: 'gold',
    tier: 'Gold',
    price: '£2,800 / year',
    features: [
      '4 Anti-Wrinkle treatments per year',
      '1 HydraFacial + 1 Chemical Peel per month',
      '20% discount on all treatments',
      'Dedicated personal consultant',
      'Free annual skin assessment',
      'Complimentary birthday treatment',
    ],
    ideal_for: 'Clients committed to ongoing skin health and visible improvement.',
    savings: 'Save over £1,200 vs pay-as-you-go',
    emoji: '🥇',
  },
  {
    id: 'platinum',
    tier: 'Platinum',
    price: '£5,200 / year  ·  or £450 / month',
    features: [
      'Unlimited Anti-Wrinkle and Filler treatments',
      'Unlimited HydraFacials and Chemical Peels',
      '30% discount on all laser and body treatments',
      'Same-day VIP booking',
      'Dedicated personal consultant',
      'Quarterly PRP sessions included',
      'Annual full skin rejuvenation package',
    ],
    ideal_for: 'VIP clients who want unlimited access to the full Noor Aesthetics offering.',
    savings: 'Save over £3,500 vs pay-as-you-go',
    emoji: '💎',
  },
];

const ALL_NAMES_SORTED = [
  ...TREATMENTS.map(t => t.name),
  ...MEMBERSHIPS.map(m => m.tier),
].sort((a, b) => b.length - a.length);

export const NAMES_REGEX = new RegExp(
  `(${ALL_NAMES_SORTED.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'gi'
);

export function findTreatment(name: string): TreatmentInfo | undefined {
  return TREATMENTS.find(t => t.name.toLowerCase() === name.toLowerCase());
}

export function findMembership(name: string): MembershipInfo | undefined {
  return MEMBERSHIPS.find(m => m.tier.toLowerCase() === name.toLowerCase());
}

/** Extract unique treatment/membership names found in a text string */
export function extractMentioned(text: string): string[] {
  const found = new Set<string>();
  const plain = text.replace(/<[^>]+>/g, ''); // strip HTML tags
  const matches = plain.matchAll(new RegExp(NAMES_REGEX.source, 'gi'));
  for (const m of matches) {
    const original = ALL_NAMES_SORTED.find(n => n.toLowerCase() === m[0].toLowerCase());
    if (original) found.add(original);
  }
  return [...found];
}

export function formatTreatmentHTML(t: TreatmentInfo): string {
  const lines: string[] = [
    `${t.emoji} <b>${t.name}</b>`,
    `<i>${t.category}</i>`,
    '',
    t.description,
    '',
    `💷 <b>Price:</b> ${t.price}`,
    `⏱ <b>Duration:</b> ${t.duration}`,
    '',
    '<b>Benefits:</b>',
    ...t.benefits.map(b => `  ✓ ${b}`),
    '',
    `🔄 <b>Recovery:</b> ${t.recovery}`,
    `👤 <b>Ideal for:</b> ${t.ideal_for}`,
  ];
  return lines.join('\n');
}

export function formatMembershipHTML(m: MembershipInfo): string {
  const lines: string[] = [
    `${m.emoji} <b>${m.tier} Membership</b>`,
    '',
    `💷 <b>Price:</b> ${m.price}`,
    `💰 <b>Savings:</b> ${m.savings}`,
    '',
    '<b>What\'s included:</b>',
    ...m.features.map(f => `  ✓ ${f}`),
    '',
    `👤 <b>Ideal for:</b> ${m.ideal_for}`,
    '',
    '<i>Reply or call us for a complimentary consultation.</i>',
  ];
  return lines.join('\n');
}
