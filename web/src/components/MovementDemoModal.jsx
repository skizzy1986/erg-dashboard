import { lazy, Suspense, useState } from 'react';
import { MOVEMENT_DEMOS } from '../constants/movementDemos.js';
import { slugForExerciseName } from '../utils/movementSlug.js';

// three.js/@react-three/fiber are heavy — load them only when a curated
// demo is actually opened, not as part of the main app bundle.
const MovementFigure3D = lazy(() => import('./MovementFigure3D.jsx'));

function FigureLoading() {
  return (
    <div
      style={{
        background: 'var(--panel2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        height: 320,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--mut)',
        fontSize: 13,
      }}
    >
      Loading 3D figure…
    </div>
  );
}

function Tag({ children }) {
  return <span className="demo-tag">{children}</span>;
}

export default function MovementDemoModal({ exerciseName, onClose }) {
  const slug = slugForExerciseName(exerciseName);
  const demo = slug ? MOVEMENT_DEMOS[slug] : null;
  const [phaseIdx, setPhaseIdx] = useState(0);

  const bg = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!demo) {
    return (
      <div className="slog">
        <div className="sheet-bg" onClick={bg}>
          <div className="sheet">
            <div className="sheet-hd">
              <h3>{exerciseName}</h3>
              <button className="btn xs sec" onClick={onClose}>
                Close
              </button>
            </div>
            <div className="sheet-body demo-wrap">
              <div className="demo-fallback">
                🎬 Demonstration coming soon.
                <br />
                This movement isn't in the curated set yet.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const phase = demo.phases[phaseIdx];

  return (
    <div className="slog">
      <div className="sheet-bg" onClick={bg}>
        <div className="sheet">
          <div className="sheet-hd">
            <h3>{demo.name}</h3>
            <button className="btn xs sec" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="sheet-body demo-wrap">
            <Suspense fallback={<FigureLoading />}>
              <MovementFigure3D
                pose={phase.pose}
                primaryMuscles={phase.primaryMuscles}
                secondaryMuscles={phase.secondaryMuscles}
              />
            </Suspense>
            <div className="seg" style={{ marginTop: 12 }}>
              {demo.phases.map((p, i) => (
                <button
                  key={p.label}
                  className={i === phaseIdx ? 'on' : ''}
                  onClick={() => setPhaseIdx(i)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={demo.phases.length - 1}
              step={1}
              value={phaseIdx}
              onChange={(e) => setPhaseIdx(Number(e.target.value))}
              style={{ width: '100%', marginTop: 10 }}
            />
            <div className="demo-muscles" style={{ marginTop: 14 }}>
              <b>{phase.label}</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {phase.cues.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="demo-muscles" style={{ marginTop: 12 }}>
              <b>Primary:</b>{' '}
              {demo.primaryMuscles.map((m) => (
                <Tag key={m}>{m}</Tag>
              ))}
              <br />
              <b>Secondary:</b>{' '}
              {demo.secondaryMuscles.map((m) => (
                <Tag key={m}>{m}</Tag>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
