// Regenerates .design-sync/base.css from the app's own palette. Re-run whenever
// src/constants/themeValues.js changes:  node .design-sync/gen-css.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DARK } from '../src/constants/themeValues.js';
import { cssVars } from '../src/utils/themeCss.js';

const here = dirname(fileURLToPath(import.meta.url));
const css = `/* Generated from src/constants/theme.js by .design-sync/gen-css.mjs — do not hand-edit.
   SplitIQ ships no stylesheet of its own: components carry inline styles and
   index.html paints the ground before React mounts. This file is the design
   system's token layer plus that ground, so every design built with SplitIQ
   starts on the same dark surface the app uses. */
${cssVars(DARK)}

html,
body {
  margin: 0;
  padding: 0;
  /* !important: SplitIQ is a dark-only surface — index.html paints this ground
     before React mounts, and preview-card templates default their body to
     white, which would render every component on the wrong ground. */
  background: var(--color-bg) !important;
  color: var(--color-text) !important;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
}
`;
writeFileSync(join(here, 'base.css'), css);
console.error(`  base.css: ${Object.keys(DARK).length} tokens from src/constants/themeValues.js`);
