import { THEME } from '../../constants/theme.js';
import { splashCss } from '../../utils/splashCss.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { FONT } from '../../constants/type.js';
import { brandLine } from '../../utils/brandLine.js';

const CSS = splashCss(THEME);

const MARK_PATH = 'M30 88 C 44 88, 46 40, 62 40 C 78 40, 80 88, 94 88';

export default function SplashScreen() {
  const reduced = usePrefersReducedMotion();
  const line = brandLine(document.documentElement.lang);
  return (
    <div
      className={reduced ? 'siq-splash siq-splash--still' : 'siq-splash'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: THEME.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        fontFamily: FONT.sans,
      }}
    >
      <style>{CSS}</style>
      <div className="siq-splash__glow" />
      <div className="siq-splash__mark">
        <div className="siq-splash__halo" />
        <div className="siq-splash__tile" />
        <svg
          width="124"
          height="124"
          viewBox="0 0 124 124"
          style={{ position: 'relative', overflow: 'visible' }}
        >
          <line className="siq-splash__base" x1="30" y1="88" x2="94" y2="88" />
          <path className="siq-splash__stroke" d={MARK_PATH} />
          {/* Left at the SVG origin deliberately: offset-path translates the
              element to the path point, so a circle authored at cx/cy would land
              at twice the offset. Engines without motion path hide it instead. */}
          <circle className="siq-splash__head" r="4" />
        </svg>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div className="siq-splash__word">
          Split<span className="siq-splash__word-iq">IQ</span>
        </div>
        <div className="siq-splash__line">
          <span
            className="siq-splash__cycle siq-splash__cycle--1"
            aria-hidden="true"
          >
            ERG
          </span>
          <span
            className="siq-splash__cycle siq-splash__cycle--2"
            aria-hidden="true"
          >
            STRENGTH
          </span>
          <span
            className="siq-splash__cycle siq-splash__cycle--3"
            aria-hidden="true"
          >
            BIKE
          </span>
          <span className="siq-splash__tagline" lang={line.lang}>
            {line.lead}{' '}
            <span className="siq-splash__tagline-head">{line.head}</span>
          </span>
        </div>
      </div>
      <div className="siq-splash__progress">
        <div className="siq-splash__track" />
      </div>
      <div className="siq-splash__caption">SYNCING TRAINING LOG</div>
    </div>
  );
}
