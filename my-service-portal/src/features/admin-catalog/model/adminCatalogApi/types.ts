import type {
  EquipmentCatalogCategory,
  EquipmentDisassemblyStepCameraPreset,
  EquipmentExplosionSettings,
  EquipmentMeshInfo,
  EquipmentModelSpecificationItem,
  EquipmentModelVisibility,
  EquipmentPartInfo,
  EquipmentPreviewCameraSettings,
} from '@/entities/equipment';

export type AdminCatalogPreviewKind = 'model' | 'image';

export interface AdminStorageFile {
  fileName: string;
  publicPath: string;
  sizeBytes: number;
}

export interface StorageFilesResponse {
  items: AdminStorageFile[];
}

export interface CategoriesResponse {
  items: EquipmentCatalogCategory[];
}

export interface CatalogModelItemPayload {
  id: string;
  slug: string;
  title: string;
  description: string;
  visibility: EquipmentModelVisibility;
  categoryId: string | null;
  categoryTitle: string | null;
  company: string | null;
  year: number | null;
  assetPath: string | null;
  hasAsset: boolean;
  previewKind: AdminCatalogPreviewKind | null;
  previewPath: string | null;
  previewCamera?: {
    position?: [number, number, number];
    fov?: number;
  };
  deviceDescription?: string;
  specifications?: EquipmentModelSpecificationItem[];
}

export interface CatalogModelResponse {
  item: CatalogModelItemPayload;
}

export interface CatalogPartResponse {
  item: EquipmentPartInfo;
}

export interface CatalogPartsResponse {
  items: EquipmentPartInfo[];
}

export interface CatalogMeshesResponse {
  items: EquipmentMeshInfo[];
}

export interface CatalogExplosionSettingsResponse {
  item: EquipmentExplosionSettings;
}

export interface CatalogModelContentResponse {
  item: {
    deviceDescription: string;
    specifications: EquipmentModelSpecificationItem[];
  };
}

export interface CatalogPreviewCameraResponse {
  item: EquipmentPreviewCameraSettings;
}

export interface CatalogDisassemblyResponse {
  item: {
    id: string;
    modelSlug: string;
    title: string;
    steps?: Array<{
      id: string;
      title: string;
      description: string;
      partId: string | null;
      focusMeshIndex?: number | null;
      order?: number;
      cameraPreset?: {
        position?: [number, number, number];
        target?: [number, number, number];
        fov?: number;
      };
    }>;
  };
}

export interface UpdateDisassemblyPayload {
  title: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    partId: string | null;
    focusMeshIndex: number | null;
    cameraPreset: EquipmentDisassemblyStepCameraPreset;
  }>;
}
