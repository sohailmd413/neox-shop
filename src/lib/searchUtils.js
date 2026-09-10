// Client-side search matching + highlight helpers for the autocomplete
// experience. Matching is layered: exact substring → all-words → lightweight
// typo tolerance (Levenshtein ≤ 1), so a minor misspelling still surfaces a
// relevant result before falling back to "No results".

export function norm(s = "") {
  return (s || "").toString().toLowerCase().trim();
}

// Iterative Levenshtein with two rolling rows. Good enough for short product
// names / query words; capped usage keeps it cheap.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// Score a product against the term. Lower score = better. -1 = no match.
// Tiers: 0 starts-with · 1 exact-substring · 2 all-words · 3 typo tolerant.
function scoreProduct(p, term, termWords, lang) {
  const name = norm(lang === "ar" ? (p.name_ar || p.name) : p.name);
  const nameAr = norm(p.name_ar);
  const brand = norm(p.brand);
  const haystack = `${name} ${nameAr} ${brand}`;

  if (!term) return -1;
  if (name.startsWith(term) || brand.startsWith(term)) return 0;
  if (name.includes(term) || nameAr.includes(term) || brand.includes(term)) return 1;

  // all-words: every typed word appears somewhere in name/brand (handles
  // reordering like "phone apple" → "Apple iPhone").
  if (termWords.length && termWords.every((w) => haystack.includes(w))) return 2;

  // typo tolerance: the whole term is within edit distance 1 of a single word
  // in the name (e.g. "iphne" → "iphone"). Only for reasonably long queries.
  if (term.length >= 4) {
    const nameWords = name.split(/\s+/);
    for (const w of nameWords) {
      if (w.length >= 3 && Math.abs(w.length - term.length) <= 2 && levenshtein(term, w) <= 1) return 3;
    }
  }
  return -1;
}

export function rankProducts(products, term, lang, limit = 5) {
  const t = norm(term);
  if (!t) return [];
  const words = t.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const p of products || []) {
    const s = scoreProduct(p, t, words, lang);
    if (s >= 0) scored.push({ p, s, rating: p.rating || 0 });
  }
  scored.sort((a, b) => (a.s - b.s) || (b.rating - a.rating) || 0);
  return scored.slice(0, limit).map((x) => x.p);
}

export function matchCategories(categories, term, lang, limit = 3) {
  const t = norm(term);
  if (!t) return [];
  const words = t.split(/\s+/).filter(Boolean);
  const out = [];
  for (const c of categories || []) {
    const name = norm(lang === "ar" ? (c.name_ar || c.name) : c.name);
    const nameAr = norm(c.name_ar);
    if (name.startsWith(t) || name.includes(t) || nameAr.includes(t)) {
      out.push({ c, s: name.startsWith(t) ? 0 : 1 });
    } else if (words.length && words.every((w) => `${name} ${nameAr}`.includes(w))) {
      out.push({ c, s: 2 });
    }
  }
  out.sort((a, b) => a.s - b.s);
  return out.slice(0, limit).map((x) => x.c);
}

export function matchTrending(trending, term, limit = 5) {
  const t = norm(term);
  if (!t) return [];
  return (trending || [])
    .map((row) => (typeof row === "string" ? row : row.query_text))
    .filter((q) => q && norm(q).includes(t))
    .slice(0, limit);
}

// Split text into segments, marking the first occurrence of the term (and any
// of its words) so the matched substring can be bolded in the dropdown.
export function highlightParts(text = "", term = "") {
  const t = norm(term);
  if (!t) return [{ text, match: false }];
  const lower = (text || "").toLowerCase();
  const idx = lower.indexOf(t);
  if (idx >= 0) {
    return [
      { text: text.slice(0, idx), match: false },
      { text: text.slice(idx, idx + t.length), match: true },
      { text: text.slice(idx + t.length), match: false },
    ];
  }
  // fall back to highlighting individual matched words
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [{ text, match: false }];
  const segments = [];
  let rest = text;
  let restLower = lower;
  for (const w of words) {
    const i = restLower.indexOf(w);
    if (i >= 0) {
      segments.push({ text: rest.slice(0, i), match: false });
      segments.push({ text: rest.slice(i, i + w.length), match: true });
      rest = rest.slice(i + w.length);
      restLower = rest.toLowerCase();
    }
  }
  if (rest) segments.push({ text: rest, match: false });
  return segments.length ? segments : [{ text, match: false }];
}