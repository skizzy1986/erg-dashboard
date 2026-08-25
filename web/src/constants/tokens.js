// Layout scales (#255, slice S0). Values from DESIGN_BRIEF.md §7, with two
// corrections from the later, design-owned conventions.md.
//
// This module defines the scales; it does not migrate call sites. Applying
// SPACE and RADIUS is slice S6, which is gated on screenshot baselines because
// it nudges ~200 call sites by ±2px — the largest visual-drift risk in the
// brief. LAYER is the exception: see below.

// 4px base. Retires the stray 6 and 10 the codebase uses today.
export const SPACE = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Cards settle on 12; 6 stays for chips, inputs and inset rows.
export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  pill: 999,
};

// Four ranks per screen: 52 hero · 20 title · 14 body · 9 section label.
//
// Weights differ from DESIGN_BRIEF.md §7, which predates the light ground and
// still lists 400s. conventions.md sets a floor of 500 — below it Archivo reads
// thin on light — and puts labels and all figures at 700, so `label` and `micro`
// are 700 here rather than the brief's 600.
export const TYPE = {
  hero: { size: 52, weight: 700, letterSpacing: -1, lineHeight: 1 },
  display: { size: 32, weight: 700, letterSpacing: -0.5, lineHeight: 1.1 },
  title: { size: 20, weight: 700, letterSpacing: -0.25, lineHeight: 1.2 },
  body: { size: 14, weight: 500, lineHeight: 1.5 },
  bodySm: { size: 12, weight: 500, lineHeight: 1.5 },
  label: { size: 11, weight: 700, letterSpacing: 1, lineHeight: 1.3 },
  caption: { size: 10, weight: 500, lineHeight: 1.4 },
  micro: { size: 9, weight: 700, letterSpacing: 3, lineHeight: 1.3 },
};

// Stacking order. `backdrop` comes from HANDOFF.md §2 (sheet 200, backdrop 150,
// nav 100); `bar` is the slot HANDOFF.md §2's SessionBar occupies — chrome that
// sits above the tab bar and persists across destinations.
//
// This scale is applied, not just declared, because the codebase disagreed with
// itself about it: StrengthLogger's toast sat at 80 and its modal backdrop at
// 50, both *below* BottomTabBar's 100, so a toast fired from the logger
// rendered behind the nav.
export const LAYER = {
  base: 0,
  sticky: 10,
  nav: 100,
  bar: 110,
  backdrop: 150,
  sheet: 200,
  toast: 300,
  modal: 400,
};

// One breakpoint. `useIsMobile` already reads 767; App.jsx's isWide 900 and the
// dead isMid 600 are the two S3 deletes.
export const BREAKPOINT = { compact: 767 };
