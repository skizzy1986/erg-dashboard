import { useEffect, useRef } from 'react';
import { THEME } from '../../constants/theme.js';
import { SPACE } from '../../constants/tokens.js';
import { ACT_BASIS, ACT_NONE, ACT_NOTE } from '../constants/activationBands.js';
import { card, chip, microLabel, secondaryButton } from './ui.js';

/**
 * The selected muscle: what it is, what it does in a squat, and how hard it is
 * working at the depth and direction already set above it in the DOM.
 *
 * Never a number — a band. The estimate comes from joint moments, and a figure
 * like "63%" reads as a measurement nobody took.
 */
export default function MuscleCard({
  muscle,
  band,
  peakBand,
  depthPercent,
  phase,
  direction,
  onClear,
}) {
  const headingRef = useRef(null);
  const seen = useRef(false);
  const slug = muscle?.slug ?? null;

  // The card appears beside the list rather than replacing it, so without this
  // a screen-reader user hears nothing. Moving focus to the heading IS the
  // announcement — and on a clear it lands on the empty card's heading rather
  // than falling to the document body, since the button that was focused has
  // just been unmounted.
  //
  // Not on the first render: a page load must not steal focus. A deep link
  // resolving after the manifest lands does move it, which is the point of
  // having followed the link.
  useEffect(() => {
    if (seen.current) headingRef.current?.focus();
    seen.current = true;
  }, [slug]);

  if (!muscle) {
    return (
      <div style={{ ...card, padding: SPACE.lg }}>
        <h3 ref={headingRef} tabIndex={-1} style={{ ...microLabel, margin: 0 }}>
          Muscle detail
        </h3>
        <p
          style={{
            margin: `${SPACE.sm}px 0 0`,
            fontSize: 13,
            lineHeight: 1.55,
            color: THEME.textSubtle,
          }}
        >
          Pick a muscle from the list to see what it does in a squat and how
          hard it is working at this depth.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        ...card,
        padding: SPACE.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
      }}
    >
      <h3
        ref={headingRef}
        tabIndex={-1}
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.3,
          color: THEME.text,
        }}
      >
        {muscle.name}
      </h3>
      <p style={{ ...microLabel, margin: 0 }}>{muscle.regionName}</p>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          color: THEME.textSubtle,
        }}
      >
        {muscle.role}
      </p>
      <div
        data-testid="muscle-band"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: SPACE.sm,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.4,
          color: THEME.text,
        }}
      >
        {band ? (
          <>
            <span>
              {band.name} at {depthPercent}% depth, {direction} ({phase})
            </span>
            <span style={chip(THEME.modelled)}>{ACT_NOTE}</span>
          </>
        ) : (
          <span>{ACT_NONE}</span>
        )}
      </div>
      {peakBand && (
        <p
          data-testid="muscle-peak"
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: THEME.text,
          }}
        >
          Peaks at {peakBand.name} in the {peakBand.where}.
        </p>
      )}
      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.5,
          color: THEME.textSubtle,
        }}
      >
        {ACT_BASIS}
      </p>
      <div>
        <button
          type="button"
          onClick={onClear}
          style={{ ...secondaryButton, padding: `${SPACE.sm}px ${SPACE.md}px` }}
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}
