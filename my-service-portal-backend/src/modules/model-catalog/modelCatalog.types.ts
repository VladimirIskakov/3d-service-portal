export type ModelPreviewKind = 'model' | 'image';
export type ModelVisibility = 'public' | 'private';

export interface ModelCatalogCategory {
  id: string;
  title: string;
  description: string;
}

export interface ModelSpecificationItem {
  id: string;
  label: string;
  value: string;
}

export interface ModelContentSectionItem {
  id: string;
  title: string;
  content: string;
}

export interface ModelMeshInfo {
  meshIndex: number;
  nodeName: string;
  meshName: string;
  label: string;
}

export interface ModelExplosionSettings {
  minDistance: number;
  maxDistance: number;
  axisSnapRatio: number;
  coreVerticalSplitFactor: number;
  coreVerticalBiasRatio: number;
}

export interface ModelPreviewCameraSettings {
  position: [number, number, number];
  fov: number;
}

export interface ModelDisassemblyStepCameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface ModelDisassemblyStep {
  id: string;
  title: string;
  description: string;
  partId: string | null;
  focusMeshIndex: number | null;
  order: number;
  cameraPreset: ModelDisassemblyStepCameraPreset;
}

export interface ModelDisassemblyProcedure {
  id: string;
  modelSlug: string;
  title: string;
  steps: ModelDisassemblyStep[];
}

export interface ModelPartSilhouetteSettings {
  opacity: number;
  edgeThresholdAngle: number;
  showEdges: boolean;
}

export const DEFAULT_MODEL_PART_SILHOUETTE_SETTINGS: ModelPartSilhouetteSettings = {
  opacity: 0.04,
  edgeThresholdAngle: 45,
  showEdges: true,
};

export interface ModelCatalogItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  visibility: ModelVisibility;
  categoryId: string | null;
  categoryTitle: string | null;
  company: string | null;
  year: number | null;
  assetPath: string | null;
  hasAsset: boolean;
  previewKind: ModelPreviewKind | null;
  previewPath: string | null;
  previewCamera: ModelPreviewCameraSettings;
  deviceDescription: string;
  contentSections: ModelContentSectionItem[];
  specifications: ModelSpecificationItem[];
}

export interface ModelPartInfo {
  id: string;
  title: string;
  description: string;
  meshIndexes: number[];
  silhouette: ModelPartSilhouetteSettings;
}

export interface UpsertModelPartInput {
  modelSlug: string;
  partId: string;
  title: string;
  description: string;
  meshIndexes: number[];
  silhouette: ModelPartSilhouetteSettings;
}

export interface ReplaceModelMeshesInput {
  modelSlug: string;
  meshes: ModelMeshInfo[];
}

export interface UpsertModelExplosionSettingsInput {
  modelSlug: string;
  settings: ModelExplosionSettings;
}

export interface CreateModelCatalogItemInput {
  slug: string;
  title: string;
  description: string;
  visibility: ModelVisibility;
  categoryId: string | null;
  categoryTitle: string | null;
  company: string | null;
  year: number | null;
  assetPath: string | null;
  previewKind: ModelPreviewKind | null;
  previewPath: string | null;
  deviceDescription: string;
  contentSections?: ModelContentSectionItem[];
  specifications: ModelSpecificationItem[];
}

export interface UpdateModelCatalogItemInput {
  slug: string;
  title: string;
  description: string;
  visibility: ModelVisibility;
  categoryId: string | null;
  categoryTitle: string | null;
  company: string | null;
  year: number | null;
  assetPath: string | null;
  previewKind: ModelPreviewKind | null;
  previewPath: string | null;
}

export interface UpdateModelContentInput {
  modelSlug: string;
  deviceDescription: string;
  contentSections?: ModelContentSectionItem[];
  specifications: ModelSpecificationItem[];
}

export interface UpdateModelPreviewCameraInput {
  modelSlug: string;
  previewCamera: ModelPreviewCameraSettings;
}

export interface UpsertModelDisassemblyProcedureInput {
  modelSlug: string;
  title: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    partId: string | null;
    focusMeshIndex: number | null;
    cameraPreset: ModelDisassemblyStepCameraPreset;
  }>;
}

export interface ModelCatalogRepository {
  listCategories(): Promise<ModelCatalogCategory[]>;
  getCategoryById(categoryId: string): Promise<ModelCatalogCategory | null>;
  createCategory(input: { id: string; title: string; description: string }): Promise<ModelCatalogCategory>;
  listModels(includePrivate?: boolean): Promise<ModelCatalogItem[]>;
  hasModelBySlug(modelSlug: string): Promise<boolean>;
  getModelBySlug(modelSlug: string): Promise<ModelCatalogItem | null>;
  getPartsByModelSlug(modelSlug: string): Promise<ModelPartInfo[] | null>;
  getMeshesByModelSlug(modelSlug: string): Promise<ModelMeshInfo[] | null>;
  replaceMeshes(input: ReplaceModelMeshesInput): Promise<ModelMeshInfo[] | null>;
  getExplosionSettingsByModelSlug(modelSlug: string): Promise<ModelExplosionSettings | null>;
  upsertExplosionSettings(input: UpsertModelExplosionSettingsInput): Promise<ModelExplosionSettings | null>;
  updateModelPreviewCamera(input: UpdateModelPreviewCameraInput): Promise<ModelCatalogItem | null>;
  getDisassemblyProcedureByModelSlug(modelSlug: string): Promise<ModelDisassemblyProcedure | null>;
  upsertDisassemblyProcedure(input: UpsertModelDisassemblyProcedureInput): Promise<ModelDisassemblyProcedure | null>;
  createModel(input: CreateModelCatalogItemInput): Promise<ModelCatalogItem>;
  updateModel(input: UpdateModelCatalogItemInput): Promise<ModelCatalogItem | null>;
  deleteModel(modelSlug: string): Promise<boolean>;
  updateModelContent(input: UpdateModelContentInput): Promise<ModelCatalogItem | null>;
  upsertPart(input: UpsertModelPartInput): Promise<ModelPartInfo | null>;
  deletePart(modelSlug: string, partId: string): Promise<boolean | null>;
}
