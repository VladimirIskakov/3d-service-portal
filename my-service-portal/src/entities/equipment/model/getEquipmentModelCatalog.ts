import { buildApiUrl, requestEquipmentApi } from './api';
import type { EquipmentModelInfo } from './types';

const toFiniteOr = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const normalizeYear = (value: unknown) => {
  const parsedValue = typeof value === 'string' && value.trim() ? Number(value) : value;
  return Number.isInteger(parsedValue) ? Number(parsedValue) : null;
};

interface ModelsResponse {
  items: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    visibility: 'public' | 'private';
    categoryId: string | null;
    categoryTitle: string | null;
    company?: string | null;
    year?: number | string | null;
    assetPath: string | null;
    hasAsset: boolean;
    previewKind: 'model' | 'image' | null;
    previewPath: string | null;
    previewCamera?: { position?: [number, number, number]; fov?: number };
    deviceDescription?: string;
    specifications?: Array<{ id: string; label: string; value: string }>;
  }>;
}

export const getEquipmentModelCatalog = async (): Promise<EquipmentModelInfo[]> => {
  const response = await requestEquipmentApi<ModelsResponse>('/api/catalog/models');

  return response.items.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    visibility: item.visibility,
    categoryId: item.categoryId,
    categoryTitle: item.categoryTitle,
    company: typeof item.company === 'string' && item.company.trim() ? item.company : null,
    year: normalizeYear(item.year),
    hasAsset: item.hasAsset,
    assetUrl: item.assetPath ? buildApiUrl(item.assetPath) : null,
    previewKind: item.previewKind,
    previewUrl: item.previewPath ? buildApiUrl(item.previewPath) : null,
    previewCamera: {
      position: Array.isArray(item.previewCamera?.position)
        ? [
            toFiniteOr(item.previewCamera.position[0], 2.8),
            toFiniteOr(item.previewCamera.position[1], 2.35),
            toFiniteOr(item.previewCamera.position[2], 3.1),
          ]
        : [2.8, 2.35, 3.1],
      fov: toFiniteOr(item.previewCamera?.fov, 33),
    },
    deviceDescription: item.deviceDescription ?? '',
    specifications: Array.isArray(item.specifications) ? item.specifications : [],
  }));
};
