import { type RefObject } from 'react';
import { CameraControls } from '@react-three/drei';
import type {
  EquipmentExplosionSettings,
  EquipmentPartInfo,
} from '@/entities/equipment';
import { AppButton, AppSelect } from '@/shared/ui';
import type { EditableDisassemblyStep } from '../../model/disassemblyEditor';
import { AdminDisassemblyPreview } from './AdminDisassemblyPreview';
import styles from '../AdminModelDisassemblyEditor.module.scss';

interface Props {
  modelSlug: string;
  loading: boolean;
  savePending: boolean;
  selectedStep: EditableDisassemblyStep | null;
  partOptions: Array<{ id: string; title: string }>;
  selectedStepFocusMeshOptions: number[];
  getMeshOptionLabel: (meshIndex: number) => string;
  onDeleteStep: () => void;
  onUpdateStep: (updater: (step: EditableDisassemblyStep) => EditableDisassemblyStep) => void;
  onStepPartChange: (partId: string | null) => void;
  onFocusMeshChange: (nextValue: string) => void;
  modelUrl: string | null;
  modelUrlLoading: boolean;
  previewExplodedPartIds: string[] | null;
  explosionSettings: EquipmentExplosionSettings;
  previewPose: { position: [number, number, number]; target: [number, number, number]; fov: number };
  controlsRef: RefObject<CameraControls | null>;
  onSelectPreviewPart: (part: EquipmentPartInfo | null) => void;
  onPartCentersComputed: (value: Record<string, [number, number, number]>) => void;
  onMeshCentersComputed: (value: Record<number, [number, number, number]>) => void;
}

export const AdminDisassemblyStepForm = ({
  modelSlug,
  loading,
  savePending,
  selectedStep,
  partOptions,
  selectedStepFocusMeshOptions,
  getMeshOptionLabel,
  onDeleteStep,
  onUpdateStep,
  onStepPartChange,
  onFocusMeshChange,
  modelUrl,
  modelUrlLoading,
  previewExplodedPartIds,
  explosionSettings,
  previewPose,
  controlsRef,
  onSelectPreviewPart,
  onPartCentersComputed,
  onMeshCentersComputed,
}: Props) => {
  if (!selectedStep) {
    return (
      <div className={styles.adminModelDisassemblyEditor__placeholder}>
        Выберите шаг или создайте новый, чтобы настроить разборку.
      </div>
    );
  }

  return (
    <>
      <div className={styles.adminModelDisassemblyEditor__stepHeader}>
        <h4 className={styles.adminModelDisassemblyEditor__stepTitle}>Настройки шага</h4>
        <div className={styles.adminModelDisassemblyEditor__stepActions}>
          <AppButton
            variant="danger"
            onClick={onDeleteStep}
            disabled={loading || savePending}
          >
            Удалить
          </AppButton>
        </div>
      </div>

      <div className={styles.adminModelDisassemblyEditor__formGrid}>
        <label className={styles.adminModelDisassemblyEditor__field}>
          <span>ID шага</span>
          <input
            type="text"
            value={selectedStep.id}
            onChange={(event) =>
              onUpdateStep((step) => ({ ...step, id: event.target.value }))
            }
            placeholder="step-1"
            disabled={loading || savePending}
          />
        </label>

        <label className={styles.adminModelDisassemblyEditor__field}>
          <span>Название шага</span>
          <input
            type="text"
            value={selectedStep.title}
            onChange={(event) =>
              onUpdateStep((step) => ({ ...step, title: event.target.value }))
            }
            placeholder="Снять верхнюю крышку"
            disabled={loading || savePending}
          />
        </label>

        <label className={styles.adminModelDisassemblyEditor__field}>
          <span>Деталь шага</span>
          <AppSelect
            value={selectedStep.partId ?? ''}
            onChange={(event) => onStepPartChange(event.target.value || null)}
            disabled={loading || savePending}
          >
            <option value="">Не привязывать</option>
            {partOptions.map((part) => (
              <option key={part.id} value={part.id}>
                {part.title} ({part.id})
              </option>
            ))}
          </AppSelect>
        </label>

        <label className={styles.adminModelDisassemblyEditor__field}>
          <span>Меш фокусировки</span>
          <AppSelect
            value={selectedStep.focusMeshIndex !== null ? String(selectedStep.focusMeshIndex) : ''}
            onChange={(event) => onFocusMeshChange(event.target.value)}
            disabled={loading || savePending || !selectedStep.partId}
          >
            <option value="">Центр детали</option>
            {selectedStepFocusMeshOptions.map((meshIndex) => (
              <option key={meshIndex} value={meshIndex}>
                {getMeshOptionLabel(meshIndex)}
              </option>
            ))}
          </AppSelect>
        </label>

        <label className={styles.adminModelDisassemblyEditor__field}>
          <span>Описание шага</span>
          <textarea
            value={selectedStep.description}
            onChange={(event) =>
              onUpdateStep((step) => ({ ...step, description: event.target.value }))
            }
            rows={4}
            placeholder="Что нужно сделать на этом шаге."
            disabled={loading || savePending}
          />
        </label>

        <div className={styles.adminModelDisassemblyEditor__cameraGrid}>
          <label className={styles.adminModelDisassemblyEditor__field}>
            <span>Угол горизонтали (°)</span>
            <input
              type="number"
              value={selectedStep.cameraPreset.position[0]}
              onChange={(event) =>
                onUpdateStep((step) => ({
                  ...step,
                  cameraPreset: {
                    ...step.cameraPreset,
                    position: [
                      Number(event.target.value),
                      step.cameraPreset.position[1],
                      step.cameraPreset.position[2],
                    ],
                    target: [0, 0, 0],
                  },
                }))
              }
              step={1}
              min={-360}
              max={360}
              disabled={loading || savePending}
            />
          </label>

          <label className={styles.adminModelDisassemblyEditor__field}>
            <span>Угол вертикали (°)</span>
            <input
              type="number"
              value={selectedStep.cameraPreset.position[1]}
              onChange={(event) =>
                onUpdateStep((step) => ({
                  ...step,
                  cameraPreset: {
                    ...step.cameraPreset,
                    position: [
                      step.cameraPreset.position[0],
                      Number(event.target.value),
                      step.cameraPreset.position[2],
                    ],
                    target: [0, 0, 0],
                  },
                }))
              }
              step={1}
              min={-89}
              max={89}
              disabled={loading || savePending}
            />
          </label>

          <label className={styles.adminModelDisassemblyEditor__field}>
            <span>Дистанция</span>
            <input
              type="number"
              value={selectedStep.cameraPreset.position[2]}
              onChange={(event) =>
                onUpdateStep((step) => ({
                  ...step,
                  cameraPreset: {
                    ...step.cameraPreset,
                    position: [
                      step.cameraPreset.position[0],
                      step.cameraPreset.position[1],
                      Number(event.target.value),
                    ],
                    target: [0, 0, 0],
                  },
                }))
              }
              step={0.1}
              min={0.2}
              max={100}
              disabled={loading || savePending}
            />
          </label>

          <label className={styles.adminModelDisassemblyEditor__field}>
            <span>FOV</span>
            <input
              type="number"
              value={selectedStep.cameraPreset.fov}
              onChange={(event) =>
                onUpdateStep((step) => ({
                  ...step,
                  cameraPreset: {
                    ...step.cameraPreset,
                    fov: Number(event.target.value),
                  },
                }))
              }
              step={1}
              min={10}
              max={90}
              disabled={loading || savePending}
            />
          </label>
        </div>
      </div>

      <AdminDisassemblyPreview
        modelSlug={modelSlug}
        modelUrl={modelUrl}
        modelUrlLoading={modelUrlLoading}
        previewExplodedPartIds={previewExplodedPartIds}
        explosionSettings={explosionSettings}
        selectedPartId={selectedStep.partId ?? null}
        previewPose={previewPose}
        controlsRef={controlsRef}
        onSelectPart={onSelectPreviewPart}
        onPartCentersComputed={onPartCentersComputed}
        onMeshCentersComputed={onMeshCentersComputed}
      />
    </>
  );
};
