// Shared inline-style pieces for the squat tool. Every colour is a THEME
// pointer, so the same object renders on light and dark.
import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE, TYPE } from '../../constants/tokens.js';
import { alpha } from '../../utils/themeCss.js';

export const card = {
  background: THEME.surface,
  border: `1px solid ${THEME.border}`,
  borderRadius: RADIUS.md,
  boxSizing: 'border-box',
};

export const microLabel = {
  fontFamily: FONT.sans,
  fontSize: TYPE.micro.size,
  fontWeight: TYPE.micro.weight,
  letterSpacing: 2,
  lineHeight: TYPE.micro.lineHeight,
  textTransform: 'uppercase',
  color: THEME.textSubtle,
};

const buttonBase = {
  fontFamily: FONT.sans,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.2,
  borderRadius: RADIUS.sm,
  padding: `${SPACE.sm + 2}px ${SPACE.lg}px`,
  minHeight: 44,
  cursor: 'pointer',
  boxSizing: 'border-box',
};

export const primaryButton = {
  ...buttonBase,
  background: THEME.accent,
  color: THEME.surface,
  border: `1px solid ${THEME.accent}`,
};

export const secondaryButton = {
  ...buttonBase,
  background: 'transparent',
  color: THEME.text,
  border: `1px solid ${THEME.border}`,
};

// A text link that is still a 44 px target (WCAG 2.5.5): inline-flex keeps it
// in the sentence while its box grows to the touch minimum.
export const touchLink = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  verticalAlign: 'middle',
};

export const linkButton = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: THEME.accent,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  cursor: 'pointer',
};

export const chip = (token) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: SPACE.xs,
  fontFamily: FONT.sans,
  fontSize: TYPE.caption.size,
  fontWeight: 700,
  letterSpacing: 0.5,
  lineHeight: 1.3,
  color: token,
  background: alpha(token, '14'),
  border: `1px solid ${alpha(token, '40')}`,
  borderRadius: RADIUS.pill,
  padding: `${SPACE.xxs}px ${SPACE.sm}px`,
  whiteSpace: 'nowrap',
});

export const mono = { fontFamily: FONT.mono, fontWeight: 600 };

export const bodyText = {
  fontSize: TYPE.body.size,
  lineHeight: 1.6,
  color: THEME.textSubtle,
  margin: 0,
};

export const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};
