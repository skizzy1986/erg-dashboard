// Custom property names are case-sensitive, and some CSS parsers lowercase
// them — `--color-accentAlt` silently became `--color-accentalt` and resolved
// to nothing. Kebab-case is the safe form, and it is what the design side's
// splitiq-light-tokens.css already publishes.
export const cssVarName = (key) =>
  `--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

// Tints a token. `hexPair` is the two-digit alpha the call site used to append
// straight onto a hex — THEME.accent followed by 15 — which worked while THEME
// held literals, because it produced the 8-digit hex #00d4ff15.
//
// It does not survive the token seam. THEME values are var() references now, so
// that same expression renders `var(--color-accent)15`, and CSS does not merge
// those into one component — substitution inserts a token boundary. The result
// is not a colour, the declaration is invalid at computed-value time, and the
// browser drops it whole. Silently: no fallback, no console warning, just a
// card with no background and a border that never draws.
//
// color-mix() is the form that works, and matches what the seam already used at
// the sites it converted by hand. It reproduces #RRGGBBAA to sRGB rounding
// rather than exactly, so this is not bit-identical on dark — unlike the literal
// substitutions, which were.
export const alpha = (token, hexPair) =>
  `color-mix(in srgb, ${token} ${+((parseInt(hexPair, 16) / 255) * 100).toFixed(2)}%, transparent)`;

// `selector` scopes a palette. Light is emitted at :root so nothing depends on
// a data-theme attribute being present; dark is emitted under
// [data-theme='dark'] so a surface that wants it — the live erg screen at 5am —
// can opt in without a second THEME object.
export function cssVars(theme, selector = ':root') {
  const decls = Object.keys(theme)
    .map((k) => `  ${cssVarName(k)}: ${theme[k]};`)
    .join('\n');
  return `${selector} {\n${decls}\n}`;
}
