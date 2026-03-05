import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type {
  AdminAuditLogEntry,
  AdminAuditLogListQuery,
  AdminAuditLogListResult,
  AdminAuditLogRepository,
} from '../../../types.js';

const ADMIN_AUDIT_LOGS_COLLECTION = 'adminAuditLogs';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const FETCH_MULTIPLIER = 3;
const MIN_BATCH = 50;
const MAX_SCAN_ITERATIONS = 20;

interface FirestoreAdminAuditLogDoc {
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

interface CursorPayload {
  createdAtMs: number;
  id: string;
}

interface MappedAuditLogEntry extends AdminAuditLogEntry {
  createdAtMs: number;
}

const normalizeLimit = (value: number | undefined) => {
  const safeValue = typeof value === 'number' && Number.isFinite(value)
    ? value
    : DEFAULT_LIMIT;

  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(safeValue)));
};

const normalizeFilter = (value: string | undefined) => value?.trim().toLowerCase() ?? '';

const encodeCursor = (payload: CursorPayload) => {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

const decodeCursor = (cursor: string | null | undefined): CursorPayload | null => {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<CursorPayload>;
    if (
      typeof parsed.createdAtMs !== 'number'
      || !Number.isFinite(parsed.createdAtMs)
      || typeof parsed.id !== 'string'
      || !parsed.id.trim()
    ) {
      return null;
    }

    return {
      createdAtMs: parsed.createdAtMs,
      id: parsed.id.trim(),
    };
  } catch {
    return null;
  }
};

const mapDocToEntry = (doc: FirebaseFirestore.QueryDocumentSnapshot): MappedAuditLogEntry => {
  const data = doc.data() as FirestoreAdminAuditLogDoc;
  const createdAtTs = data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromMillis(0);
  const details = typeof data.details === 'object' && data.details
    ? (data.details as Record<string, unknown>)
    : undefined;

  return {
    id: doc.id,
    actorUid: data.actorUid ?? '',
    actorEmail: data.actorEmail ?? '',
    action: data.action ?? '',
    targetType: data.targetType ?? '',
    targetId: data.targetId ?? '',
    details,
    createdAt: createdAtTs.toDate().toISOString(),
    createdAtMs: createdAtTs.toMillis(),
  };
};

const matchesFilters = (
  item: AdminAuditLogEntry,
  filters: {
    action: string;
    targetType: string;
    actorEmail: string;
    targetId: string;
  },
) => {
  if (filters.action && !item.action.toLowerCase().includes(filters.action)) {
    return false;
  }

  if (filters.targetType && !item.targetType.toLowerCase().includes(filters.targetType)) {
    return false;
  }

  if (filters.actorEmail && !item.actorEmail.toLowerCase().includes(filters.actorEmail)) {
    return false;
  }

  if (filters.targetId && !item.targetId.toLowerCase().includes(filters.targetId)) {
    return false;
  }

  return true;
};

export const createFirestoreAdminAuditLogRepository = (
  firestore: Firestore,
): AdminAuditLogRepository => {
  return {
    async append(entry) {
      await firestore.collection(ADMIN_AUDIT_LOGS_COLLECTION).add({
        actorUid: entry.actorUid,
        actorEmail: entry.actorEmail,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        ...(entry.details ? { details: entry.details } : {}),
        createdAt: FieldValue.serverTimestamp(),
      } satisfies FirestoreAdminAuditLogDoc);
    },
    async list(query: AdminAuditLogListQuery): Promise<AdminAuditLogListResult> {
      const limit = normalizeLimit(query.limit);
      const batchSize = Math.max(MIN_BATCH, limit * FETCH_MULTIPLIER);
      const filters = {
        action: normalizeFilter(query.action),
        targetType: normalizeFilter(query.targetType),
        actorEmail: normalizeFilter(query.actorEmail),
        targetId: normalizeFilter(query.targetId),
      };

      let cursor = decodeCursor(query.cursor);
      const items: AdminAuditLogEntry[] = [];
      let scanIterations = 0;
      let hasMore = false;
      let nextCursorPayload: CursorPayload | null = null;

      while (items.length < limit && scanIterations < MAX_SCAN_ITERATIONS) {
        scanIterations += 1;

        let firestoreQuery = firestore
          .collection(ADMIN_AUDIT_LOGS_COLLECTION)
          .orderBy('createdAt', 'desc')
          .orderBy('__name__', 'desc')
          .limit(batchSize);

        if (cursor) {
          firestoreQuery = firestoreQuery.startAfter(Timestamp.fromMillis(cursor.createdAtMs), cursor.id);
        }

        const snapshot = await firestoreQuery.get();

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        for (const doc of snapshot.docs) {
          const mapped = mapDocToEntry(doc);
          cursor = { createdAtMs: mapped.createdAtMs, id: mapped.id };

          if (!matchesFilters(mapped, filters)) {
            continue;
          }

          items.push({
            id: mapped.id,
            actorUid: mapped.actorUid,
            actorEmail: mapped.actorEmail,
            action: mapped.action,
            targetType: mapped.targetType,
            targetId: mapped.targetId,
            details: mapped.details,
            createdAt: mapped.createdAt,
          });

          if (items.length >= limit) {
            nextCursorPayload = cursor;
            hasMore = true;
            break;
          }
        }

        if (items.length >= limit) {
          break;
        }

        if (snapshot.size < batchSize) {
          hasMore = false;
          break;
        }

        hasMore = true;
      }

      return {
        items,
        nextCursor: hasMore && nextCursorPayload ? encodeCursor(nextCursorPayload) : null,
      };
    },
  };
};
