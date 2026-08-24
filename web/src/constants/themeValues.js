// The palette's literal values. THEME (theme.js) is a pointer table of
// var(--color-*) strings; this module is what those variables resolve to and
// the only place a hex is written down.
//
// Split out for the token seam (#250): cssVars() must read values, not THEME,
// or it emits `--color-accent: var(--color-accent)` and resolves to nothing.
export const DARK = {
  bg: '#08080d',
  surface: '#1a1a2e',
  raised: '#2a2a48',
  field: '#08080d',
  border: '#4a4a68',
  text: '#e8e8f0',
  muted: '#7e7e9a',
  accent: '#00d4ff',
  positive: '#34d399',
  caution: '#ffd700',
  warning: '#ff6b35',
  critical: '#ff2d55',
  accentAlt: '#a78bfa',
  accentAlt2: '#f472b6',
  cycling: '#2dd4bf',
  surfaceAlt: '#1e1e30',
  surfaceDeep: '#12121f',
  neutral: '#3a3a4a',
  textSubtle: '#aaaacc',
  textFaint: '#6c6c88',
  textDim: '#5a5a74',
  divider: '#3e3e5a',
  neutralAccent: '#888888',
  textStrong: '#ffffff',
};

// The palette the document boots on. index.html's pre-mount ground, the PWA
// manifest and the Android launch colours all mirror this, so the ground is
// written down once. Flipping the app's default theme is a change to this line.
export const DEFAULT_THEME = DARK;
