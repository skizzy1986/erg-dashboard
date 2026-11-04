import { THEME } from '../../constants/theme.js';
import { SPACE } from '../../constants/tokens.js';

// Source page wording for the first two; the worker one is new because the
// tool now unpacks off the main thread.
export const CAPABILITY_MESSAGES = {
  webgl: 'The 3D view needs WebGL, which this browser did not provide.',
  decompression:
    'This browser cannot unpack the anatomy data. Update the browser and reload.',
  worker:
    'This browser cannot run background tasks, which the 3D view needs to unpack its data.',
};

export function missingCapabilities(caps) {
  return Object.keys(CAPABILITY_MESSAGES).filter((k) => !caps[k]);
}

export default function CapabilityNotice({ capabilities }) {
  const missing = missingCapabilities(capabilities);
  if (!missing.length) return null;
  return (
    <div
      role="note"
      aria-label="3D view unavailable"
      style={{
        maxWidth: 380,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          color: THEME.text,
        }}
      >
        3D view unavailable in this browser
      </h2>
      {missing.map((k) => (
        <p
          key={k}
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: THEME.textSubtle,
          }}
        >
          {CAPABILITY_MESSAGES[k]}
        </p>
      ))}
      <p
        style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: THEME.muted }}
      >
        The coaching guide, form check and targets all still work.
      </p>
    </div>
  );
}
