// A pointer table, not a palette. Every value is a var(--color-*) string that
// resolves through the cascade, so a component renders on whichever theme the
// document declares without editing its source. The literal hexes live in
// constants/themeValues.js and are emitted as custom properties by cssVars().
//
// Component source is unchanged by this shape: `color: THEME.accent` still works.
export const THEME = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  raised: 'var(--color-raised)',
  field: 'var(--color-field)',
  border: 'var(--color-border)',
  text: 'var(--color-text)',
  muted: 'var(--color-muted)',
  accent: 'var(--color-accent)',
  positive: 'var(--color-positive)',
  caution: 'var(--color-caution)',
  warning: 'var(--color-warning)',
  critical: 'var(--color-critical)',
  accentAlt: 'var(--color-accentAlt)',
  accentAlt2: 'var(--color-accentAlt2)',
  cycling: 'var(--color-cycling)',
  surfaceAlt: 'var(--color-surfaceAlt)',
  surfaceDeep: 'var(--color-surfaceDeep)',
  neutral: 'var(--color-neutral)',
  textSubtle: 'var(--color-textSubtle)',
  textFaint: 'var(--color-textFaint)',
  textDim: 'var(--color-textDim)',
  divider: 'var(--color-divider)',
  neutralAccent: 'var(--color-neutralAccent)',
  textStrong: 'var(--color-textStrong)',
};
