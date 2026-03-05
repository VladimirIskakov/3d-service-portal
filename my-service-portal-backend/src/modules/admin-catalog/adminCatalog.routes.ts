import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config/types.js';
import type { AppDatabase } from '../../shared/db/types.js';
import { getErrorCode } from '../../shared/errors/index.js';
import { sendError } from '../../shared/http/sendError.js';
import { createAdminAuthService } from '../admin-auth/adminAuth.service.js';
import { requireAdminSession } from '../admin-auth/requireAdminSession.js';
import type { AdminAuthUser } from '../admin-auth/adminAuth.types.js';
import { createModelCatalogService } from '../model-catalog/modelCatalog.service.js';
import type {
  ModelDisassemblyStepCameraPreset,
  ModelMeshInfo,
  ModelPartSilhouetteSettings,
} from '../model-catalog/modelCatalog.types.js';
import { createModelStorageService } from '../model-storage/modelStorage.service.js';
import type {
  CreateCatalogCategoryBody,
  CreateCatalogModelCardBody,
  ReplaceCatalogModelMeshesBody,
  UpdateCatalogModelContentBody,
  UpdateCatalogModelCardBody,
  UpdateCatalogModelPreviewCameraBody,
  UpsertCatalogModelDisassemblyBody,
  UpsertCatalogModelExplosionSettingsBody,
  UpsertCatalogModelPartBody,
} from './adminCatalog.types.js';
import { isPreviewKind, isVisibility } from './adminCatalog.types.js';

const resolvePreviewFileFromStorage = (
  storageService: ReturnType<typeof createModelStorageService>,
  previewKind: 'model' | 'image',
  storageFileName: string,
) => {
  return previewKind === 'model'
    ? storageService.getStoredModelByFileName(storageFileName)
    : storageService.getStoredImageByFileName(storageFileName);
};

const parseCardPayload = (body: CreateCatalogModelCardBody | UpdateCatalogModelCardBody) => {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const categoryId = typeof body?.categoryId === 'string' ? body.categoryId.trim() : '';
  const visibility = isVisibility(body?.visibility) ? body.visibility : 'private';
  const previewKind = isPreviewKind(body?.previewKind) ? body.previewKind : null;
  const storageFileName = typeof body?.storageFileName === 'string' ? body.storageFileName.trim() : '';

  return { title, description, categoryId, visibility, previewKind, storageFileName };
};

interface ResolvedCatalogCardCommand {
  title: string;
  description: string;
  categoryId: string | null;
  visibility: 'public' | 'private';
  previewKind: 'model' | 'image';
  previewPath: string;
}

const parseCategoryPayload = (body: CreateCatalogCategoryBody) => {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  return { title, description };
};

interface ResolvedCatalogPartCommand {
  partId: string;
  title: string;
  description: string;
  meshIndexes: number[];
  silhouette?: Partial<ModelPartSilhouetteSettings>;
}

const resolveCatalogCardCommand = (
  body: CreateCatalogModelCardBody | UpdateCatalogModelCardBody,
  storageService: ReturnType<typeof createModelStorageService>,
): ResolvedCatalogCardCommand | { error: 'validation_error' | 'storage_file_not_found' } => {
  const { title, description, categoryId, visibility, previewKind, storageFileName } = parseCardPayload(body);

  if (!title || !previewKind || !storageFileName) {
    return { error: 'validation_error' };
  }

  const storedFile = resolvePreviewFileFromStorage(storageService, previewKind, storageFileName);
  if (!storedFile) {
    return { error: 'storage_file_not_found' };
  }

  return {
    title,
    description,
    categoryId: categoryId || null,
    visibility,
    previewKind,
    previewPath: storedFile.publicPath,
  };
};

const sendCatalogValidationError = (
  reply: Parameters<typeof sendError>[0],
  error: 'validation_error' | 'storage_file_not_found',
) => {
  if (error === 'validation_error') {
    return sendError(reply, 400, error, 'title, previewKind and storageFileName are required.');
  }

  return sendError(reply, 400, error, 'Selected storage file not found.');
};

const sendCatalogMutationError = (
  reply: Parameters<typeof sendError>[0],
  code: string,
  fallback: 'catalog_create_failed' | 'catalog_update_failed' | 'catalog_delete_failed',
) => {
  if (code === 'validation_error') {
    return sendError(reply, 400, code, 'Invalid card payload.');
  }

  if (code === 'category_not_found') {
    return sendError(reply, 404, code, 'Category not found.');
  }

  if (code === 'model_not_found') {
    return sendError(reply, 404, code, 'Model card not found.');
  }

  if (code === 'model_slug_conflict') {
    return sendError(reply, 409, code, 'Model slug conflict.');
  }

  return sendError(
    reply,
    500,
    code,
    fallback === 'catalog_create_failed'
      ? 'Failed to create model card.'
      : fallback === 'catalog_update_failed'
        ? 'Failed to update model card.'
        : 'Failed to delete model card.',
  );
};

const parseMeshIndexes = (raw: unknown): number[] | null => {
  if (Array.isArray(raw)) {
    const parsed = raw
      .map((value) => (typeof value === 'number' ? value : Number(value)))
      .filter((value) => Number.isInteger(value) && value >= 0);
    return parsed;
  }

  if (typeof raw === 'string') {
    const normalized = raw.trim();
    if (!normalized) {
      return [];
    }

    const parts = normalized.split(',').map((item) => item.trim()).filter(Boolean);
    const numbers = parts.map((item) => Number(item));
    if (numbers.some((value) => !Number.isInteger(value) || value < 0)) {
      return null;
    }

    return numbers;
  }

  return null;
};

const resolveCatalogPartCommand = (
  body: UpsertCatalogModelPartBody,
): ResolvedCatalogPartCommand | { error: 'validation_error' } => {
  const partId = typeof body?.partId === 'string' ? body.partId.trim() : '';
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const meshIndexes = parseMeshIndexes(body?.meshIndexes);
  let silhouette: Partial<ModelPartSilhouetteSettings> | undefined;

  if (body?.silhouette !== undefined) {
    if (typeof body.silhouette !== 'object' || body.silhouette === null) {
      return { error: 'validation_error' };
    }

    const raw = body.silhouette as Record<string, unknown>;
    const opacity = raw.opacity === undefined ? undefined : toFiniteNumber(raw.opacity);
    const edgeThresholdAngle = raw.edgeThresholdAngle === undefined ? undefined : toFiniteNumber(raw.edgeThresholdAngle);
    const showEdges = raw.showEdges === undefined ? undefined : raw.showEdges;

    if (
      (raw.opacity !== undefined && opacity === null)
      || (raw.edgeThresholdAngle !== undefined && edgeThresholdAngle === null)
      || (raw.showEdges !== undefined && typeof showEdges !== 'boolean')
    ) {
      return { error: 'validation_error' };
    }

    const nextSilhouette: Partial<ModelPartSilhouetteSettings> = {};
    if (opacity !== undefined && opacity !== null) {
      nextSilhouette.opacity = opacity;
    }
    if (edgeThresholdAngle !== undefined && edgeThresholdAngle !== null) {
      nextSilhouette.edgeThresholdAngle = edgeThresholdAngle;
    }
    if (typeof showEdges === 'boolean') {
      nextSilhouette.showEdges = showEdges;
    }
    silhouette = nextSilhouette;
  }

  if (!partId || !title || meshIndexes === null) {
    return { error: 'validation_error' };
  }

  return { partId, title, description, meshIndexes, silhouette };
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseExplosionSettingsPayload = (body: UpsertCatalogModelExplosionSettingsBody) => {
  const minDistance = toFiniteNumber(body?.minDistance);
  const maxDistance = toFiniteNumber(body?.maxDistance);
  const axisSnapRatio = toFiniteNumber(body?.axisSnapRatio);
  const coreVerticalSplitFactor = toFiniteNumber(body?.coreVerticalSplitFactor);
  const coreVerticalBiasRatio = toFiniteNumber(body?.coreVerticalBiasRatio);

  if (
    minDistance === null
    || maxDistance === null
    || axisSnapRatio === null
    || coreVerticalSplitFactor === null
    || coreVerticalBiasRatio === null
  ) {
    return null;
  }

  return {
    minDistance,
    maxDistance,
    axisSnapRatio,
    coreVerticalSplitFactor,
    coreVerticalBiasRatio,
  };
};

const parseMeshesPayload = (body: ReplaceCatalogModelMeshesBody): ModelMeshInfo[] | null => {
  if (!body || !Array.isArray(body.items)) {
    return null;
  }

  const items: ModelMeshInfo[] = [];

  for (const raw of body.items) {
    if (typeof raw !== 'object' || !raw) {
      return null;
    }

    const item = raw as Record<string, unknown>;
    const meshIndex = Number(item.meshIndex);
    if (!Number.isInteger(meshIndex) || meshIndex < 0) {
      return null;
    }

    items.push({
      meshIndex,
      nodeName: typeof item.nodeName === 'string' ? item.nodeName : '',
      meshName: typeof item.meshName === 'string' ? item.meshName : '',
      label: typeof item.label === 'string' ? item.label : '',
    });
  }

  return items;
};

const parseModelContentPayload = (body: UpdateCatalogModelContentBody) => {
  const deviceDescription = typeof body?.deviceDescription === 'string' ? body.deviceDescription.trim() : '';

  if (!Array.isArray(body?.specifications)) {
    return {
      deviceDescription,
      specifications: [],
    };
  }

  const specifications = body.specifications
    .map((item, index) => {
      if (typeof item !== 'object' || !item) {
        return null;
      }

      const raw = item as Record<string, unknown>;
      const label = typeof raw.label === 'string' ? raw.label.trim() : '';
      const value = typeof raw.value === 'string' ? raw.value.trim() : '';
      const id = typeof raw.id === 'string' ? raw.id.trim() : `spec-${index + 1}`;

      if (!label && !value) {
        return null;
      }

      return { id, label, value };
    })
    .filter((item): item is { id: string; label: string; value: string } => Boolean(item));

  return {
    deviceDescription,
    specifications,
  };
};

const parsePreviewCameraPayload = (body: UpdateCatalogModelPreviewCameraBody) => {
  const position = Array.isArray(body?.position) ? body.position.map((item) => Number(item)) : null;
  const fov = toFiniteNumber(body?.fov);

  if (!position || position.length < 3 || position.some((value) => !Number.isFinite(value)) || fov === null) {
    return null;
  }

  return {
    position: [Number(position[0]), Number(position[1]), Number(position[2])] as [number, number, number],
    fov,
  };
};

const parseDisassemblyCameraPreset = (value: unknown): ModelDisassemblyStepCameraPreset | null => {
  if (typeof value !== 'object' || !value) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const position = Array.isArray(raw.position) ? raw.position.map((item) => Number(item)) : null;
  const target = Array.isArray(raw.target) ? raw.target.map((item) => Number(item)) : null;
  const fov = toFiniteNumber(raw.fov);

  if (
    !position
    || position.length < 3
    || position.some((item) => !Number.isFinite(item))
    || !target
    || target.length < 3
    || target.some((item) => !Number.isFinite(item))
    || fov === null
  ) {
    return null;
  }

  return {
    position: [position[0], position[1], position[2]],
    target: [target[0], target[1], target[2]],
    fov,
  };
};

const parseDisassemblyPayload = (body: UpsertCatalogModelDisassemblyBody) => {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!Array.isArray(body?.steps)) {
    return null;
  }

  const steps = body.steps
    .map((step, index) => {
      if (typeof step !== 'object' || !step) {
        return null;
      }

      const raw = step as Record<string, unknown>;
      const id = typeof raw.id === 'string' ? raw.id.trim() : `step-${index + 1}`;
      const stepTitle = typeof raw.title === 'string' ? raw.title.trim() : '';
      const description = typeof raw.description === 'string' ? raw.description.trim() : '';
      const partId = typeof raw.partId === 'string' && raw.partId.trim() ? raw.partId.trim() : null;
      const focusMeshIndexRaw = raw.focusMeshIndex;
      const focusMeshIndex =
        focusMeshIndexRaw === null || focusMeshIndexRaw === undefined || focusMeshIndexRaw === ''
          ? null
          : Number(focusMeshIndexRaw);
      const cameraPreset = parseDisassemblyCameraPreset(raw.cameraPreset);

      if (
        !cameraPreset
        || (!stepTitle && !description)
        || (focusMeshIndex !== null && (!Number.isInteger(focusMeshIndex) || focusMeshIndex < 0))
      ) {
        return null;
      }

      return {
        id,
        title: stepTitle,
        description,
        partId,
        focusMeshIndex: partId ? focusMeshIndex : null,
        cameraPreset,
      };
    })
    .filter(Boolean);

  if (steps.length !== body.steps.length) {
    return null;
  }

  return {
    title,
    steps: steps as Array<{
      id: string;
      title: string;
      description: string;
      partId: string | null;
      focusMeshIndex: number | null;
      cameraPreset: ModelDisassemblyStepCameraPreset;
    }>,
  };
};

const sendCatalogPartMutationError = (
  reply: Parameters<typeof sendError>[0],
  code: string,
  fallback:
    | 'catalog_part_upsert_failed'
    | 'catalog_part_delete_failed'
    | 'catalog_meshes_replace_failed'
    | 'catalog_explode_settings_failed'
    | 'catalog_content_update_failed'
    | 'catalog_preview_camera_failed'
    | 'catalog_disassembly_failed',
) => {
  if (code === 'validation_error') {
    return sendError(reply, 400, code, 'Invalid payload.');
  }

  if (code === 'model_not_found') {
    return sendError(reply, 404, code, 'Model not found.');
  }

  if (code === 'part_not_found') {
    return sendError(reply, 404, code, 'Part not found.');
  }

  if (code === 'mesh_indexes_conflict') {
    return sendError(reply, 409, code, 'Some mesh indexes are already assigned to another part.');
  }

  const messages: Record<typeof fallback, string> = {
    catalog_part_upsert_failed: 'Failed to save model part.',
    catalog_part_delete_failed: 'Failed to delete model part.',
    catalog_meshes_replace_failed: 'Failed to save model mesh catalog.',
    catalog_explode_settings_failed: 'Failed to save explosion settings.',
    catalog_content_update_failed: 'Failed to save model content.',
    catalog_preview_camera_failed: 'Failed to save preview camera settings.',
    catalog_disassembly_failed: 'Failed to save disassembly steps.',
  };

  return sendError(reply, 500, code, messages[fallback]);
};

const appendAdminAuditLog = async (
  app: FastifyInstance,
  database: AppDatabase,
  actor: AdminAuthUser,
  entry: {
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown>;
  },
) => {
  try {
    await database.repositories.adminAuditLog.append({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      details: entry.details,
    });
  } catch (error) {
    app.log.error(
      {
        err: error,
        actorUid: actor.uid,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
      },
      'Failed to append admin audit log',
    );
  }
};

export const registerAdminCatalogRoutes = async (
  app: FastifyInstance,
  config: AppConfig,
  database: AppDatabase,
) => {
  const authService = createAdminAuthService(config);
  const catalogService = createModelCatalogService(database.repositories.modelCatalog);
  const storageService = createModelStorageService();

  app.get('/api/admin/catalog/categories', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    return {
      items: await catalogService.listCategories(),
    };
  });

  app.get('/api/admin/storage/models', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    return { items: storageService.listStoredModels() };
  });

  app.get('/api/admin/storage/images', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    return { items: storageService.listStoredImages() };
  });

  app.post<{ Body: CreateCatalogCategoryBody }>('/api/admin/catalog/categories', async (request, reply) => {
    const admin = requireAdminSession(request, reply, authService, config);
    if (!admin) {
      return;
    }

    const payload = parseCategoryPayload(request.body ?? {});

    if (!payload.title) {
      return sendError(reply, 400, 'validation_error', 'Category title is required.');
    }

    try {
      const item = await catalogService.createCategory(payload);
      await appendAdminAuditLog(app, database, admin, {
        action: 'catalog_category_create',
        targetType: 'catalogCategory',
        targetId: item.id,
        details: {
          title: item.title,
        },
      });
      return { item };
    } catch (error) {
      const code = getErrorCode(error, 'catalog_category_create_failed');

      if (code === 'validation_error') {
        return sendError(reply, 400, code, 'Invalid category payload.');
      }

      return sendError(reply, 500, code, 'Failed to create category.');
    }
  });

  app.get('/api/admin/catalog/models', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    return { items: await catalogService.listModelsForAdmin() };
  });

  app.get<{ Params: { slug: string } }>('/api/admin/catalog/models/:slug', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    const item = await catalogService.getModelBySlug(request.params.slug);
    if (!item) {
      return sendError(reply, 404, 'model_not_found', 'Model not found.');
    }

    return { item };
  });

  app.post<{ Body: CreateCatalogModelCardBody }>('/api/admin/catalog/models', async (request, reply) => {
    const admin = requireAdminSession(request, reply, authService, config);
    if (!admin) {
      return;
    }

    const command = resolveCatalogCardCommand(request.body ?? {}, storageService);
    if ('error' in command) {
      return sendCatalogValidationError(reply, command.error);
    }

    try {
      const model = await catalogService.createModelCard(command);
      await appendAdminAuditLog(app, database, admin, {
        action: 'catalog_model_create',
        targetType: 'equipmentModel',
        targetId: model.slug,
        details: {
          title: model.title,
          previewKind: model.previewKind,
          visibility: model.visibility,
        },
      });
      return { item: model };
    } catch (error) {
      return sendCatalogMutationError(reply, getErrorCode(error, 'catalog_create_failed'), 'catalog_create_failed');
    }
  });

  app.put<{ Params: { slug: string }; Body: UpdateCatalogModelCardBody }>(
    '/api/admin/catalog/models/:slug',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      const command = resolveCatalogCardCommand(request.body ?? {}, storageService);
      if ('error' in command) {
        return sendCatalogValidationError(reply, command.error);
      }

      try {
        const model = await catalogService.updateModelCard(request.params.slug, command);
        await appendAdminAuditLog(app, database, admin, {
          action: 'catalog_model_update',
          targetType: 'equipmentModel',
          targetId: request.params.slug,
          details: {
            title: model.title,
            previewKind: model.previewKind,
            visibility: model.visibility,
          },
        });
        return { item: model };
      } catch (error) {
        return sendCatalogMutationError(reply, getErrorCode(error, 'catalog_update_failed'), 'catalog_update_failed');
      }
    },
  );

  app.delete<{ Params: { slug: string } }>('/api/admin/catalog/models/:slug', async (request, reply) => {
    const admin = requireAdminSession(request, reply, authService, config);
    if (!admin) {
      return;
    }

    try {
      const result = await catalogService.deleteModelCard(request.params.slug);
      await appendAdminAuditLog(app, database, admin, {
        action: 'catalog_model_delete',
        targetType: 'equipmentModel',
        targetId: request.params.slug,
      });
      return result;
    } catch (error) {
      return sendCatalogMutationError(reply, getErrorCode(error, 'catalog_delete_failed'), 'catalog_delete_failed');
    }
  });

  app.get<{ Params: { slug: string } }>('/api/admin/catalog/models/:slug/content', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    const item = await catalogService.getModelBySlug(request.params.slug);
    if (!item) {
      return sendError(reply, 404, 'model_not_found', 'Model not found.');
    }

    return {
      item: {
        deviceDescription: item.deviceDescription ?? '',
        specifications: item.specifications ?? [],
      },
    };
  });

  app.put<{ Params: { slug: string }; Body: UpdateCatalogModelContentBody }>(
    '/api/admin/catalog/models/:slug/content',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      const payload = parseModelContentPayload(request.body ?? {});

      try {
        const model = await catalogService.updateModelContent(request.params.slug, payload);
        await appendAdminAuditLog(app, database, admin, {
          action: 'catalog_model_content_update',
          targetType: 'equipmentModel',
          targetId: request.params.slug,
          details: {
            specsCount: model.specifications.length,
            hasDeviceDescription: Boolean(model.deviceDescription.trim()),
          },
        });
        return {
          item: {
            deviceDescription: model.deviceDescription,
            specifications: model.specifications,
          },
        };
      } catch (error) {
        return sendCatalogPartMutationError(reply, getErrorCode(error, 'catalog_content_update_failed'), 'catalog_content_update_failed');
      }
    },
  );

  app.get<{ Params: { slug: string } }>('/api/admin/catalog/models/:slug/disassembly', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    try {
      return { item: await catalogService.getDisassemblyByModelSlug(request.params.slug) };
    } catch (error) {
      return sendCatalogPartMutationError(
        reply,
        getErrorCode(error, 'catalog_disassembly_failed'),
        'catalog_disassembly_failed',
      );
    }
  });

  app.put<{ Params: { slug: string }; Body: UpsertCatalogModelDisassemblyBody }>(
    '/api/admin/catalog/models/:slug/disassembly',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      const payload = parseDisassemblyPayload(request.body ?? {});
      if (!payload) {
        return sendError(reply, 400, 'validation_error', 'Invalid disassembly payload.');
      }

      try {
        const item = await catalogService.upsertDisassemblyByModelSlug(request.params.slug, payload);
        await appendAdminAuditLog(app, database, admin, {
          action: 'catalog_model_disassembly_upsert',
          targetType: 'modelDisassembly',
          targetId: request.params.slug,
          details: {
            title: item.title,
            stepsCount: item.steps.length,
          },
        });
        return { item };
      } catch (error) {
        return sendCatalogPartMutationError(
          reply,
          getErrorCode(error, 'catalog_disassembly_failed'),
          'catalog_disassembly_failed',
        );
      }
    },
  );

  app.get<{ Params: { slug: string } }>('/api/admin/catalog/models/:slug/parts', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    const parts = await catalogService.getPartsByModelSlug(request.params.slug);
    if (parts === null) {
      return sendError(reply, 404, 'model_not_found', 'Model not found.');
    }

    return { items: parts };
  });

  app.post<{ Params: { slug: string }; Body: UpsertCatalogModelPartBody }>(
    '/api/admin/catalog/models/:slug/parts',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      const command = resolveCatalogPartCommand(request.body ?? {});
      if ('error' in command) {
        return sendError(reply, 400, 'validation_error', 'partId, title and meshIndexes are required.');
      }

      try {
        const item = await catalogService.upsertModelPart(request.params.slug, command);
        await appendAdminAuditLog(app, database, admin, {
          action: 'catalog_model_part_upsert',
          targetType: 'modelPart',
          targetId: `${request.params.slug}:${item.id}`,
          details: {
            meshCount: item.meshIndexes.length,
          },
        });
        return { item };
      } catch (error) {
        return sendCatalogPartMutationError(reply, getErrorCode(error, 'catalog_part_upsert_failed'), 'catalog_part_upsert_failed');
      }
    },
  );

  app.put<{ Params: { slug: string; partId: string }; Body: UpsertCatalogModelPartBody }>(
    '/api/admin/catalog/models/:slug/parts/:partId',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      const command = resolveCatalogPartCommand({ ...(request.body ?? {}), partId: request.params.partId });
      if ('error' in command) {
        return sendError(reply, 400, 'validation_error', 'title and meshIndexes are required.');
      }

      try {
        const item = await catalogService.upsertModelPart(request.params.slug, command);
        await appendAdminAuditLog(app, database, admin, {
          action: 'catalog_model_part_upsert',
          targetType: 'modelPart',
          targetId: `${request.params.slug}:${item.id}`,
          details: {
            meshCount: item.meshIndexes.length,
          },
        });
        return { item };
      } catch (error) {
        return sendCatalogPartMutationError(reply, getErrorCode(error, 'catalog_part_upsert_failed'), 'catalog_part_upsert_failed');
      }
    },
  );

  app.delete<{ Params: { slug: string; partId: string } }>(
    '/api/admin/catalog/models/:slug/parts/:partId',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      try {
        const result = await catalogService.deleteModelPart(request.params.slug, request.params.partId);
        await appendAdminAuditLog(app, database, admin, {
          action: 'catalog_model_part_delete',
          targetType: 'modelPart',
          targetId: `${request.params.slug}:${request.params.partId}`,
        });
        return result;
      } catch (error) {
        return sendCatalogPartMutationError(reply, getErrorCode(error, 'catalog_part_delete_failed'), 'catalog_part_delete_failed');
      }
    },
  );

  app.get<{ Params: { slug: string } }>('/api/admin/catalog/models/:slug/meshes', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    const meshes = await catalogService.getMeshesByModelSlug(request.params.slug);
    if (meshes === null) {
      return sendError(reply, 404, 'model_not_found', 'Model not found.');
    }

    return { items: meshes };
  });

  app.put<{ Params: { slug: string }; Body: ReplaceCatalogModelMeshesBody }>(
    '/api/admin/catalog/models/:slug/meshes',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      const meshes = parseMeshesPayload(request.body ?? {});
      if (!meshes) {
        return sendError(reply, 400, 'validation_error', 'items[] mesh catalog payload is required.');
      }

      try {
        const items = await catalogService.replaceModelMeshes(request.params.slug, meshes);
        await appendAdminAuditLog(app, database, admin, {
          action: 'catalog_model_meshes_replace',
          targetType: 'modelMeshCatalog',
          targetId: request.params.slug,
          details: {
            meshCount: items.length,
          },
        });
        return { items };
      } catch (error) {
        return sendCatalogPartMutationError(reply, getErrorCode(error, 'catalog_meshes_replace_failed'), 'catalog_meshes_replace_failed');
      }
    },
  );

  app.get<{ Params: { slug: string } }>('/api/admin/catalog/models/:slug/preview-camera', async (request, reply) => {
    if (!requireAdminSession(request, reply, authService, config)) {
      return;
    }

    try {
      return { item: await catalogService.getPreviewCameraByModelSlug(request.params.slug) };
    } catch (error) {
      const code = getErrorCode(error, 'catalog_preview_camera_failed');
      if (code === 'model_not_found') {
        return sendError(reply, 404, code, 'Model not found.');
      }
      if (code === 'validation_error') {
        return sendError(reply, 400, code, 'Invalid model slug.');
      }
      return sendError(reply, 500, code, 'Failed to load preview camera settings.');
    }
  });

  app.put<{ Params: { slug: string }; Body: UpdateCatalogModelPreviewCameraBody }>(
    '/api/admin/catalog/models/:slug/preview-camera',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      const payload = parsePreviewCameraPayload(request.body ?? {});
      if (!payload) {
        return sendError(reply, 400, 'validation_error', 'Invalid preview camera payload.');
      }

      try {
        const item = await catalogService.updatePreviewCamera(request.params.slug, payload);
        await appendAdminAuditLog(app, database, admin, {
          action: 'catalog_model_preview_camera_update',
          targetType: 'modelPreviewCamera',
          targetId: request.params.slug,
          details: {
            position: item.position,
            fov: item.fov,
          },
        });
        return { item };
      } catch (error) {
        return sendCatalogPartMutationError(reply, getErrorCode(error, 'catalog_preview_camera_failed'), 'catalog_preview_camera_failed');
      }
    },
  );

  app.get<{ Params: { slug: string } }>(
    '/api/admin/catalog/models/:slug/explode-settings',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      try {
        return { item: await catalogService.getExplosionSettingsByModelSlug(request.params.slug) };
      } catch (error) {
        const code = getErrorCode(error, 'catalog_explode_settings_failed');
        if (code === 'model_not_found') {
          return sendError(reply, 404, code, 'Model not found.');
        }
        if (code === 'validation_error') {
          return sendError(reply, 400, code, 'Invalid model slug.');
        }
        return sendError(reply, 500, code, 'Failed to load explosion settings.');
      }
    },
  );

  app.put<{ Params: { slug: string }; Body: UpsertCatalogModelExplosionSettingsBody }>(
    '/api/admin/catalog/models/:slug/explode-settings',
    async (request, reply) => {
      const admin = requireAdminSession(request, reply, authService, config);
      if (!admin) {
        return;
      }

      const payload = parseExplosionSettingsPayload(request.body ?? {});
      if (!payload) {
        return sendError(reply, 400, 'validation_error', 'Invalid explosion settings payload.');
      }

      try {
        const item = await catalogService.upsertExplosionSettings(request.params.slug, payload);
        await appendAdminAuditLog(app, database, admin, {
          action: 'catalog_model_explode_settings_upsert',
          targetType: 'modelExplodeSettings',
          targetId: request.params.slug,
          details: {
            minDistance: item.minDistance,
            maxDistance: item.maxDistance,
            axisSnapRatio: item.axisSnapRatio,
            coreVerticalSplitFactor: item.coreVerticalSplitFactor,
            coreVerticalBiasRatio: item.coreVerticalBiasRatio,
          },
        });
        return { item };
      } catch (error) {
        return sendCatalogPartMutationError(reply, getErrorCode(error, 'catalog_explode_settings_failed'), 'catalog_explode_settings_failed');
      }
    },
  );
};
