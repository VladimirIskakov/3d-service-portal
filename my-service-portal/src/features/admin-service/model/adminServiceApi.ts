import { requestAdminApi } from '@/features/admin-auth';

export type EquipmentInstanceStatus = 'active' | 'maintenance' | 'faulty' | 'retired';
export type ServiceRequestType = 'scheduled' | 'repair' | 'diagnostics' | 'incident';
export type ServiceRequestPriority = 'low' | 'normal' | 'high' | 'critical';
export type ServiceRequestStatus = 'new' | 'in_progress' | 'waiting_parts' | 'completed' | 'canceled';
export type MaintenanceScheduleStatus = 'planned' | 'due_soon' | 'overdue' | 'requested';

export interface MaintenanceProcedureChecklistItem {
  id: string;
  title: string;
  description: string;
  partId: string | null;
  required: boolean;
}

export interface MaintenanceProcedure {
  id: string;
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

export interface EquipmentInstance {
  id: string;
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

export interface ServiceRequest {
  id: string;
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

export interface MaintenanceRecord {
  id: string;
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

export interface MaintenanceScheduleItem {
  id: string;
  equipmentInstanceId: string;
  equipmentTitle: string;
  inventoryNumber: string;
  modelSlug: string;
  modelTitle: string;
  location: string;
  responsible: string;
  procedureId: string;
  procedureTitle: string;
  intervalDays: number;
  lastCompletedAt: string | null;
  nextDueAt: string;
  isManuallyScheduled: boolean;
  status: MaintenanceScheduleStatus;
  openRequestId: string | null;
  openRequestNumber: string | null;
  requiredParts: string[];
}

export interface CreateEquipmentInstancePayload {
  inventoryNumber: string;
  modelSlug: string;
  serialNumber: string;
  location: string;
  responsible: string;
  status: EquipmentInstanceStatus;
  commissionedAt: string | null;
  notes: string;
}

export interface UpdateEquipmentInstancePayload extends CreateEquipmentInstancePayload {
  id: string;
}

export interface CreateServiceRequestPayload {
  equipmentInstanceId: string;
  type: ServiceRequestType;
  priority: ServiceRequestPriority;
  title: string;
  description: string;
  assignedTo: string;
  requiredParts: string[];
  procedureId: string | null;
  dueDate: string | null;
}

export interface UpdateServiceRequestPayload extends CreateServiceRequestPayload {
  id: string;
  status: ServiceRequestStatus;
}

export interface CreateMaintenanceProcedurePayload {
  modelSlug: string;
  title: string;
  description: string;
  intervalDays: number | null;
  estimatedMinutes: number | null;
  tools: string[];
  consumables: string[];
  checklistItems: MaintenanceProcedureChecklistItem[];
}

export interface UpdateMaintenanceProcedurePayload extends CreateMaintenanceProcedurePayload {
  id: string;
}

export interface CreateMaintenanceRecordPayload {
  serviceRequestId: string | null;
  equipmentInstanceId: string;
  procedureId?: string | null;
  performedBy: string;
  summary: string;
  actions: string[];
  replacedParts: string[];
  resultStatus: EquipmentInstanceStatus;
  serviceRequestStatus?: Exclude<ServiceRequestStatus, 'new' | 'canceled'>;
}

export interface CreateScheduledServiceRequestPayload {
  equipmentInstanceId: string;
  procedureId: string;
  assignedTo?: string;
  dueDate?: string | null;
  requiredParts?: string[];
}

export interface UpdateMaintenanceScheduleDueDatePayload {
  equipmentInstanceId: string;
  procedureId: string;
  nextDueAt: string;
}

export interface MaintenanceScheduleOverride {
  equipmentInstanceId: string;
  procedureId: string;
  nextDueAt: string;
  updatedAt: string;
}

interface ListResponse<T> {
  items: T[];
}

interface ItemResponse<T> {
  item: T;
}

export const getServiceEquipmentInstances = async () => {
  return requestAdminApi<ListResponse<EquipmentInstance>>('/service/equipment', { method: 'GET' });
};

export const createServiceEquipmentInstance = async (payload: CreateEquipmentInstancePayload) => {
  return requestAdminApi<ItemResponse<EquipmentInstance>>('/service/equipment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateServiceEquipmentInstance = async (payload: UpdateEquipmentInstancePayload) => {
  const { id, ...body } = payload;
  return requestAdminApi<ItemResponse<EquipmentInstance>>(`/service/equipment/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

export const getMaintenanceProcedures = async () => {
  return requestAdminApi<ListResponse<MaintenanceProcedure>>('/service/procedures', { method: 'GET' });
};

export const getMaintenanceSchedule = async () => {
  return requestAdminApi<ListResponse<MaintenanceScheduleItem>>('/service/schedule', { method: 'GET' });
};

export const createMaintenanceProcedure = async (payload: CreateMaintenanceProcedurePayload) => {
  return requestAdminApi<ItemResponse<MaintenanceProcedure>>('/service/procedures', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateMaintenanceProcedure = async (payload: UpdateMaintenanceProcedurePayload) => {
  const { id, ...body } = payload;
  return requestAdminApi<ItemResponse<MaintenanceProcedure>>(`/service/procedures/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

export const archiveMaintenanceProcedure = async (id: string) => {
  return requestAdminApi<ItemResponse<MaintenanceProcedure>>(`/service/procedures/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
};

export const getServiceRequests = async () => {
  return requestAdminApi<ListResponse<ServiceRequest>>('/service/requests', { method: 'GET' });
};

export const createServiceRequest = async (payload: CreateServiceRequestPayload) => {
  return requestAdminApi<ItemResponse<ServiceRequest>>('/service/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateServiceRequest = async (payload: UpdateServiceRequestPayload) => {
  const { id, ...body } = payload;
  return requestAdminApi<ItemResponse<ServiceRequest>>(`/service/requests/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

export const createScheduledServiceRequest = async (payload: CreateScheduledServiceRequestPayload) => {
  return requestAdminApi<ItemResponse<ServiceRequest>>('/service/schedule/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateServiceRequestStatus = async (id: string, status: ServiceRequestStatus) => {
  return requestAdminApi<ItemResponse<ServiceRequest>>(`/service/requests/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const cancelServiceRequest = async (id: string, cancellationReason: string) => {
  return requestAdminApi<ItemResponse<ServiceRequest>>(`/service/requests/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'canceled', cancellationReason }),
  });
};

export const updateMaintenanceScheduleDueDate = async (payload: UpdateMaintenanceScheduleDueDatePayload) => {
  return requestAdminApi<ItemResponse<MaintenanceScheduleOverride>>('/service/schedule/due-date', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const getMaintenanceRecords = async () => {
  return requestAdminApi<ListResponse<MaintenanceRecord>>('/service/records', { method: 'GET' });
};

export const createMaintenanceRecord = async (payload: CreateMaintenanceRecordPayload) => {
  return requestAdminApi<ItemResponse<MaintenanceRecord>>('/service/records', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
