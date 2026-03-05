import type { EquipmentMeshInfo } from '@/entities/equipment';
import { requestAdminApi } from '@/features/admin-auth';
import { invalidateAdminCatalogCacheByModelSlug, requestAdminCatalogGet } from './client';
import type { CatalogMeshesResponse } from './types';

export const getAdminCatalogModelMeshes = async (modelSlug: string): Promise<EquipmentMeshInfo[]> => {
  const response = await requestAdminCatalogGet<CatalogMeshesResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/meshes`,
  );

  return response.items;
};

export const replaceAdminCatalogModelMeshes = async (
  modelSlug: string,
  items: EquipmentMeshInfo[],
): Promise<EquipmentMeshInfo[]> => {
  const response = await requestAdminApi<CatalogMeshesResponse>(`/catalog/models/${encodeURIComponent(modelSlug)}/meshes`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });

  invalidateAdminCatalogCacheByModelSlug(modelSlug);

  return response.items;
};

