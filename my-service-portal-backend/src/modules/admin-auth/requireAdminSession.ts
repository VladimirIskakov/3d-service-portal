import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../../config/types.js';
import { sendError } from '../../shared/http/sendError.js';
import type { AdminAuthService } from './adminAuth.service.js';

export const requireAdminSession = (
  request: FastifyRequest,
  reply: FastifyReply,
  authService: AdminAuthService,
  config: AppConfig,
) => {
  const user = authService.readSession(request.cookies[config.sessionCookieName]);

  if (!user) {
    sendError(reply, 401, 'unauthorized', 'Admin session required.');
    return null;
  }

  return user;
};

