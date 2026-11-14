// Every (ink, ground) pair the squat tool renders, for the contrast test in
// __tests__/contrast.test.js. The test also scans the tool's source for each
// `color: THEME.x` and fails if an ink is used that no pair here covers, so a
// new colour cannot ship unmeasured.
//
// A ground is a stack of layers painted bottom to top, each [token, alphaHex]
// — the alphaHex being what alpha() in utils/themeCss.js is called with
// (omitted = opaque). Composites are what the eye sees, so they are what get
// measured: a chip's ink sits on its own 8% tint, not on the bare card.

export const GROUNDS = {
  bg: [['bg']],
  surface: [['surface']],
  surfaceAlt: [['surfaceAlt']],
  field: [['field']],
  accent: [['accent']],
  // The sticky header: surface at 90% over the page ground.
  header: [['bg'], ['surface', 'e6']],
  // The stage card's radial gradient ends in a 7% accent tint.
  stageEdge: [['surfaceAlt'], ['accent', '12']],
  // FormCheck's ✓ badge.
  positiveTint: [['surface'], ['positive', '1f']],
  // chip(token) in components/ui.js: its own ink at 8%.
  modelledChip: [['surface'], ['modelled', '14']],
  measuredPane: [['surface'], ['measured', '0d']],
  measuredChip: [['surface'], ['measured', '0d'], ['measured', '14']],
  // RichText's inline code chip.
  codeChip: [['surface'], ['text', '0f']],
  // The stage's "Modelled, not measured" chip: opaque surface over the
  // moving model, so the canvas beneath never becomes its ground.
  stageChip: [['surface']],
};

// WCAG 1.4.3: 4.5:1 for normal text, 3:1 for large (≥ 24 px, or ≥ 18.66 px
// bold). `large` is set only where every use of the pair qualifies.
export const PAIRS = [
  // Off-card, on the page ground.
  { fg: 'text', ground: 'bg', where: 'h2, secondary buttons' },
  { fg: 'textSubtle', ground: 'bg', where: 'hero subtitle, micro label' },
  // Header.
  { fg: 'positive', ground: 'header', where: 'SPLITIQ wordmark 13–15 px' },
  { fg: 'text', ground: 'header', where: 'h1 "High-bar back squat" 14 px' },
  { fg: 'accent', ground: 'header', where: '"Open SplitIQ" link 13 px' },
  { fg: 'textSubtle', ground: 'field', where: 'theme control, guide facts' },
  { fg: 'text', ground: 'field', where: 'guide fact values' },
  { fg: 'text', ground: 'surface', where: 'active theme option, card text' },
  // Cards, dialog, footer.
  { fg: 'textSubtle', ground: 'surface', where: '12 px captions, footer' },
  { fg: 'accent', ground: 'surface', where: 'phase numbers, links' },
  { fg: 'positive', ground: 'surface', where: '"Matches target" 11 px' },
  { fg: 'positive', ground: 'positiveTint', where: '✓ badge 12 px' },
  { fg: 'modelled', ground: 'modelledChip', where: 'form-check chip 10 px' },
  { fg: 'measured', ground: 'measuredChip', where: 'coming-soon chip' },
  { fg: 'text', ground: 'measuredPane', where: 'measured pane body' },
  { fg: 'textSubtle', ground: 'measuredPane', where: 'measured pane note' },
  { fg: 'text', ground: 'codeChip', where: 'inline code' },
  { fg: 'surface', ground: 'accent', where: 'primary button 13 px bold' },
  // Stage card (gradient surface → surfaceAlt → accent tint).
  { fg: 'textSubtle', ground: 'surfaceAlt', where: 'load status' },
  { fg: 'textSubtle', ground: 'stageEdge', where: 'stage micro label' },
  { fg: 'text', ground: 'surfaceAlt', where: 'capability notice heading' },
  { fg: 'text', ground: 'surface', where: 'load error 13 px' },
  // 3D stage overlay and the controls cards under it.
  {
    fg: 'modelled',
    ground: 'stageChip',
    where: '"Modelled, not measured" 11 px',
  },
  { fg: 'text', ground: 'surfaceAlt', where: '3D scene error 13 px' },
  { fg: 'text', ground: 'surface', where: 'depth readout, layer switches' },
  { fg: 'textSubtle', ground: 'surface', where: 'camera key legend 12 px' },
  { fg: 'surface', ground: 'accent', where: 'pressed phase chip' },
  // Share (R11): the rail footer, its overlay panel and the phone Share tab
  // are all on surface; the fallback link field is on field.
  {
    fg: 'text',
    ground: 'surface',
    where: 'share status 13 px, share button',
  },
  { fg: 'text', ground: 'field', where: 'share link field' },
];
