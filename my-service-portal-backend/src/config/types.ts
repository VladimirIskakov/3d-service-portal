import type { DatabaseProvider } from '../shared/db/types.js';

export interface AppConfig {
  port: number;
  host: string;
  dbProvider: DatabaseProvider;
  frontendOrigins: string[];
  firebaseWebApiKey: string;
  firebaseProjectId: string;
  firebaseServiceAccountJson: string;
  adminAllowedEmails: string[];
  sessionSecret: string;
  sessionTtlSeconds: number;
  sessionCookieName: string;
  isProduction: boolean;
}
