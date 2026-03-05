import type { ChangeEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import type { EquipmentExplosionSettings } from '@/entities/equipment';
import { AppButton } from '@/shared/ui';
import styles from '../AdminModelExplodeEditor.module.scss';

type ExplosionField = keyof EquipmentExplosionSettings;
type ExplosionFieldErrors = Partial<Record<ExplosionField, string>>;

interface FieldMetaItem {
  field: ExplosionField;
  label: string;
  step: number;
  min?: number;
  max?: number;
  hint: string;
}

interface Props {
  fieldMeta: FieldMetaItem[];
  settings: EquipmentExplosionSettings;
  fieldErrors: ExplosionFieldErrors;
  savePending: boolean;
  saveError: string | null;
  saveSuccess: string | null;
  error: string | null;
  onFieldChange: (field: ExplosionField) => (event: ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onSave: () => void;
}

export const AdminExplodeSettingsPanel = ({
  fieldMeta,
  settings,
  fieldErrors,
  savePending,
  saveError,
  saveSuccess,
  error,
  onFieldChange,
  onReset,
  onSave,
}: Props) => {
  return (
    <div className={styles.adminModelExplodeEditor__controlsCard}>
      <div className={styles.adminModelExplodeEditor__sectionHeader}>
        <h3 className={styles.adminModelExplodeEditor__title}>Параметры разлёта</h3>
      </div>

      <div className={styles.adminModelExplodeEditor__grid}>
        {fieldMeta.map((meta) => (
          <label key={meta.field} className={`${styles.adminModelExplodeEditor__field} ${fieldErrors[meta.field] ? styles.adminModelExplodeEditor__fieldInvalid : ''}`}>
            <span>{meta.label}</span>
            <input
              type="number"
              value={settings[meta.field]}
              onChange={onFieldChange(meta.field)}
              step={meta.step}
              min={meta.min}
              max={meta.max}
            />
            <small className={styles.adminModelExplodeEditor__fieldHint}>{meta.hint}</small>
            {fieldErrors[meta.field] ? <small className={styles.adminModelExplodeEditor__fieldError}>{fieldErrors[meta.field]}</small> : null}
          </label>
        ))}
      </div>

      <div className={styles.adminModelExplodeEditor__actions}>
        <AppButton
          variant="secondary"
          iconOnly
          className={styles.adminModelExplodeEditor__iconButton}
          onClick={onReset}
          disabled={savePending}
          title="Сбросить по умолчанию"
          aria-label="Сбросить параметры разлёта по умолчанию"
        >
          <RotateCcw size={16} aria-hidden="true" />
        </AppButton>
        <AppButton variant="primary" onClick={onSave} disabled={savePending}>
          {savePending ? 'Сохраняем...' : 'Сохранить параметры'}
        </AppButton>
      </div>

      {saveError ? <p className={styles.adminModelExplodeEditor__error}>{saveError}</p> : null}
      {saveSuccess ? <p className={styles.adminModelExplodeEditor__success}>{saveSuccess}</p> : null}
      {error ? <p className={styles.adminModelExplodeEditor__error}>{error}</p> : null}
    </div>
  );
};
