import { useEffect, useRef, useState } from 'react';

/**
 * The strain readout's polite announcement (criterion 23). Paused, it follows
 * the readout (`key`) and the phase: the key carries no phase, so a scrub into
 * a new phase with the same top regions must still be said. Playing, it speaks only when the phase changes, at most
 * once per `minMs`, and only if the user started playback: an autoplaying rep
 * (PR A) never narrates itself. Otherwise it keeps the last thing it said.
 * An empty key (heatmap off) clears it.
 */
export function useStrainAnnouncement({
  key,
  text,
  phase,
  playing,
  userPlayed,
  minMs = 3000,
}) {
  const [live, setLive] = useState('');
  const said = useRef({ key: '', phase: null, at: -Infinity });
  const latest = useRef({ text, phase });
  useEffect(() => {
    latest.current = { text, phase };
  });

  useEffect(() => {
    const speak = () => {
      const now = window.performance.now();
      said.current = { key, phase: latest.current.phase, at: now };
      setLive(latest.current.text);
    };
    if (!key) {
      said.current = { key: '', phase: null, at: -Infinity };
      setLive('');
      return undefined;
    }
    if (!playing) {
      if (key !== said.current.key || phase !== said.current.phase) speak();
      return undefined;
    }
    if (!userPlayed || phase === said.current.phase) return undefined;
    const wait = said.current.at + minMs - window.performance.now();
    if (wait <= 0) {
      speak();
      return undefined;
    }
    // Inside the window: say the phase it is in when the window closes.
    const id = setTimeout(speak, wait);
    return () => clearTimeout(id);
  }, [key, phase, playing, userPlayed, minMs]);

  return live;
}
