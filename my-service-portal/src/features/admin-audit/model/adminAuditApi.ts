import { requestAdminApi } from '@/features/admin-auth';

export interface AdminAuditLogItem {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAuditLogsQuery {
  limit?: number;
  cursor?: string | null;
  action?: string;
  targetType?: string;
  actorEmail?: string;
  targetId?: string;
}

export interface AdminAuditLogsResponse {
  items: AdminAuditLogItem[];
  nextCursor: string | null;
}

const buildAuditLogsQueryString = (query: AdminAuditLogsQuery) => {
  const params = new URLSearchParams();

  if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
    params.set('limit', String(Math.trunc(query.limit)));
  }

  if (query.cursor) {
    params.set('cursor', query.cursor);
  }

  if (query.action?.trim()) {
    params.set('action', query.action.trim());
  }

  if (query.targetType?.trim()) {
    params.set('targetType', query.targetType.trim());
  }

  if (query.actorEmail?.trim()) {
    params.set('actorEmail', query.actorEmail.trim());
  }

  if (query.targetId?.trim()) {
    params.set('targetId', query.targetId.trim());
  }

  const serialized = params.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
};

export const getAdminAuditLogs = (query: AdminAuditLogsQuery = {}) => {
  return requestAdminApi<AdminAuditLogsResponse>(`/audit-logs${buildAuditLogsQueryString(query)}`, {
    method: 'GET',
  });
};
