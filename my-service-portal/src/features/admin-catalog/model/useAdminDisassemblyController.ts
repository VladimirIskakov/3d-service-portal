import { useEffect, useMemo, useRef, useState } from 'react';
import { CameraControls } from '@react-three/drei';
import {
  DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS,
  type EquipmentMeshInfo,
  type EquipmentPartInfo,
} from '@/entities/equipment';
import {
  buildPreviewPose,
  type EditableDisassemblyStep,
  getDisassemblyErrorMessage,
} from './disassemblyEditor';
import {
  getAdminCatalogModelBySlug,
  getAdminCatalogModelDisassembly,
  getAdminCatalogModelExplosionSettings,
  getAdminCatalogModelMeshes,
  getAdminCatalogModelParts,
} from './adminCatalogApi';
import { useAdminDisassemblyStepActions } from './useAdminDisassemblyStepActions';

interface UseAdminDisassemblyControllerInput {
  modelSlug: string;
}

export const useAdminDisassemblyController = ({ modelSlug }: UseAdminDisassemblyControllerInput) => {
  const staticControlsRef = useRef<CameraControls | null>(null);

  const [steps, setSteps] = useState<EditableDisassemblyStep[]>([]);
  const [parts, setParts] = useState<EquipmentPartInfo[]>([]);
  const [meshes, setMeshes] = useState<EquipmentMeshInfo[]>([]);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelUrlLoading, setModelUrlLoading] = useState(true);
  const [explosionSettings, setExplosionSettings] = useState(DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [partCentersById, setPartCentersById] = useState<Record<string, [number, number, number]>>({});
  const [meshCentersByIndex, setMeshCentersByIndex] = useState<Record<number, [number, number, number]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const selectedStep = useMemo(
    () => steps.find((step) => step.id === selectedStepId) ?? null,
    [steps, selectedStepId],
  );

  const partsById = useMemo(() => {
    const map = new Map<string, EquipmentPartInfo>();
    parts.forEach((part) => {
      map.set(part.id, part);
    });
    return map;
  }, [parts]);

  const meshesByIndex = useMemo(() => {
    const map = new Map<number, EquipmentMeshInfo>();
    meshes.forEach((mesh) => {
      map.set(mesh.meshIndex, mesh);
    });
    return map;
  }, [meshes]);

  const selectedStepIndex = useMemo(
    () => (selectedStepId ? steps.findIndex((step) => step.id === selectedStepId) : -1),
    [selectedStepId, steps],
  );

  const selectedStepPart = useMemo(
    () => (selectedStep?.partId ? partsById.get(selectedStep.partId) ?? null : null),
    [partsById, selectedStep?.partId],
  );

  const selectedStepFocusMeshOptions = useMemo(() => {
    if (!selectedStepPart) {
      return [];
    }

    return [...selectedStepPart.meshIndexes].sort((a, b) => a - b);
  }, [selectedStepPart]);

  const partOptions = useMemo(
    () => parts.map((part) => ({ id: part.id, title: part.title.trim() || part.id })),
    [parts],
  );

  const previewExplodedPartIds = useMemo(() => {
    if (selectedStepIndex < 0) {
      return null;
    }

    const ids: string[] = [];
    const used = new Set<string>();

    for (let index = 0; index <= selectedStepIndex; index += 1) {
      const partId = steps[index]?.partId;
      if (!partId || used.has(partId)) {
        continue;
      }
      used.add(partId);
      ids.push(partId);
    }

    return ids.length > 0 ? ids : null;
  }, [selectedStepIndex, steps]);

  const previewPose = useMemo(
    () => buildPreviewPose(selectedStep, partCentersById, meshCentersByIndex),
    [meshCentersByIndex, partCentersById, selectedStep],
  );

  const getMeshOptionLabel = (meshIndex: number) => {
    const mesh = meshesByIndex.get(meshIndex);
    if (!mesh) {
      return `Меш #${meshIndex}`;
    }

    const rawLabel = mesh.label?.trim() || mesh.nodeName?.trim() || mesh.meshName?.trim();
    return rawLabel ? `${rawLabel} (#${meshIndex})` : `Меш #${meshIndex}`;
  };

  const stepActions = useAdminDisassemblyStepActions({
    modelSlug,
    steps,
    setSteps,
    selectedStepId,
    setSelectedStepId,
    parts,
    partsById,
    setSavePending,
    setSaveError,
    setSaveSuccess,
  });

  const handlePreviewSelectPart = (part: EquipmentPartInfo | null) => {
    stepActions.handleStepPartChange(part?.id ?? null);
  };

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      setLoading(true);
      setModelUrlLoading(true);
      setError(null);
      setSaveError(null);
      setSaveSuccess(null);
      setPartCentersById({});
      setMeshCentersByIndex({});
      setMeshes([]);
      setExplosionSettings(DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS);

      try {
        const [disassembly, modelParts] = await Promise.all([
          getAdminCatalogModelDisassembly(modelSlug),
          getAdminCatalogModelParts(modelSlug),
        ]);

        if (disposed) {
          return;
        }

        const modelPartsById = new Map<string, EquipmentPartInfo>();
        modelParts.forEach((part) => {
          modelPartsById.set(part.id, part);
        });

        const orderedSteps = [...disassembly.steps]
          .sort((a, b) => a.order - b.order)
          .map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            partId: step.partId,
            focusMeshIndex:
              step.partId
              && Number.isInteger(step.focusMeshIndex)
              && modelPartsById.get(step.partId)?.meshIndexes.includes(Number(step.focusMeshIndex))
                ? Number(step.focusMeshIndex)
                : null,
            cameraPreset: step.cameraPreset,
          }));

        setSteps(orderedSteps);
        setParts(modelParts);
        setSelectedStepId((current) => {
          if (current && orderedSteps.some((step) => step.id === current)) {
            return current;
          }

          return orderedSteps[0]?.id ?? null;
        });
        setLoading(false);

        void getAdminCatalogModelMeshes(modelSlug)
          .then((modelMeshes) => {
            if (!disposed) {
              setMeshes(modelMeshes);
            }
          })
          .catch(() => {
            if (!disposed) {
              setMeshes([]);
            }
          });

        void getAdminCatalogModelExplosionSettings(modelSlug)
          .then((settings) => {
            if (!disposed) {
              setExplosionSettings(settings);
            }
          })
          .catch(() => {
            if (!disposed) {
              setExplosionSettings(DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS);
            }
          });

        try {
          const modelInfo = await getAdminCatalogModelBySlug(modelSlug);
          if (!disposed) {
            setModelUrl(modelInfo.assetUrl ?? null);
          }
        } catch {
          if (!disposed) {
            setModelUrl(null);
          }
        } finally {
          if (!disposed) {
            setModelUrlLoading(false);
          }
        }
      } catch (loadError) {
        if (disposed) {
          return;
        }

        setError(getDisassemblyErrorMessage(loadError, 'load'));
        setSteps([]);
        setParts([]);
        setMeshes([]);
        setModelUrl(null);
        setModelUrlLoading(false);
        setSelectedStepId(null);
        setLoading(false);
      }
    };

    void load();

    return () => {
      disposed = true;
    };
  }, [modelSlug]);

  return {
    staticControlsRef,
    loading,
    error,
    savePending,
    saveError,
    saveSuccess,
    dragOverStepId: stepActions.dragOverStepId,
    steps,
    selectedStepId,
    selectedStep,
    partOptions,
    selectedStepFocusMeshOptions,
    modelUrl,
    modelUrlLoading,
    previewExplodedPartIds,
    explosionSettings,
    previewPose,
    getMeshOptionLabel,
    setSelectedStepId,
    handleCreateStep: stepActions.handleCreateStep,
    handleStepDragStart: stepActions.handleStepDragStart,
    handleStepDragOver: stepActions.handleStepDragOver,
    handleStepDrop: stepActions.handleStepDrop,
    handleStepDragEnd: stepActions.handleStepDragEnd,
    handleDeleteStep: stepActions.handleDeleteStep,
    updateSelectedStep: stepActions.updateSelectedStep,
    handleStepPartChange: stepActions.handleStepPartChange,
    handleFocusMeshChange: stepActions.handleFocusMeshChange,
    handlePreviewSelectPart,
    handleSave: stepActions.handleSave,
    setPartCentersById,
    setMeshCentersByIndex,
  };
};

