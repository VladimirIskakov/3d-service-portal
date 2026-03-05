import { requestEquipmentApi } from './api';
import type { EquipmentExplosionSettings } from './types';

interface ExplosionSettingsResponse {
  item: EquipmentExplosionSettings;
}

export const getEquipmentModelExplosionSettings = async (slug: string): Promise<EquipmentExplosionSettings> => {
  const response = await requestEquipmentApi<ExplosionSettingsResponse>(`/api/catalog/models/${encodeURIComponent(slug)}/explode-settings`);
  return response.item;
};
