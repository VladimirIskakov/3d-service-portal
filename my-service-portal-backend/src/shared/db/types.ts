import type { ModelCatalogRepository } from '../../modules/model-catalog/modelCatalog.types.js';
import type { ServiceManagementRepository } from '../../modules/service-management/serviceManagement.types.js';

export type DatabaseProvider = 'firestore';

export interface AdminAuditLogEntryInput {
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}

export interface AdminAuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAuditLogListQuery {
  limit?: number;
  cursor?: string | null;
  action?: string;
  targetType?: string;
  actorEmail?: string;
  targetId?: string;
}

export interface AdminAuditLogListResult {
  items: AdminAuditLogEntry[];
  nextCursor: string | null;
}

export interface AdminAuditLogRepository {
  append(entry: AdminAuditLogEntryInput): Promise<void>;
  list(query: AdminAuditLogListQuery): Promise<AdminAuditLogListResult>;
}

export interface AppDatabase {
  provider: DatabaseProvider;
  bootstrap(): Promise<void>;
  repositories: {
    modelCatalog: ModelCatalogRepository;
    adminAuditLog: AdminAuditLogRepository;
    serviceManagement: ServiceManagementRepository;
  };
}
