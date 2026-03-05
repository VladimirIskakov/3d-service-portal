import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getEquipmentPartCatalog,
  getEquipmentModelBySlug,
  getEquipmentModelDisassembly,
  getEquipmentModelExplosionSettings,
  type EquipmentDisassemblyProcedure,
  type EquipmentDisassemblyStep,
  type EquipmentExplosionSettings,
  type EquipmentModelInfo,
  type EquipmentPartInfo,
} from '@/entities/equipment';
import { useSceneControls } from '@/features/scene-controls';

const degToRad = (value: number) => (value * Math.PI) / 180;

interface UseModelPageControllerInput {
  slug: string | undefined;
}

export const useModelPageController = ({ slug }: UseModelPageControllerInput) => {
  const [selectedPart, setSelectedPart] = useState<EquipmentPartInfo | null>(null);
  const [model, setModel] = useState<EquipmentModelInfo | null>(null);
  const [partCatalog, setPartCatalog] = useState<EquipmentPartInfo[]>([]);
  const [explosionSettings, setExplosionSettings] = useState<EquipmentExplosionSettings | null>(null);
  const [disassembly, setDisassembly] = useState<EquipmentDisassemblyProcedure | null>(null);
  const [isDisassemblyMode, setIsDisassemblyMode] = useState(false);
  const [disassemblyStepIndex, setDisassemblyStepIndex] = useState(0);
  const [partCentersById, setPartCentersById] = useState<Record<string, [number, number, number]>>({});
  const [meshCentersByIndex, setMeshCentersByIndex] = useState<Record<number, [number, number, number]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wasDisassemblyModeRef = useRef(false);

  const {
    isFullscreen,
    isExploded,
    controlsRef,
    resetFocus,
    toggleExplode,
    toggleFullscreen,
  } = useSceneControls();

  useEffect(() => {
    setSelectedPart(null);
    setPartCatalog([]);
    setExplosionSettings(null);
    setDisassembly(null);
    setIsDisassemblyMode(false);
    setDisassemblyStepIndex(0);
    setPartCentersById({});
    setMeshCentersByIndex({});
  }, [slug]);

  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      if (!slug) {
        if (isMounted) {
          setModel(null);
          setError('Модель не указана. Вернитесь в каталог.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [modelInfo, partCatalogItems, explodeSettings, disassemblyData] = await Promise.all([
          getEquipmentModelBySlug(slug),
          getEquipmentPartCatalog(slug).catch(() => []),
          getEquipmentModelExplosionSettings(slug).catch(() => null),
          getEquipmentModelDisassembly(slug).catch(() => null),
        ]);

        if (!isMounted) {
          return;
        }

        setModel(modelInfo);
        setPartCatalog(partCatalogItems);
        setExplosionSettings(explodeSettings);
        setDisassembly(disassemblyData);
      } catch {
        if (isMounted) {
          setModel(null);
          setPartCatalog([]);
          setDisassembly(null);
          setError('Не удалось загрузить модель из каталога.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadModel();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const disassemblySteps = useMemo(() => {
    const source = disassembly?.steps ?? [];
    return [...source].sort((a, b) => a.order - b.order);
  }, [disassembly]);

  const activeDisassemblyStep = useMemo<EquipmentDisassemblyStep | null>(() => {
    if (disassemblySteps.length === 0) {
      return null;
    }

    return disassemblySteps[disassemblyStepIndex] ?? disassemblySteps[0];
  }, [disassemblyStepIndex, disassemblySteps]);

  useEffect(() => {
    setDisassemblyStepIndex((current) => {
      if (disassemblySteps.length === 0) {
        return 0;
      }

      return Math.min(current, disassemblySteps.length - 1);
    });
  }, [disassemblySteps.length]);

  const applyDisassemblyStepCamera = useCallback((
    step: EquipmentDisassemblyStep | null,
    partCenter: [number, number, number] | null,
  ) => {
    if (!step) {
      return;
    }

    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    let positionX: number;
    let positionY: number;
    let positionZ: number;
    let targetX: number;
    let targetY: number;
    let targetZ: number;

    if (partCenter) {
      const yawDeg = step.cameraPreset.position[0];
      const pitchDeg = step.cameraPreset.position[1];
      const distanceRaw = step.cameraPreset.position[2];
      const distance = Number.isFinite(distanceRaw) ? Math.max(0.2, Math.abs(distanceRaw)) : 3;

      const yaw = degToRad(Number.isFinite(yawDeg) ? yawDeg : 45);
      const pitch = degToRad(Number.isFinite(pitchDeg) ? pitchDeg : 18);

      const cosPitch = Math.cos(pitch);
      const offsetX = distance * cosPitch * Math.sin(yaw);
      const offsetY = distance * Math.sin(pitch);
      const offsetZ = distance * cosPitch * Math.cos(yaw);

      targetX = partCenter[0];
      targetY = partCenter[1];
      targetZ = partCenter[2];

      positionX = targetX + offsetX;
      positionY = targetY + offsetY;
      positionZ = targetZ + offsetZ;
    } else {
      [positionX, positionY, positionZ] = step.cameraPreset.position;
      [targetX, targetY, targetZ] = step.cameraPreset.target;
    }

    void controls.setLookAt(positionX, positionY, positionZ, targetX, targetY, targetZ, true);

    const camera = controls.camera;
    if ('fov' in camera && typeof camera.fov === 'number') {
      camera.fov = step.cameraPreset.fov;
      camera.updateProjectionMatrix();
    }
  }, [controlsRef]);

  useEffect(() => {
    if (!isDisassemblyMode || loading) {
      return;
    }

    const focusMeshCenter =
      activeDisassemblyStep?.focusMeshIndex !== null && activeDisassemblyStep?.focusMeshIndex !== undefined
        ? (meshCentersByIndex[activeDisassemblyStep.focusMeshIndex] ?? null)
        : null;
    const partCenter = focusMeshCenter
      ?? (activeDisassemblyStep?.partId ? (partCentersById[activeDisassemblyStep.partId] ?? null) : null);
    applyDisassemblyStepCamera(activeDisassemblyStep, partCenter);
  }, [activeDisassemblyStep, applyDisassemblyStepCamera, isDisassemblyMode, loading, meshCentersByIndex, partCentersById]);

  useEffect(() => {
    if (wasDisassemblyModeRef.current && !isDisassemblyMode) {
      resetFocus();
    }

    wasDisassemblyModeRef.current = isDisassemblyMode;
  }, [isDisassemblyMode, resetFocus]);

  const handleToggleDisassemblyMode = () => {
    setIsDisassemblyMode((current) => !current);
  };

  const handleDisassemblyStepChange = (direction: -1 | 1) => {
    setDisassemblyStepIndex((current) => {
      if (disassemblySteps.length === 0) {
        return 0;
      }

      const nextIndex = current + direction;
      return Math.min(disassemblySteps.length - 1, Math.max(0, nextIndex));
    });
  };

  const disassemblyExplodedPartIds = useMemo(() => {
    if (!isDisassemblyMode || disassemblySteps.length === 0) {
      return null;
    }

    const maxStepIndex = Math.min(disassemblyStepIndex, disassemblySteps.length - 1);
    const ids: string[] = [];
    const used = new Set<string>();

    for (let index = 0; index <= maxStepIndex; index += 1) {
      const partId = disassemblySteps[index]?.partId;
      if (!partId || used.has(partId)) {
        continue;
      }
      used.add(partId);
      ids.push(partId);
    }

    return ids.length > 0 ? ids : null;
  }, [disassemblyStepIndex, disassemblySteps, isDisassemblyMode]);

  const effectiveExploded = isDisassemblyMode
    ? Boolean(disassemblyExplodedPartIds && disassemblyExplodedPartIds.length > 0)
    : isExploded;
  const effectiveSelectedPartId = isDisassemblyMode
    ? activeDisassemblyStep?.partId ?? null
    : selectedPart?.id ?? null;

  return {
    model,
    partCatalog,
    explosionSettings,
    loading,
    error,
    selectedPart,
    setSelectedPart,
    partCentersById,
    setPartCentersById,
    meshCentersByIndex,
    setMeshCentersByIndex,
    isDisassemblyMode,
    disassemblyStepIndex,
    disassemblySteps,
    activeDisassemblyStep,
    handleToggleDisassemblyMode,
    handleDisassemblyStepChange,
    disassemblyExplodedPartIds,
    effectiveExploded,
    effectiveSelectedPartId,
    isFullscreen,
    controlsRef,
    resetFocus,
    toggleExplode,
    toggleFullscreen,
  };
};

