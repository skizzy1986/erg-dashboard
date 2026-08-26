// The five destinations, from DESIGN_BRIEF.md §2.2 and the artboards' own
// `data-tab` ids. One list, so the tab bar and the shell cannot disagree about
// what exists — and so desktop can adopt the same names in S3.
//
// Each answers one question:
//   today    What am I doing right now, and am I in any state to do it?
//   train    The live session — prescription, logging, the set in front of me.
//   progress Is the training working? Load, erg, strength, history.
//   body     Readiness and the readings behind it — sleep, RHR, HRV.
//   coach    Why the plan says what it says.
//
// Icons are still emoji. The artboards draw 18x18 glyphs; swapping them is
// iconography, not information architecture, and is deliberately left out of
// this change.
export const DESTINATIONS = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'train', label: 'Train', icon: '🚣' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'body', label: 'Body', icon: '❤️' },
  { id: 'coach', label: 'Coach', icon: '🤖' },
];

export const DEFAULT_DESTINATION = 'today';

export const isDestination = (id) => DESTINATIONS.some((d) => d.id === id);
