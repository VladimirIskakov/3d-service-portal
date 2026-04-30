import type { AppConfig } from '../../../../config/types.js';
import { getFirebaseAdminFirestore } from '../../../../integrations/firebase/firebaseAdmin.js';
import { createFirestoreAdminAuditLogRepository } from './admin-audit/createFirestoreAdminAuditLogRepository.js';
import { createFirestoreModelCatalogRepository } from './model-catalog/createFirestoreModelCatalogRepository.js';
import { seedFirestoreModelCatalogIfNeeded } from './model-catalog/seedFirestoreModelCatalog.js';
import { createFirestoreServiceManagementRepository } from './service-management/createFirestoreServiceManagementRepository.js';
import type { AppDatabase } from '../../types.js';

export const createFirestoreAppDatabase = (config: AppConfig): AppDatabase => {
  const firestore = getFirebaseAdminFirestore(config);
  const modelCatalogRepository = createFirestoreModelCatalogRepository(firestore);
  const adminAuditLogRepository = createFirestoreAdminAuditLogRepository(firestore);
  const serviceManagementRepository = createFirestoreServiceManagementRepository(firestore);

  return {
    provider: 'firestore',
    async bootstrap() {
      await seedFirestoreModelCatalogIfNeeded(firestore);
    },
    repositories: {
      modelCatalog: modelCatalogRepository,
      adminAuditLog: adminAuditLogRepository,
      serviceManagement: serviceManagementRepository,
    },
  };
};
