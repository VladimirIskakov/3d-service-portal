import type { AppConfig } from '../../config/types.js';

export const getAdminSessionCookieOptions = (config: AppConfig) => {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.isProduction,
    maxAge: config.sessionTtlSeconds,
  };
};

