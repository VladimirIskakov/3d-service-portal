import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { EquipmentPreviewCameraSettings } from '../model/types';
import { AppSpinner } from '@/shared/ui';
import styles from './EquipmentPreviewCanvas.module.scss';

interface Props {
  modelUrl: string;
  cameraSettings?: EquipmentPreviewCameraSettings | null;
}

const PreviewModel = ({ modelUrl }: Pick<Props, 'modelUrl'>) => {
  const { scene } = useGLTF(modelUrl);

  const previewObject = useMemo(() => {
    const clone = scene.clone(true);
    const root = new THREE.Group();
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    clone.position.sub(center);
    root.add(clone);

    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const targetSize = 1.8;
    root.scale.setScalar(targetSize / maxSize);

    return root;
  }, [scene]);

  return <primitive object={previewObject} />;
};

const PreviewLoader = () => (
  <Html center>
    <AppSpinner size="sm" aria-hidden="true" />
  </Html>
);

const PreviewCameraController = ({
  cameraSettings,
}: {
  cameraSettings?: EquipmentPreviewCameraSettings | null;
}) => {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    if (!cameraSettings) {
      return;
    }

    camera.position.set(...cameraSettings.position);

    if (camera instanceof THREE.PerspectiveCamera) {
      const vExtentSlope = Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * cameraSettings.fov);
      const focalLength = (0.5 * camera.getFilmHeight()) / vExtentSlope;
      camera.setFocalLength(focalLength);
      camera.updateProjectionMatrix();
    }

    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, cameraSettings, invalidate]);

  return null;
};

export const EquipmentPreviewCanvas = ({ modelUrl, cameraSettings }: Props) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [canRenderCanvas, setCanRenderCanvas] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCanRenderCanvas(true);
          observer.disconnect();
        }
      },
      { rootMargin: '220px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const initialCamera = cameraSettings ?? {
    position: [2.8, 2.35, 3.1] as [number, number, number],
    fov: 33,
  };

  return (
    <div ref={rootRef} className={styles.equipmentPreviewCanvas__root} aria-hidden="true">
      {canRenderCanvas ? (
        <Canvas
          frameloop="demand"
          dpr={[1, 1]}
          gl={{
            antialias: true,
            powerPreference: 'low-power',
            alpha: true,
            stencil: false,
          }}
          camera={{ position: initialCamera.position, fov: initialCamera.fov }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(new THREE.Color('#161b22'), 1);
            scene.background = new THREE.Color('#161b22');
          }}
        >
          <Suspense fallback={<PreviewLoader />}>
            <PreviewCameraController cameraSettings={cameraSettings ?? null} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 7, 5]} intensity={1} />
            <directionalLight position={[-4, 3, -3]} intensity={0.35} />
            <PreviewModel modelUrl={modelUrl} />
          </Suspense>
        </Canvas>
      ) : (
        <div className={styles.equipmentPreviewCanvas__placeholder}>
          <AppSpinner aria-hidden="true" />
        </div>
      )}
    </div>
  );
};
