import type { DragEvent } from 'react';
import { AppButton } from '@/shared/ui';
import type { EditableDisassemblyStep } from '../../model/disassemblyEditor';
import styles from '../AdminModelDisassemblyEditor.module.scss';

interface Props {
  loading: boolean;
  savePending: boolean;
  error: string | null;
  steps: EditableDisassemblyStep[];
  selectedStepId: string | null;
  dragOverStepId: string | null;
  onCreateStep: () => void;
  onSelectStep: (stepId: string) => void;
  onStepDragStart: (stepId: string) => (event: DragEvent<HTMLButtonElement>) => void;
  onStepDragOver: (stepId: string) => (event: DragEvent<HTMLButtonElement>) => void;
  onStepDrop: (stepId: string) => (event: DragEvent<HTMLButtonElement>) => void;
  onStepDragEnd: () => void;
}

export const AdminDisassemblyStepList = ({
  loading,
  savePending,
  error,
  steps,
  selectedStepId,
  dragOverStepId,
  onCreateStep,
  onSelectStep,
  onStepDragStart,
  onStepDragOver,
  onStepDrop,
  onStepDragEnd,
}: Props) => {
  return (
    <div className={styles.adminModelDisassemblyEditor__listPane}>
      <div className={styles.adminModelDisassemblyEditor__topActions}>
        <AppButton
          variant="secondary"
          onClick={onCreateStep}
          disabled={loading || savePending}
        >
          Новый шаг
        </AppButton>
      </div>

      <p className={styles.adminModelDisassemblyEditor__helperText}>Порядок шагов меняется перетаскиванием.</p>

      {error ? <p className={styles.adminModelDisassemblyEditor__error}>{error}</p> : null}

      <div className={styles.adminModelDisassemblyEditor__list}>
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`${styles.adminModelDisassemblyEditor__listItem} ${selectedStepId === step.id ? styles.adminModelDisassemblyEditor__listItemActive : ''} ${
              dragOverStepId === step.id ? styles.adminModelDisassemblyEditor__listItemDragOver : ''
            }`}
            onClick={() => onSelectStep(step.id)}
            draggable={steps.length > 1}
            onDragStart={onStepDragStart(step.id)}
            onDragOver={onStepDragOver(step.id)}
            onDrop={onStepDrop(step.id)}
            onDragEnd={onStepDragEnd}
          >
            <span className={styles.adminModelDisassemblyEditor__listItemOrder}>Шаг {index + 1}</span>
            <span className={styles.adminModelDisassemblyEditor__listItemTitle}>{step.title || 'Без названия'}</span>
            <span className={styles.adminModelDisassemblyEditor__listItemMeta}>{step.partId ? `Деталь: ${step.partId}` : 'Без привязки'}</span>
          </button>
        ))}

        {!loading && steps.length === 0 ? (
          <div className={styles.adminModelDisassemblyEditor__emptyList}>Шаги не добавлены.</div>
        ) : null}
      </div>
    </div>
  );
};
