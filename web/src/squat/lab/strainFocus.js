// Prototype (lab) only. The muscles working hardest at one instant, by the
// model's estimated activation. Ties break by manifest order, so the list
// never reshuffles between two equal frames.
export function topMuscles(muscles, weights, n = 3) {
  if (!muscles || !weights) return [];
  const idx = [];
  for (let i = 0; i < muscles.length; i++) {
    if (muscles[i].tendon || !muscles[i].act) continue;
    if (!(weights[i] > 0)) continue;
    idx.push(i);
  }
  idx.sort((a, b) => weights[b] - weights[a] || a - b);
  return idx.slice(0, n);
}

export const STRAIN_TITLE = 'Working hardest now';
