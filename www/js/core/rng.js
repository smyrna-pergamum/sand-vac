// Deterministic xorshift32 RNG so levels can be reproduced from a seed.
export function createRng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export const randInt = (rng, n) => Math.floor(rng() * n);

export const pick = (rng, arr) => arr[randInt(rng, arr.length)];

export function shuffle(rng, arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Splits a grain total into `parts` near-equal integers that sum to total.
export function splitTotal(total, parts) {
  if (total <= 0) return [];
  const p = Math.max(1, Math.min(parts, total));
  const base = Math.floor(total / p);
  const rem = total - base * p;
  return Array.from({ length: p }, (_, i) => base + (i < rem ? 1 : 0));
}
