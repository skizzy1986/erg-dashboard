// Stylesheet for the mobile splash (components/mobile/SplashScreen.jsx). It is a
// string builder rather than inline styles because the splash needs keyframes,
// and a keyframe cannot be expressed as a style object. Twin of themeCss.js.
//
// Every colour is interpolated from the passed theme — the palette is
// mid-migration and a literal hex would silently survive the move.

// Not exported: the translucent accents the design calls for have no THEME
// token. color-mix rather than a parsed rgba() because THEME values are
// var(--color-*) pointers since #287, not hexes — parsing them yielded
// rgba(NaN, ...), which the browser drops, and the glow silently vanished.
function fade(color, pct) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

// The reduced-motion resting state is the END of every entrance, not the start —
// several CSS defaults here (stroke-dashoffset, scaleX(0), opacity 0) are the
// first keyframe, so merely switching animations off would freeze a half-drawn
// logo. Emitted twice, from this one template, so the class-driven and
// media-query-driven copies cannot drift.
function stillRules(root) {
  return `${root} .siq-splash__glow,
${root} .siq-splash__halo,
${root} .siq-splash__tile,
${root} .siq-splash__base,
${root} .siq-splash__stroke,
${root} .siq-splash__head,
${root} .siq-splash__word,
${root} .siq-splash__sub,
${root} .siq-splash__track {
  animation: none !important;
}
${root} .siq-splash__glow {
  opacity: .32;
  transform: none;
}
${root} .siq-splash__tile {
  opacity: 1;
  transform: none;
}
${root} .siq-splash__halo {
  opacity: 0;
}
${root} .siq-splash__base {
  transform: scaleX(1);
}
${root} .siq-splash__stroke {
  stroke-dashoffset: 0;
}
${root} .siq-splash__head {
  opacity: 0;
}
${root} .siq-splash__word {
  opacity: 1;
  transform: none;
}
${root} .siq-splash__sub {
  opacity: 1;
  letter-spacing: 3px;
}
${root} .siq-splash__track {
  display: none;
}`;
}

export function splashCss(theme) {
  return `.siq-splash {
  overflow: hidden;
  background: ${theme.bg};
}
.siq-splash__glow {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(circle, ${fade(theme.accent, 16)} 0%, ${fade(theme.accent, 0)} 66%);
  animation: siq-splash-glow 4000ms ease-in-out infinite;
}
.siq-splash__mark {
  position: relative;
  width: 124px;
  height: 124px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.siq-splash__halo {
  position: absolute;
  inset: -6px;
  border-radius: 34px;
  border: 1px solid ${theme.accent};
  animation: siq-splash-halo 980ms cubic-bezier(.2, .7, .3, 1) 400ms both;
}
.siq-splash__tile {
  position: absolute;
  inset: 0;
  border-radius: 30px;
  background: linear-gradient(160deg, ${theme.surfaceAlt} 0%, ${theme.surfaceDeep} 100%);
  border: 1px solid ${theme.divider};
  box-shadow: 0 18px 46px rgba(0, 0, 0, .55), inset 0 1px 0 rgba(255, 255, 255, .05);
  animation: siq-splash-tile 950ms cubic-bezier(.2, .8, .2, 1) both;
}
.siq-splash__base {
  stroke: ${theme.divider};
  stroke-width: 1.5;
  stroke-linecap: round;
  transform-origin: 30px 88px;
  animation: siq-splash-base 860ms cubic-bezier(.3, .7, .2, 1) 370ms both;
}
.siq-splash__stroke {
  fill: none;
  stroke: ${theme.accent};
  stroke-width: 4.5;
  stroke-linecap: round;
  stroke-dasharray: 260;
  filter: drop-shadow(0 0 8px ${fade(theme.accent, 55)});
  animation: siq-splash-draw 4000ms cubic-bezier(.35, .7, .2, 1) infinite both;
}
.siq-splash__head {
  fill: ${theme.text};
  offset-path: path('M30 88 C 44 88, 46 40, 62 40 C 78 40, 80 88, 94 88');
  animation: siq-splash-head 4000ms cubic-bezier(.35, .7, .2, 1) infinite both;
}
.siq-splash__word {
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -.8px;
  color: ${theme.text};
  animation: siq-splash-word 650ms cubic-bezier(.2, .8, .2, 1) 580ms both;
}
.siq-splash__word-iq {
  font-family: var(--font-mono);
  font-weight: 700;
  letter-spacing: 0;
  color: ${theme.accent};
}
.siq-splash__sub {
  font-size: 9px;
  letter-spacing: 3px;
  color: ${theme.textSubtle};
  animation: siq-splash-sub 620ms cubic-bezier(.2, .8, .2, 1) 800ms both;
}
.siq-splash__progress {
  position: absolute;
  bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  width: 140px;
  height: 2px;
  background: ${theme.surfaceAlt};
  border-radius: 2px;
  overflow: hidden;
}
.siq-splash__track {
  width: 36%;
  height: 100%;
  background: linear-gradient(90deg, ${fade(theme.accent, 0)}, ${theme.accent});
  animation: siq-splash-track 1500ms cubic-bezier(.55, 0, .45, 1) infinite;
}
.siq-splash__caption {
  position: absolute;
  bottom: calc(44px + env(safe-area-inset-bottom, 0px));
  font-size: 9px;
  letter-spacing: 2px;
  color: ${theme.textSubtle};
}
@keyframes siq-splash-glow {
  0%, 100% { opacity: .32; transform: scale(1); }
  50% { opacity: .72; transform: scale(1.1); }
}
@keyframes siq-splash-tile {
  0% { opacity: 0; transform: scale(.8) rotate(-6deg); }
  47% { opacity: 1; transform: scale(1.05) rotate(1.5deg); }
  76% { transform: scale(.99) rotate(0deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes siq-splash-halo {
  0% { opacity: 0; transform: scale(.8); }
  16% { opacity: .55; }
  100% { opacity: 0; transform: scale(1.45); }
}
@keyframes siq-splash-draw {
  0%, 14% { stroke-dashoffset: 260; }
  52%, 100% { stroke-dashoffset: 0; }
}
@keyframes siq-splash-head {
  0%, 14% { opacity: 0; offset-distance: 0%; }
  20% { opacity: 1; }
  52% { offset-distance: 100%; opacity: 1; }
  66%, 100% { offset-distance: 100%; opacity: 0; }
}
@keyframes siq-splash-base {
  0% { transform: scaleX(0); }
  37%, 100% { transform: scaleX(1); }
}
@keyframes siq-splash-word {
  0% { opacity: 0; transform: translateY(9px); }
  37%, 100% { opacity: 1; transform: none; }
}
@keyframes siq-splash-sub {
  0% { opacity: 0; letter-spacing: 6px; }
  48%, 100% { opacity: 1; letter-spacing: 3px; }
}
@keyframes siq-splash-track {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
${stillRules('.siq-splash--still')}
@media (prefers-reduced-motion: reduce) {
${stillRules('.siq-splash')}
}
@supports not (offset-path: path('M 0 0')) {
  .siq-splash__head {
    display: none;
  }
}
`;
}
