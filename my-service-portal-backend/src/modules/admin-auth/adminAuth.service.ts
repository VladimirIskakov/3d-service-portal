import type { AppConfig } from '../../config/types.js';
import { signInWithFirebasePassword } from '../../integrations/firebase/firebaseIdentityToolkit.js';
import { createAppError, getErrorCode } from '../../shared/errors/index.js';
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '../../shared/security/adminSessionToken.js';
import type { AdminAuthUser } from './adminAuth.types.js';

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
        role: 'admin',
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

      if (
        config.adminAllowedEmails.length > 0 &&
        !config.adminAllowedEmails.includes(normalizedEmail)
      ) {
        throw createServiceError('admin_forbidden', 'User is not in admin allowlist.');
      }

      const now = Math.floor(Date.now() / 1000);
      const token = createAdminSessionToken(
        {
          uid: firebaseUser.uid,
          email: normalizedEmail,
          role: 'admin',
          iat: now,
          exp: now + config.sessionTtlSeconds,
        },
        config.sessionSecret,
      );

      const user: AdminAuthUser = {
        uid: firebaseUser.uid,
        email: normalizedEmail,
        role: 'admin',
      };

      return { user, token };
    },
  };
};
