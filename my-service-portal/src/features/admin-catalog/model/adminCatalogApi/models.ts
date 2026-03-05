import type { EquipmentModelInfo, EquipmentModelVisibility } from '@/entities/equipment';
import { requestAdminApi } from '@/features/admin-auth';
import {
  invalidateAdminCatalogCache,
  invalidateAdminCatalogCacheByModelSlug,
  requestAdminCatalogGet,
} from './client';
import { mapCatalogItem } from './mappers';
import type { AdminCatalogPreviewKind, CatalogModelItemPayload, CatalogModelResponse } from './types';

export const getAdminCatalogModelList = async (): Promise<EquipmentModelInfo[]> => {
  const response = await requestAdminCatalogGet<{ items: CatalogModelItemPayload[] }>('/catalog/models');
  return response.items.map(mapCatalogItem);
};

export const getAdminCatalogModelBySlug = async (slug: string): Promise<EquipmentModelInfo> => {
  const response = await requestAdminCatalogGet<CatalogModelResponse>(`/catalog/models/${encodeURIComponent(slug)}`);
  return mapCatalogItem(response.item);
};

export const createAdminCatalogModelCard = async (payload: {
  title: string;
  description: string;
  categoryId: string | null;
  visibility: EquipmentModelVisibility;
  previewKind: AdminCatalogPreviewKind;
  storageFileName: string;
}) => {
  const response = await requestAdminApi<CatalogModelResponse>('/catalog/models', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  invalidateAdminCatalogCache((key) => key.includes('/catalog/models') || key.includes('/storage/'));

  return mapCatalogItem(response.item);
};

export const updateAdminCatalogModelCard = async (
  slug: string,
  payload: {
    title: string;
    description: string;
    categoryId: string | null;
    visibility: EquipmentModelVisibility;
    previewKind: AdminCatalogPreviewKind;
    storageFileName: string;
  },
) => {
  const response = await requestAdminApi<CatalogModelResponse>(`/catalog/models/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  invalidateAdminCatalogCacheByModelSlug(slug);

  return mapCatalogItem(response.item);
};

export const deleteAdminCatalogModelCard = (slug: string) => {
  return requestAdminApi<{ ok: true }>(`/catalog/models/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  }).then((result) => {
    invalidateAdminCatalogCacheByModelSlug(slug);
    invalidateAdminCatalogCache((key) => key.includes('/storage/'));
    return result;
  });
};

