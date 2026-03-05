import { requestEquipmentApi } from './api';
import type {
  EquipmentDisassemblyProcedure,
  EquipmentDisassemblyStep,
  EquipmentDisassemblyStepCameraPreset,
} from './types';

interface DisassemblyResponse {
  item: {
    id: string;
    modelSlug: string;
    title: string;
    steps?: Array<{
      id: string;
      title: string;
      description: string;
      partId: string | null;
      focusMeshIndex?: number | null;
      order?: number;
      cameraPreset?: {
        position?: [number, number, number];
        target?: [number, number, number];
        fov?: number;
      };
    }>;
  };
}

const toFiniteOr = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const mapCameraPreset = (
  cameraPreset: NonNullable<DisassemblyResponse['item']['steps']>[number]['cameraPreset'] | undefined,
): EquipmentDisassemblyStepCameraPreset => {
  return {
    position: Array.isArray(cameraPreset?.position)
      ? [
          toFiniteOr(cameraPreset.position[0], 45),
          toFiniteOr(cameraPreset.position[1], 18),
          toFiniteOr(cameraPreset.position[2], 3.2),
        ]
      : [45, 18, 3.2],
    target: Array.isArray(cameraPreset?.target)
      ? [
          toFiniteOr(cameraPreset.target[0], 0),
          toFiniteOr(cameraPreset.target[1], 0),
          toFiniteOr(cameraPreset.target[2], 0),
        ]
      : [0, 0, 0],
    fov: toFiniteOr(cameraPreset?.fov, 33),
  };
};

const mapStep = (
  step: NonNullable<DisassemblyResponse['item']['steps']>[number],
  index: number,
): EquipmentDisassemblyStep => {
  return {
    id: step.id,
    title: step.title ?? '',
    description: step.description ?? '',
    partId: typeof step.partId === 'string' && step.partId.trim() ? step.partId : null,
    focusMeshIndex: Number.isInteger(step.focusMeshIndex) && Number(step.focusMeshIndex) >= 0
      ? Number(step.focusMeshIndex)
      : null,
    order: typeof step.order === 'number' && Number.isFinite(step.order) ? step.order : index,
    cameraPreset: mapCameraPreset(step.cameraPreset),
  };
};

export const getEquipmentModelDisassembly = async (slug: string): Promise<EquipmentDisassemblyProcedure> => {
  const response = await requestEquipmentApi<DisassemblyResponse>(
    `/api/catalog/models/${encodeURIComponent(slug)}/disassembly`,
  );

  const steps = Array.isArray(response.item.steps)
    ? response.item.steps.map((step, index) => mapStep(step, index))
    : [];

  return {
    id: response.item.id,
    modelSlug: response.item.modelSlug,
    title: response.item.title,
    steps,
  };
};
