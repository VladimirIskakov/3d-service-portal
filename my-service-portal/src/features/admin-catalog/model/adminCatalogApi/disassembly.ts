import type { EquipmentDisassemblyProcedure } from '@/entities/equipment';
import { requestAdminApi } from '@/features/admin-auth';
import { invalidateAdminCatalogCacheByModelSlug, requestAdminCatalogGet } from './client';
import { mapDisassemblyProcedure } from './mappers';
import type { CatalogDisassemblyResponse, UpdateDisassemblyPayload } from './types';

export const getAdminCatalogModelDisassembly = async (
  modelSlug: string,
): Promise<EquipmentDisassemblyProcedure> => {
  const response = await requestAdminCatalogGet<CatalogDisassemblyResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/disassembly`,
  );

  return mapDisassemblyProcedure(response.item);
};

export const updateAdminCatalogModelDisassembly = async (
  modelSlug: string,
  payload: UpdateDisassemblyPayload,
): Promise<EquipmentDisassemblyProcedure> => {
  const response = await requestAdminApi<CatalogDisassemblyResponse>(
    `/catalog/models/${encodeURIComponent(modelSlug)}/disassembly`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );

  invalidateAdminCatalogCacheByModelSlug(modelSlug);

  return mapDisassemblyProcedure(response.item);
};

