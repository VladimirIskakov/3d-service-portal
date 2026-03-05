import { type DragEvent, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { EquipmentPartInfo } from '@/entities/equipment';
import { updateAdminCatalogModelDisassembly } from './adminCatalogApi';
import {
  createStep,
  type EditableDisassemblyStep,
  getDisassemblyErrorMessage,
  isFiniteNumber,
  isValidStepId,
  moveItem,
  normalizeStepId,
} from './disassemblyEditor';

interface UseAdminDisassemblyStepActionsInput {
  modelSlug: string;
  steps: EditableDisassemblyStep[];
  setSteps: Dispatch<SetStateAction<EditableDisassemblyStep[]>>;
  selectedStepId: string | null;
  setSelectedStepId: Dispatch<SetStateAction<string | null>>;
  parts: EquipmentPartInfo[];
  partsById: Map<string, EquipmentPartInfo>;
  setSavePending: Dispatch<SetStateAction<boolean>>;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  setSaveSuccess: Dispatch<SetStateAction<string | null>>;
}

export const useAdminDisassemblyStepActions = ({
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
}: UseAdminDisassemblyStepActionsInput) => {
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);

  const resolveDefaultFocusMeshIndex = (partId: string | null) => {
    if (!partId) {
      return null;
    }

    const part = partsById.get(partId);
    if (!part || part.meshIndexes.length !== 1) {
      return null;
    }

    return part.meshIndexes[0];
  };

  const updateSelectedStep = (updater: (step: EditableDisassemblyStep) => EditableDisassemblyStep) => {
    if (!selectedStepId) {
      return;
    }

    let nextSelectedId = selectedStepId;
    setSteps((current) =>
      current.map((step) => {
        if (step.id !== selectedStepId) {
          return step;
        }

        const updatedStep = updater(step);
        if (updatedStep.id !== step.id) {
          nextSelectedId = updatedStep.id;
        }

        return updatedStep;
      }),
    );
    setSelectedStepId(nextSelectedId);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleStepPartChange = (nextPartId: string | null) => {
    updateSelectedStep((step) => {
      if (!nextPartId) {
        return {
          ...step,
          partId: null,
          focusMeshIndex: null,
        };
      }

      const defaultFocusMeshIndex = resolveDefaultFocusMeshIndex(nextPartId);

      return {
        ...step,
        partId: nextPartId,
        focusMeshIndex:
          step.partId === nextPartId
          && step.focusMeshIndex !== null
          && (partsById.get(nextPartId)?.meshIndexes.includes(step.focusMeshIndex) ?? false)
            ? step.focusMeshIndex
            : defaultFocusMeshIndex,
      };
    });
  };

  const handleFocusMeshChange = (nextValueRaw: string) => {
    const nextValue = nextValueRaw.trim();

    updateSelectedStep((step) => {
      if (!step.partId) {
        return {
          ...step,
          focusMeshIndex: null,
        };
      }

      if (!nextValue) {
        return {
          ...step,
          focusMeshIndex: null,
        };
      }

      const parsed = Number(nextValue);
      const part = partsById.get(step.partId);
      const valid = Number.isInteger(parsed) && (part?.meshIndexes.includes(parsed) ?? false);

      return {
        ...step,
        focusMeshIndex: valid ? parsed : null,
      };
    });
  };

  const handleCreateStep = () => {
    const nextStep = createStep(steps);
    setSteps((current) => [...current, nextStep]);
    setSelectedStepId(nextStep.id);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleDeleteStep = () => {
    if (!selectedStepId) {
      return;
    }

    const currentIndex = steps.findIndex((step) => step.id === selectedStepId);
    if (currentIndex === -1) {
      return;
    }

    const nextSteps = steps.filter((step) => step.id !== selectedStepId);
    setSteps(nextSteps);

    if (nextSteps.length === 0) {
      setSelectedStepId(null);
    } else if (currentIndex < nextSteps.length) {
      setSelectedStepId(nextSteps[currentIndex].id);
    } else {
      setSelectedStepId(nextSteps[nextSteps.length - 1].id);
    }

    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleStepDragStart = (stepId: string) => (event: DragEvent<HTMLButtonElement>) => {
    setDraggedStepId(stepId);
    setDragOverStepId(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', stepId);
  };

  const handleStepDragOver = (stepId: string) => (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!draggedStepId || draggedStepId === stepId) {
      setDragOverStepId(null);
      return;
    }

    setDragOverStepId(stepId);
    event.dataTransfer.dropEffect = 'move';
  };

  const handleStepDrop = (stepId: string) => (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const sourceId = draggedStepId ?? event.dataTransfer.getData('text/plain');
    setDraggedStepId(null);
    setDragOverStepId(null);

    if (!sourceId || sourceId === stepId) {
      return;
    }

    setSteps((current) => {
      const sourceIndex = current.findIndex((step) => step.id === sourceId);
      const targetIndex = current.findIndex((step) => step.id === stepId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return current;
      }
      return moveItem(current, sourceIndex, targetIndex);
    });
    setSelectedStepId(sourceId);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleStepDragEnd = () => {
    setDraggedStepId(null);
    setDragOverStepId(null);
  };

  const validateBeforeSave = () => {
    const usedIds = new Set<string>();
    const knownPartIds = new Set(parts.map((part) => part.id));

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const normalizedId = normalizeStepId(step.id, index);
      const title = step.title.trim();
      const description = step.description.trim();

      if (!isValidStepId(normalizedId)) {
        return `Шаг ${index + 1}: некорректный ID.`;
      }

      if (usedIds.has(normalizedId)) {
        return `Шаг ${index + 1}: ID должен быть уникальным.`;
      }

      usedIds.add(normalizedId);

      if (!title && !description) {
        return `Шаг ${index + 1}: заполните название или описание.`;
      }

      if (step.partId && !knownPartIds.has(step.partId)) {
        return `Шаг ${index + 1}: привязана несуществующая деталь.`;
      }

      if (step.partId && step.focusMeshIndex !== null) {
        const part = partsById.get(step.partId);
        if (!part || !part.meshIndexes.includes(step.focusMeshIndex)) {
          return `Шаг ${index + 1}: выбранный меш не принадлежит детали.`;
        }
      }

      const { cameraPreset } = step;
      if (
        !cameraPreset
        || cameraPreset.position.length !== 3
        || cameraPreset.target.length !== 3
        || !cameraPreset.position.every(isFiniteNumber)
        || !cameraPreset.target.every(isFiniteNumber)
        || !isFiniteNumber(cameraPreset.fov)
      ) {
        return `Шаг ${index + 1}: некорректные настройки камеры.`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateBeforeSave();
    if (validationError) {
      setSaveError(validationError);
      setSaveSuccess(null);
      return;
    }

    setSavePending(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const saved = await updateAdminCatalogModelDisassembly(modelSlug, {
        title: 'Разборка',
        steps: steps.map((step, index) => ({
          id: normalizeStepId(step.id, index),
          title: step.title.trim(),
          description: step.description.trim(),
          partId: step.partId,
          focusMeshIndex: step.partId ? step.focusMeshIndex : null,
          cameraPreset: {
            position: [
              Number(step.cameraPreset.position[0]),
              Number(step.cameraPreset.position[1]),
              Number(step.cameraPreset.position[2]),
            ],
            target: [0, 0, 0],
            fov: Number(step.cameraPreset.fov),
          },
        })),
      });

      const orderedSteps = [...saved.steps]
        .sort((a, b) => a.order - b.order)
        .map((step) => ({
          id: step.id,
          title: step.title,
          description: step.description,
          partId: step.partId,
          focusMeshIndex: step.focusMeshIndex ?? null,
          cameraPreset: step.cameraPreset,
        }));

      setSteps(orderedSteps);
      setSelectedStepId((current) => {
        if (current && orderedSteps.some((step) => step.id === current)) {
          return current;
        }
        return orderedSteps[0]?.id ?? null;
      });
      setSaveSuccess('Шаги разборки сохранены.');
    } catch (saveRequestError) {
      setSaveError(getDisassemblyErrorMessage(saveRequestError, 'save'));
    } finally {
      setSavePending(false);
    }
  };

  return {
    dragOverStepId,
    updateSelectedStep,
    handleStepPartChange,
    handleFocusMeshChange,
    handleCreateStep,
    handleDeleteStep,
    handleStepDragStart,
    handleStepDragOver,
    handleStepDrop,
    handleStepDragEnd,
    handleSave,
  };
};

