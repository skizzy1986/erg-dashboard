// Custom property names are case-sensitive, and some CSS parsers lowercase
// them — `--color-accentAlt` silently became `--color-accentalt` and resolved
// to nothing. Kebab-case is the safe form, and it is what the design side's
// splitiq-light-tokens.css already publishes.
export const cssVarName = (key) =>
  `--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

export function cssVars(theme) {
  const decls = Object.keys(theme)
    .map((k) => `  ${cssVarName(k)}: ${theme[k]};`)
    .join('\n');
  return `:root {\n${decls}\n}`;
}
