import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { muscleColor } from '../utils/muscleColor.js';

const DEG = Math.PI / 180;
const BODY_COLOR = '#3a3a5a';

function Overlay({ muscle, position, radius, primary, secondary }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 12, 12]} />
      <meshStandardMaterial color={muscleColor(muscle, primary, secondary)} />
    </mesh>
  );
}

function Arm({ side, shoulderAngle, elbowAngle, primary, secondary }) {
  const x = side === 'L' ? -0.28 : 0.28;
  return (
    <group position={[x, 0.35, 0]} rotation={[0, 0, shoulderAngle * DEG]}>
      <mesh position={[0, -0.2, 0]}>
        <capsuleGeometry args={[0.08, 0.24, 4, 8]} />
        <meshStandardMaterial color={BODY_COLOR} />
      </mesh>
      <Overlay
        muscle="shoulders"
        position={[0, -0.02, 0]}
        radius={0.09}
        primary={primary}
        secondary={secondary}
      />
      <Overlay
        muscle="biceps"
        position={[0, -0.2, 0.09]}
        radius={0.06}
        primary={primary}
        secondary={secondary}
      />
      <Overlay
        muscle="triceps"
        position={[0, -0.2, -0.09]}
        radius={0.06}
        primary={primary}
        secondary={secondary}
      />
      <group position={[0, -0.4, 0]} rotation={[elbowAngle * DEG, 0, 0]}>
        <mesh position={[0, -0.175, 0]}>
          <capsuleGeometry args={[0.07, 0.21, 4, 8]} />
          <meshStandardMaterial color={BODY_COLOR} />
        </mesh>
        <Overlay
          muscle="forearms"
          position={[0, -0.175, 0]}
          radius={0.05}
          primary={primary}
          secondary={secondary}
        />
        <mesh position={[0, -0.38, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={BODY_COLOR} />
        </mesh>
      </group>
    </group>
  );
}

function Leg({ side, hipAngle, kneeAngle, primary, secondary }) {
  const x = side === 'L' ? -0.14 : 0.14;
  return (
    <group position={[x, -0.45, 0]} rotation={[hipAngle * DEG, 0, 0]}>
      <mesh position={[0, -0.25, 0]}>
        <capsuleGeometry args={[0.11, 0.3, 4, 8]} />
        <meshStandardMaterial color={BODY_COLOR} />
      </mesh>
      <Overlay
        muscle="glutes"
        position={[0, -0.04, -0.08]}
        radius={0.08}
        primary={primary}
        secondary={secondary}
      />
      <Overlay
        muscle="quadriceps"
        position={[0, -0.25, 0.09]}
        radius={0.08}
        primary={primary}
        secondary={secondary}
      />
      <Overlay
        muscle="hamstrings"
        position={[0, -0.25, -0.09]}
        radius={0.07}
        primary={primary}
        secondary={secondary}
      />
      <group position={[0, -0.5, 0]} rotation={[kneeAngle * DEG, 0, 0]}>
        <mesh position={[0, -0.25, 0]}>
          <capsuleGeometry args={[0.09, 0.3, 4, 8]} />
          <meshStandardMaterial color={BODY_COLOR} />
        </mesh>
        <Overlay
          muscle="calves"
          position={[0, -0.25, -0.07]}
          radius={0.06}
          primary={primary}
          secondary={secondary}
        />
        <mesh position={[0, -0.52, 0.05]}>
          <boxGeometry args={[0.1, 0.06, 0.2]} />
          <meshStandardMaterial color={BODY_COLOR} />
        </mesh>
      </group>
    </group>
  );
}

function Mannequin({ pose, primaryMuscles, secondaryMuscles }) {
  const p = pose || {};
  const primary = primaryMuscles || [];
  const secondary = secondaryMuscles || [];
  return (
    <group rotation={[0, 0, (p.torso || 0) * DEG]}>
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.22, 0.45, 4, 8]} />
        <meshStandardMaterial color={BODY_COLOR} />
      </mesh>
      <Overlay
        muscle="chest"
        position={[0, 0.12, 0.2]}
        radius={0.1}
        primary={primary}
        secondary={secondary}
      />
      <Overlay
        muscle="abdominals"
        position={[0, -0.15, 0.2]}
        radius={0.09}
        primary={primary}
        secondary={secondary}
      />
      <Overlay
        muscle="back"
        position={[0, 0.05, -0.2]}
        radius={0.11}
        primary={primary}
        secondary={secondary}
      />
      <Overlay
        muscle="lats"
        position={[0, -0.1, -0.18]}
        radius={0.1}
        primary={primary}
        secondary={secondary}
      />
      <mesh position={[0, 0.59, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color={BODY_COLOR} />
      </mesh>
      <Arm
        side="L"
        shoulderAngle={p.shoulderL || 0}
        elbowAngle={p.elbowL || 0}
        primary={primary}
        secondary={secondary}
      />
      <Arm
        side="R"
        shoulderAngle={p.shoulderR || 0}
        elbowAngle={p.elbowR || 0}
        primary={primary}
        secondary={secondary}
      />
      <Leg
        side="L"
        hipAngle={p.hipL || 0}
        kneeAngle={p.kneeL || 0}
        primary={primary}
        secondary={secondary}
      />
      <Leg
        side="R"
        hipAngle={p.hipR || 0}
        kneeAngle={p.kneeR || 0}
        primary={primary}
        secondary={secondary}
      />
    </group>
  );
}

export default function MovementFigure3D({
  pose,
  primaryMuscles,
  secondaryMuscles,
}) {
  return (
    <div
      style={{
        background: 'var(--panel2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        height: 320,
      }}
    >
      <Canvas frameloop="demand" camera={{ position: [0, 0.1, 2.6], fov: 35 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 3]} intensity={0.7} />
        <Mannequin
          pose={pose}
          primaryMuscles={primaryMuscles}
          secondaryMuscles={secondaryMuscles}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.15}
          maxPolarAngle={Math.PI / 2.15}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
