import type { FastifyInstance } from 'fastify';
import type { AppDatabase } from '../../shared/db/types.js';
import { getErrorCode } from '../../shared/errors/index.js';
import { sendError } from '../../shared/http/sendError.js';
import { createModelCatalogService } from './modelCatalog.service.js';

export const registerModelCatalogRoutes = async (app: FastifyInstance, database: AppDatabase) => {
  const service = createModelCatalogService(database.repositories.modelCatalog);

  app.get('/api/catalog/categories', async () => {
    return {
      items: await service.listCategories(),
    };
  });

  app.get('/api/catalog/models', async () => {
    return {
      items: await service.listModels(),
    };
  });

  app.get<{ Params: { slug: string } }>('/api/catalog/models/:slug', async (request, reply) => {
    const model = await service.getPublicModelBySlug(request.params.slug);

    if (!model) {
      return sendError(reply, 404, 'model_not_found', 'Model not found.');
    }

    return {
      item: model,
    };
  });

  app.get<{ Params: { slug: string } }>('/api/catalog/models/:slug/parts', async (request, reply) => {
    const parts = await service.getPartsByModelSlug(request.params.slug);

    if (parts === null) {
      return sendError(reply, 404, 'model_not_found', 'Model not found.');
    }

    return {
      items: parts,
    };
  });

  app.get<{ Params: { slug: string } }>('/api/catalog/models/:slug/meshes', async (request, reply) => {
    const meshes = await service.getMeshesByModelSlug(request.params.slug);

    if (meshes === null) {
      return sendError(reply, 404, 'model_not_found', 'Model not found.');
    }

    return {
      items: meshes,
    };
  });

  app.get<{ Params: { slug: string } }>(
    '/api/catalog/models/:slug/explode-settings',
    async (request, reply) => {
      try {
        return {
          item: await service.getExplosionSettingsByModelSlug(request.params.slug),
        };
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

  app.get<{ Params: { slug: string } }>('/api/catalog/models/:slug/disassembly', async (request, reply) => {
    try {
      const disassembly = await service.getDisassemblyByModelSlug(request.params.slug);

      const model = await service.getPublicModelBySlug(request.params.slug);
      if (!model) {
        return sendError(reply, 404, 'model_not_found', 'Model not found.');
      }

      return { item: disassembly };
    } catch (error) {
      const code = getErrorCode(error, 'catalog_disassembly_failed');
      if (code === 'model_not_found') {
        return sendError(reply, 404, code, 'Model not found.');
      }

      if (code === 'validation_error') {
        return sendError(reply, 400, code, 'Invalid model slug.');
      }

      return sendError(reply, 500, code, 'Failed to load disassembly data.');
    }
  });
};
