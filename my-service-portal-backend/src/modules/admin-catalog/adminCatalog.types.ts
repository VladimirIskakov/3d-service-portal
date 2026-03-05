import type {
  ModelMeshInfo,
  ModelPreviewKind,
  ModelSpecificationItem,
  ModelVisibility,
} from '../model-catalog/modelCatalog.types.js';

export interface CreateCatalogModelCardBody {
  title?: unknown;
  description?: unknown;
  categoryId?: unknown;
  visibility?: unknown;
  previewKind?: unknown;
  storageFileName?: unknown;
}

export interface UpdateCatalogModelCardBody {
  title?: unknown;
  description?: unknown;
  categoryId?: unknown;
  visibility?: unknown;
  previewKind?: unknown;
  storageFileName?: unknown;
}

export interface UpsertCatalogModelPartBody {
  partId?: unknown;
  title?: unknown;
  description?: unknown;
  meshIndexes?: unknown;
  silhouette?: unknown;
}

export interface ReplaceCatalogModelMeshesBody {
  items?: unknown;
}

export interface ReplaceCatalogModelMeshItemBody extends ModelMeshInfo {}

export interface UpsertCatalogModelExplosionSettingsBody {
  minDistance?: unknown;
  maxDistance?: unknown;
  axisSnapRatio?: unknown;
  coreVerticalSplitFactor?: unknown;
  coreVerticalBiasRatio?: unknown;
}

export interface UpdateCatalogModelContentBody {
  deviceDescription?: unknown;
  specifications?: unknown;
}

export interface UpdateCatalogModelPreviewCameraBody {
  position?: unknown;
  fov?: unknown;
}

export interface UpsertCatalogModelDisassemblyBody {
  title?: unknown;
  steps?: unknown;
}

export interface CreateCatalogCategoryBody {
  title?: unknown;
  description?: unknown;
}

export const isVisibility = (value: unknown): value is ModelVisibility => {
  return value === 'public' || value === 'private';
};

export interface UpdateCatalogModelContentSpecBody extends ModelSpecificationItem {}

export const isPreviewKind = (value: unknown): value is ModelPreviewKind => {
  return value === 'model' || value === 'image';
};
