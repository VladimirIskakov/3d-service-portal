import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { EquipmentModelSpecificationItem } from '@/entities/equipment';
import { AdminApiError } from '@/features/admin-auth';
import { AppButton } from '@/shared/ui';
import {
  getAdminCatalogModelContent,
  updateAdminCatalogModelContent,
} from '../model/adminCatalogApi';
import styles from './AdminModelContentEditor.module.scss';

interface Props {
  modelSlug: string;
}

type SpecDraft = EquipmentModelSpecificationItem;

const createSpecDraft = (index: number): SpecDraft => ({
  id: `spec-${Date.now()}-${index}`,
  label: '',
  value: '',
});

const getContentErrorMessage = (error: unknown, action: 'load' | 'save') => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'model_not_found':
      return 'Модель не найдена.';
    case 'unauthorized':
      return 'Сессия администратора истекла. Войдите снова.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      return action === 'save'
        ? 'Не удалось сохранить подробное описание модели.'
        : 'Не удалось загрузить подробное описание модели.';
  }
};

const normalizeSpecifications = (items: SpecDraft[]): EquipmentModelSpecificationItem[] => {
  return items
    .map((item) => ({
      id: item.id,
      label: item.label.trim(),
      value: item.value.trim(),
    }))
    .filter((item) => item.label.length > 0 || item.value.length > 0);
};

export const AdminModelContentEditor = ({ modelSlug }: Props) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [deviceDescription, setDeviceDescription] = useState('');
  const [specs, setSpecs] = useState<SpecDraft[]>([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setSaveError(null);
      setSaveSuccess(null);

      try {
        const content = await getAdminCatalogModelContent(modelSlug);
        if (!isMounted) {
          return;
        }

        setDeviceDescription(content.deviceDescription ?? '');
        setSpecs((content.specifications ?? []).map((item, index) => ({
          id: item.id || `spec-${index + 1}`,
          label: item.label ?? '',
          value: item.value ?? '',
        })));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDeviceDescription('');
        setSpecs([]);
        setLoadError(getContentErrorMessage(error, 'load'));
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

  const specsCountLabel = useMemo(() => {
    const normalized = normalizeSpecifications(specs);
    return `${normalized.length} характеристик`;
  }, [specs]);

  const addSpec = () => {
    setSpecs((current) => [...current, createSpecDraft(current.length)]);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const removeSpec = (id: string) => {
    setSpecs((current) => current.filter((item) => item.id !== id));
    setSaveError(null);
    setSaveSuccess(null);
  };

  const updateSpec = (id: string, field: 'label' | 'value', value: string) => {
    setSpecs((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    setSavePending(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const payload = {
        deviceDescription: deviceDescription.trim(),
        specifications: normalizeSpecifications(specs),
      };

      const saved = await updateAdminCatalogModelContent(modelSlug, payload);
      setDeviceDescription(saved.deviceDescription ?? '');
      setSpecs((saved.specifications ?? []).map((item, index) => ({
        id: item.id || `spec-${index + 1}`,
        label: item.label ?? '',
        value: item.value ?? '',
      })));
      setSaveSuccess('Подробное описание и характеристики сохранены.');
    } catch (error) {
      setSaveError(getContentErrorMessage(error, 'save'));
    } finally {
      setSavePending(false);
    }
  };

  return (
    <div className={styles.adminModelContentEditor__root}>
      <div className={styles.adminModelContentEditor__card}>
        <div className={styles.adminModelContentEditor__header}>
          <div>
            <h3 className={styles.adminModelContentEditor__title}>Контент модели</h3>
            <p className={styles.adminModelContentEditor__subtitle}>Здесь задается подробное описание для страницы модели и характеристики устройства.</p>
          </div>
          <AppButton variant="primary" onClick={() => void handleSave()} disabled={savePending || loading}>
            {savePending ? 'Сохранение...' : 'Сохранить'}
          </AppButton>
        </div>

        <p className={styles.adminModelContentEditor__notice}>
          Краткое описание для карточки справочника редактируется в основной админке. Здесь — контент страницы модели.
        </p>

        <label className={styles.adminModelContentEditor__field}>
          <span>Описание устройства</span>
          <textarea
            value={deviceDescription}
            onChange={(event) => {
              setDeviceDescription(event.target.value);
              setSaveError(null);
              setSaveSuccess(null);
            }}
            rows={6}
            placeholder="Подробное описание устройства, назначения и особенностей модели"
            disabled={loading}
          />
        </label>

        <div className={styles.adminModelContentEditor__specsSection}>
          <div className={styles.adminModelContentEditor__specsHeader}>
            <div>
              <h4>Характеристики</h4>
              <p>{specsCountLabel}</p>
            </div>
            <AppButton variant="secondary" onClick={addSpec} disabled={loading}>
              <Plus size={16} aria-hidden="true" />
              <span>Добавить</span>
            </AppButton>
          </div>

          <div className={styles.adminModelContentEditor__specsList}>
            {loading ? (
              <div className={styles.adminModelContentEditor__emptyState}>Загрузка контента...</div>
            ) : specs.length === 0 ? (
              <div className={styles.adminModelContentEditor__emptyState}>Характеристики пока не добавлены.</div>
            ) : (
              specs.map((spec) => (
                <div key={spec.id} className={styles.adminModelContentEditor__specRow}>
                  <input
                    type="text"
                    value={spec.label}
                    onChange={(event) => updateSpec(spec.id, 'label', event.target.value)}
                    placeholder="Название характеристики"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(event) => updateSpec(spec.id, 'value', event.target.value)}
                    placeholder="Значение"
                  />
                  <AppButton
                    variant="ghost"
                    iconOnly
                    className={styles.adminModelContentEditor__iconButton}
                    onClick={() => removeSpec(spec.id)}
                    title="Удалить характеристику"
                    aria-label="Удалить характеристику"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </AppButton>
                </div>
              ))
            )}
          </div>
        </div>

        {loadError ? <p className={styles.adminModelContentEditor__error}>{loadError}</p> : null}
        {saveError ? <p className={styles.adminModelContentEditor__error}>{saveError}</p> : null}
        {saveSuccess ? <p className={styles.adminModelContentEditor__success}>{saveSuccess}</p> : null}
      </div>
    </div>
  );
};


