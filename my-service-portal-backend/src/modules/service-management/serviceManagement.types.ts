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

export interface CreateEquipmentInstanceInput {
  inventoryNumber: string;
  modelSlug: string;
  serialNumber: string;
  location: string;
  responsible: string;
  status: EquipmentInstanceStatus;
  commissionedAt: string | null;
  notes: string;
}

export interface UpdateEquipmentInstanceInput extends CreateEquipmentInstanceInput {
  id: string;
}

export interface CreateServiceRequestInput {
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

export interface UpdateServiceRequestInput extends CreateServiceRequestInput {
  id: string;
  status: ServiceRequestStatus;
}

export interface CreateMaintenanceProcedureInput {
  modelSlug: string;
  title: string;
  description: string;
  intervalDays: number | null;
  estimatedMinutes: number | null;
  tools: string[];
  consumables: string[];
  checklistItems: MaintenanceProcedureChecklistItem[];
}

export interface UpdateMaintenanceProcedureInput extends CreateMaintenanceProcedureInput {
  id: string;
}

export interface UpdateServiceRequestStatusInput {
  id: string;
  status: ServiceRequestStatus;
  cancellationReason?: string | null;
}

export interface CreateMaintenanceRecordInput {
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

export interface CreateScheduledServiceRequestInput {
  equipmentInstanceId: string;
  procedureId: string;
  assignedTo?: string;
  dueDate?: string | null;
  requiredParts?: string[];
}

export interface UpdateMaintenanceScheduleDueDateInput {
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

export interface ServiceManagementRepository {
  listEquipmentInstances(): Promise<EquipmentInstance[]>;
  getEquipmentInstanceById(id: string): Promise<EquipmentInstance | null>;
  createEquipmentInstance(input: CreateEquipmentInstanceInput & { modelTitle: string }): Promise<EquipmentInstance>;
  updateEquipmentInstance(input: UpdateEquipmentInstanceInput & { modelTitle: string }): Promise<EquipmentInstance | null>;
  updateEquipmentInstanceStatus(id: string, status: EquipmentInstanceStatus): Promise<EquipmentInstance | null>;
  listMaintenanceProcedures(): Promise<MaintenanceProcedure[]>;
  getMaintenanceProcedureById(id: string): Promise<MaintenanceProcedure | null>;
  createMaintenanceProcedure(input: CreateMaintenanceProcedureInput & { modelTitle: string }): Promise<MaintenanceProcedure>;
  updateMaintenanceProcedure(input: UpdateMaintenanceProcedureInput & { modelTitle: string }): Promise<MaintenanceProcedure | null>;
  archiveMaintenanceProcedure(id: string): Promise<MaintenanceProcedure | null>;
  listServiceRequests(): Promise<ServiceRequest[]>;
  getServiceRequestById(id: string): Promise<ServiceRequest | null>;
  createServiceRequest(input: CreateServiceRequestInput & {
    requestNumber: string;
    equipmentTitle: string;
    modelSlug: string;
    procedureTitle: string | null;
  }): Promise<ServiceRequest>;
  updateServiceRequest(input: UpdateServiceRequestInput & {
    equipmentTitle: string;
    modelSlug: string;
    procedureTitle: string | null;
  }): Promise<ServiceRequest | null>;
  updateServiceRequestStatus(input: UpdateServiceRequestStatusInput): Promise<ServiceRequest | null>;
  listMaintenanceScheduleOverrides(): Promise<MaintenanceScheduleOverride[]>;
  upsertMaintenanceScheduleOverride(input: UpdateMaintenanceScheduleDueDateInput): Promise<MaintenanceScheduleOverride>;
  listMaintenanceRecords(): Promise<MaintenanceRecord[]>;
  createMaintenanceRecord(input: CreateMaintenanceRecordInput & {
    equipmentTitle: string;
    modelSlug: string;
    procedureId: string | null;
    procedureTitle: string | null;
  }): Promise<MaintenanceRecord>;
}
