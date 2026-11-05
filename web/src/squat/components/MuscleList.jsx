import { useId, useRef, useState } from 'react';
import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { card, microLabel, srOnly } from './ui.js';

const FLAT = (regions) => regions.flatMap((g) => g.items);

/**
 * The accessible substitute for the model: one listbox, one tab stop, 118
 * options in eleven named groups. Grouped `<button aria-pressed>` would put
 * 118 elements in the tab order instead.
 *
 * Selection does NOT follow focus. Each selection recolours 50,119 vertices
 * and writes history.replaceState, so arrowing through the list would fire 118
 * of each; the APG allows either, and this is the case it warns about. Arrows
 * move focus, Enter/Space selects, aria-selected marks the selection.
 *
 * It deliberately takes no band-per-option function: a per-option band would
 * make all 118 rows depend on the depth sample and re-render the whole list on
 * every step of a slider drag. The band belongs to the card.
 */
export default function MuscleList({
  regions,
  total,
  matches,
  query,
  onQuery,
  selected,
  onSelect,
  notice,
}) {
  const uid = useId();
  const listId = `${uid}-muscles`;
  const items = FLAT(regions);
  const [focusSlug, setFocusSlug] = useState(null);
  const [inside, setInside] = useState(false);
  const refs = useRef({});

  // A filter that hides the focused option must not drop focus to the body:
  // the roving tabindex falls back to the selection, then to the first row,
  // so there is always exactly one tabbable option.
  const active =
    items.find((m) => m.slug === focusSlug) ??
    items.find((m) => m.slug === selected) ??
    items[0] ??
    null;

  const moveTo = (m) => {
    if (!m) return;
    setFocusSlug(m.slug);
    refs.current[m.slug]?.focus();
  };

  const onKeyDown = (e) => {
    const at = items.findIndex((m) => m.slug === active?.slug);
    const to = {
      ArrowDown: at + 1,
      ArrowUp: at - 1,
      Home: 0,
      End: items.length - 1,
    }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    moveTo(items[Math.max(0, Math.min(items.length - 1, to))]);
  };

  return (
    <div
      style={{
        ...card,
        padding: SPACE.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.md,
        minWidth: 0,
      }}
    >
      <label
        style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}
      >
        <span style={{ ...microLabel, margin: 0 }}>Filter muscles</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-controls={listId}
          placeholder="glutes, soleus, grip…"
          style={{
            font: 'inherit',
            fontSize: 14,
            minHeight: 44,
            padding: `0 ${SPACE.md}px`,
            boxSizing: 'border-box',
            background: THEME.field,
            color: THEME.text,
            border: `1px solid ${THEME.border}`,
            borderRadius: RADIUS.sm,
          }}
        />
      </label>
      <p
        role="status"
        data-testid="muscle-matches"
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.5,
          color: THEME.textSubtle,
        }}
      >
        {matches === total
          ? `${total} muscles and tendons`
          : `${matches} of ${total} match`}
      </p>
      {notice && (
        <p
          role="alert"
          style={{
            margin: 0,
            fontSize: 12,
            lineHeight: 1.5,
            color: THEME.text,
          }}
        >
          {notice}
        </p>
      )}
      <span id={`${listId}-label`} style={srOnly}>
        Muscles by region
      </span>
      {items.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: THEME.text,
          }}
        >
          No muscle matches that.
        </p>
      ) : (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-label`}
          onKeyDown={onKeyDown}
          onFocus={() => setInside(true)}
          onBlur={() => setInside(false)}
          style={{ maxHeight: 420, overflow: 'auto', margin: 0 }}
        >
          {regions.map((g) => (
            <div
              key={g.id}
              role="group"
              aria-label={g.name}
              style={{ marginBottom: SPACE.sm }}
            >
              <p
                aria-hidden="true"
                style={{
                  ...microLabel,
                  margin: `${SPACE.xs}px 0`,
                  position: 'sticky',
                  top: 0,
                  background: THEME.surface,
                }}
              >
                {g.name}
              </p>
              {g.items.map((m) => {
                const isSelected = m.slug === selected;
                const isActive = m.slug === active?.slug;
                return (
                  <div
                    key={m.slug}
                    ref={(el) => {
                      refs.current[m.slug] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={isActive ? 0 : -1}
                    data-slug={m.slug}
                    onFocus={() => setFocusSlug(m.slug)}
                    onClick={() => onSelect(m.slug)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(m.slug);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: 36,
                      padding: `${SPACE.xs}px ${SPACE.sm}px`,
                      borderRadius: RADIUS.sm,
                      fontFamily: FONT.sans,
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      lineHeight: 1.4,
                      cursor: 'pointer',
                      color: THEME.text,
                      // Selected is a filled row; focus is an outline. Both
                      // are visible, and visibly different, on either theme.
                      background: isSelected ? THEME.field : 'transparent',
                      border: `1px solid ${isSelected ? THEME.border : 'transparent'}`,
                      // Inline styles cannot express :focus-visible, and the
                      // roving tabindex means the UA ring alone is easy to
                      // lose, so the ring is drawn from state instead. Left
                      // undefined when idle so the UA default still backs it.
                      outline:
                        isActive && inside
                          ? `2px solid ${THEME.accent}`
                          : undefined,
                      outlineOffset: 2,
                    }}
                  >
                    {m.name}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
