import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config/types.js';
import type { AppDatabase } from '../../shared/db/types.js';
import { getErrorCode } from '../../shared/errors/index.js';
import { sendError } from '../../shared/http/sendError.js';
import { createAdminAuthService } from '../admin-auth/adminAuth.service.js';
import { requireRoleSession } from '../admin-auth/requireAdminSession.js';
import { createServiceManagementService } from './serviceManagement.service.js';
import type {
  CreateEquipmentInstanceInput,
  CreateMaintenanceProcedureInput,
  CreateMaintenanceRecordInput,
  CreateScheduledServiceRequestInput,
  CreateServiceRequestInput,
  UpdateEquipmentInstanceInput,
  UpdateMaintenanceProcedureInput,
  UpdateMaintenanceScheduleDueDateInput,
  UpdateServiceRequestInput,
  UpdateServiceRequestStatusInput,
} from './serviceManagement.types.js';

const SERVICE_READ_ROLES = ['admin', 'manager', 'engineer', 'viewer'] as const;
const SERVICE_MANAGE_ROLES = ['admin', 'manager'] as const;
const SERVICE_WORK_ROLES = ['admin', 'manager', 'engineer'] as const;

const sendServiceError = (reply: Parameters<typeof sendError>[0], code: string) => {
  if (code === 'validation_error') {
    return sendError(reply, 400, code, 'Invalid service payload.');
  }

  if (code === 'model_not_found') {
    return sendError(reply, 404, code, 'Equipment model not found.');
  }

  if (code === 'equipment_not_found') {
    return sendError(reply, 404, code, 'Equipment instance not found.');
  }

  if (code === 'request_not_found') {
    return sendError(reply, 404, code, 'Service request not found.');
  }

  if (code === 'procedure_not_found') {
    return sendError(reply, 404, code, 'Maintenance procedure not found.');
  }

  if (code === 'request_already_exists') {
    return sendError(reply, 409, code, 'Scheduled service request already exists.');
  }

  if (code === 'forbidden') {
    return sendError(reply, 403, code, 'Forbidden service operation.');
  }

  return sendError(reply, 500, code, 'Service operation failed.');
};

export const registerServiceManagementRoutes = async (
  app: FastifyInstance,
  config: AppConfig,
  database: AppDatabase,
) => {
  const authService = createAdminAuthService(config);
  const service = createServiceManagementService(
    database.repositories.serviceManagement,
    database.repositories.modelCatalog,
  );

  app.get('/api/admin/service/equipment', async (request, reply) => {
    if (!requireRoleSession(request, reply, authService, config, SERVICE_READ_ROLES)) {
      return;
    }

    return { items: await service.listEquipmentInstances() };
  });

  app.post<{ Body: Partial<CreateEquipmentInstanceInput> }>('/api/admin/service/equipment', async (request, reply) => {
    const actor = requireRoleSession(request, reply, authService, config, SERVICE_MANAGE_ROLES);
    if (!actor) {
      return;
    }

    try {
      const item = await service.createEquipmentInstance(request.body ?? {});
      await database.repositories.adminAuditLog.append({
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'service_equipment_create',
        targetType: 'equipmentInstance',
        targetId: item.id,
        details: { inventoryNumber: item.inventoryNumber, modelSlug: item.modelSlug },
      });
      return { item };
    } catch (error) {
      return sendServiceError(reply, getErrorCode(error, 'service_equipment_create_failed'));
    }
  });

  app.put<{ Params: { id: string }; Body: Partial<UpdateEquipmentInstanceInput> }>(
    '/api/admin/service/equipment/:id',
    async (request, reply) => {
      const actor = requireRoleSession(request, reply, authService, config, SERVICE_MANAGE_ROLES);
      if (!actor) {
        return;
      }

      try {
        const item = await service.updateEquipmentInstance({
          ...(request.body ?? {}),
          id: request.params.id,
        });
        await database.repositories.adminAuditLog.append({
          actorUid: actor.uid,
          actorEmail: actor.email,
          action: 'service_equipment_update',
          targetType: 'equipmentInstance',
          targetId: item.id,
          details: { inventoryNumber: item.inventoryNumber, status: item.status },
        });
        return { item };
      } catch (error) {
        return sendServiceError(reply, getErrorCode(error, 'service_equipment_update_failed'));
      }
    },
  );

  app.get('/api/admin/service/requests', async (request, reply) => {
    if (!requireRoleSession(request, reply, authService, config, SERVICE_READ_ROLES)) {
      return;
    }

    return { items: await service.listServiceRequests() };
  });

  app.get('/api/admin/service/procedures', async (request, reply) => {
    if (!requireRoleSession(request, reply, authService, config, SERVICE_READ_ROLES)) {
      return;
    }

    return { items: await service.listMaintenanceProcedures() };
  });

  app.get('/api/admin/service/schedule', async (request, reply) => {
    if (!requireRoleSession(request, reply, authService, config, SERVICE_READ_ROLES)) {
      return;
    }

    return { items: await service.listMaintenanceSchedule() };
  });

  app.post<{ Body: Partial<CreateMaintenanceProcedureInput> }>(
    '/api/admin/service/procedures',
    async (request, reply) => {
      const actor = requireRoleSession(request, reply, authService, config, SERVICE_MANAGE_ROLES);
      if (!actor) {
        return;
      }

      try {
        const item = await service.createMaintenanceProcedure(request.body ?? {});
        await database.repositories.adminAuditLog.append({
          actorUid: actor.uid,
          actorEmail: actor.email,
          action: 'service_procedure_create',
          targetType: 'maintenanceProcedure',
          targetId: item.id,
          details: {
            modelSlug: item.modelSlug,
            title: item.title,
            checklistCount: item.checklistItems.length,
          },
        });
        return { item };
      } catch (error) {
        return sendServiceError(reply, getErrorCode(error, 'service_procedure_create_failed'));
      }
    },
  );

  app.put<{ Params: { id: string }; Body: Partial<UpdateMaintenanceProcedureInput> }>(
    '/api/admin/service/procedures/:id',
    async (request, reply) => {
      const actor = requireRoleSession(request, reply, authService, config, SERVICE_MANAGE_ROLES);
      if (!actor) {
        return;
      }

      try {
        const item = await service.updateMaintenanceProcedure({
          ...(request.body ?? {}),
          id: request.params.id,
        });
        await database.repositories.adminAuditLog.append({
          actorUid: actor.uid,
          actorEmail: actor.email,
          action: 'service_procedure_update',
          targetType: 'maintenanceProcedure',
          targetId: item.id,
          details: { modelSlug: item.modelSlug, title: item.title },
        });
        return { item };
      } catch (error) {
        return sendServiceError(reply, getErrorCode(error, 'service_procedure_update_failed'));
      }
    },
  );

  app.delete<{ Params: { id: string } }>('/api/admin/service/procedures/:id', async (request, reply) => {
    const actor = requireRoleSession(request, reply, authService, config, SERVICE_MANAGE_ROLES);
    if (!actor) {
      return;
    }

    try {
      const item = await service.archiveMaintenanceProcedure(request.params.id);
      await database.repositories.adminAuditLog.append({
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'service_procedure_archive',
        targetType: 'maintenanceProcedure',
        targetId: item.id,
        details: { title: item.title },
      });
      return { item };
    } catch (error) {
      return sendServiceError(reply, getErrorCode(error, 'service_procedure_archive_failed'));
    }
  });

  app.post<{ Body: Partial<CreateServiceRequestInput> }>('/api/admin/service/requests', async (request, reply) => {
    const actor = requireRoleSession(request, reply, authService, config, SERVICE_MANAGE_ROLES);
    if (!actor) {
      return;
    }

    try {
      const item = await service.createServiceRequest(request.body ?? {});
      await database.repositories.adminAuditLog.append({
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'service_request_create',
        targetType: 'serviceRequest',
        targetId: item.id,
        details: { requestNumber: item.requestNumber, equipmentInstanceId: item.equipmentInstanceId },
      });
      return { item };
    } catch (error) {
      return sendServiceError(reply, getErrorCode(error, 'service_request_create_failed'));
    }
  });

  app.put<{ Params: { id: string }; Body: Partial<UpdateServiceRequestInput> }>(
    '/api/admin/service/requests/:id',
    async (request, reply) => {
      const actor = requireRoleSession(request, reply, authService, config, SERVICE_MANAGE_ROLES);
      if (!actor) {
        return;
      }

      try {
        const item = await service.updateServiceRequest({
          ...(request.body ?? {}),
          id: request.params.id,
        });
        await database.repositories.adminAuditLog.append({
          actorUid: actor.uid,
          actorEmail: actor.email,
          action: 'service_request_update',
          targetType: 'serviceRequest',
          targetId: item.id,
          details: { requestNumber: item.requestNumber, status: item.status },
        });
        return { item };
      } catch (error) {
        return sendServiceError(reply, getErrorCode(error, 'service_request_update_failed'));
      }
    },
  );

  app.post<{ Body: Partial<CreateScheduledServiceRequestInput> }>(
    '/api/admin/service/schedule/requests',
    async (request, reply) => {
      const actor = requireRoleSession(request, reply, authService, config, SERVICE_MANAGE_ROLES);
      if (!actor) {
        return;
      }

      try {
        const item = await service.createScheduledServiceRequest(request.body ?? {});
        await database.repositories.adminAuditLog.append({
          actorUid: actor.uid,
          actorEmail: actor.email,
          action: 'service_schedule_request_create',
          targetType: 'serviceRequest',
          targetId: item.id,
          details: {
            requestNumber: item.requestNumber,
            equipmentInstanceId: item.equipmentInstanceId,
            procedureId: item.procedureId,
          },
        });
        return { item };
      } catch (error) {
        return sendServiceError(reply, getErrorCode(error, 'service_schedule_request_create_failed'));
      }
    },
  );

  app.patch<{ Body: Partial<UpdateMaintenanceScheduleDueDateInput> }>(
    '/api/admin/service/schedule/due-date',
    async (request, reply) => {
      const actor = requireRoleSession(request, reply, authService, config, SERVICE_MANAGE_ROLES);
      if (!actor) {
        return;
      }

      try {
        const item = await service.updateMaintenanceScheduleDueDate(request.body ?? {});
        await database.repositories.adminAuditLog.append({
          actorUid: actor.uid,
          actorEmail: actor.email,
          action: 'service_schedule_due_date_update',
          targetType: 'maintenanceSchedule',
          targetId: `${item.equipmentInstanceId}:${item.procedureId}`,
          details: { nextDueAt: item.nextDueAt },
        });
        return { item };
      } catch (error) {
        return sendServiceError(reply, getErrorCode(error, 'service_schedule_due_date_failed'));
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: Partial<UpdateServiceRequestStatusInput> }>(
    '/api/admin/service/requests/:id/status',
    async (request, reply) => {
      const actor = requireRoleSession(request, reply, authService, config, SERVICE_WORK_ROLES);
      if (!actor) {
        return;
      }

      try {
        const item = await service.updateServiceRequestStatus({
          id: request.params.id,
          status: request.body?.status,
        });
        await database.repositories.adminAuditLog.append({
          actorUid: actor.uid,
          actorEmail: actor.email,
          action: 'service_request_status_update',
          targetType: 'serviceRequest',
          targetId: item.id,
          details: { status: item.status },
        });
        return { item };
      } catch (error) {
        return sendServiceError(reply, getErrorCode(error, 'service_request_status_failed'));
      }
    },
  );

  app.get('/api/admin/service/records', async (request, reply) => {
    if (!requireRoleSession(request, reply, authService, config, SERVICE_READ_ROLES)) {
      return;
    }

    return { items: await service.listMaintenanceRecords() };
  });

  app.post<{ Body: Partial<CreateMaintenanceRecordInput> }>('/api/admin/service/records', async (request, reply) => {
    const actor = requireRoleSession(request, reply, authService, config, SERVICE_WORK_ROLES);
    if (!actor) {
      return;
    }

    try {
      const recordInput = { ...(request.body ?? {}) };

      if (actor.role === 'engineer') {
        const serviceRequestId = typeof recordInput.serviceRequestId === 'string'
          ? recordInput.serviceRequestId.trim()
          : '';

        if (serviceRequestId) {
          const serviceRequest = await database.repositories.serviceManagement.getServiceRequestById(serviceRequestId);
          const assignedTo = serviceRequest?.assignedTo.trim().toLowerCase() ?? '';

          if (assignedTo && assignedTo !== actor.email.toLowerCase()) {
            return sendServiceError(reply, 'forbidden');
          }
        }

        recordInput.performedBy = actor.email;
      }

      const item = await service.createMaintenanceRecord(recordInput);
      await database.repositories.adminAuditLog.append({
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'service_record_create',
        targetType: 'maintenanceRecord',
        targetId: item.id,
        details: { equipmentInstanceId: item.equipmentInstanceId, serviceRequestId: item.serviceRequestId },
      });
      return { item };
    } catch (error) {
      return sendServiceError(reply, getErrorCode(error, 'service_record_create_failed'));
    }
  });
};
