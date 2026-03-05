import type { EquipmentCatalogCategory } from '@/entities/equipment';
import { requestAdminApi } from '@/features/admin-auth';
import { invalidateAdminCatalogCache, requestAdminCatalogGet } from './client';
import type { CategoriesResponse } from './types';

export const getAdminCatalogCategories = () => {
  return requestAdminCatalogGet<CategoriesResponse>('/catalog/categories');
};

export const createAdminCatalogCategory = async (payload: {
  title: string;
  description?: string;
}): Promise<EquipmentCatalogCategory> => {
  const response = await requestAdminApi<{ item: EquipmentCatalogCategory }>('/catalog/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  invalidateAdminCatalogCache((key) => key.includes('/catalog/categories'));

  return response.item;
};

