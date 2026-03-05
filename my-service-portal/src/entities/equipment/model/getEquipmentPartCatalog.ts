import { requestEquipmentApi } from './api';
import type { EquipmentPartInfo } from './types';

interface PartsResponse {
  items: EquipmentPartInfo[];
}

export const getEquipmentPartCatalog = async (modelSlug: string): Promise<EquipmentPartInfo[]> => {
  const response = await requestEquipmentApi<PartsResponse>(`/api/catalog/models/${encodeURIComponent(modelSlug)}/parts`);
  return response.items;
};
