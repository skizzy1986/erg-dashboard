import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';

// A real rigged Ready Player Me humanoid, vendored as a static asset. The
// `new URL(..., import.meta.url)` form lets Vite hash + rewrite the URL
// (respecting `base`) instead of inlining the 1.8MB binary.
const MODEL_URL = new URL('../assets/movement-figure.glb', import.meta.url)
  .href;

function Figure() {
  const { scene } = useGLTF(MODEL_URL);
  // Clone so we own an independent skinned instance (safe under StrictMode
  // double-mount, and required once per-phase bone posing lands).
  const model = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);
    cloned.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
        o.frustumCulled = false;
      }
    });
    return cloned;
  }, [scene]);
  // Feet sit at y≈0 already; drop very slightly so shoes meet the shadow plane.
  return <primitive object={model} position={[0, -0.02, 0]} />;
}

export default function MovementFigure3D() {
  return (
    <div
      style={{
        background:
          'radial-gradient(120% 90% at 50% 15%, #26263f 0%, var(--panel2) 70%)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        height: 360,
        overflow: 'hidden',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [0, 0.95, 3.7], fov: 30 }}
      >
        {/* Soft studio lighting — neutral so the avatar's own materials read
            cleanly, with one key light for form + shadow. */}
        <hemisphereLight args={['#dfe6ff', '#2a2a3e', 0.9]} />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[2.5, 4, 3]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0002}
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          <Figure />
        </Suspense>
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.5}
          scale={4}
          blur={2.6}
          far={2}
          resolution={512}
          color="#000000"
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.8}
          target={[0, 0.95, 0]}
          minPolarAngle={Math.PI / 2.35}
          maxPolarAngle={Math.PI / 2.35}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
