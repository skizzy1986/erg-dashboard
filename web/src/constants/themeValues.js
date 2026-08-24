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

// The light palette. Values are conventions.md's, which is design-owned and
// CI-verified, not HANDOFF.md §1's — §1 published --color-muted #43485a, and
// conventions.md:101-105 reassigns that value to textSubtle (the one neutral
// that passes on every ground) and gives muted #4a4f63. The ground is #bcc5dd;
// §1's #c3cade is withdrawn.
//
// Three keys the light spec does not cover, called out rather than guessed at
// silently:
//   surfaceDeep   the far end of the splash gradient (splashCss.js). Set midway
//                 between the inset and the ground so it still recedes.
//   neutralAccent 10-11px caption text on a card, so it needs AA — textFaint
//                 would not clear 4.5. Same value as muted; a fold candidate.
//   textStrong    maximum-contrast ink. On light that is `text`. Also a fold
//                 candidate, but kept so call sites need no edit.
export const LIGHT = {
  bg: '#bcc5dd',
  surface: '#ffffff',
  raised: '#ffffff',
  field: '#f4f7fc',
  border: '#c8cee0',
  text: '#1c1e2a',
  muted: '#4a4f63',
  accent: '#0a7093',
  positive: '#10795a',
  caution: '#8a6a10',
  warning: '#a34c1c',
  critical: '#a32040',
  accentAlt: '#5f45b0',
  accentAlt2: '#a3407a',
  cycling: '#10786c',
  surfaceAlt: '#eef4fb',
  surfaceDeep: '#d5dded',
  neutral: '#98a1bb',
  textSubtle: '#43485a',
  textFaint: '#767c92',
  textDim: '#98a1bb',
  divider: '#e4e7ef',
  neutralAccent: '#4a4f63',
  textStrong: '#1c1e2a',
};

// The palette the document boots on. index.html's pre-mount ground, the PWA
// manifest and the Android launch colours all mirror this, so the ground is
// written down once. Flipping the app's default theme is a change to this line.
export const DEFAULT_THEME = DARK;
