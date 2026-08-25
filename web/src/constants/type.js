// Archivo carries language, IBM Plex Mono carries measurement. Anything that is
// a split, watt, pace, TSS, weight or tabular date is mono; anything that is a
// label, button, sentence or nav item is sans (conventions.md).
//
// Pointers, not stacks — the values live in fonts.css, the same split the
// colour tokens use.
export const FONT = {
  sans: 'var(--font-sans)',
  mono: 'var(--font-mono)',
};
