import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS,
  type EquipmentPartInfo,
} from '@/entities/equipment';
import {
  fetchAdminModelMeshCatalog,
  fetchAdminModelParts,
  removeAdminModelPart,
  saveAdminModelPart,
} from './adminModelPartsService';
import { type ModelMeshCatalogItem } from './loadModelMeshCatalog';
import {
  clearPartFieldError,
  type EditorTab,
  getPartActionErrorMessage,
  normalizeMeshIndexes,
  type PartFieldErrors,
  validatePartForm,
} from './partsEditor';
import type { AppSegmentedOption } from '@/shared/ui';

interface UseAdminModelPartsControllerInput {
  modelSlug: string | null;
}

export const useAdminModelPartsController = ({ modelSlug }: UseAdminModelPartsControllerInput) => {
  const [parts, setParts] = useState<EquipmentPartInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [meshCatalog, setMeshCatalog] = useState<ModelMeshCatalogItem[]>([]);
  const [meshCatalogLoading, setMeshCatalogLoading] = useState(false);
  const [meshCatalogError, setMeshCatalogError] = useState<string | null>(null);
  const [meshSearch, setMeshSearch] = useState('');
  const [activeTab, setActiveTab] = useState<EditorTab>('preview');

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [partId, setPartIdState] = useState('');
  const [title, setTitleState] = useState('');
  const [description, setDescriptionState] = useState('');
  const [selectedMeshIndexes, setSelectedMeshIndexes] = useState<number[]>([]);
  const [silhouetteOpacity, setSilhouetteOpacity] = useState(DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.opacity);
  const [silhouetteEdgeThresholdAngle, setSilhouetteEdgeThresholdAngle] = useState(
    DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.edgeThresholdAngle,
  );
  const [silhouetteShowEdges, setSilhouetteShowEdges] = useState(
    DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.showEdges,
  );
  const [fieldErrors, setFieldErrors] = useState<PartFieldErrors>({});

  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const tabOptions: AppSegmentedOption<EditorTab>[] = [
    { value: 'preview', label: 'Превью' },
    { value: 'content', label: 'Контент' },
    { value: 'parts', label: 'Детали' },
    { value: 'explode', label: 'Разлёт' },
    { value: 'disassembly', label: 'Разборка' },
  ];

  const isEditMode = Boolean(selectedPartId);

  const selectedPart = useMemo(
    () => parts.find((part) => part.id === selectedPartId) ?? null,
    [parts, selectedPartId],
  );

  const selectedMeshIndexSet = useMemo(() => new Set(selectedMeshIndexes), [selectedMeshIndexes]);

  const meshOwnersByIndex = useMemo(() => {
    const map = new Map<number, EquipmentPartInfo[]>();

    parts.forEach((part) => {
      part.meshIndexes.forEach((meshIndex) => {
        const owners = map.get(meshIndex);
        if (owners) {
          owners.push(part);
          return;
        }

        map.set(meshIndex, [part]);
      });
    });

    return map;
  }, [parts]);

  const filteredMeshCatalog = useMemo(() => {
    const term = meshSearch.trim().toLowerCase();

    if (!term) {
      return meshCatalog;
    }

    return meshCatalog.filter((mesh) => {
      const haystack = `${mesh.meshIndex + 1} ${mesh.meshIndex} ${mesh.label} ${mesh.nodeName} ${mesh.meshName}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [meshCatalog, meshSearch]);

  const selectedMeshItems = useMemo(() => {
    const byIndex = new Map(meshCatalog.map((item) => [item.meshIndex, item] as const));
    return selectedMeshIndexes
      .map((meshIndex) => byIndex.get(meshIndex))
      .filter(Boolean) as ModelMeshCatalogItem[];
  }, [meshCatalog, selectedMeshIndexes]);

  const selectedMeshSummary = useMemo(() => {
    if (selectedMeshItems.length === 0) {
      return 'Меши не выбраны';
    }

    if (selectedMeshItems.length <= 3) {
      return selectedMeshItems.map((item) => item.label).join(', ');
    }

    const preview = selectedMeshItems
      .slice(0, 2)
      .map((item) => item.label)
      .join(', ');
    return `${preview} и еще ${selectedMeshItems.length - 2}`;
  }, [selectedMeshItems]);

  const availableMeshCount = useMemo(() => {
    return meshCatalog.reduce((count, mesh) => {
      const owners = meshOwnersByIndex.get(mesh.meshIndex) ?? [];
      const lockedByOtherPart = owners.some((owner) => owner.id !== selectedPartId);
      return lockedByOtherPart ? count : count + 1;
    }, 0);
  }, [meshCatalog, meshOwnersByIndex, selectedPartId]);

  const resetForm = () => {
    setSelectedPartId(null);
    setPartIdState('');
    setTitleState('');
    setDescriptionState('');
    setSelectedMeshIndexes([]);
    setSilhouetteOpacity(DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.opacity);
    setSilhouetteEdgeThresholdAngle(DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.edgeThresholdAngle);
    setSilhouetteShowEdges(DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.showEdges);
    setFieldErrors({});
    setSaveError(null);
    setSaveSuccess(null);
  };

  const fillFormFromPart = (part: EquipmentPartInfo) => {
    setSelectedPartId(part.id);
    setPartIdState(part.id);
    setTitleState(part.title);
    setDescriptionState(part.description ?? '');
    setSelectedMeshIndexes(normalizeMeshIndexes(part.meshIndexes));
    setSilhouetteOpacity(part.silhouette?.opacity ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.opacity);
    setSilhouetteEdgeThresholdAngle(
      part.silhouette?.edgeThresholdAngle ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.edgeThresholdAngle,
    );
    setSilhouetteShowEdges(part.silhouette?.showEdges ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.showEdges);
    setFieldErrors({});
    setSaveError(null);
    setSaveSuccess(null);
  };

  const loadParts = async (slug: string) => {
    setLoading(true);
    setError(null);

    try {
      const items = await fetchAdminModelParts(slug);
      setParts(items);
      setSelectedPartId((current) =>
        current && items.some((part) => part.id === current) ? current : null,
      );
    } catch (loadError) {
      setParts([]);
      setSelectedPartId(null);
      setError(getPartActionErrorMessage(loadError, 'load'));
    } finally {
      setLoading(false);
    }
  };

  const loadMeshes = async (slug: string) => {
    setMeshCatalogLoading(true);
    setMeshCatalogError(null);

    try {
      const result = await fetchAdminModelMeshCatalog(slug);
      setMeshCatalog(result.items);
      setMeshCatalogError(result.warning);
    } catch (loadError) {
      setMeshCatalog([]);
      setMeshCatalogError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить список мешей модели.');
    } finally {
      setMeshCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (!modelSlug) {
      setParts([]);
      setMeshCatalog([]);
      setMeshCatalogError(null);
      setMeshSearch('');
      setActiveTab('preview');
      resetForm();
      setError(null);
      return;
    }

    setActiveTab('preview');
    void loadParts(modelSlug);
    void loadMeshes(modelSlug);
  }, [modelSlug]);

  useEffect(() => {
    if (!selectedPart) {
      return;
    }

    setPartIdState(selectedPart.id);
    setTitleState(selectedPart.title);
    setDescriptionState(selectedPart.description ?? '');
    setSelectedMeshIndexes(normalizeMeshIndexes(selectedPart.meshIndexes));
    setSilhouetteOpacity(selectedPart.silhouette?.opacity ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.opacity);
    setSilhouetteEdgeThresholdAngle(
      selectedPart.silhouette?.edgeThresholdAngle ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.edgeThresholdAngle,
    );
    setSilhouetteShowEdges(
      selectedPart.silhouette?.showEdges ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.showEdges,
    );
  }, [selectedPart]);

  const handleToggleMeshSelection = (meshIndex: number) => {
    const owners = meshOwnersByIndex.get(meshIndex) ?? [];
    const lockedByOtherPart = owners.some((owner) => owner.id !== selectedPartId);
    const alreadySelected = selectedMeshIndexSet.has(meshIndex);

    if (lockedByOtherPart && !alreadySelected) {
      return;
    }

    setSelectedMeshIndexes((current) => {
      if (current.includes(meshIndex)) {
        return current.filter((value) => value !== meshIndex);
      }

      return [...current, meshIndex].sort((a, b) => a - b);
    });
    clearPartFieldError(setFieldErrors, 'meshIndexes');
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    if (!modelSlug) {
      return;
    }

    const validation = validatePartForm({
      partId,
      title,
      meshIndexes: selectedMeshIndexes,
      silhouette: {
        opacity: silhouetteOpacity,
        edgeThresholdAngle: silhouetteEdgeThresholdAngle,
        showEdges: silhouetteShowEdges,
      },
    });
    const conflictingMeshIndexes = validation.meshIndexes.filter((meshIndex) => {
      const owners = meshOwnersByIndex.get(meshIndex) ?? [];
      return owners.some((owner) => owner.id !== selectedPartId);
    });

    const nextFieldErrors: PartFieldErrors = { ...validation.errors };

    if (conflictingMeshIndexes.length > 0) {
      nextFieldErrors.meshIndexes = `Меши уже используются другими деталями: ${conflictingMeshIndexes.join(', ')}`;
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setSaveError(null);
      setSaveSuccess(null);
      return;
    }

    setSavePending(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const saved = await saveAdminModelPart({
        modelSlug,
        isEditMode,
        partId,
        title,
        description,
        meshIndexes: validation.meshIndexes,
        silhouette: validation.silhouette,
      });

      await loadParts(modelSlug);
      fillFormFromPart(saved);
      setSaveSuccess(isEditMode ? 'Деталь обновлена.' : 'Деталь создана.');
    } catch (savePartError) {
      setSaveError(getPartActionErrorMessage(savePartError, 'save'));
    } finally {
      setSavePending(false);
    }
  };

  const handleDelete = async () => {
    if (!modelSlug || !selectedPartId) {
      return;
    }

    setDeletePending(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await removeAdminModelPart(modelSlug, selectedPartId);
      await loadParts(modelSlug);
      resetForm();
      setSaveSuccess('Деталь удалена.');
    } catch (deleteError) {
      setSaveError(getPartActionErrorMessage(deleteError, 'delete'));
    } finally {
      setDeletePending(false);
    }
  };

  const handleRefresh = () => {
    if (!modelSlug) {
      return;
    }

    void loadParts(modelSlug);
    void loadMeshes(modelSlug);
  };

  return {
    loading,
    error,
    meshCatalogLoading,
    meshCatalogError,
    meshSearch,
    activeTab,
    parts,
    selectedPartId,
    fieldErrors,
    partId,
    title,
    description,
    selectedMeshIndexes,
    meshCatalog,
    availableMeshCount,
    filteredMeshCatalog,
    selectedMeshIndexSet,
    meshOwnersByIndex,
    selectedMeshSummary,
    saveError,
    saveSuccess,
    savePending,
    deletePending,
    isEditMode,
    tabOptions,
    resetForm,
    setActiveTab,
    handleRefresh,
    handleSelectPart: fillFormFromPart,
    handleMeshSearchChange: setMeshSearch,
    handleClearMeshSelection: () => {
      setSelectedMeshIndexes([]);
      clearPartFieldError(setFieldErrors, 'meshIndexes');
      setSaveError(null);
      setSaveSuccess(null);
    },
    handlePartIdChange: (value: string) => {
      setPartIdState(value);
      clearPartFieldError(setFieldErrors, 'partId');
    },
    handleTitleChange: (value: string) => {
      setTitleState(value);
      clearPartFieldError(setFieldErrors, 'title');
    },
    handleDescriptionChange: setDescriptionState,
    handleToggleMeshSelection,
    handleSave,
    handleDelete,
  };
};
