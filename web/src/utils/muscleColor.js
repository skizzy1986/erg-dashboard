const PRIMARY_COLOR = '#ef4444';
const SECONDARY_COLOR = '#f59e0b';
const INACTIVE_COLOR = '#46525f';

export function muscleColor(muscleName, primaryMuscles, secondaryMuscles) {
  const m = String(muscleName || '').toLowerCase();
  const primary = (primaryMuscles || []).map((x) => String(x).toLowerCase());
  const secondary = (secondaryMuscles || []).map((x) =>
    String(x).toLowerCase()
  );
  if (primary.includes(m)) return PRIMARY_COLOR;
  if (secondary.includes(m)) return SECONDARY_COLOR;
  return INACTIVE_COLOR;
}
