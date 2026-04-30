import type { AppConfig } from '../../config/types.js';
import { signInWithFirebasePassword } from '../../integrations/firebase/firebaseIdentityToolkit.js';
import { createAppError, getErrorCode } from '../../shared/errors/index.js';
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '../../shared/security/adminSessionToken.js';
import type { AdminAuthUser, UserRole } from './adminAuth.types.js';

export interface AdminAuthService {
  readSession(token?: string): AdminAuthUser | null;
  login(login: string, password: string): Promise<{ user: AdminAuthUser; token: string }>;
}

export interface AdminAuthServiceError extends Error {
  code: string;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const createServiceError = (code: string, message: string): AdminAuthServiceError =>
  createAppError(code, message);

const resolveUserRole = (email: string, config: AppConfig): UserRole | null => {
  const roleLists: Array<{ role: UserRole; emails: string[] }> = [
    { role: 'admin', emails: config.adminAllowedEmails },
    { role: 'manager', emails: config.managerAllowedEmails },
    { role: 'engineer', emails: config.engineerAllowedEmails },
    { role: 'viewer', emails: config.viewerAllowedEmails },
  ];

  if (roleLists.every((entry) => entry.emails.length === 0)) {
    return 'admin';
  }

  return roleLists.find((entry) => entry.emails.includes(email))?.role ?? null;
};

export const createAdminAuthService = (config: AppConfig): AdminAuthService => {
  return {
    readSession(token?: string) {
      if (!token) {
        return null;
      }

      const payload = verifyAdminSessionToken(token, config.sessionSecret);

      if (!payload) {
        return null;
      }

      return {
        uid: payload.uid,
        email: payload.email,
        role: payload.role,
      };
    },

    async login(login, password) {
      if (!login || !password) {
        throw createServiceError('validation_error', 'Login and password are required.');
      }

      if (!config.firebaseWebApiKey || !config.sessionSecret) {
        throw createServiceError('server_misconfigured', 'Backend auth env is not configured.');
      }

      let firebaseUser;

      try {
        firebaseUser = await signInWithFirebasePassword(config.firebaseWebApiKey, login, password);
      } catch (error) {
        const code = getErrorCode(error, 'firebase_auth_failed');

        throw createServiceError(code, 'Firebase authorization failed.');
      }

      const normalizedEmail = normalizeEmail(firebaseUser.email);

      const role = resolveUserRole(normalizedEmail, config);
      if (!role) {
        throw createServiceError('admin_forbidden', 'User is not in admin allowlist.');
      }

      const now = Math.floor(Date.now() / 1000);
      const token = createAdminSessionToken(
        {
          uid: firebaseUser.uid,
          email: normalizedEmail,
          role,
          iat: now,
          exp: now + config.sessionTtlSeconds,
        },
        config.sessionSecret,
      );

      const user: AdminAuthUser = {
        uid: firebaseUser.uid,
        email: normalizedEmail,
        role,
      };

      return { user, token };
    },
  };
};
