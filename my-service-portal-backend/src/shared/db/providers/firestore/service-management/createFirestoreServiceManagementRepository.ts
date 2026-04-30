import type { Firestore } from 'firebase-admin/firestore';
import type {
  CreateEquipmentInstanceInput,
  CreateMaintenanceProcedureInput,
  CreateMaintenanceRecordInput,
  CreateServiceRequestInput,
  EquipmentInstance,
  EquipmentInstanceStatus,
  MaintenanceProcedure,
  MaintenanceProcedureChecklistItem,
  MaintenanceRecord,
  MaintenanceScheduleOverride,
  ServiceManagementRepository,
  ServiceRequest,
  ServiceRequestPriority,
  ServiceRequestStatus,
  ServiceRequestType,
  UpdateEquipmentInstanceInput,
  UpdateMaintenanceProcedureInput,
  UpdateMaintenanceScheduleDueDateInput,
  UpdateServiceRequestInput,
  UpdateServiceRequestStatusInput,
} from '../../../../../modules/service-management/serviceManagement.types.js';

const EQUIPMENT_INSTANCES_COLLECTION = 'equipmentInstances';
const MAINTENANCE_PROCEDURES_COLLECTION = 'maintenanceProcedures';
const SERVICE_REQUESTS_COLLECTION = 'serviceRequests';
const MAINTENANCE_RECORDS_COLLECTION = 'maintenanceRecords';
const MAINTENANCE_SCHEDULE_OVERRIDES_COLLECTION = 'maintenanceScheduleOverrides';

interface FirestoreEquipmentInstanceDoc {
  inventoryNumber: string;
  modelSlug: string;
  modelTitle: string;
  serialNumber: string;
  location: string;
  responsible: string;
  status: EquipmentInstanceStatus;
  commissionedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface FirestoreServiceRequestDoc {
  requestNumber: string;
  equipmentInstanceId: string;
  equipmentTitle: string;
  modelSlug: string;
  type: ServiceRequestType;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  title: string;
  description: string;
  assignedTo: string;
  requiredParts: string[];
  procedureId: string | null;
  procedureTitle: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  canceledAt: string | null;
  cancellationReason: string | null;
}

interface FirestoreMaintenanceProcedureDoc {
  modelSlug: string;
  modelTitle: string;
  title: string;
  description: string;
  intervalDays: number | null;
  estimatedMinutes: number | null;
  tools: string[];
  consumables: string[];
  checklistItems: MaintenanceProcedureChecklistItem[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface FirestoreMaintenanceRecordDoc {
  serviceRequestId: string | null;
  equipmentInstanceId: string;
  equipmentTitle: string;
  modelSlug: string;
  procedureId: string | null;
  procedureTitle: string | null;
  performedBy: string;
  summary: string;
  actions: string[];
  replacedParts: string[];
  resultStatus: EquipmentInstanceStatus;
  createdAt: string;
}

interface FirestoreMaintenanceScheduleOverrideDoc {
  equipmentInstanceId: string;
  procedureId: string;
  nextDueAt: string;
  updatedAt: string;
}

const nowIso = () => new Date().toISOString();

const mapEquipmentDoc = (
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): EquipmentInstance | null => {
  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as FirestoreEquipmentInstanceDoc;
  return {
    id: doc.id,
    inventoryNumber: data.inventoryNumber ?? '',
    modelSlug: data.modelSlug ?? '',
    modelTitle: data.modelTitle ?? '',
    serialNumber: data.serialNumber ?? '',
    location: data.location ?? '',
    responsible: data.responsible ?? '',
    status: data.status ?? 'active',
    commissionedAt: data.commissionedAt ?? null,
    notes: data.notes ?? '',
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
  };
};

const mapRequestDoc = (
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): ServiceRequest | null => {
  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as FirestoreServiceRequestDoc;
  return {
    id: doc.id,
    requestNumber: data.requestNumber ?? '',
    equipmentInstanceId: data.equipmentInstanceId ?? '',
    equipmentTitle: data.equipmentTitle ?? '',
    modelSlug: data.modelSlug ?? '',
    type: data.type ?? 'repair',
    priority: data.priority ?? 'normal',
    status: data.status ?? 'new',
    title: data.title ?? '',
    description: data.description ?? '',
    assignedTo: data.assignedTo ?? '',
    requiredParts: Array.isArray(data.requiredParts) ? data.requiredParts : [],
    procedureId: data.procedureId ?? null,
    procedureTitle: data.procedureTitle ?? null,
    dueDate: data.dueDate ?? null,
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
    completedAt: data.completedAt ?? null,
    canceledAt: data.canceledAt ?? null,
    cancellationReason: data.cancellationReason ?? null,
  };
};

const mapProcedureDoc = (
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): MaintenanceProcedure | null => {
  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as FirestoreMaintenanceProcedureDoc;
  return {
    id: doc.id,
    modelSlug: data.modelSlug ?? '',
    modelTitle: data.modelTitle ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    intervalDays: data.intervalDays ?? null,
    estimatedMinutes: data.estimatedMinutes ?? null,
    tools: Array.isArray(data.tools) ? data.tools : [],
    consumables: Array.isArray(data.consumables) ? data.consumables : [],
    checklistItems: Array.isArray(data.checklistItems) ? data.checklistItems : [],
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
    archivedAt: data.archivedAt ?? null,
  };
};

const mapRecordDoc = (
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): MaintenanceRecord | null => {
  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as FirestoreMaintenanceRecordDoc;
  return {
    id: doc.id,
    serviceRequestId: data.serviceRequestId ?? null,
    equipmentInstanceId: data.equipmentInstanceId ?? '',
    equipmentTitle: data.equipmentTitle ?? '',
    modelSlug: data.modelSlug ?? '',
    procedureId: data.procedureId ?? null,
    procedureTitle: data.procedureTitle ?? null,
    performedBy: data.performedBy ?? '',
    summary: data.summary ?? '',
    actions: Array.isArray(data.actions) ? data.actions : [],
    replacedParts: Array.isArray(data.replacedParts) ? data.replacedParts : [],
    resultStatus: data.resultStatus ?? 'active',
    createdAt: data.createdAt ?? '',
  };
};

const mapScheduleOverrideDoc = (
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): MaintenanceScheduleOverride | null => {
  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as FirestoreMaintenanceScheduleOverrideDoc;
  return {
    equipmentInstanceId: data.equipmentInstanceId ?? '',
    procedureId: data.procedureId ?? '',
    nextDueAt: data.nextDueAt ?? '',
    updatedAt: data.updatedAt ?? '',
  };
};

const createScheduleOverrideId = (equipmentInstanceId: string, procedureId: string) => {
  return `${equipmentInstanceId}__${procedureId}`;
};

export const createFirestoreServiceManagementRepository = (
  firestore: Firestore,
): ServiceManagementRepository => {
  const equipmentCollection = firestore.collection(EQUIPMENT_INSTANCES_COLLECTION);
  const procedureCollection = firestore.collection(MAINTENANCE_PROCEDURES_COLLECTION);
  const requestCollection = firestore.collection(SERVICE_REQUESTS_COLLECTION);
  const recordCollection = firestore.collection(MAINTENANCE_RECORDS_COLLECTION);
  const scheduleOverrideCollection = firestore.collection(MAINTENANCE_SCHEDULE_OVERRIDES_COLLECTION);

  return {
    async listEquipmentInstances() {
      const snapshot = await equipmentCollection.orderBy('updatedAt', 'desc').limit(200).get();
      return snapshot.docs
        .map((doc) => mapEquipmentDoc(doc))
        .filter((item): item is EquipmentInstance => Boolean(item));
    },

    async getEquipmentInstanceById(id) {
      return mapEquipmentDoc(await equipmentCollection.doc(id).get());
    },

    async createEquipmentInstance(input: CreateEquipmentInstanceInput & { modelTitle: string }) {
      const timestamp = nowIso();
      const payload: FirestoreEquipmentInstanceDoc = {
        inventoryNumber: input.inventoryNumber,
        modelSlug: input.modelSlug,
        modelTitle: input.modelTitle,
        serialNumber: input.serialNumber,
        location: input.location,
        responsible: input.responsible,
        status: input.status,
        commissionedAt: input.commissionedAt,
        notes: input.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const ref = await equipmentCollection.add(payload);
      return {
        id: ref.id,
        ...payload,
      };
    },

    async updateEquipmentInstanceStatus(id, status) {
      const ref = equipmentCollection.doc(id);
      const current = await ref.get();
      if (!current.exists) {
        return null;
      }

      await ref.update({ status, updatedAt: nowIso() } satisfies Partial<FirestoreEquipmentInstanceDoc>);
      return mapEquipmentDoc(await ref.get());
    },

    async updateEquipmentInstance(input: UpdateEquipmentInstanceInput & { modelTitle: string }) {
      const ref = equipmentCollection.doc(input.id);
      const current = await ref.get();
      if (!current.exists) {
        return null;
      }

      await ref.update({
        inventoryNumber: input.inventoryNumber,
        modelSlug: input.modelSlug,
        modelTitle: input.modelTitle,
        serialNumber: input.serialNumber,
        location: input.location,
        responsible: input.responsible,
        status: input.status,
        commissionedAt: input.commissionedAt,
        notes: input.notes,
        updatedAt: nowIso(),
      } satisfies Partial<FirestoreEquipmentInstanceDoc>);
      return mapEquipmentDoc(await ref.get());
    },

    async listMaintenanceProcedures() {
      const snapshot = await procedureCollection.orderBy('updatedAt', 'desc').limit(200).get();
      return snapshot.docs
        .map((doc) => mapProcedureDoc(doc))
        .filter((item): item is MaintenanceProcedure => Boolean(item));
    },

    async getMaintenanceProcedureById(id) {
      return mapProcedureDoc(await procedureCollection.doc(id).get());
    },

    async createMaintenanceProcedure(input: CreateMaintenanceProcedureInput & { modelTitle: string }) {
      const timestamp = nowIso();
      const payload: FirestoreMaintenanceProcedureDoc = {
        modelSlug: input.modelSlug,
        modelTitle: input.modelTitle,
        title: input.title,
        description: input.description,
        intervalDays: input.intervalDays,
        estimatedMinutes: input.estimatedMinutes,
        tools: input.tools,
        consumables: input.consumables,
        checklistItems: input.checklistItems,
        createdAt: timestamp,
        updatedAt: timestamp,
        archivedAt: null,
      };
      const ref = await procedureCollection.add(payload);
      return {
        id: ref.id,
        ...payload,
      };
    },

    async updateMaintenanceProcedure(input: UpdateMaintenanceProcedureInput & { modelTitle: string }) {
      const ref = procedureCollection.doc(input.id);
      const current = await ref.get();
      if (!current.exists) {
        return null;
      }

      await ref.update({
        modelSlug: input.modelSlug,
        modelTitle: input.modelTitle,
        title: input.title,
        description: input.description,
        intervalDays: input.intervalDays,
        estimatedMinutes: input.estimatedMinutes,
        tools: input.tools,
        consumables: input.consumables,
        checklistItems: input.checklistItems,
        updatedAt: nowIso(),
      } satisfies Partial<FirestoreMaintenanceProcedureDoc>);
      return mapProcedureDoc(await ref.get());
    },

    async archiveMaintenanceProcedure(id) {
      const ref = procedureCollection.doc(id);
      const current = await ref.get();
      if (!current.exists) {
        return null;
      }

      const timestamp = nowIso();
      await ref.update({
        archivedAt: timestamp,
        updatedAt: timestamp,
      } satisfies Partial<FirestoreMaintenanceProcedureDoc>);
      return mapProcedureDoc(await ref.get());
    },

    async listServiceRequests() {
      const snapshot = await requestCollection.orderBy('updatedAt', 'desc').limit(200).get();
      return snapshot.docs
        .map((doc) => mapRequestDoc(doc))
        .filter((item): item is ServiceRequest => Boolean(item));
    },

    async getServiceRequestById(id) {
      return mapRequestDoc(await requestCollection.doc(id).get());
    },

    async createServiceRequest(input: CreateServiceRequestInput & {
      requestNumber: string;
      equipmentTitle: string;
      modelSlug: string;
      procedureTitle: string | null;
    }) {
      const timestamp = nowIso();
      const payload: FirestoreServiceRequestDoc = {
        requestNumber: input.requestNumber,
        equipmentInstanceId: input.equipmentInstanceId,
        equipmentTitle: input.equipmentTitle,
        modelSlug: input.modelSlug,
        type: input.type,
        priority: input.priority,
        status: 'new',
        title: input.title,
        description: input.description,
        assignedTo: input.assignedTo,
        requiredParts: input.requiredParts,
        procedureId: input.procedureId,
        procedureTitle: input.procedureTitle,
        dueDate: input.dueDate,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
        canceledAt: null,
        cancellationReason: null,
      };
      const ref = await requestCollection.add(payload);
      return {
        id: ref.id,
        ...payload,
      };
    },

    async updateServiceRequest(input: UpdateServiceRequestInput & {
      equipmentTitle: string;
      modelSlug: string;
      procedureTitle: string | null;
    }) {
      const ref = requestCollection.doc(input.id);
      const current = await ref.get();
      if (!current.exists) {
        return null;
      }

      await ref.update({
        equipmentInstanceId: input.equipmentInstanceId,
        equipmentTitle: input.equipmentTitle,
        modelSlug: input.modelSlug,
        type: input.type,
        priority: input.priority,
        status: input.status,
        title: input.title,
        description: input.description,
        assignedTo: input.assignedTo,
        requiredParts: input.requiredParts,
        procedureId: input.procedureId,
        procedureTitle: input.procedureTitle,
        dueDate: input.dueDate,
        updatedAt: nowIso(),
      } satisfies Partial<FirestoreServiceRequestDoc>);
      return mapRequestDoc(await ref.get());
    },

    async updateServiceRequestStatus(input: UpdateServiceRequestStatusInput) {
      const ref = requestCollection.doc(input.id);
      const current = await ref.get();
      if (!current.exists) {
        return null;
      }

      const timestamp = nowIso();
      await ref.update({
        status: input.status,
        updatedAt: timestamp,
        completedAt: input.status === 'completed' ? timestamp : null,
        canceledAt: input.status === 'canceled' ? timestamp : null,
        cancellationReason: input.status === 'canceled' ? (input.cancellationReason ?? null) : null,
      } satisfies Partial<FirestoreServiceRequestDoc>);
      return mapRequestDoc(await ref.get());
    },

    async listMaintenanceScheduleOverrides() {
      const snapshot = await scheduleOverrideCollection.limit(500).get();
      return snapshot.docs
        .map((doc) => mapScheduleOverrideDoc(doc))
        .filter((item): item is MaintenanceScheduleOverride => Boolean(item));
    },

    async upsertMaintenanceScheduleOverride(input: UpdateMaintenanceScheduleDueDateInput) {
      const timestamp = nowIso();
      const payload: FirestoreMaintenanceScheduleOverrideDoc = {
        equipmentInstanceId: input.equipmentInstanceId,
        procedureId: input.procedureId,
        nextDueAt: input.nextDueAt,
        updatedAt: timestamp,
      };
      await scheduleOverrideCollection
        .doc(createScheduleOverrideId(input.equipmentInstanceId, input.procedureId))
        .set(payload, { merge: true });
      return payload;
    },

    async listMaintenanceRecords() {
      const snapshot = await recordCollection.orderBy('createdAt', 'desc').limit(200).get();
      return snapshot.docs
        .map((doc) => mapRecordDoc(doc))
        .filter((item): item is MaintenanceRecord => Boolean(item));
    },

    async createMaintenanceRecord(input: CreateMaintenanceRecordInput & {
      equipmentTitle: string;
      modelSlug: string;
      procedureId: string | null;
      procedureTitle: string | null;
    }) {
      const payload: FirestoreMaintenanceRecordDoc = {
        serviceRequestId: input.serviceRequestId,
        equipmentInstanceId: input.equipmentInstanceId,
        equipmentTitle: input.equipmentTitle,
        modelSlug: input.modelSlug,
        procedureId: input.procedureId,
        procedureTitle: input.procedureTitle,
        performedBy: input.performedBy,
        summary: input.summary,
        actions: input.actions,
        replacedParts: input.replacedParts,
        resultStatus: input.resultStatus,
        createdAt: nowIso(),
      };
      const ref = await recordCollection.add(payload);
      return {
        id: ref.id,
        ...payload,
      };
    },
  };
};
