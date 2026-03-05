import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { EquipmentPreviewCanvas, type EquipmentPreviewCameraSettings } from '@/entities/equipment';
import { AdminApiError } from '@/features/admin-auth';
import { AppButton } from '@/shared/ui';
import {
  getAdminCatalogModelBySlug,
  getAdminCatalogModelPreviewCamera,
  updateAdminCatalogModelPreviewCamera,
} from '../model/adminCatalogApi';
import styles from './AdminModelPreviewCameraEditor.module.scss';

interface Props {
  modelSlug: string;
}

type CameraField = 'x' | 'y' | 'z' | 'fov';
type CameraFieldErrors = Partial<Record<CameraField, string>>;

const DEFAULT_PREVIEW_CAMERA: EquipmentPreviewCameraSettings = {
  position: [2.8, 2.35, 3.1],
  fov: 33,
};

const toFinite = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getPreviewCameraErrorMessage = (error: unknown, action: 'load' | 'save') => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'model_not_found':
      return 'Модель не найдена.';
    case 'validation_error':
      return 'Проверьте значения камеры превью.';
    case 'unauthorized':
      return 'Сессия администратора истекла. Войдите снова.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      return action === 'save'
        ? 'Не удалось сохранить настройки камеры превью.'
        : 'Не удалось загрузить настройки камеры превью.';
  }
};

const validatePreviewCamera = (settings: EquipmentPreviewCameraSettings): CameraFieldErrors => {
  const errors: CameraFieldErrors = {};
  const [x, y, z] = settings.position;

  if (!Number.isFinite(x) || x < -30 || x > 30) {
    errors.x = 'Диапазон: -30..30';
  }
  if (!Number.isFinite(y) || y < -30 || y > 30) {
    errors.y = 'Диапазон: -30..30';
  }
  if (!Number.isFinite(z) || z < -30 || z > 30) {
    errors.z = 'Диапазон: -30..30';
  }
  if (!Number.isFinite(settings.fov) || settings.fov < 10 || settings.fov > 90) {
    errors.fov = 'Диапазон: 10..90';
  }

  return errors;
};

export const AdminModelPreviewCameraEditor = ({ modelSlug }: Props) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CameraFieldErrors>({});

  const [previewKind, setPreviewKind] = useState<'model' | 'image' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraSettings, setCameraSettings] = useState<EquipmentPreviewCameraSettings>(DEFAULT_PREVIEW_CAMERA);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setSaveError(null);
      setSaveSuccess(null);
      setFieldErrors({});

      try {
        const [model, previewCamera] = await Promise.all([
          getAdminCatalogModelBySlug(modelSlug),
          getAdminCatalogModelPreviewCamera(modelSlug),
        ]);

        if (!isMounted) {
          return;
        }

        setPreviewKind(model.previewKind);
        setPreviewUrl(model.previewUrl);
        setCameraSettings(previewCamera);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPreviewKind(null);
        setPreviewUrl(null);
        setCameraSettings(DEFAULT_PREVIEW_CAMERA);
        setLoadError(getPreviewCameraErrorMessage(error, 'load'));
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

  const canPreview3d = previewKind === 'model' && Boolean(previewUrl);
  const canPreviewImage = previewKind === 'image' && Boolean(previewUrl);

  const fields = useMemo(
    () => [
      { key: 'x' as const, label: 'Позиция X', step: 0.1, value: cameraSettings.position[0] },
      { key: 'y' as const, label: 'Позиция Y', step: 0.1, value: cameraSettings.position[1] },
      { key: 'z' as const, label: 'Позиция Z', step: 0.1, value: cameraSettings.position[2] },
      { key: 'fov' as const, label: 'FOV', step: 1, value: cameraSettings.fov },
    ],
    [cameraSettings],
  );

  const handleFieldChange = (field: CameraField) => (event: ChangeEvent<HTMLInputElement>) => {
    setCameraSettings((current) => {
      if (field === 'fov') {
        return { ...current, fov: toFinite(event.target.value, current.fov) };
      }

      const nextPosition = [...current.position] as [number, number, number];
      const index = field === 'x' ? 0 : field === 'y' ? 1 : 2;
      nextPosition[index] = toFinite(event.target.value, nextPosition[index]);
      return { ...current, position: nextPosition };
    });

    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleReset = () => {
    setCameraSettings(DEFAULT_PREVIEW_CAMERA);
    setFieldErrors({});
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    const nextErrors = validatePreviewCamera(cameraSettings);
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
      const saved = await updateAdminCatalogModelPreviewCamera(modelSlug, cameraSettings);
      setCameraSettings(saved);
      setSaveSuccess('Настройки камеры превью сохранены.');
    } catch (error) {
      setSaveError(getPreviewCameraErrorMessage(error, 'save'));
    } finally {
      setSavePending(false);
    }
  };

  return (
    <div className={styles.adminModelPreviewCameraEditor__root}>
      <div className={styles.adminModelPreviewCameraEditor__layout}>
        <div className={styles.adminModelPreviewCameraEditor__controlsCard}>
          <div className={styles.adminModelPreviewCameraEditor__sectionHeader}>
            <div>
              <h3 className={styles.adminModelPreviewCameraEditor__title}>Настройки превью</h3>
              <p className={styles.adminModelPreviewCameraEditor__subtitle}>Положение камеры для карточки каталога с 3D-превью.</p>
            </div>
          </div>

          <div className={styles.adminModelPreviewCameraEditor__grid}>
            {fields.map((field) => (
              <label key={field.key} className={`${styles.adminModelPreviewCameraEditor__field} ${fieldErrors[field.key] ? styles.adminModelPreviewCameraEditor__fieldInvalid : ''}`}>
                <span>{field.label}</span>
                <input
                  type="number"
                  value={field.value}
                  onChange={handleFieldChange(field.key)}
                  step={field.step}
                />
                {fieldErrors[field.key] ? <small className={styles.adminModelPreviewCameraEditor__fieldError}>{fieldErrors[field.key]}</small> : null}
              </label>
            ))}
          </div>

          <div className={styles.adminModelPreviewCameraEditor__actions}>
            <AppButton
              variant="secondary"
              iconOnly
              className={styles.adminModelPreviewCameraEditor__iconButton}
              onClick={handleReset}
              disabled={savePending}
              title="Сбросить по умолчанию"
              aria-label="Сбросить настройки камеры превью по умолчанию"
            >
              <RotateCcw size={16} aria-hidden="true" />
            </AppButton>
            <AppButton variant="primary" onClick={() => void handleSave()} disabled={savePending || loading}>
              {savePending ? 'Сохранение...' : 'Сохранить настройки'}
            </AppButton>
          </div>

          {loadError ? <p className={styles.adminModelPreviewCameraEditor__error}>{loadError}</p> : null}
          {saveError ? <p className={styles.adminModelPreviewCameraEditor__error}>{saveError}</p> : null}
          {saveSuccess ? <p className={styles.adminModelPreviewCameraEditor__success}>{saveSuccess}</p> : null}
        </div>

        <div className={styles.adminModelPreviewCameraEditor__previewCard}>
          <div className={styles.adminModelPreviewCameraEditor__sectionHeader}>
            <div>
              <h3 className={styles.adminModelPreviewCameraEditor__title}>Предпросмотр карточки</h3>
              <p className={styles.adminModelPreviewCameraEditor__subtitle}>Изменения применяются к 3D-превью в каталоге.</p>
            </div>
          </div>

          <div className={styles.adminModelPreviewCameraEditor__previewWrap}>
            <div className={styles.adminModelPreviewCameraEditor__previewStage}>
              <div
                className={`${styles.adminModelPreviewCameraEditor__previewFrame} ${
                  canPreview3d && previewUrl ? styles.adminModelPreviewCameraEditor__previewFrameCanvas : ''
                }`}
              >
                {loading ? (
                  <div className={styles.adminModelPreviewCameraEditor__previewPlaceholder}>Загрузка превью...</div>
                ) : canPreview3d && previewUrl ? (
                  <EquipmentPreviewCanvas modelUrl={previewUrl} cameraSettings={cameraSettings} />
                ) : canPreviewImage && previewUrl ? (
                  <img className={styles.adminModelPreviewCameraEditor__previewImage} src={previewUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <div className={styles.adminModelPreviewCameraEditor__previewPlaceholder}>
                    Настройка камеры доступна только для карточек с 3D-превью.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


