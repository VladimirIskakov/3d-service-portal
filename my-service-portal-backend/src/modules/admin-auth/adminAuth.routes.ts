import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config/types.js';
import { getErrorCode } from '../../shared/errors/index.js';
import { getAdminSessionCookieOptions } from '../../shared/http/adminSessionCookie.js';
import { sendError } from '../../shared/http/sendError.js';
import { createAdminAuthService } from './adminAuth.service.js';
import type { AdminLoginBody, AdminSessionResponse, AdminUserDirectoryItem, UserRole } from './adminAuth.types.js';

const getErrorStatusCode = (code: string) => {
  switch (code) {
    case 'validation_error':
      return 400;
    case 'invalid_credentials':
      return 401;
    case 'admin_forbidden':
      return 403;
    case 'server_misconfigured':
      return 500;
    default:
      return 502;
  }
};

const unauthenticatedResponse: AdminSessionResponse = {
  authenticated: false,
  user: null,
};

const buildUserDirectory = (config: AppConfig): AdminUserDirectoryItem[] => {
  const roleEntries: Array<{ role: UserRole; emails: string[] }> = [
    { role: 'admin', emails: config.adminAllowedEmails },
    { role: 'manager', emails: config.managerAllowedEmails },
    { role: 'engineer', emails: config.engineerAllowedEmails },
    { role: 'viewer', emails: config.viewerAllowedEmails },
  ];

  const byEmail = new Map<string, AdminUserDirectoryItem>();
  roleEntries.forEach(({ role, emails }) => {
    emails.forEach((email) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || byEmail.has(normalizedEmail)) {
        return;
      }

      byEmail.set(normalizedEmail, { email: normalizedEmail, role });
    });
  });

  return Array.from(byEmail.values()).sort((left, right) => (
    left.role.localeCompare(right.role) || left.email.localeCompare(right.email)
  ));
};

export const registerAdminAuthRoutes = async (app: FastifyInstance, config: AppConfig) => {
  const authService = createAdminAuthService(config);

  app.get('/api/admin/session', async (request) => {
    const user = authService.readSession(request.cookies[config.sessionCookieName]);

    if (!user) {
      return unauthenticatedResponse;
    }

    return {
      authenticated: true,
      user,
    } satisfies AdminSessionResponse;
  });

  app.get('/api/admin/users', async (request, reply) => {
    const user = authService.readSession(request.cookies[config.sessionCookieName]);

    if (!user) {
      return sendError(reply, 401, 'unauthorized', 'Session is required.');
    }

    return {
      items: buildUserDirectory(config),
    };
  });

  app.post<{ Body: AdminLoginBody }>('/api/admin/login', async (request, reply) => {
    const login = typeof request.body?.login === 'string' ? request.body.login.trim() : '';
    const password = typeof request.body?.password === 'string' ? request.body.password : '';

    try {
      const { user, token } = await authService.login(login, password);

      reply.setCookie(
        config.sessionCookieName,
        token,
        getAdminSessionCookieOptions(config, request.headers.origin),
      );

      return {
        authenticated: true,
        user,
      } satisfies AdminSessionResponse;
    } catch (error) {
      const code = getErrorCode(error, 'auth_error');

      if (code === 'admin_forbidden') {
        reply.clearCookie(config.sessionCookieName, { path: '/' });
      }

      return sendError(reply, getErrorStatusCode(code), code, 'Authorization failed.');
    }
  });

  app.post('/api/admin/logout', async (_request, reply) => {
    reply.clearCookie(config.sessionCookieName, { path: '/' });

    return {
      ok: true as const,
    };
  });
};
