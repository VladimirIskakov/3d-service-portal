import type { EquipmentPartInfo } from '@/entities/equipment';
import {
  createAdminCatalogModelPart,
  deleteAdminCatalogModelPart,
  getAdminCatalogModelBySlug,
  getAdminCatalogModelMeshes,
  getAdminCatalogModelParts,
  replaceAdminCatalogModelMeshes,
  updateAdminCatalogModelPart,
} from './adminCatalogApi';
import { type ModelMeshCatalogItem, loadModelMeshCatalog } from './loadModelMeshCatalog';
import { getMeshCatalogErrorMessage } from './partsEditor';

export const fetchAdminModelParts = (modelSlug: string) => {
  return getAdminCatalogModelParts(modelSlug);
};

export const fetchAdminModelMeshCatalog = async (
  modelSlug: string,
): Promise<{ items: ModelMeshCatalogItem[]; warning: string | null }> => {
  const model = await getAdminCatalogModelBySlug(modelSlug);

  if (!model.assetUrl) {
    throw new Error('У модели нет 3D-файла. Выбор мешей по имени недоступен.');
  }

  let storedMeshes: ModelMeshCatalogItem[] = [];
  let storedMeshesError: unknown = null;

  try {
    storedMeshes = await getAdminCatalogModelMeshes(modelSlug);
  } catch (requestError) {
    storedMeshesError = requestError;
  }

  try {
    const localMeshes = await loadModelMeshCatalog(model.assetUrl, { forceReload: true });

    if (localMeshes.length === 0) {
      if (storedMeshes.length > 0) {
        return { items: storedMeshes, warning: null };
      }

      throw new Error(storedMeshesError ? getMeshCatalogErrorMessage(storedMeshesError) : 'Меши не найдены.');
    }

    const syncedMeshes = await replaceAdminCatalogModelMeshes(modelSlug, localMeshes);
    return { items: syncedMeshes, warning: null };
  } catch (scanOrSyncError) {
    if (storedMeshes.length > 0) {
      return {
        items: storedMeshes,
        warning: 'Не удалось обновить список мешей из файла модели. Используется сохраненный список.',
      };
    }

    if (scanOrSyncError instanceof Error) {
      throw scanOrSyncError;
    }

    throw new Error(getMeshCatalogErrorMessage(scanOrSyncError));
  }
};

export const saveAdminModelPart = async (input: {
  modelSlug: string;
  isEditMode: boolean;
  partId: string;
  title: string;
  description: string;
  meshIndexes: number[];
  silhouette: EquipmentPartInfo['silhouette'];
}) => {
  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    meshIndexes: input.meshIndexes,
    silhouette: input.silhouette,
  };

  if (input.isEditMode) {
    return updateAdminCatalogModelPart(input.modelSlug, input.partId, payload);
  }

  return createAdminCatalogModelPart(input.modelSlug, {
    partId: input.partId.trim(),
    ...payload,
  });
};

export const removeAdminModelPart = (modelSlug: string, partId: string) => {
  return deleteAdminCatalogModelPart(modelSlug, partId);
};

