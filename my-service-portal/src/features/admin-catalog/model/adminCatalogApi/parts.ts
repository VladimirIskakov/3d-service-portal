import type { EquipmentPartInfo } from '@/entities/equipment';
import { requestAdminApi } from '@/features/admin-auth';
import { invalidateAdminCatalogCacheByModelSlug, requestAdminCatalogGet } from './client';
import type { CatalogPartResponse, CatalogPartsResponse } from './types';

export const getAdminCatalogModelParts = async (modelSlug: string): Promise<EquipmentPartInfo[]> => {
  const response = await requestAdminCatalogGet<CatalogPartsResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/parts`,
  );

  return response.items;
};

export const createAdminCatalogModelPart = async (
  modelSlug: string,
  payload: {
    partId: string;
    title: string;
    description: string;
    meshIndexes: number[];
    silhouette: EquipmentPartInfo['silhouette'];
  },
): Promise<EquipmentPartInfo> => {
  const response = await requestAdminApi<CatalogPartResponse>(`/catalog/models/${encodeURIComponent(modelSlug)}/parts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  invalidateAdminCatalogCacheByModelSlug(modelSlug);

  return response.item;
};

export const updateAdminCatalogModelPart = async (
  modelSlug: string,
  partId: string,
  payload: {
    title: string;
    description: string;
    meshIndexes: number[];
    silhouette: EquipmentPartInfo['silhouette'];
  },
): Promise<EquipmentPartInfo> => {
  const response = await requestAdminApi<CatalogPartResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/parts/${encodeURIComponent(partId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );

  invalidateAdminCatalogCacheByModelSlug(modelSlug);

  return response.item;
};

export const deleteAdminCatalogModelPart = (modelSlug: string, partId: string) => {
  return requestAdminApi<{ ok: true }>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/parts/${encodeURIComponent(partId)}`,
    {
      method: 'DELETE',
    },
  ).then((result) => {
    invalidateAdminCatalogCacheByModelSlug(modelSlug);
    return result;
  });
};

