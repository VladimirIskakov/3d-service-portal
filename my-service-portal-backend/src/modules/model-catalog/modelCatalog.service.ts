import { createAppError } from '../../shared/errors/index.js';
import type {
  ModelContentSectionItem,
  ModelDisassemblyProcedure,
  ModelDisassemblyStep,
  ModelDisassemblyStepCameraPreset,
  ModelPartSilhouetteSettings,
  ModelCatalogRepository,
  ModelExplosionSettings,
  ModelMeshInfo,
  ModelPreviewCameraSettings,
  ModelPreviewKind,
  ModelSpecificationItem,
  ModelVisibility,
} from './modelCatalog.types.js';
import { DEFAULT_MODEL_PART_SILHOUETTE_SETTINGS } from './modelCatalog.types.js';

const DEFAULT_MODEL_EXPLOSION_SETTINGS: ModelExplosionSettings = {
  minDistance: 1.4,
  maxDistance: 3.8,
  axisSnapRatio: 0.22,
  coreVerticalSplitFactor: 0.28,
  coreVerticalBiasRatio: 0.6,
};

const slugify = (value: string) => {
  const latinized = value.normalize('NFKD').replace(/[МЂ-НЇ]/g, '').toLowerCase();

  const slug = latinized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return slug || 'model';
};

const normalizePartId = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

const DEFAULT_MODEL_PREVIEW_CAMERA_SETTINGS: ModelPreviewCameraSettings = {
  position: [2.8, 2.35, 3.1],
  fov: 33,
};

const DEFAULT_MODEL_DISASSEMBLY_CAMERA_PRESET: ModelDisassemblyStepCameraPreset = {
  position: [45, 18, 3.2],
  target: [0, 0, 0],
  fov: 33,
};

const normalizeSpecificationId = (value: string, fallbackIndex: number) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || `spec-${fallbackIndex + 1}`;
};

const normalizeContentSectionId = (value: string, fallbackIndex: number) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || `section-${fallbackIndex + 1}`;
};

const sanitizeMeshIndexes = (meshIndexes: number[]) => {
  return Array.from(new Set(meshIndexes.filter((value) => Number.isInteger(value) && value >= 0))).sort(
    (a, b) => a - b,
  );
};

const normalizeContentSections = (
  items: ModelContentSectionItem[] | undefined | null,
  fallbackDescription = '',
): ModelContentSectionItem[] => {
  const source = Array.isArray(items)
    ? items
    : fallbackDescription.trim()
      ? [{ id: 'device-description', title: 'РћРїРёСЃР°РЅРёРµ СѓСЃС‚СЂРѕР№СЃС‚РІР°', content: fallbackDescription.trim() }]
      : [];

  const result: ModelContentSectionItem[] = [];
  const usedIds = new Set<string>();

  source.forEach((item, index) => {
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    const content = typeof item?.content === 'string' ? item.content.trim() : '';

    if (!title && !content) {
      return;
    }

    let id = normalizeContentSectionId(typeof item?.id === 'string' ? item.id : '', index);
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${id}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    result.push({
      id,
      title: title || `Р Р°Р·РґРµР» ${result.length + 1}`,
      content,
    });
  });

  return result;
};

const normalizeSpecifications = (items: ModelSpecificationItem[] | undefined | null): ModelSpecificationItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  const result: ModelSpecificationItem[] = [];
  const usedIds = new Set<string>();

  items.forEach((item, index) => {
    const label = typeof item?.label === 'string' ? item.label.trim() : '';
    const value = typeof item?.value === 'string' ? item.value.trim() : '';

    if (!label && !value) {
      return;
    }

    let id = normalizeSpecificationId(typeof item?.id === 'string' ? item.id : '', index);
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${id}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    result.push({ id, label, value });
  });

  return result;
};

const normalizeVisibility = (value: ModelVisibility | undefined | null): ModelVisibility => {
  return value === 'public' ? 'public' : 'private';
};

const normalizeMeshCatalog = (meshes: ModelMeshInfo[]) => {
  const byIndex = new Map<number, ModelMeshInfo>();

  meshes.forEach((mesh) => {
    const meshIndex = Number(mesh.meshIndex);
    if (!Number.isInteger(meshIndex) || meshIndex < 0) {
      return;
    }

    const nodeName = typeof mesh.nodeName === 'string' ? mesh.nodeName.trim() : '';
    const meshName = typeof mesh.meshName === 'string' ? mesh.meshName.trim() : '';
    const label = (typeof mesh.label === 'string' ? mesh.label.trim() : '') || nodeName || meshName || `Mesh #${meshIndex + 1}`;

    byIndex.set(meshIndex, {
      meshIndex,
      nodeName,
      meshName,
      label,
    });
  });

  return Array.from(byIndex.values()).sort((a, b) => a.meshIndex - b.meshIndex);
};

const findMeshIndexConflicts = (
  parts: Array<{ id: string; meshIndexes: number[] }>,
  currentPartId: string,
  nextMeshIndexes: number[],
) => {
  const nextMeshIndexSet = new Set(nextMeshIndexes);
  const conflictingMeshIndexes = new Set<number>();

  parts.forEach((part) => {
    if (part.id === currentPartId) {
      return;
    }

    part.meshIndexes.forEach((meshIndex) => {
      if (nextMeshIndexSet.has(meshIndex)) {
        conflictingMeshIndexes.add(meshIndex);
      }
    });
  });

  return Array.from(conflictingMeshIndexes).sort((a, b) => a - b);
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeExplosionSettings = (input: Partial<ModelExplosionSettings>): ModelExplosionSettings => {
  const minDistance = Number.isFinite(input.minDistance)
    ? clamp(Number(input.minDistance), 0.1, 100)
    : DEFAULT_MODEL_EXPLOSION_SETTINGS.minDistance;
  const maxDistanceRaw = Number.isFinite(input.maxDistance)
    ? clamp(Number(input.maxDistance), 0.1, 100)
    : DEFAULT_MODEL_EXPLOSION_SETTINGS.maxDistance;
  const maxDistance = Math.max(maxDistanceRaw, minDistance);

  return {
    minDistance,
    maxDistance,
    axisSnapRatio: Number.isFinite(input.axisSnapRatio)
      ? clamp(Number(input.axisSnapRatio), 0, 1)
      : DEFAULT_MODEL_EXPLOSION_SETTINGS.axisSnapRatio,
    coreVerticalSplitFactor: Number.isFinite(input.coreVerticalSplitFactor)
      ? clamp(Number(input.coreVerticalSplitFactor), 0, 2)
      : DEFAULT_MODEL_EXPLOSION_SETTINGS.coreVerticalSplitFactor,
    coreVerticalBiasRatio: Number.isFinite(input.coreVerticalBiasRatio)
      ? clamp(Number(input.coreVerticalBiasRatio), 0, 4)
      : DEFAULT_MODEL_EXPLOSION_SETTINGS.coreVerticalBiasRatio,
  };
};

const normalizePreviewCameraSettings = (
  input: Partial<ModelPreviewCameraSettings> | undefined | null,
): ModelPreviewCameraSettings => {
  const rawPosition = Array.isArray(input?.position) ? input.position : [];
  const x = Number(rawPosition[0]);
  const y = Number(rawPosition[1]);
  const z = Number(rawPosition[2]);
  const fov = Number(input?.fov);

  return {
    position: [
      Number.isFinite(x) ? clamp(x, -30, 30) : DEFAULT_MODEL_PREVIEW_CAMERA_SETTINGS.position[0],
      Number.isFinite(y) ? clamp(y, -30, 30) : DEFAULT_MODEL_PREVIEW_CAMERA_SETTINGS.position[1],
      Number.isFinite(z) ? clamp(z, -30, 30) : DEFAULT_MODEL_PREVIEW_CAMERA_SETTINGS.position[2],
    ],
    fov: Number.isFinite(fov) ? clamp(fov, 10, 90) : DEFAULT_MODEL_PREVIEW_CAMERA_SETTINGS.fov,
  };
};

const normalizePartSilhouetteSettings = (
  input: Partial<ModelPartSilhouetteSettings> | undefined | null,
): ModelPartSilhouetteSettings => {
  const opacity = Number(input?.opacity);
  const edgeThresholdAngle = Number(input?.edgeThresholdAngle);
  const showEdges = typeof input?.showEdges === 'boolean'
    ? input.showEdges
    : DEFAULT_MODEL_PART_SILHOUETTE_SETTINGS.showEdges;

  return {
    opacity: Number.isFinite(opacity)
      ? clamp(opacity, 0, 1)
      : DEFAULT_MODEL_PART_SILHOUETTE_SETTINGS.opacity,
    edgeThresholdAngle: Number.isFinite(edgeThresholdAngle)
      ? clamp(edgeThresholdAngle, 0, 180)
      : DEFAULT_MODEL_PART_SILHOUETTE_SETTINGS.edgeThresholdAngle,
    showEdges,
  };
};

const normalizeDisassemblyStepId = (value: string, fallbackIndex: number) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || `step-${fallbackIndex + 1}`;
};

const normalizeDisassemblyCameraPreset = (
  input: Partial<ModelDisassemblyStepCameraPreset> | undefined | null,
): ModelDisassemblyStepCameraPreset => {
  const rawPosition = Array.isArray(input?.position) ? input.position : [];
  const rawTarget = Array.isArray(input?.target) ? input.target : [];
  const fov = Number(input?.fov);

  const px = Number(rawPosition[0]);
  const py = Number(rawPosition[1]);
  const pz = Number(rawPosition[2]);
  const tx = Number(rawTarget[0]);
  const ty = Number(rawTarget[1]);
  const tz = Number(rawTarget[2]);

  return {
    position: [
      Number.isFinite(px) ? clamp(px, -360, 360) : DEFAULT_MODEL_DISASSEMBLY_CAMERA_PRESET.position[0],
      Number.isFinite(py) ? clamp(py, -89, 89) : DEFAULT_MODEL_DISASSEMBLY_CAMERA_PRESET.position[1],
      Number.isFinite(pz) ? clamp(Math.abs(pz), 0.2, 100) : DEFAULT_MODEL_DISASSEMBLY_CAMERA_PRESET.position[2],
    ],
    target: [
      Number.isFinite(tx) ? clamp(tx, -50, 50) : DEFAULT_MODEL_DISASSEMBLY_CAMERA_PRESET.target[0],
      Number.isFinite(ty) ? clamp(ty, -50, 50) : DEFAULT_MODEL_DISASSEMBLY_CAMERA_PRESET.target[1],
      Number.isFinite(tz) ? clamp(tz, -50, 50) : DEFAULT_MODEL_DISASSEMBLY_CAMERA_PRESET.target[2],
    ],
    fov: Number.isFinite(fov) ? clamp(fov, 10, 90) : DEFAULT_MODEL_DISASSEMBLY_CAMERA_PRESET.fov,
  };
};

const normalizeDisassemblySteps = (
  input: Array<Partial<ModelDisassemblyStep> | Record<string, unknown>> | undefined | null,
) => {
  if (!Array.isArray(input)) {
    return [] as Array<{
      id: string;
      title: string;
      description: string;
      partId: string | null;
      focusMeshIndex: number | null;
      cameraPreset: ModelDisassemblyStepCameraPreset;
    }>;
  }

  const result: Array<{
    id: string;
    title: string;
    description: string;
    partId: string | null;
    focusMeshIndex: number | null;
    cameraPreset: ModelDisassemblyStepCameraPreset;
  }> = [];
  const usedIds = new Set<string>();

  input.forEach((item, index) => {
    const raw = (typeof item === 'object' && item ? item : {}) as Partial<ModelDisassemblyStep>;
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    const description = typeof raw.description === 'string' ? raw.description.trim() : '';
    const normalizedPartId =
      typeof raw.partId === 'string' && raw.partId.trim()
        ? normalizePartId(raw.partId)
        : null;
    const rawFocusMeshIndex = Number((raw as { focusMeshIndex?: unknown }).focusMeshIndex);
    const focusMeshIndex = Number.isInteger(rawFocusMeshIndex) && rawFocusMeshIndex >= 0
      ? rawFocusMeshIndex
      : null;

    if (!title && !description) {
      return;
    }

    let id = normalizeDisassemblyStepId(typeof raw.id === 'string' ? raw.id : '', index);
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${id}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);

    result.push({
      id,
      title: title || `РЁР°Рі ${result.length + 1}`,
      description,
      partId: normalizedPartId,
      focusMeshIndex: normalizedPartId ? focusMeshIndex : null,
      cameraPreset: normalizeDisassemblyCameraPreset(raw.cameraPreset),
    });
  });

  return result;
};

const buildMediaPayload = (input: { previewKind: ModelPreviewKind; previewPath: string }) => {
  const previewPath = input.previewPath.trim();

  if (!previewPath) {
    throw createAppError('validation_error', 'Preview file is required.');
  }

  return {
    previewKind: input.previewKind,
    previewPath,
    assetPath: input.previewKind === 'model' ? previewPath : null,
  };
};

export const createModelCatalogService = (repository: ModelCatalogRepository) => {
  return {
    listCategories() {
      return repository.listCategories();
    },
    getCategoryById(categoryId: string) {
      return repository.getCategoryById(categoryId);
    },
    async createCategory(input: { title: string; description?: string }) {
      const title = input.title.trim();
      const description = (input.description ?? '').trim();

      if (title.length < 2) {
        throw createAppError('validation_error', 'Category title is required.');
      }

      const baseId = slugify(title);
      let id = baseId;
      let suffix = 2;

      while (await repository.getCategoryById(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }

      return repository.createCategory({ id, title, description });
    },
    listModels() {
      return repository.listModels(false);
    },
    listModelsForAdmin() {
      return repository.listModels(true);
    },
    async getPublicModelBySlug(modelSlug: string) {
      const model = await repository.getModelBySlug(modelSlug);
      if (!model || model.visibility !== 'public') {
        return null;
      }
      return model;
    },
    getModelBySlug(modelSlug: string) {
      return repository.getModelBySlug(modelSlug);
    },
    getPartsByModelSlug(modelSlug: string) {
      return repository.getPartsByModelSlug(modelSlug);
    },
    getMeshesByModelSlug(modelSlug: string) {
      return repository.getMeshesByModelSlug(modelSlug);
    },
    async replaceModelMeshes(modelSlug: string, meshes: ModelMeshInfo[]) {
      const normalizedModelSlug = modelSlug.trim();

      if (!normalizedModelSlug) {
        throw createAppError('validation_error', 'modelSlug is required.');
      }

      const normalizedMeshes = normalizeMeshCatalog(meshes);
      const result = await repository.replaceMeshes({ modelSlug: normalizedModelSlug, meshes: normalizedMeshes });

      if (result === null) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return result;
    },
    async getExplosionSettingsByModelSlug(modelSlug: string) {
      const normalizedModelSlug = modelSlug.trim();
      if (!normalizedModelSlug) {
        throw createAppError('validation_error', 'modelSlug is required.');
      }

      const model = await repository.getModelBySlug(normalizedModelSlug);
      if (!model) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      const settings = await repository.getExplosionSettingsByModelSlug(normalizedModelSlug);
      return settings ?? DEFAULT_MODEL_EXPLOSION_SETTINGS;
    },
    async getPreviewCameraByModelSlug(modelSlug: string) {
      const normalizedModelSlug = modelSlug.trim();
      if (!normalizedModelSlug) {
        throw createAppError('validation_error', 'modelSlug is required.');
      }

      const model = await repository.getModelBySlug(normalizedModelSlug);
      if (!model) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return normalizePreviewCameraSettings(model.previewCamera);
    },
    async getDisassemblyByModelSlug(modelSlug: string): Promise<ModelDisassemblyProcedure> {
      const normalizedModelSlug = modelSlug.trim();
      if (!normalizedModelSlug) {
        throw createAppError('validation_error', 'modelSlug is required.');
      }

      const disassembly = await repository.getDisassemblyProcedureByModelSlug(normalizedModelSlug);
      if (disassembly) {
        return disassembly;
      }

      const exists = await repository.hasModelBySlug(normalizedModelSlug);
      if (!exists) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return {
        id: normalizedModelSlug,
        modelSlug: normalizedModelSlug,
        title: 'Разборка',
        steps: [],
      };
    },
    async upsertDisassemblyByModelSlug(
      modelSlug: string,
      input: {
        title?: string;
        steps?: Array<Partial<ModelDisassemblyStep> | Record<string, unknown>>;
      },
    ): Promise<ModelDisassemblyProcedure> {
      const normalizedModelSlug = modelSlug.trim();
      if (!normalizedModelSlug) {
        throw createAppError('validation_error', 'modelSlug is required.');
      }

      const exists = await repository.hasModelBySlug(normalizedModelSlug);
      if (!exists) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      const title = typeof input.title === 'string' && input.title.trim()
        ? input.title.trim()
        : 'Разборка';
      const steps = normalizeDisassemblySteps(input.steps);

      const saved = await repository.upsertDisassemblyProcedure({
        modelSlug: normalizedModelSlug,
        title,
        steps,
      });

      if (!saved) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return saved;
    },
    async upsertExplosionSettings(
      modelSlug: string,
      input: Partial<ModelExplosionSettings>,
    ) {
      const normalizedModelSlug = modelSlug.trim();
      if (!normalizedModelSlug) {
        throw createAppError('validation_error', 'modelSlug is required.');
      }

      const settings = normalizeExplosionSettings(input);
      const saved = await repository.upsertExplosionSettings({ modelSlug: normalizedModelSlug, settings });

      if (!saved) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return saved;
    },
    async updatePreviewCamera(
      modelSlug: string,
      input: Partial<ModelPreviewCameraSettings>,
    ) {
      const normalizedModelSlug = modelSlug.trim();
      if (!normalizedModelSlug) {
        throw createAppError('validation_error', 'modelSlug is required.');
      }

      const previewCamera = normalizePreviewCameraSettings(input);
      const updated = await repository.updateModelPreviewCamera({
        modelSlug: normalizedModelSlug,
        previewCamera,
      });

      if (!updated) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return updated.previewCamera;
    },
    async createModelCard(input: {
      title: string;
      description?: string;
      categoryId?: string | null;
      previewKind: ModelPreviewKind;
      previewPath: string;
      visibility?: ModelVisibility;
    }) {
      const title = input.title.trim();
      const description = (input.description ?? '').trim();
      const categoryId = (input.categoryId ?? '').trim();

      if (!title) {
        throw createAppError('validation_error', 'Title is required.');
      }

      const category = categoryId ? await repository.getCategoryById(categoryId) : null;
      if (categoryId && !category) {
        throw createAppError('category_not_found', 'Category not found.');
      }

      const media = buildMediaPayload({ previewKind: input.previewKind, previewPath: input.previewPath });

      const baseSlug = slugify(title);
      let slug = baseSlug;
      let suffix = 2;

      while (await repository.getModelBySlug(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      return repository.createModel({
        slug,
        title,
        description,
        visibility: 'private',
        categoryId: category?.id ?? null,
        categoryTitle: category?.title ?? null,
        assetPath: media.assetPath,
        previewKind: media.previewKind,
        previewPath: media.previewPath,
        deviceDescription: '',
        contentSections: [],
        specifications: [],
      });
    },
    async updateModelCard(
      slug: string,
      input: {
        title: string;
        description?: string;
        categoryId?: string | null;
        previewKind: ModelPreviewKind;
        previewPath: string;
        visibility?: ModelVisibility;
      },
    ) {
      const normalizedSlug = slug.trim();
      const title = input.title.trim();
      const description = (input.description ?? '').trim();
      const categoryId = (input.categoryId ?? '').trim();

      if (!normalizedSlug || !title) {
        throw createAppError('validation_error', 'Slug and title are required.');
      }

      const category = categoryId ? await repository.getCategoryById(categoryId) : null;
      if (categoryId && !category) {
        throw createAppError('category_not_found', 'Category not found.');
      }

      const media = buildMediaPayload({ previewKind: input.previewKind, previewPath: input.previewPath });
      const visibility = normalizeVisibility(input.visibility);

      const updated = await repository.updateModel({
        slug: normalizedSlug,
        title,
        description,
        visibility,
        categoryId: category?.id ?? null,
        categoryTitle: category?.title ?? null,
        assetPath: media.assetPath,
        previewKind: media.previewKind,
        previewPath: media.previewPath,
      });

      if (!updated) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return updated;
    },
    async deleteModelCard(modelSlug: string) {
      const normalizedModelSlug = modelSlug.trim();

      if (!normalizedModelSlug) {
        throw createAppError('validation_error', 'modelSlug is required.');
      }

      const deleted = await repository.deleteModel(normalizedModelSlug);

      if (!deleted) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return { ok: true as const };
    },
    async updateModelContent(
      modelSlug: string,
      input: {
        deviceDescription?: string;
        contentSections?: ModelContentSectionItem[];
        specifications?: ModelSpecificationItem[];
      },
    ) {
      const normalizedModelSlug = modelSlug.trim();
      if (!normalizedModelSlug) {
        throw createAppError('validation_error', 'modelSlug is required.');
      }

      const deviceDescription = (input.deviceDescription ?? '').trim();
      const contentSections = normalizeContentSections(input.contentSections, deviceDescription);
      const specifications = normalizeSpecifications(input.specifications);

      const updated = await repository.updateModelContent({
        modelSlug: normalizedModelSlug,
        deviceDescription,
        contentSections,
        specifications,
      });

      if (!updated) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return updated;
    },
    async upsertModelPart(
      modelSlug: string,
      input: {
        partId: string;
        title: string;
        description?: string;
        meshIndexes: number[];
        silhouette?: Partial<ModelPartSilhouetteSettings>;
      },
    ) {
      const normalizedModelSlug = modelSlug.trim();
      const normalizedPartId = normalizePartId(input.partId);
      const title = input.title.trim();
      const description = (input.description ?? '').trim();
      const meshIndexes = sanitizeMeshIndexes(input.meshIndexes);
      const silhouette = normalizePartSilhouetteSettings(input.silhouette);

      if (!normalizedModelSlug || !normalizedPartId || !title) {
        throw createAppError('validation_error', 'modelSlug, partId and title are required.');
      }

      const existingParts = await repository.getPartsByModelSlug(normalizedModelSlug);

      if (existingParts === null) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      const conflictingMeshIndexes = findMeshIndexConflicts(existingParts, normalizedPartId, meshIndexes);

      if (conflictingMeshIndexes.length > 0) {
        throw createAppError(
          'mesh_indexes_conflict',
          `Mesh indexes already assigned: ${conflictingMeshIndexes.join(', ')}`,
        );
      }

      const part = await repository.upsertPart({
        modelSlug: normalizedModelSlug,
        partId: normalizedPartId,
        title,
        description,
        meshIndexes,
        silhouette,
      });

      if (!part) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      return part;
    },
    async deleteModelPart(modelSlug: string, partId: string) {
      const normalizedModelSlug = modelSlug.trim();
      const normalizedPartId = normalizePartId(partId);

      if (!normalizedModelSlug || !normalizedPartId) {
        throw createAppError('validation_error', 'modelSlug and partId are required.');
      }

      const result = await repository.deletePart(normalizedModelSlug, normalizedPartId);

      if (result === null) {
        throw createAppError('model_not_found', 'Model not found.');
      }

      if (!result) {
        throw createAppError('part_not_found', 'Part not found.');
      }

      return { ok: true as const };
    },
  };
};

export { DEFAULT_MODEL_EXPLOSION_SETTINGS };
export { DEFAULT_MODEL_PREVIEW_CAMERA_SETTINGS };
export { DEFAULT_MODEL_DISASSEMBLY_CAMERA_PRESET };

