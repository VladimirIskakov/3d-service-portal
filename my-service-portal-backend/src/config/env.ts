import 'dotenv/config';
import type { AppConfig } from './types.js';
import type { DatabaseProvider } from '../shared/db/types.js';

const parseNumber = (raw: string | undefined, fallback: number) => {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const normalizeOrigin = (value: string) => value.trim().toLowerCase().replace(/\/+$/, '');

const parseList = (raw: string | undefined) => {
  return (raw ?? '')
    .split(',')
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
};

const parseDbProvider = (raw: string | undefined): DatabaseProvider => {
  const value = (raw ?? 'firestore').trim().toLowerCase();

  if (value === 'firestore') {
    return value;
  }

  throw new Error(`Unsupported DB_PROVIDER: ${value}`);
};

export const loadAppConfig = (): AppConfig => {
  const frontendOrigins = parseList(process.env.FRONTEND_ORIGIN);

  return {
    port: parseNumber(process.env.PORT, 8787),
    host: (process.env.HOST ?? '0.0.0.0').trim(),
    dbProvider: parseDbProvider(process.env.DB_PROVIDER),
    frontendOrigins: frontendOrigins.length > 0 ? frontendOrigins : ['http://localhost:5173'],
    firebaseWebApiKey: (process.env.FIREBASE_WEB_API_KEY ?? '').trim(),
    firebaseProjectId: (process.env.FIREBASE_PROJECT_ID ?? '').trim(),
    firebaseServiceAccountJson: (process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '').trim(),
    adminAllowedEmails: parseList(process.env.ADMIN_ALLOWED_EMAILS),
    sessionSecret: (process.env.ADMIN_SESSION_SECRET ?? '').trim(),
    sessionTtlSeconds: parseNumber(process.env.ADMIN_SESSION_TTL_SECONDS, 60 * 60 * 12),
    sessionCookieName:
      (process.env.ADMIN_SESSION_COOKIE_NAME ?? 'admin_session').trim() || 'admin_session',
    isProduction: process.env.NODE_ENV === 'production',
  };
};

export const assertAppConfig = (config: AppConfig) => {
  const missing: string[] = [];

  if (!config.firebaseWebApiKey) {
    missing.push('FIREBASE_WEB_API_KEY');
  }

  if (!config.sessionSecret) {
    missing.push('ADMIN_SESSION_SECRET');
  }

  if (config.dbProvider === 'firestore') {
    if (!config.firebaseProjectId) {
      missing.push('FIREBASE_PROJECT_ID');
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required backend env vars: ${missing.join(', ')}`);
  }
};
