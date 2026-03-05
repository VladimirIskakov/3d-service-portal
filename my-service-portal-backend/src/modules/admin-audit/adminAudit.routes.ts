import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config/types.js';
import type { AppDatabase } from '../../shared/db/types.js';
import { sendError } from '../../shared/http/sendError.js';
import { createAdminAuthService } from '../admin-auth/adminAuth.service.js';
import { requireAdminSession } from '../admin-auth/requireAdminSession.js';

interface ListAuditLogsQuery {
  limit?: string;
  cursor?: string;
  action?: string;
  targetType?: string;
  actorEmail?: string;
  targetId?: string;
}

const parseLimit = (value: string | undefined) => {
  if (!value || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const registerAdminAuditRoutes = async (
  app: FastifyInstance,
  config: AppConfig,
  database: AppDatabase,
) => {
  const authService = createAdminAuthService(config);

  app.get<{ Querystring: ListAuditLogsQuery }>(
    '/api/admin/audit-logs',
    async (request, reply) => {
      if (!requireAdminSession(request, reply, authService, config)) {
        return;
      }

      const parsedLimit = parseLimit(request.query.limit);
      if (Number.isNaN(parsedLimit)) {
        return sendError(reply, 400, 'validation_error', 'limit must be a number.');
      }

      const result = await database.repositories.adminAuditLog.list({
        limit: parsedLimit,
        cursor: request.query.cursor ?? null,
        action: request.query.action,
        targetType: request.query.targetType,
        actorEmail: request.query.actorEmail,
        targetId: request.query.targetId,
      });

      return result;
    },
  );
};
