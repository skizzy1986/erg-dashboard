// design-sync entry: the named public surface of SplitIQ's shared UI layer.
// The app's components are default exports; this barrel gives them stable named
// exports so the design bundle can expose them on window.SplitIQ.
export { default as LogEntry } from '../src/components/LogEntry.jsx';
export { default as WorkoutItem } from '../src/components/WorkoutItem.jsx';
export { default as WorkoutTarget } from '../src/components/WorkoutTarget.jsx';
export { default as LiveMetric } from '../src/components/LiveMetric.jsx';
export { default as ErrorFallback } from '../src/components/ErrorFallback.jsx';
export { default as ErgTooltip } from '../src/components/ErgTooltip.jsx';
export { default as LoadTooltip } from '../src/components/LoadTooltip.jsx';
export { default as StrengthTooltip } from '../src/components/StrengthTooltip.jsx';
export {
  default as PaceTrendChart,
  PaceTooltip,
} from '../src/components/PaceTrendChart.jsx';
export { default as BottomTabBar } from '../src/components/mobile/BottomTabBar.jsx';

export { THEME } from '../src/constants/theme.js';
export { C, ICON } from '../src/constants/ui.js';
// derivePaceZones(cp), not a static zone table: trainingConfig.js deliberately
// stopped exporting PACE_ZONES so a seed-derived table cannot diverge from the
// live `rowing_cp` anchor. Callers pass the current CP in watts.
export { derivePaceZones } from '../src/constants/trainingConfig.js';
