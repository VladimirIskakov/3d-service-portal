import type {
  EquipmentDisassemblyProcedure,
  EquipmentDisassemblyStep,
  EquipmentDisassemblyStepCameraPreset,
  EquipmentModelInfo,
  EquipmentPreviewCameraSettings,
} from '@/entities/equipment';
import { buildApiUrl } from '@/entities/equipment';
import type { CatalogDisassemblyResponse, CatalogModelItemPayload } from './types';

const toFiniteOr = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export const mapCatalogItem = (item: CatalogModelItemPayload): EquipmentModelInfo => {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    visibility: item.visibility,
    categoryId: item.categoryId,
    categoryTitle: item.categoryTitle,
    hasAsset: item.hasAsset,
    assetUrl: item.assetPath ? buildApiUrl(item.assetPath) : null,
    previewKind: item.previewKind,
    previewUrl: item.previewPath ? buildApiUrl(item.previewPath) : null,
    previewCamera: {
      position: Array.isArray(item.previewCamera?.position)
        ? [
            toFiniteOr(item.previewCamera.position[0], 2.8),
            toFiniteOr(item.previewCamera.position[1], 2.35),
            toFiniteOr(item.previewCamera.position[2], 3.1),
          ]
        : [2.8, 2.35, 3.1],
      fov: toFiniteOr(item.previewCamera?.fov, 33),
    },
    deviceDescription: item.deviceDescription ?? '',
    specifications: Array.isArray(item.specifications) ? item.specifications : [],
  };
};

const mapDisassemblyCameraPreset = (
  cameraPreset: NonNullable<CatalogDisassemblyResponse['item']['steps']>[number]['cameraPreset'] | undefined,
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

const mapDisassemblyStep = (
  step: NonNullable<CatalogDisassemblyResponse['item']['steps']>[number],
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
    cameraPreset: mapDisassemblyCameraPreset(step.cameraPreset),
  };
};

export const mapDisassemblyProcedure = (item: CatalogDisassemblyResponse['item']): EquipmentDisassemblyProcedure => {
  return {
    id: item.id,
    modelSlug: item.modelSlug,
    title: item.title ?? '',
    steps: Array.isArray(item.steps)
      ? item.steps.map((step, index) => mapDisassemblyStep(step, index))
      : [],
  };
};

export const mapPreviewCamera = (
  item: Partial<EquipmentPreviewCameraSettings> | null | undefined,
): EquipmentPreviewCameraSettings => {
  return {
    position: Array.isArray(item?.position)
      ? [
          toFiniteOr(item.position[0], 2.8),
          toFiniteOr(item.position[1], 2.35),
          toFiniteOr(item.position[2], 3.1),
        ]
      : [2.8, 2.35, 3.1],
    fov: toFiniteOr(item?.fov, 33),
  };
};

