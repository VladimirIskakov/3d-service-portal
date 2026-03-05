import type { Dispatch, SetStateAction } from 'react';
import type {
  EquipmentPartInfo,
  EquipmentPartSilhouetteSettings,
} from '@/entities/equipment';
import { AdminApiError } from '@/features/admin-auth';

export type PartField =
  | 'partId'
  | 'title'
  | 'meshIndexes'
  | 'silhouetteOpacity'
  | 'silhouetteEdgeThresholdAngle';

export type PartFieldErrors = Partial<Record<PartField, string>>;

export type EditorTab = 'preview' | 'content' | 'parts' | 'explode' | 'disassembly';

const PART_ID_REGEX = /^[a-z0-9][a-z0-9-_]{0,79}$/;

export const getPartActionErrorMessage = (error: unknown, action: 'save' | 'delete' | 'load') => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'validation_error':
      return 'Проверь поля детали.';
    case 'mesh_indexes_conflict':
      return 'Некоторые меши уже привязаны к другим деталям.';
    case 'model_not_found':
      return 'Модель не найдена.';
    case 'part_not_found':
      return 'Деталь не найдена.';
    case 'unauthorized':
      return 'Сессия администратора истекла. Войдите снова.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      if (action === 'delete') {
        return 'Не удалось удалить деталь.';
      }
      if (action === 'load') {
        return 'Не удалось загрузить детали модели.';
      }
      return 'Не удалось сохранить деталь.';
  }
};

export const getMeshCatalogErrorMessage = (error: unknown) => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'model_not_found':
      return 'Модель не найдена.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      return 'Не удалось загрузить список мешей модели.';
  }
};

export const validatePartForm = (input: {
  partId: string;
  title: string;
  meshIndexes: number[];
  silhouette: EquipmentPartSilhouetteSettings;
}): {
  errors: PartFieldErrors;
  meshIndexes: number[];
  silhouette: EquipmentPartSilhouetteSettings;
} => {
  const errors: PartFieldErrors = {};
  const partId = input.partId.trim().toLowerCase();
  const title = input.title.trim();
  const meshIndexes = Array.from(
    new Set(input.meshIndexes.filter((value) => Number.isInteger(value) && value >= 0)),
  ).sort((a, b) => a - b);
  const silhouette = {
    opacity: input.silhouette.opacity,
    edgeThresholdAngle: input.silhouette.edgeThresholdAngle,
    showEdges: Boolean(input.silhouette.showEdges),
  };

  if (!partId) {
    errors.partId = 'Укажи ID детали.';
  } else if (!PART_ID_REGEX.test(partId)) {
    errors.partId = 'Только a-z, 0-9, дефис и _. Начинать с буквы или цифры.';
  }

  if (title.length < 2) {
    errors.title = 'Название детали должно быть не короче 2 символов.';
  }

  if (meshIndexes.length === 0) {
    errors.meshIndexes = 'Выбери хотя бы один меш.';
  }

  if (!Number.isFinite(silhouette.opacity) || silhouette.opacity < 0 || silhouette.opacity > 1) {
    errors.silhouetteOpacity = 'Диапазон: 0..1';
  }

  if (
    !Number.isFinite(silhouette.edgeThresholdAngle)
    || silhouette.edgeThresholdAngle < 0
    || silhouette.edgeThresholdAngle > 180
  ) {
    errors.silhouetteEdgeThresholdAngle = 'Диапазон: 0..180';
  }

  return { errors, meshIndexes, silhouette };
};

export const clearPartFieldError = (
  setErrors: Dispatch<SetStateAction<PartFieldErrors>>,
  field: PartField,
) => {
  setErrors((current) => {
    if (!current[field]) {
      return current;
    }

    return {
      ...current,
      [field]: undefined,
    };
  });
};

export const normalizeMeshIndexes = (meshIndexes: number[]) => {
  return Array.from(new Set(meshIndexes)).sort((a, b) => a - b);
};

export const formatMeshOwnerLabel = (part: EquipmentPartInfo) => {
  return part.title.trim() || part.id;
};
