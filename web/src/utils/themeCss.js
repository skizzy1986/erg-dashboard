// Custom property names are case-sensitive, and some CSS parsers lowercase
// them — `--color-accentAlt` silently became `--color-accentalt` and resolved
// to nothing. Kebab-case is the safe form, and it is what the design side's
// splitiq-light-tokens.css already publishes.
export const cssVarName = (key) =>
  `--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

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
