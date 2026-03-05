import type { EquipmentModelSpecificationItem } from '@/entities/equipment';
import { requestAdminApi } from '@/features/admin-auth';
import { invalidateAdminCatalogCacheByModelSlug, requestAdminCatalogGet } from './client';
import type { CatalogModelContentResponse } from './types';

export const getAdminCatalogModelContent = async (
  modelSlug: string,
): Promise<{ deviceDescription: string; specifications: EquipmentModelSpecificationItem[] }> => {
  const response = await requestAdminCatalogGet<CatalogModelContentResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/content`,
  );

  return {
    deviceDescription: response.item.deviceDescription ?? '',
    specifications: Array.isArray(response.item.specifications) ? response.item.specifications : [],
  };
};

export const updateAdminCatalogModelContent = async (
  modelSlug: string,
  payload: { deviceDescription: string; specifications: EquipmentModelSpecificationItem[] },
): Promise<{ deviceDescription: string; specifications: EquipmentModelSpecificationItem[] }> => {
  const response = await requestAdminApi<CatalogModelContentResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/content`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );

  invalidateAdminCatalogCacheByModelSlug(modelSlug);

  return {
    deviceDescription: response.item.deviceDescription ?? '',
    specifications: Array.isArray(response.item.specifications) ? response.item.specifications : [],
  };
};

