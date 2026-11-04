// The five phases of the reference rep, in timeline order. `index` matches the
// manifest's rep.ph codes (0 brace, 1 lowering, 2 bottom, 3 drive, 4 lockout).
// `goto` is the rep time (s) the source page jumped to from the guide heading;
// 'bottom' resolves to rep.t_bottom.
export const PHASES = [
  {
    index: 0,
    id: 'setup',
    name: 'Setup and brace',
    heading: 'Setup and brace',
    mode: 'Bracing: muscles hold position (isometric).',
    goto: 0.3,
  },
  {
    index: 1,
    id: 'lowering',
    name: 'Lowering',
    heading: 'Lowering (eccentric)',
    mode: 'Prime movers lengthen under load (eccentric) and brake the bar.',
    goto: 1.6,
  },
  {
    index: 2,
    id: 'bottom',
    name: 'Bottom',
    heading: 'The bottom (transition)',
    mode: 'Reversal: prime movers at full stretch switch from braking to driving. Ground force peaks.',
    goto: 'bottom',
  },
  {
    index: 3,
    id: 'drive',
    name: 'Drive',
    heading: 'Drive (concentric) and the sticking region',
    mode: 'Prime movers shorten (concentric). Activation is highest just after the reversal.',
    goto: 2.45,
  },
  {
    index: 4,
    id: 'lockout',
    name: 'Lockout',
    heading: 'Lockout',
    mode: 'Finishing the drive while the bar slows. Breathe and re-brace.',
    goto: 3.3,
  },
];
