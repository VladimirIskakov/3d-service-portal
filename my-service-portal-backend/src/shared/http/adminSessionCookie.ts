import type { AppConfig } from '../../config/types.js';

const normalizeOrigin = (originHeader: string | string[] | undefined) => {
  const raw = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  return (raw ?? '').trim().toLowerCase().replace(/\/+$/, '');
};

const isLocalhostOrigin = (origin: string) => {
  return origin.startsWith('http://localhost') || origin.startsWith('https://localhost');
};

export const getAdminSessionCookieOptions = (
  config: AppConfig,
  requestOrigin?: string | string[],
) => {
  const origin = normalizeOrigin(requestOrigin);
  const isCrossSite = origin.length > 0 && !isLocalhostOrigin(origin);
  const sameSite: 'lax' | 'none' = isCrossSite ? 'none' : 'lax';

  return {
    path: '/',
    httpOnly: true,
    sameSite,
    secure: config.isProduction || isCrossSite,
    maxAge: config.sessionTtlSeconds,
  };
};
