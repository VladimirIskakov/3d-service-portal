import { createAppError } from '../../shared/errors/index.js';
import type { ModelCatalogRepository } from '../model-catalog/modelCatalog.types.js';
import type {
  CreateEquipmentInstanceInput,
  CreateMaintenanceProcedureInput,
  CreateMaintenanceRecordInput,
  CreateScheduledServiceRequestInput,
  CreateServiceRequestInput,
  EquipmentInstance,
  EquipmentInstanceStatus,
  MaintenanceProcedure,
  MaintenanceProcedureChecklistItem,
  MaintenanceRecord,
  MaintenanceScheduleItem,
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
} from './serviceManagement.types.js';

const EQUIPMENT_STATUSES: EquipmentInstanceStatus[] = ['active', 'maintenance', 'faulty', 'retired'];
const REQUEST_TYPES: ServiceRequestType[] = ['scheduled', 'repair', 'diagnostics', 'incident'];
const REQUEST_PRIORITIES: ServiceRequestPriority[] = ['low', 'normal', 'high', 'critical'];
const REQUEST_STATUSES: ServiceRequestStatus[] = ['new', 'in_progress', 'waiting_parts', 'completed', 'canceled'];
const OPEN_REQUEST_STATUSES = new Set<ServiceRequestStatus>(['new', 'in_progress', 'waiting_parts']);
const RECORD_REQUEST_STATUSES: Array<Exclude<ServiceRequestStatus, 'new' | 'canceled'>> = [
  'in_progress',
  'waiting_parts',
  'completed',
];
const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeString = (value: unknown, maxLength = 240) => {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
};

const normalizeText = (value: unknown, maxLength = 4000) => {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
};

const normalizeDate = (value: unknown) => {
  const raw = normalizeString(value, 40);
  if (!raw) {
    return null;
  }

  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) {
    throw createAppError('validation_error', 'Invalid date value.');
  }

  return new Date(timestamp).toISOString();
};

const normalizeStringList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item, 240))
      .filter(Boolean)
      .slice(0, 50);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((item) => normalizeString(item, 240))
      .filter(Boolean)
      .slice(0, 50);
  }

  return [];
};

const normalizePositiveInteger = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100_000) {
    throw createAppError('validation_error', 'Expected a positive integer.');
  }

  return parsed;
};

const normalizeChecklistItems = (value: unknown): MaintenanceProcedureChecklistItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (typeof item !== 'object' || !item) {
        return null;
      }

      const raw = item as Record<string, unknown>;
      const title = normalizeString(raw.title, 180);
      if (!title) {
        return null;
      }

      const id = normalizeString(raw.id, 80) || `step-${index + 1}`;
      const description = normalizeText(raw.description, 1000);
      const partId = normalizeString(raw.partId, 120) || null;
      const required = typeof raw.required === 'boolean' ? raw.required : true;

      return { id, title, description, partId, required };
    })
    .filter((item): item is MaintenanceProcedureChecklistItem => Boolean(item))
    .slice(0, 80);
};

const assertInList = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  return allowed.includes(value as T) ? (value as T) : fallback;
};

const createRequestNumber = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SR-${datePart}-${suffix}`;
};

const parseDateMs = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const buildMaintenanceSchedule = (
  equipmentItems: EquipmentInstance[],
  procedures: MaintenanceProcedure[],
  requests: ServiceRequest[],
  records: MaintenanceRecord[],
  overrides: MaintenanceScheduleOverride[],
): MaintenanceScheduleItem[] => {
  const now = Date.now();
  const dueSoonLimit = now + (14 * DAY_MS);
  const activeEquipment = equipmentItems.filter((item) => item.status !== 'retired');
  const periodicProcedures = procedures.filter((procedure) => (
    !procedure.archivedAt && procedure.intervalDays && procedure.intervalDays > 0
  ));

  return activeEquipment
    .flatMap((equipment) => {
      return periodicProcedures
        .filter((procedure) => procedure.modelSlug === equipment.modelSlug && procedure.intervalDays)
        .map((procedure) => {
          const procedureRecords = records
            .filter((record) => (
              record.equipmentInstanceId === equipment.id
              && record.procedureId === procedure.id
            ))
            .sort((left, right) => (parseDateMs(right.createdAt) ?? 0) - (parseDateMs(left.createdAt) ?? 0));
          const lastRecord = procedureRecords[0] ?? null;
          const baseTimestamp = parseDateMs(lastRecord?.createdAt)
            ?? parseDateMs(equipment.commissionedAt)
            ?? parseDateMs(equipment.createdAt)
            ?? now;
          const intervalDays = procedure.intervalDays ?? 0;
          const override = overrides.find((item) => (
            item.equipmentInstanceId === equipment.id && item.procedureId === procedure.id
          )) ?? null;
          const overrideUpdatedAt = parseDateMs(override?.updatedAt);
          const lastCompletedAt = parseDateMs(lastRecord?.createdAt);
          const canUseOverride = override
            && (!lastCompletedAt || !overrideUpdatedAt || overrideUpdatedAt >= lastCompletedAt);
          const nextDueAt = canUseOverride
            ? override.nextDueAt
            : new Date(baseTimestamp + (intervalDays * DAY_MS)).toISOString();
          const nextDueTimestamp = Date.parse(nextDueAt);
          const openRequest = requests.find((request) => (
            request.equipmentInstanceId === equipment.id
            && request.procedureId === procedure.id
            && OPEN_REQUEST_STATUSES.has(request.status)
          )) ?? null;
          const status = openRequest
            ? 'requested'
            : nextDueTimestamp < now
              ? 'overdue'
              : nextDueTimestamp <= dueSoonLimit
                ? 'due_soon'
                : 'planned';

          return {
            id: `${equipment.id}:${procedure.id}`,
            equipmentInstanceId: equipment.id,
            equipmentTitle: `${equipment.inventoryNumber} - ${equipment.modelTitle}`,
            inventoryNumber: equipment.inventoryNumber,
            modelSlug: equipment.modelSlug,
            modelTitle: equipment.modelTitle,
            location: equipment.location,
            responsible: equipment.responsible,
            procedureId: procedure.id,
            procedureTitle: procedure.title,
            intervalDays,
            lastCompletedAt: lastRecord?.createdAt ?? null,
            nextDueAt,
            isManuallyScheduled: Boolean(canUseOverride),
            status,
            openRequestId: openRequest?.id ?? null,
            openRequestNumber: openRequest?.requestNumber ?? null,
            requiredParts: procedure.consumables,
          } satisfies MaintenanceScheduleItem;
        });
    })
    .sort((left, right) => Date.parse(left.nextDueAt) - Date.parse(right.nextDueAt));
};

export const createServiceManagementService = (
  repository: ServiceManagementRepository,
  modelCatalogRepository: ModelCatalogRepository,
) => {
  return {
    listEquipmentInstances() {
      return repository.listEquipmentInstances();
    },

    async createEquipmentInstance(body: Partial<CreateEquipmentInstanceInput>) {
      const inventoryNumber = normalizeString(body.inventoryNumber, 80);
      const modelSlug = normalizeString(body.modelSlug, 120);
      const serialNumber = normalizeString(body.serialNumber, 120);
      const location = normalizeString(body.location, 160);
      const responsible = normalizeString(body.responsible, 160);
      const status = assertInList(body.status, EQUIPMENT_STATUSES, 'active');
      const commissionedAt = normalizeDate(body.commissionedAt);
      const notes = normalizeText(body.notes, 2000);

      if (!inventoryNumber || !modelSlug || !location) {
        throw createAppError('validation_error', 'inventoryNumber, modelSlug and location are required.');
      }

      const model = await modelCatalogRepository.getModelBySlug(modelSlug);
      if (!model) {
        throw createAppError('model_not_found', 'Equipment model not found.');
      }

      return repository.createEquipmentInstance({
        inventoryNumber,
        modelSlug,
        modelTitle: model.title,
        serialNumber,
        location,
        responsible,
        status,
        commissionedAt,
        notes,
      });
    },

    async updateEquipmentInstance(body: Partial<UpdateEquipmentInstanceInput>) {
      const id = normalizeString(body.id, 160);
      const inventoryNumber = normalizeString(body.inventoryNumber, 80);
      const modelSlug = normalizeString(body.modelSlug, 120);
      const serialNumber = normalizeString(body.serialNumber, 120);
      const location = normalizeString(body.location, 160);
      const responsible = normalizeString(body.responsible, 160);
      const status = assertInList(body.status, EQUIPMENT_STATUSES, 'active');
      const commissionedAt = normalizeDate(body.commissionedAt);
      const notes = normalizeText(body.notes, 2000);

      if (!id || !inventoryNumber || !modelSlug || !location) {
        throw createAppError('validation_error', 'id, inventoryNumber, modelSlug and location are required.');
      }

      const model = await modelCatalogRepository.getModelBySlug(modelSlug);
      if (!model) {
        throw createAppError('model_not_found', 'Equipment model not found.');
      }

      const item = await repository.updateEquipmentInstance({
        id,
        inventoryNumber,
        modelSlug,
        modelTitle: model.title,
        serialNumber,
        location,
        responsible,
        status,
        commissionedAt,
        notes,
      });
      if (!item) {
        throw createAppError('equipment_not_found', 'Equipment instance not found.');
      }

      return item;
    },

    listServiceRequests() {
      return repository.listServiceRequests();
    },

    listMaintenanceProcedures() {
      return repository.listMaintenanceProcedures();
    },

    async listMaintenanceSchedule() {
      const [equipmentItems, procedures, requests, records, overrides] = await Promise.all([
        repository.listEquipmentInstances(),
        repository.listMaintenanceProcedures(),
        repository.listServiceRequests(),
        repository.listMaintenanceRecords(),
        repository.listMaintenanceScheduleOverrides(),
      ]);

      return buildMaintenanceSchedule(equipmentItems, procedures, requests, records, overrides);
    },

    async createMaintenanceProcedure(body: Partial<CreateMaintenanceProcedureInput>) {
      const modelSlug = normalizeString(body.modelSlug, 120);
      const title = normalizeString(body.title, 180);
      const description = normalizeText(body.description, 2000);
      const intervalDays = normalizePositiveInteger(body.intervalDays);
      const estimatedMinutes = normalizePositiveInteger(body.estimatedMinutes);
      const tools = normalizeStringList(body.tools);
      const consumables = normalizeStringList(body.consumables);
      const checklistItems = normalizeChecklistItems(body.checklistItems);

      if (!modelSlug || !title || checklistItems.length === 0) {
        throw createAppError('validation_error', 'modelSlug, title and checklistItems are required.');
      }

      const model = await modelCatalogRepository.getModelBySlug(modelSlug);
      if (!model) {
        throw createAppError('model_not_found', 'Equipment model not found.');
      }

      return repository.createMaintenanceProcedure({
        modelSlug,
        modelTitle: model.title,
        title,
        description,
        intervalDays,
        estimatedMinutes,
        tools,
        consumables,
        checklistItems,
      });
    },

    async updateMaintenanceProcedure(body: Partial<UpdateMaintenanceProcedureInput>) {
      const id = normalizeString(body.id, 160);
      const modelSlug = normalizeString(body.modelSlug, 120);
      const title = normalizeString(body.title, 180);
      const description = normalizeText(body.description, 2000);
      const intervalDays = normalizePositiveInteger(body.intervalDays);
      const estimatedMinutes = normalizePositiveInteger(body.estimatedMinutes);
      const tools = normalizeStringList(body.tools);
      const consumables = normalizeStringList(body.consumables);
      const checklistItems = normalizeChecklistItems(body.checklistItems);

      if (!id || !modelSlug || !title || checklistItems.length === 0) {
        throw createAppError('validation_error', 'id, modelSlug, title and checklistItems are required.');
      }

      const model = await modelCatalogRepository.getModelBySlug(modelSlug);
      if (!model) {
        throw createAppError('model_not_found', 'Equipment model not found.');
      }

      const item = await repository.updateMaintenanceProcedure({
        id,
        modelSlug,
        modelTitle: model.title,
        title,
        description,
        intervalDays,
        estimatedMinutes,
        tools,
        consumables,
        checklistItems,
      });
      if (!item) {
        throw createAppError('procedure_not_found', 'Maintenance procedure not found.');
      }

      return item;
    },

    async archiveMaintenanceProcedure(idRaw: string) {
      const id = normalizeString(idRaw, 160);
      if (!id) {
        throw createAppError('validation_error', 'Procedure id is required.');
      }

      const item = await repository.archiveMaintenanceProcedure(id);
      if (!item) {
        throw createAppError('procedure_not_found', 'Maintenance procedure not found.');
      }

      return item;
    },

    async createServiceRequest(body: Partial<CreateServiceRequestInput>) {
      const equipmentInstanceId = normalizeString(body.equipmentInstanceId, 160);
      const type = assertInList(body.type, REQUEST_TYPES, 'repair');
      const priority = assertInList(body.priority, REQUEST_PRIORITIES, 'normal');
      const title = normalizeString(body.title, 180);
      const description = normalizeText(body.description);
      const assignedTo = normalizeString(body.assignedTo, 160);
      const requiredParts = normalizeStringList(body.requiredParts);
      const procedureId = normalizeString(body.procedureId, 160) || null;
      const dueDate = normalizeDate(body.dueDate);

      if (!equipmentInstanceId || !title) {
        throw createAppError('validation_error', 'equipmentInstanceId and title are required.');
      }

      const equipment = await repository.getEquipmentInstanceById(equipmentInstanceId);
      if (!equipment) {
        throw createAppError('equipment_not_found', 'Equipment instance not found.');
      }

      const procedure = procedureId ? await repository.getMaintenanceProcedureById(procedureId) : null;
      if (procedureId && (!procedure || procedure.modelSlug !== equipment.modelSlug)) {
        throw createAppError('procedure_not_found', 'Maintenance procedure not found.');
      }

      const request = await repository.createServiceRequest({
        equipmentInstanceId,
        equipmentTitle: `${equipment.inventoryNumber} - ${equipment.modelTitle}`,
        modelSlug: equipment.modelSlug,
        type,
        priority,
        title,
        description,
        assignedTo,
        requiredParts,
        procedureId,
        procedureTitle: procedure?.title ?? null,
        dueDate,
        requestNumber: createRequestNumber(),
      });

      if (request.status !== 'completed') {
        if (request.type !== 'scheduled') {
          await repository.updateEquipmentInstanceStatus(equipment.id, 'maintenance');
        }
      }

      return request;
    },

    async createScheduledServiceRequest(body: Partial<CreateScheduledServiceRequestInput>) {
      const equipmentInstanceId = normalizeString(body.equipmentInstanceId, 160);
      const procedureId = normalizeString(body.procedureId, 160);
      const assignedTo = normalizeString(body.assignedTo, 160);
      const explicitRequiredParts = normalizeStringList(body.requiredParts);

      if (!equipmentInstanceId || !procedureId) {
        throw createAppError('validation_error', 'equipmentInstanceId and procedureId are required.');
      }

      const [equipment, procedure, requests, schedule] = await Promise.all([
        repository.getEquipmentInstanceById(equipmentInstanceId),
        repository.getMaintenanceProcedureById(procedureId),
        repository.listServiceRequests(),
        Promise.all([
          repository.listEquipmentInstances(),
          repository.listMaintenanceProcedures(),
          repository.listServiceRequests(),
          repository.listMaintenanceRecords(),
          repository.listMaintenanceScheduleOverrides(),
        ]).then(([equipmentItems, procedures, requestItems, records, overrides]) => (
          buildMaintenanceSchedule(equipmentItems, procedures, requestItems, records, overrides)
        )),
      ]);

      if (!equipment) {
        throw createAppError('equipment_not_found', 'Equipment instance not found.');
      }

      if (!procedure || procedure.modelSlug !== equipment.modelSlug || !procedure.intervalDays) {
        throw createAppError('procedure_not_found', 'Maintenance procedure not found.');
      }

      const existingRequest = requests.find((request) => (
        request.equipmentInstanceId === equipment.id
        && request.procedureId === procedure.id
        && OPEN_REQUEST_STATUSES.has(request.status)
      ));
      if (existingRequest) {
        throw createAppError('request_already_exists', 'Scheduled service request already exists.');
      }

      const scheduleItem = schedule.find((item) => (
        item.equipmentInstanceId === equipment.id && item.procedureId === procedure.id
      ));
      const dueDate = normalizeDate(body.dueDate) ?? scheduleItem?.nextDueAt ?? null;
      const dueTimestamp = parseDateMs(dueDate);
      const priority: ServiceRequestPriority = dueTimestamp && dueTimestamp < Date.now() ? 'high' : 'normal';

      return repository.createServiceRequest({
        equipmentInstanceId,
        equipmentTitle: `${equipment.inventoryNumber} - ${equipment.modelTitle}`,
        modelSlug: equipment.modelSlug,
        type: 'scheduled',
        priority,
        title: procedure.title,
        description: procedure.description,
        assignedTo,
        requiredParts: explicitRequiredParts.length > 0 ? explicitRequiredParts : procedure.consumables,
        procedureId,
        procedureTitle: procedure.title,
        dueDate,
        requestNumber: createRequestNumber(),
      });
    },

    async updateServiceRequest(body: Partial<UpdateServiceRequestInput>) {
      const id = normalizeString(body.id, 160);
      const equipmentInstanceId = normalizeString(body.equipmentInstanceId, 160);
      const type = assertInList(body.type, REQUEST_TYPES, 'repair');
      const priority = assertInList(body.priority, REQUEST_PRIORITIES, 'normal');
      const status = assertInList(body.status, REQUEST_STATUSES, 'new');
      const title = normalizeString(body.title, 180);
      const description = normalizeText(body.description);
      const assignedTo = normalizeString(body.assignedTo, 160);
      const requiredParts = normalizeStringList(body.requiredParts);
      const procedureId = normalizeString(body.procedureId, 160) || null;
      const dueDate = normalizeDate(body.dueDate);

      if (!id || !equipmentInstanceId || !title) {
        throw createAppError('validation_error', 'id, equipmentInstanceId and title are required.');
      }

      const equipment = await repository.getEquipmentInstanceById(equipmentInstanceId);
      if (!equipment) {
        throw createAppError('equipment_not_found', 'Equipment instance not found.');
      }

      const procedure = procedureId ? await repository.getMaintenanceProcedureById(procedureId) : null;
      if (procedureId && (!procedure || procedure.modelSlug !== equipment.modelSlug || procedure.archivedAt)) {
        throw createAppError('procedure_not_found', 'Maintenance procedure not found.');
      }

      const item = await repository.updateServiceRequest({
        id,
        equipmentInstanceId,
        equipmentTitle: `${equipment.inventoryNumber} - ${equipment.modelTitle}`,
        modelSlug: equipment.modelSlug,
        type,
        priority,
        status,
        title,
        description,
        assignedTo,
        requiredParts,
        procedureId,
        procedureTitle: procedure?.title ?? null,
        dueDate,
      });
      if (!item) {
        throw createAppError('request_not_found', 'Service request not found.');
      }

      if (status === 'completed' || status === 'canceled') {
        await repository.updateEquipmentInstanceStatus(item.equipmentInstanceId, 'active');
      } else if (status === 'in_progress' || status === 'waiting_parts') {
        await repository.updateEquipmentInstanceStatus(item.equipmentInstanceId, 'maintenance');
      }

      return item;
    },

    async updateMaintenanceScheduleDueDate(body: Partial<UpdateMaintenanceScheduleDueDateInput>) {
      const equipmentInstanceId = normalizeString(body.equipmentInstanceId, 160);
      const procedureId = normalizeString(body.procedureId, 160);
      const nextDueAt = normalizeDate(body.nextDueAt);

      if (!equipmentInstanceId || !procedureId || !nextDueAt) {
        throw createAppError('validation_error', 'equipmentInstanceId, procedureId and nextDueAt are required.');
      }

      const [equipment, procedure] = await Promise.all([
        repository.getEquipmentInstanceById(equipmentInstanceId),
        repository.getMaintenanceProcedureById(procedureId),
      ]);

      if (!equipment) {
        throw createAppError('equipment_not_found', 'Equipment instance not found.');
      }

      if (!procedure || procedure.modelSlug !== equipment.modelSlug || procedure.archivedAt) {
        throw createAppError('procedure_not_found', 'Maintenance procedure not found.');
      }

      return repository.upsertMaintenanceScheduleOverride({
        equipmentInstanceId,
        procedureId,
        nextDueAt,
      });
    },

    async updateServiceRequestStatus(body: Partial<UpdateServiceRequestStatusInput>) {
      const id = normalizeString(body.id, 160);
      const status = assertInList(body.status, REQUEST_STATUSES, 'new');
      const cancellationReason = normalizeText(body.cancellationReason, 1000) || null;

      if (!id) {
        throw createAppError('validation_error', 'Request id is required.');
      }

      const request = await repository.updateServiceRequestStatus({ id, status, cancellationReason });
      if (!request) {
        throw createAppError('request_not_found', 'Service request not found.');
      }

      if (status === 'completed' || status === 'canceled') {
        await repository.updateEquipmentInstanceStatus(request.equipmentInstanceId, 'active');
      } else if (status === 'in_progress' || status === 'waiting_parts') {
        await repository.updateEquipmentInstanceStatus(request.equipmentInstanceId, 'maintenance');
      }

      return request;
    },

    listMaintenanceRecords() {
      return repository.listMaintenanceRecords();
    },

    async createMaintenanceRecord(body: Partial<CreateMaintenanceRecordInput>) {
      const serviceRequestId = normalizeString(body.serviceRequestId, 160) || null;
      const equipmentInstanceId = normalizeString(body.equipmentInstanceId, 160);
      const bodyProcedureId = normalizeString(body.procedureId, 160) || null;
      let performedBy = normalizeString(body.performedBy, 160);
      const summary = normalizeText(body.summary, 2000);
      const actions = normalizeStringList(body.actions);
      const replacedParts = normalizeStringList(body.replacedParts);
      const resultStatus = assertInList(body.resultStatus, EQUIPMENT_STATUSES, 'active');
      const serviceRequestStatus = assertInList(body.serviceRequestStatus, RECORD_REQUEST_STATUSES, 'completed');

      if (!equipmentInstanceId || !summary) {
        throw createAppError('validation_error', 'equipmentInstanceId and summary are required.');
      }

      const equipment = await repository.getEquipmentInstanceById(equipmentInstanceId);
      if (!equipment) {
        throw createAppError('equipment_not_found', 'Equipment instance not found.');
      }

      let procedureId = bodyProcedureId;
      let procedureTitle: string | null = null;

      if (serviceRequestId) {
        const request = await repository.getServiceRequestById(serviceRequestId);
        if (!request || request.equipmentInstanceId !== equipmentInstanceId) {
          throw createAppError('request_not_found', 'Service request not found.');
        }

        procedureId = request.procedureId;
        procedureTitle = request.procedureTitle;
        performedBy = request.assignedTo || performedBy;
      }

      if (!performedBy) {
        throw createAppError('validation_error', 'performedBy is required.');
      }

      if (procedureId && !procedureTitle) {
        const procedure = await repository.getMaintenanceProcedureById(procedureId);
        if (!procedure || procedure.modelSlug !== equipment.modelSlug) {
          throw createAppError('procedure_not_found', 'Maintenance procedure not found.');
        }
        procedureTitle = procedure.title;
      }

      const record = await repository.createMaintenanceRecord({
        serviceRequestId,
        equipmentInstanceId,
        equipmentTitle: `${equipment.inventoryNumber} - ${equipment.modelTitle}`,
        modelSlug: equipment.modelSlug,
        procedureId,
        procedureTitle,
        performedBy,
        summary,
        actions,
        replacedParts,
        resultStatus,
      });

      await repository.updateEquipmentInstanceStatus(equipment.id, resultStatus);

      if (serviceRequestId) {
        await repository.updateServiceRequestStatus({ id: serviceRequestId, status: serviceRequestStatus });
      }

      return record;
    },
  };
};
