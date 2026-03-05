import type { EquipmentExplosionSettings } from '@/entities/equipment';
import { requestAdminApi } from '@/features/admin-auth';
import { invalidateAdminCatalogCacheByModelSlug, requestAdminCatalogGet } from './client';
import type { CatalogExplosionSettingsResponse } from './types';

export const getAdminCatalogModelExplosionSettings = async (
  modelSlug: string,
): Promise<EquipmentExplosionSettings> => {
  const response = await requestAdminCatalogGet<CatalogExplosionSettingsResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/explode-settings`,
  );

  return response.item;
};

export const updateAdminCatalogModelExplosionSettings = async (
  modelSlug: string,
  payload: EquipmentExplosionSettings,
): Promise<EquipmentExplosionSettings> => {
  const response = await requestAdminApi<CatalogExplosionSettingsResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/explode-settings`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );

  invalidateAdminCatalogCacheByModelSlug(modelSlug);

  return response.item;
};

