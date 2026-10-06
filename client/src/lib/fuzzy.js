// Small typo-tolerant matcher for the header search (e.g. "plumer", "elctric", "a/c" still match).

function distance(a, b) {
  // Damerau-Levenshtein (optimal string alignment), enough for short words.
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Extra words people type for each category slug.
const SYNONYMS = {
  plumbing: ['plumber', 'leak', 'tap', 'pipe', 'drain', 'geyser', 'tank', 'water', 'sink', 'toilet'],
  electrical: ['electrician', 'wiring', 'socket', 'breaker', 'light', 'fan', 'switch', 'bijli'],
  'ac-repair': ['ac', 'aircon', 'air conditioner', 'split', 'inverter', 'cooling', 'gas refill', 'hvac'],
  'car-mechanic': ['mechanic', 'car', 'auto', 'battery', 'brake', 'engine', 'tyre', 'tire'],
  'home-cleaning': ['cleaning', 'cleaner', 'maid', 'sofa', 'carpet', 'deep clean', 'kitchen'],
  carpentry: ['carpenter', 'wood', 'door', 'lock', 'cabinet', 'furniture', 'wardrobe'],
  painting: ['painter', 'paint', 'damp', 'wall', 'weather coat', 'polish'],
  'appliance-repair': ['washing machine', 'fridge', 'refrigerator', 'microwave', 'oven', 'appliance', 'dispenser'],
  'pest-control': ['pest', 'termite', 'cockroach', 'bed bug', 'mosquito', 'fumigation', 'spray'],
  'solar-ups': ['solar', 'ups', 'inverter', 'battery', 'panel', 'net metering'],
};

/** Returns categories ranked by how well they match the query, tolerant of small typos. */
export function matchCategories(query, categories, limit = 5) {
  const q = normalise(query);
  if (!q) return [];
  const qWords = q.split(' ');
  const scored = categories.map((c) => {
    const terms = [normalise(c.name), ...(SYNONYMS[c.slug] || [])];
    let best = 0;
    for (const term of terms) {
      if (term.startsWith(q)) best = Math.max(best, 100);
      else if (term.includes(q)) best = Math.max(best, 80);
      else {
        for (const tw of term.split(' ')) {
          for (const qw of qWords) {
            if (qw.length < 3) continue;
            if (tw.startsWith(qw)) best = Math.max(best, 70);
            const dist = distance(qw, tw.slice(0, Math.max(qw.length, 3) + 1));
            const allowed = qw.length >= 7 ? 2 : 1;
            if (dist <= allowed) best = Math.max(best, 60 - dist * 10);
          }
        }
      }
    }
    return { category: c, score: best };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.category);
}
