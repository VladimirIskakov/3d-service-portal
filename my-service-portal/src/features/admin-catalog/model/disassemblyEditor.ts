import type {
  EquipmentDisassemblyStep,
  EquipmentDisassemblyStepCameraPreset,
} from '@/entities/equipment';
import { AdminApiError } from '@/features/admin-auth';

export type EditableDisassemblyStep = Omit<EquipmentDisassemblyStep, 'order'>;

const STEP_ID_REGEX = /^[a-z0-9][a-z0-9-_]{0,79}$/;

export const DEFAULT_CAMERA_PRESET: EquipmentDisassemblyStepCameraPreset = {
  // position = [yawDeg, pitchDeg, distance]
  position: [45, 18, 3.2],
  target: [0, 0, 0],
  fov: 33,
};

export const DEFAULT_PREVIEW_POSE = {
  position: [2.8, 2.35, 3.1] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
  fov: 33,
};

const degToRad = (value: number) => (value * Math.PI) / 180;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getDisassemblyErrorMessage = (error: unknown, action: 'load' | 'save') => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'model_not_found':
      return 'Модель не найдена.';
    case 'validation_error':
      return action === 'save'
        ? 'Проверьте корректность шагов разборки.'
        : 'Некорректный ответ сервера.';
    case 'unauthorized':
      return 'Сессия администратора истекла. Войдите снова.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      return action === 'save'
        ? 'Не удалось сохранить шаги разборки.'
        : 'Не удалось загрузить шаги разборки.';
  }
};

export const normalizeStepId = (value: string, fallbackIndex: number) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || `step-${fallbackIndex + 1}`;
};

export const createStep = (steps: EditableDisassemblyStep[]): EditableDisassemblyStep => {
  const usedIds = new Set(steps.map((step) => step.id));
  let index = steps.length + 1;
  let nextId = `step-${index}`;

  while (usedIds.has(nextId)) {
    index += 1;
    nextId = `step-${index}`;
  }

  return {
    id: nextId,
    title: `Шаг ${index}`,
    description: '',
    partId: null,
    focusMeshIndex: null,
    cameraPreset: DEFAULT_CAMERA_PRESET,
  };
};

export const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= items.length
    || toIndex >= items.length
    || fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

export const isFiniteNumber = (value: number) => Number.isFinite(value);

export const buildPreviewPose = (
  step: EditableDisassemblyStep | null,
  partCentersById: Record<string, [number, number, number]>,
  meshCentersByIndex: Record<number, [number, number, number]>,
) => {
  if (!step) {
    return DEFAULT_PREVIEW_POSE;
  }

  const stepFov = Number.isFinite(step.cameraPreset.fov)
    ? clamp(step.cameraPreset.fov, 10, 90)
    : DEFAULT_PREVIEW_POSE.fov;

  const focusMeshCenter = step.focusMeshIndex !== null
    ? meshCentersByIndex[step.focusMeshIndex] ?? null
    : null;
  const partCenter = step.partId ? (partCentersById[step.partId] ?? null) : null;
  const targetCenter = focusMeshCenter ?? partCenter;

  if (targetCenter) {
    const [targetX, targetY, targetZ] = targetCenter;
    const yawDeg = Number(step.cameraPreset.position[0]);
    const pitchDeg = Number(step.cameraPreset.position[1]);
    const distanceRaw = Number(step.cameraPreset.position[2]);

    const yaw = degToRad(Number.isFinite(yawDeg) ? yawDeg : DEFAULT_CAMERA_PRESET.position[0]);
    const pitch = degToRad(Number.isFinite(pitchDeg) ? pitchDeg : DEFAULT_CAMERA_PRESET.position[1]);
    const distance = Number.isFinite(distanceRaw)
      ? Math.max(0.2, Math.abs(distanceRaw))
      : DEFAULT_CAMERA_PRESET.position[2];

    const cosPitch = Math.cos(pitch);
    const offsetX = distance * cosPitch * Math.sin(yaw);
    const offsetY = distance * Math.sin(pitch);
    const offsetZ = distance * cosPitch * Math.cos(yaw);

    return {
      position: [targetX + offsetX, targetY + offsetY, targetZ + offsetZ] as [number, number, number],
      target: [targetX, targetY, targetZ] as [number, number, number],
      fov: stepFov,
    };
  }

  return {
    position: step.cameraPreset.position,
    target: step.cameraPreset.target,
    fov: stepFov,
  };
};

export const isValidStepId = (value: string) => STEP_ID_REGEX.test(value);
