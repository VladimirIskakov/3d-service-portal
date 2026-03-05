import { requestEquipmentApi } from './api';
import type { EquipmentCatalogCategory } from './types';

interface CategoriesResponse {
  items: EquipmentCatalogCategory[];
}

export const getEquipmentCategories = async (): Promise<EquipmentCatalogCategory[]> => {
  const response = await requestEquipmentApi<CategoriesResponse>('/api/catalog/categories');
  return response.items;
};
