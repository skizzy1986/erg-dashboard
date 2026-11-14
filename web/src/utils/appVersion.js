export function versionLabel(v) {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed ? 'v' + trimmed : null;
}
