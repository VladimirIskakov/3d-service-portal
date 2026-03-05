import { Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Environment, Html } from '@react-three/drei';
import { AppSpinner } from '../AppSpinner';
import styles from './CanvasLayout.module.scss';
import { ManagedCameraControls } from './ManagedCameraControls';

interface Props {
  children: ReactNode;
  controlsRef: React.RefObject<CameraControls | null>;
  onReset: () => void;
}

const CanvasLoadingFallback = () => (
  <Html center>
      <div className={styles.canvasLayout__loadingOverlay} role="status" aria-label="Загрузка модели" aria-live="polite">
        <AppSpinner aria-hidden="true" />
      </div>
  </Html>
);

export const CanvasLayout = ({ children, controlsRef, onReset }: Props) => {
  return (
    <div className={styles.canvasLayout__canvasRoot}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'low-power',
          alpha: true,
          stencil: false
        }}
        resize={{ debounce: 4 }}
        camera={{ position: [5, 5, 5], fov: 50 }}
        onPointerMissed={(e) => e.button === 0 && onReset()}
      >
        <Suspense fallback={<CanvasLoadingFallback />}>
          <color attach="background" args={['#1f242c']} />
          <ambientLight intensity={0.5} />
          <Environment preset="city" frames={1} resolution={128} />
          <directionalLight position={[10, 10, 10]} intensity={1} />

          {children}

          <ManagedCameraControls controlsRef={controlsRef} minDistance={2} maxDistance={20} />
        </Suspense>
      </Canvas>
    </div>
  );
};


