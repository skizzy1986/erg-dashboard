import { msg } from '@lingui/core/macro';

// The four destinations, from DESIGN_BRIEF.md §2.2 and the artboards' own
// `data-tab` ids. One list, so the tab bar and the shell cannot disagree about
// what exists — and so desktop can adopt the same names in S3.
//
// Each answers one question:
//   today    What am I doing right now, and am I in any state to do it?
//   train    The live session — prescription, logging, the set in front of me.
//   progress Is the training working? Load, erg, strength, history.
//   body     Readiness and the readings behind it — sleep, RHR, HRV.
// The artboards draw a fifth, coach; it was retired in #414.
//
// Icons are still emoji. The artboards draw 18x18 glyphs; swapping them is
// iconography, not information architecture, and is deliberately left out of
// this change.
//
// `label` stays the English string — the e2e suite and the destination tests
// select by it. `message` is the same text as a Lingui descriptor, which the
// tab bar renders in the active language. A test pins the two together.
export const DESTINATIONS = [
  {
    id: 'today',
    label: 'Today',
    message: msg({ message: 'Today', comment: 'Mobile tab bar' }),
    icon: '☀️',
  },
  {
    id: 'train',
    label: 'Train',
    message: msg({ message: 'Train', comment: 'Mobile tab bar' }),
    icon: '🚣',
  },
  {
    id: 'progress',
    label: 'Progress',
    message: msg({ message: 'Progress', comment: 'Mobile tab bar' }),
    icon: '📈',
  },
  {
    id: 'body',
    label: 'Body',
    message: msg({
      message: 'Body',
      comment: 'Mobile tab bar: readiness, sleep, heart rate',
    }),
    icon: '❤️',
  },
];

export const DEFAULT_DESTINATION = 'today';

export const isDestination = (id) => DESTINATIONS.some((d) => d.id === id);
