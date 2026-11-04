import { mono } from './ui.js';
import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { alpha } from '../../utils/themeCss.js';

// Renders the segment format of constants/guide.js. A model value ({ k }) is a
// measurement, so it is set in Plex Mono; before the manifest arrives it shows
// an ellipsis rather than a guessed number.
export default function RichText({ segments, kv }) {
  return segments.map((seg, i) => {
    if (typeof seg === 'string') return <span key={i}>{seg}</span>;
    if ('k' in seg) {
      const v = kv?.[seg.k];
      return (
        <span key={i} style={{ ...mono, fontWeight: 500, color: THEME.text }}>
          {v ?? '…'}
        </span>
      );
    }
    if ('b' in seg)
      return (
        <strong key={i} style={{ color: THEME.text, fontWeight: 700 }}>
          {seg.b}
        </strong>
      );
    if ('i' in seg) return <em key={i}>{seg.i}</em>;
    if ('code' in seg)
      return (
        <code
          key={i}
          style={{
            fontFamily: FONT.mono,
            fontSize: '0.92em',
            background: alpha(THEME.text, '0f'),
            borderRadius: 4,
            padding: '1px 4px',
          }}
        >
          {seg.code}
        </code>
      );
    return null;
  });
}
