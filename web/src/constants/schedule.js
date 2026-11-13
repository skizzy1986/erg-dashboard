// Only PHASE_CONTEXT remains here: the roster, microcycle, season and volume
// tables were culled with the Calendar's roster path (#420). Overview's phase
// card is its last reader and goes in #421.
export const PHASE_CONTEXT = {
  current: 'BASE',
  phaseLabel: 'Phase 1 — Base (Extended)',
  window: 'Jun–Aug 2026',
  weeksIn: 3,
  weeksTotal: 12,
  doing:
    'Building the aerobic engine. All erg in UT1/UT2, volume rising ~10%/wk, no intensity. Strength progressing on compounds.',
  why: "Peripheral adaptations (mitochondria, capillaries, fat oxidation) take 6–8wk minimum and can't be rushed. The foundation everything later is built on.",
  notYet:
    "No threshold or VO2 work — that's Build 1 (Sept+). Resisting intensity now IS the work.",
  nextGate:
    'End-of-base 5k benchmark (~wk 6, early Aug) — first real fitness checkpoint.',
  arc: [
    { phase: 'BASE', window: 'Jun–Aug', active: true },
    { phase: 'BUILD 1', window: 'Sep–Oct', active: false },
    { phase: 'BUILD 2', window: 'Nov–Dec', active: false },
    { phase: 'PEAK', window: 'Jan–Feb', active: false },
    { phase: 'RACE', window: 'late Feb 2027', active: false },
  ],
};
