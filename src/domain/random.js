/** Tire `count` éléments distincts au hasard dans `pool` (sans remise, Fisher-Yates partiel). */
export function drawRandom(pool, count) {
  const arr = [...pool];
  const n = Math.max(0, Math.min(count, arr.length));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}
