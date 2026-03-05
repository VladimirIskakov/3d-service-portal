import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { CameraControls } from '@react-three/drei';
import {
  DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS,
  DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS,
  type EquipmentExplosionSettings,
  type EquipmentPartInfo,
  type EquipmentPartSilhouetteSettings,
} from '@/entities/equipment';
import { AdminApiError } from '@/features/admin-auth';
import {
  getAdminCatalogModelBySlug,
  getAdminCatalogModelExplosionSettings,
  getAdminCatalogModelParts,
  updateAdminCatalogModelPart,
  updateAdminCatalogModelExplosionSettings,
} from './adminCatalogApi';
import {
  type ExplosionField,
  type ExplosionFieldErrors,
  getExplodeErrorMessage,
  parseNumericInput,
  type SilhouetteField,
  type SilhouetteFieldErrors,
  validateExplosionSettings,
  validateSilhouetteSettings,
} from './explodeEditorConfig';

interface UseAdminExplodeControllerInput {
  modelSlug: string;
}

export const useAdminExplodeController = ({ modelSlug }: UseAdminExplodeControllerInput) => {
  const controlsRef = useRef<CameraControls | null>(null);

  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<EquipmentExplosionSettings>(DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS);
  const [fieldErrors, setFieldErrors] = useState<ExplosionFieldErrors>({});
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [previewExploded, setPreviewExploded] = useState(true);
  const [selectedPart, setSelectedPart] = useState<EquipmentPartInfo | null>(null);
  const [silhouetteSettings, setSilhouetteSettings] = useState(DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS);
  const [silhouetteErrors, setSilhouetteErrors] = useState<SilhouetteFieldErrors>({});
  const [silhouetteSavePending, setSilhouetteSavePending] = useState(false);
  const [silhouetteSaveError, setSilhouetteSaveError] = useState<string | null>(null);
  const [silhouetteSaveSuccess, setSilhouetteSaveSuccess] = useState<string | null>(null);
  const [sceneRevision, setSceneRevision] = useState(0);
  const [silhouettePreviewOverride, setSilhouettePreviewOverride] = useState<
    Record<string, EquipmentPartSilhouetteSettings> | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setSaveError(null);
      setSaveSuccess(null);
      setFieldErrors({});
      setSelectedPart(null);
      setSilhouetteSettings(DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS);
      setSilhouetteErrors({});
      setSilhouetteSaveError(null);
      setSilhouetteSaveSuccess(null);
      setSilhouettePreviewOverride(null);

      try {
        const [model, explodeSettings] = await Promise.all([
          getAdminCatalogModelBySlug(modelSlug),
          getAdminCatalogModelExplosionSettings(modelSlug),
        ]);

        if (!isMounted) {
          return;
        }

        setModelUrl(model.assetUrl);
        setSettings(explodeSettings);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setModelUrl(null);
        setError(getExplodeErrorMessage(loadError, 'load'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [modelSlug]);

  useEffect(() => {
    if (!selectedPart) {
      setSilhouetteSettings(DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS);
      setSilhouetteErrors({});
      setSilhouetteSaveError(null);
      setSilhouetteSaveSuccess(null);
      setSilhouettePreviewOverride(null);
      return;
    }

    setSilhouetteSettings(selectedPart.silhouette ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS);
    setSilhouetteErrors({});
    setSilhouetteSaveError(null);
    setSilhouetteSaveSuccess(null);
    setSilhouettePreviewOverride({
      [selectedPart.id]: selectedPart.silhouette ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS,
    });
  }, [selectedPart]);

  const resetCamera = () => {
    void controlsRef.current?.reset(true);
  };

  const handleFieldChange = (field: ExplosionField) => (event: ChangeEvent<HTMLInputElement>) => {
    setSettings((current) => ({
      ...current,
      [field]: parseNumericInput(event.target.value, current[field]),
    }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError(null);
    setSaveSuccess(null);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS);
    setFieldErrors({});
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSaveSettings = async () => {
    const nextErrors = validateExplosionSettings(settings);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSaveError(null);
      setSaveSuccess(null);
      return;
    }

    setSavePending(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const saved = await updateAdminCatalogModelExplosionSettings(modelSlug, settings);
      setSettings(saved);
      setSaveSuccess('Параметры разлёта сохранены.');
    } catch (saveErr) {
      setSaveError(getExplodeErrorMessage(saveErr, 'save'));
    } finally {
      setSavePending(false);
    }
  };

  const handleSilhouetteChange = (field: SilhouetteField) => (event: ChangeEvent<HTMLInputElement>) => {
    setSilhouetteSettings((current) => {
      const next = {
        ...current,
        [field]: parseNumericInput(event.target.value, current[field]),
      };
      if (selectedPart) {
        setSilhouettePreviewOverride({ [selectedPart.id]: next });
      }
      return next;
    });
    setSilhouetteErrors((current) => ({ ...current, [field]: undefined }));
    setSilhouetteSaveError(null);
    setSilhouetteSaveSuccess(null);
  };

  const handleSilhouetteShowEdgesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSilhouetteSettings((current) => {
      const next = { ...current, showEdges: checked };
      if (selectedPart) {
        setSilhouettePreviewOverride({ [selectedPart.id]: next });
      }
      return next;
    });
    setSilhouetteSaveError(null);
    setSilhouetteSaveSuccess(null);
  };

  const handleResetSilhouette = () => {
    setSilhouetteSettings(DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS);
    if (selectedPart) {
      setSilhouettePreviewOverride({ [selectedPart.id]: DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS });
    }
    setSilhouetteErrors({});
    setSilhouetteSaveError(null);
    setSilhouetteSaveSuccess(null);
  };

  const handleSaveSilhouette = async () => {
    if (!selectedPart) {
      return;
    }

    const nextErrors = validateSilhouetteSettings(silhouetteSettings);
    setSilhouetteErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSilhouetteSaveError(null);
      setSilhouetteSaveSuccess(null);
      return;
    }

    setSilhouetteSavePending(true);
    setSilhouetteSaveError(null);
    setSilhouetteSaveSuccess(null);

    try {
      const freshParts = await getAdminCatalogModelParts(modelSlug);
      const actualPart = freshParts.find((part) => part.id === selectedPart.id) ?? selectedPart;

      const saved = await updateAdminCatalogModelPart(modelSlug, selectedPart.id, {
        title: actualPart.title,
        description: actualPart.description,
        meshIndexes: actualPart.meshIndexes,
        silhouette: silhouetteSettings,
      });

      setSelectedPart(saved);
      setSilhouetteSettings(saved.silhouette ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS);
      setSilhouettePreviewOverride({
        [saved.id]: saved.silhouette ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS,
      });
      setSilhouetteSaveSuccess('Параметры силуэта сохранены.');
      setSceneRevision((value) => value + 1);
    } catch (saveErrorValue) {
      const code = saveErrorValue instanceof AdminApiError ? saveErrorValue.code : '';
      if (code === 'part_not_found') {
        setSilhouetteSaveError('Деталь не найдена.');
      } else if (code === 'mesh_indexes_conflict') {
        setSilhouetteSaveError('Не удалось сохранить: изменился состав мешей детали.');
      } else if (code === 'unauthorized') {
        setSilhouetteSaveError('Сессия администратора истекла. Войдите снова.');
      } else if (code === 'network_error') {
        setSilhouetteSaveError('Нет соединения с API сервера.');
      } else {
        setSilhouetteSaveError('Не удалось сохранить параметры силуэта.');
      }
    } finally {
      setSilhouetteSavePending(false);
    }
  };

  return {
    controlsRef,
    modelUrl,
    hasAsset: Boolean(modelUrl),
    loading,
    error,
    settings,
    fieldErrors,
    savePending,
    saveError,
    saveSuccess,
    previewExploded,
    selectedPart,
    silhouetteSettings,
    silhouetteErrors,
    silhouetteSavePending,
    silhouetteSaveError,
    silhouetteSaveSuccess,
    sceneRevision,
    silhouettePreviewOverride,
    handleFieldChange,
    resetSettings,
    handleSaveSettings,
    setPreviewExploded,
    setSelectedPart,
    handleSilhouetteChange,
    handleSilhouetteShowEdgesChange,
    handleResetSilhouette,
    handleSaveSilhouette,
    resetCamera,
  };
};
