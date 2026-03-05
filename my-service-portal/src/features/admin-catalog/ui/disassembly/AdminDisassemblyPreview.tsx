import { useEffect, type RefObject } from 'react';
import { CameraControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  type EquipmentExplosionSettings,
  type EquipmentPartInfo,
  EquipmentScene,
} from '@/entities/equipment';
import { AppSpinner } from '@/shared/ui';
import { DEFAULT_PREVIEW_POSE } from '../../model/disassemblyEditor';
import styles from '../AdminModelDisassemblyEditor.module.scss';

const StaticCamera = ({
  pose,
}: {
  pose: { position: [number, number, number]; target: [number, number, number]; fov: number };
}) => {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    camera.position.set(...pose.position);
    if (camera instanceof THREE.PerspectiveCamera) {
      const vExtentSlope = Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * pose.fov);
      const focalLength = (0.5 * camera.getFilmHeight()) / vExtentSlope;
      camera.setFocalLength(focalLength);
      camera.updateProjectionMatrix();
    }
    camera.lookAt(...pose.target);
    invalidate();
  }, [camera, invalidate, pose]);

  return null;
};

interface Props {
  modelSlug: string;
  modelUrl: string | null;
  modelUrlLoading: boolean;
  previewExplodedPartIds: string[] | null;
  explosionSettings: EquipmentExplosionSettings;
  selectedPartId: string | null;
  previewPose: { position: [number, number, number]; target: [number, number, number]; fov: number };
  controlsRef: RefObject<CameraControls | null>;
  onSelectPart: (part: EquipmentPartInfo | null) => void;
  onPartCentersComputed: (value: Record<string, [number, number, number]>) => void;
  onMeshCentersComputed: (value: Record<number, [number, number, number]>) => void;
}

export const AdminDisassemblyPreview = ({
  modelSlug,
  modelUrl,
  modelUrlLoading,
  previewExplodedPartIds,
  explosionSettings,
  selectedPartId,
  previewPose,
  controlsRef,
  onSelectPart,
  onPartCentersComputed,
  onMeshCentersComputed,
}: Props) => {
  return (
    <div className={styles.adminModelDisassemblyEditor__previewBlock}>
      <h5 className={styles.adminModelDisassemblyEditor__previewTitle}>Превью шага</h5>
      <div className={styles.adminModelDisassemblyEditor__previewCanvasWrap}>
        {modelUrlLoading ? (
          <div className={styles.adminModelDisassemblyEditor__previewLoadingState} role="status" aria-live="polite">
            <AppSpinner aria-hidden="true" />
            <span>Загрузка 3D-модели...</span>
          </div>
        ) : !modelUrl ? (
          <div className={styles.adminModelDisassemblyEditor__previewPlaceholder}>Для модели не загружен 3D-файл.</div>
        ) : (
          <div className={styles.adminModelDisassemblyEditor__previewCanvas}>
            <Canvas
              frameloop="demand"
              dpr={[1, 1]}
              gl={{
                antialias: true,
                powerPreference: 'low-power',
                alpha: true,
                stencil: false,
              }}
              camera={{ position: DEFAULT_PREVIEW_POSE.position, fov: DEFAULT_PREVIEW_POSE.fov }}
              onCreated={({ gl, scene }) => {
                const color = new THREE.Color('#161b22');
                gl.setClearColor(color, 1);
                scene.background = color;
              }}
            >
              <ambientLight intensity={0.65} />
              <directionalLight position={[5, 7, 5]} intensity={1} />
              <directionalLight position={[-4, 3, -3]} intensity={0.35} />

              <StaticCamera pose={previewPose} />

              <EquipmentScene
                modelSlug={modelSlug}
                modelUrl={modelUrl}
                exploded={Boolean(previewExplodedPartIds && previewExplodedPartIds.length > 0)}
                explodedPartIds={previewExplodedPartIds}
                explosionSettings={explosionSettings}
                controlsRef={controlsRef}
                selectedPartId={selectedPartId}
                onSelectPart={onSelectPart}
                onPartCentersComputed={onPartCentersComputed}
                onMeshCentersComputed={onMeshCentersComputed}
              />
            </Canvas>
          </div>
        )}
      </div>
    </div>
  );
};
