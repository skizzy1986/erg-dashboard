export const DRAFT_KEY = 'erg_strength_draft';

export function saveDraft(active) {
  if (!active) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(active));
  } catch (e) {
    // QuotaExceededError or SecurityError — best-effort, silently ignore
  }
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !p.id || !p.label || !Array.isArray(p.exercises)) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return p;
  } catch (e) {
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
