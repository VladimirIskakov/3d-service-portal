export interface EquipmentPartSilhouetteSettings {
  opacity: number;
  edgeThresholdAngle: number;
  showEdges: boolean;
}

export const DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS: EquipmentPartSilhouetteSettings = {
  opacity: 0.04,
  edgeThresholdAngle: 45,
  showEdges: true,
};

export interface EquipmentPartInfo {
  id: string;
  title: string;
  description: string;
  meshIndexes: number[];
  silhouette: EquipmentPartSilhouetteSettings;
}

export interface EquipmentMeshInfo {
  meshIndex: number;
  nodeName: string;
  meshName: string;
  label: string;
}

export interface EquipmentExplosionSettings {
  minDistance: number;
  maxDistance: number;
  axisSnapRatio: number;
  coreVerticalSplitFactor: number;
  coreVerticalBiasRatio: number;
}

export const DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS: EquipmentExplosionSettings = {
  minDistance: 1.4,
  maxDistance: 3.8,
  axisSnapRatio: 0.22,
  coreVerticalSplitFactor: 0.28,
  coreVerticalBiasRatio: 0.6,
};

export interface EquipmentPreviewCameraSettings {
  position: [number, number, number];
  fov: number;
}

export interface EquipmentDisassemblyStepCameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface EquipmentDisassemblyStep {
  id: string;
  title: string;
  description: string;
  partId: string | null;
  focusMeshIndex: number | null;
  order: number;
  cameraPreset: EquipmentDisassemblyStepCameraPreset;
}

export interface EquipmentDisassemblyProcedure {
  id: string;
  modelSlug: string;
  title: string;
  steps: EquipmentDisassemblyStep[];
}

export type EquipmentModelVisibility = 'public' | 'private';

export interface EquipmentModelSpecificationItem {
  id: string;
  label: string;
  value: string;
}

export interface EquipmentCatalogCategory {
  id: string;
  title: string;
  description: string;
}

export type EquipmentCardPreviewKind = 'model' | 'image' | null;

export interface EquipmentModelInfo {
  id: string;
  slug: string;
  title: string;
  description: string;
  visibility: EquipmentModelVisibility;
  categoryId: string | null;
  categoryTitle: string | null;
  hasAsset: boolean;
  assetUrl: string | null;
  previewKind: EquipmentCardPreviewKind;
  previewUrl: string | null;
  previewCamera: EquipmentPreviewCameraSettings;
  deviceDescription: string;
  specifications: EquipmentModelSpecificationItem[];
}
