import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../../config/types.js';
import { sendError } from '../../shared/http/sendError.js';
import type { AdminAuthService } from './adminAuth.service.js';
import type { UserRole } from './adminAuth.types.js';

export const requireRoleSession = (
  request: FastifyRequest,
  reply: FastifyReply,
  authService: AdminAuthService,
  config: AppConfig,
  allowedRoles: readonly UserRole[],
) => {
  const user = authService.readSession(request.cookies[config.sessionCookieName]);

  if (!user) {
    sendError(reply, 401, 'unauthorized', 'Session required.');
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    sendError(reply, 403, 'forbidden', 'Insufficient permissions.');
    return null;
  }

  return user;
};

export const requireAdminSession = (
  request: FastifyRequest,
  reply: FastifyReply,
  authService: AdminAuthService,
  config: AppConfig,
) => requireRoleSession(request, reply, authService, config, ['admin']);
