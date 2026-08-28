// Two summary statistics, extracted from mathjs (#54 follow-up). mathjs shipped
// its whole factory/type system into the initial chunk — ~87 KB gzipped — to
// supply `mean` and `std` on plain number arrays inside one tab's regression
// panel. The least-squares fit next to them was always hand-rolled JS.
//
// `sampleStdDev` matches mathjs `std(...)` exactly: its default normalization is
// 'unbiased', dividing by n-1, NOT the population n. Changing that divisor would
// silently move the published HR130 spread figure.

export function mean(xs) {
  if (!xs.length) throw new Error('mean requires at least one value');
  return xs.reduce((sum, x) => sum + x, 0) / xs.length;
}

export function sampleStdDev(xs) {
  if (xs.length < 2)
    throw new Error('sampleStdDev requires at least two values');
  const m = mean(xs);
  const ss = xs.reduce((sum, x) => sum + (x - m) ** 2, 0);
  return Math.sqrt(ss / (xs.length - 1));
}
