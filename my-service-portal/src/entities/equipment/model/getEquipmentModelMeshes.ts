import { requestEquipmentApi } from './api';
import type { EquipmentMeshInfo } from './types';

interface MeshesResponse {
  items: EquipmentMeshInfo[];
}

export const getEquipmentModelMeshes = async (slug: string): Promise<EquipmentMeshInfo[]> => {
  const response = await requestEquipmentApi<MeshesResponse>(`/api/catalog/models/${encodeURIComponent(slug)}/meshes`);
  return response.items;
};
