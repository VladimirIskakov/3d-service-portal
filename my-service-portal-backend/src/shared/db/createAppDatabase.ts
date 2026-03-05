import type { AppConfig } from '../../config/types.js';
import { createFirestoreAppDatabase } from './providers/firestore/createFirestoreAppDatabase.js';
import type { AppDatabase } from './types.js';

export const createAppDatabase = (config: AppConfig): AppDatabase => {
  const provider = config.dbProvider;

  switch (provider) {
    case 'firestore':
      return createFirestoreAppDatabase(config);
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unsupported DB provider: ${String(exhaustive)}`);
    }
  }
};

