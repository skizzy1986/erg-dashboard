export function cssVars(theme) {
  const decls = Object.keys(theme)
    .map((k) => `  --color-${k}: ${theme[k]};`)
    .join('\n');
  return `:root {\n${decls}\n}`;
}
