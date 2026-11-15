// A small seeded random generator (mulberry32) so a screenshot state built
// from a seed always renders the same frame, and live play can still be
// seeded from the clock. Every value it returns is in [0, 1).

export function makeSeededRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function range(random, min, max) {
  return min + random() * (max - min);
}

export function randomSeed() {
  return (Date.now() % 2147483647) >>> 0;
}
