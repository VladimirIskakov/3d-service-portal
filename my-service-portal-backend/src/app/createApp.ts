import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { STORAGE_DIR } from '../config/paths.js';
import type { AppConfig } from '../config/types.js';
import { registerAdminAuditRoutes } from '../modules/admin-audit/adminAudit.routes.js';
import { registerAdminCatalogRoutes } from '../modules/admin-catalog/adminCatalog.routes.js';
import { registerAdminAuthRoutes } from '../modules/admin-auth/adminAuth.routes.js';
import { registerModelCatalogRoutes } from '../modules/model-catalog/modelCatalog.routes.js';
import { createAppDatabase } from '../shared/db/index.js';

export const createApp = async (config: AppConfig) => {
  const app = Fastify({
    logger: true,
  });
  const database = createAppDatabase(config);

  await database.bootstrap();

  await app.register(cookie);

  await app.register(cors, {
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, config.frontendOrigins.includes(origin));
    },
  });

  await app.register(fastifyStatic, {
    root: STORAGE_DIR,
    prefix: '/files/',
    decorateReply: false,
  });

  await registerAdminAuthRoutes(app, config);
  await registerAdminAuditRoutes(app, config, database);
  await registerAdminCatalogRoutes(app, config, database);
  await registerModelCatalogRoutes(app, database);

  app.get('/api/health', async () => ({ ok: true }));

  return app;
};
