import type { EquipmentPreviewCameraSettings } from '@/entities/equipment';
import { requestAdminApi } from '@/features/admin-auth';
import { invalidateAdminCatalogCacheByModelSlug, requestAdminCatalogGet } from './client';
import { mapPreviewCamera } from './mappers';
import type { CatalogPreviewCameraResponse } from './types';

export const getAdminCatalogModelPreviewCamera = async (
  modelSlug: string,
): Promise<EquipmentPreviewCameraSettings> => {
  const response = await requestAdminCatalogGet<CatalogPreviewCameraResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/preview-camera`,
  );

  return mapPreviewCamera(response.item);
};

export const updateAdminCatalogModelPreviewCamera = async (
  modelSlug: string,
  payload: EquipmentPreviewCameraSettings,
): Promise<EquipmentPreviewCameraSettings> => {
  const response = await requestAdminApi<CatalogPreviewCameraResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/preview-camera`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );

  invalidateAdminCatalogCacheByModelSlug(modelSlug);

  return mapPreviewCamera(response.item);
};

