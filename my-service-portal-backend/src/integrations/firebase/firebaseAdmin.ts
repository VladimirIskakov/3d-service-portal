import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { AppConfig } from '../../config/types.js';

const parseServiceAccountJson = (rawJson: string) => {
  if (!rawJson) {
    return null;
  }

  const normalizedJson = rawJson.includes('\\n')
    ? rawJson.replace(/\\n/g, '\n')
    : rawJson;

  try {
    return JSON.parse(normalizedJson) as Record<string, unknown>;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
  }
};

export const getFirebaseAdminFirestore = (config: AppConfig) => {
  const existingApp = getApps()[0];

  const app =
    existingApp ??
    initializeApp({
      projectId: config.firebaseProjectId,
      credential: (() => {
        const serviceAccount = parseServiceAccountJson(config.firebaseServiceAccountJson);
        return serviceAccount ? cert(serviceAccount) : applicationDefault();
      })(),
    });

  return getFirestore(app);
};
