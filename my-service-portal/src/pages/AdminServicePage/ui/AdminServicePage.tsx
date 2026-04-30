import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { getEquipmentModelCatalog, type EquipmentModelInfo } from '@/entities/equipment';
import {
  createMaintenanceRecord,
  createMaintenanceProcedure,
  createScheduledServiceRequest,
  createServiceEquipmentInstance,
  createServiceRequest,
  archiveMaintenanceProcedure,
  cancelServiceRequest,
  getMaintenanceRecords,
  getMaintenanceProcedures,
  getMaintenanceSchedule,
  getServiceEquipmentInstances,
  getServiceRequests,
  equipmentInstanceStatusLabels,
  maintenanceScheduleStatusLabels,
  serviceRequestPriorityLabels,
  serviceRequestStatusLabels,
  serviceRequestTypeLabels,
  updateMaintenanceProcedure,
  updateMaintenanceScheduleDueDate,
  updateServiceEquipmentInstance,
  updateServiceRequest,
  updateServiceRequestStatus,
  type EquipmentInstance,
  type EquipmentInstanceStatus,
  type MaintenanceProcedure,
  type MaintenanceProcedureChecklistItem,
  type MaintenanceRecord,
  type MaintenanceScheduleItem,
  type ServiceRequest,
  type ServiceRequestPriority,
  type ServiceRequestStatus,
  type ServiceRequestType,
} from '@/features/admin-service';
import { AdminApiError, getAdminUsers, type AdminUserDirectoryItem } from '@/features/admin-auth';
import { AppButton, AppSegmentedControl, type AppSegmentedOption } from '@/shared/ui';
import { AdminServiceDataGrid, type AdminServiceTab } from './AdminServiceDataGrid';
import styles from './AdminServicePage.module.scss';

const serviceTabOptions: AppSegmentedOption<AdminServiceTab>[] = [
  { value: 'equipment', label: 'Экземпляры' },
  { value: 'procedures', label: 'Регламенты' },
  { value: 'requests', label: 'Заявки' },
  { value: 'records', label: 'Записи работ' },
  { value: 'schedule', label: 'График ТО' },
];

const userRoleLabels: Record<AdminUserDirectoryItem['role'], string> = {
  admin: 'Админ',
  manager: 'Менеджер',
  engineer: 'Инженер',
  viewer: 'Просмотр',
};

const instanceStatusOptions = Object.entries(equipmentInstanceStatusLabels) as Array<[EquipmentInstanceStatus, string]>;
const requestTypeOptions = Object.entries(serviceRequestTypeLabels) as Array<[ServiceRequestType, string]>;
const priorityOptions = Object.entries(serviceRequestPriorityLabels) as Array<[ServiceRequestPriority, string]>;
const requestStatusOptions = Object.entries(serviceRequestStatusLabels) as Array<[ServiceRequestStatus, string]>;

const getErrorMessage = (error: unknown) => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'unauthorized':
      return 'Сессия администратора истекла. Войдите снова.';
    case 'model_not_found':
      return 'Выбранная модель не найдена.';
    case 'equipment_not_found':
      return 'Экземпляр оборудования не найден.';
    case 'request_not_found':
      return 'Заявка не найдена.';
    case 'request_already_exists':
      return 'По этому регламенту уже есть открытая заявка.';
    case 'forbidden':
      return 'Недостаточно прав для операции.';
    case 'validation_error':
      return 'Заполните обязательные поля корректно.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      return 'Операция не выполнена.';
  }
};

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Без срока';
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));
};

const toDateInputValue = (value: string | null) => {
  if (!value) {
    return '';
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value.slice(0, 10);
  }

  return new Date(timestamp).toISOString().slice(0, 10);
};

const splitLines = (value: string) => {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildChecklistItems = (value: string): MaintenanceProcedureChecklistItem[] => {
  return splitLines(value).map((title, index) => ({
    id: `step-${index + 1}`,
    title,
    description: '',
    partId: null,
    required: true,
  }));
};

export const AdminServicePage = () => {
  const [models, setModels] = useState<EquipmentModelInfo[]>([]);
  const [equipment, setEquipment] = useState<EquipmentInstance[]>([]);
  const [procedures, setProcedures] = useState<MaintenanceProcedure[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [schedule, setSchedule] = useState<MaintenanceScheduleItem[]>([]);
  const [users, setUsers] = useState<AdminUserDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [equipmentEditingId, setEquipmentEditingId] = useState<string | null>(null);
  const [procedureEditingId, setProcedureEditingId] = useState<string | null>(null);
  const [requestEditingId, setRequestEditingId] = useState<string | null>(null);
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});
  const [scheduleDueDateDrafts, setScheduleDueDateDrafts] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<AdminServiceTab>('equipment');
  const [filters, setFilters] = useState({
    search: '',
    equipmentStatus: 'all' as EquipmentInstanceStatus | 'all',
    requestStatus: 'open' as ServiceRequestStatus | 'open' | 'all',
    requestType: 'all' as ServiceRequestType | 'all',
    assignedTo: '',
    modelSlug: 'all',
    scheduleMonth: 'all',
  });

  const [equipmentForm, setEquipmentForm] = useState({
    inventoryNumber: '',
    modelSlug: '',
    serialNumber: '',
    location: '',
    responsible: '',
    status: 'active' as EquipmentInstanceStatus,
    commissionedAt: '',
    notes: '',
  });

  const [requestForm, setRequestForm] = useState({
    equipmentInstanceId: '',
    type: 'repair' as ServiceRequestType,
    priority: 'normal' as ServiceRequestPriority,
    status: 'new' as ServiceRequestStatus,
    procedureId: '',
    title: '',
    description: '',
    assignedTo: '',
    requiredParts: '',
    dueDate: '',
  });

  const [procedureForm, setProcedureForm] = useState({
    modelSlug: '',
    title: '',
    description: '',
    intervalDays: '',
    estimatedMinutes: '',
    tools: '',
    consumables: '',
    checklistItems: '',
  });

  const [recordForm, setRecordForm] = useState({
    serviceRequestId: '',
    equipmentInstanceId: '',
    performedBy: '',
    summary: '',
    actions: '',
    replacedParts: '',
    resultStatus: 'active' as EquipmentInstanceStatus,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        modelItems,
        equipmentResponse,
        proceduresResponse,
        requestsResponse,
        recordsResponse,
        scheduleResponse,
        usersResponse,
      ] = await Promise.all([
        getEquipmentModelCatalog(),
        getServiceEquipmentInstances(),
        getMaintenanceProcedures(),
        getServiceRequests(),
        getMaintenanceRecords(),
        getMaintenanceSchedule(),
        getAdminUsers(),
      ]);

      setModels(modelItems);
      setEquipment(equipmentResponse.items);
      setProcedures(proceduresResponse.items);
      setRequests(requestsResponse.items);
      setRecords(recordsResponse.items);
      setSchedule(scheduleResponse.items);
      setUsers(usersResponse.items);
      setEquipmentForm((current) => ({
        ...current,
        modelSlug: current.modelSlug || modelItems[0]?.slug || '',
      }));
      setProcedureForm((current) => ({
        ...current,
        modelSlug: current.modelSlug || modelItems[0]?.slug || '',
      }));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openRequests = useMemo(() => {
    return requests.filter((request) => request.status !== 'completed' && request.status !== 'canceled');
  }, [requests]);

  const activeProcedures = useMemo(() => {
    return procedures.filter((procedure) => !procedure.archivedAt);
  }, [procedures]);

  const serviceAnalytics = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const completedRequests = requests.filter((request) => request.status === 'completed');
    const overdueRequests = openRequests.filter((request) => {
      if (!request.dueDate) {
        return false;
      }

      return Date.parse(request.dueDate) < now;
    });
    const dueSoonRequests = openRequests.filter((request) => {
      if (!request.dueDate) {
        return false;
      }

      const dueAt = Date.parse(request.dueDate);
      return dueAt >= now && dueAt - now <= sevenDaysMs;
    });
    const criticalRequests = openRequests.filter((request) => request.priority === 'critical' || request.priority === 'high');
    const faultyEquipment = equipment.filter((item) => item.status === 'faulty');
    const overdueSchedule = schedule.filter((item) => item.status === 'overdue');
    const dueSoonSchedule = schedule.filter((item) => item.status === 'due_soon');
    const requestedSchedule = schedule.filter((item) => item.status === 'requested');
    const completionRate = requests.length > 0 ? Math.round((completedRequests.length / requests.length) * 100) : 0;

    return {
      completedRequests,
      overdueRequests,
      dueSoonRequests,
      criticalRequests,
      faultyEquipment,
      overdueSchedule,
      dueSoonSchedule,
      requestedSchedule,
      completionRate,
    };
  }, [equipment, openRequests, requests, schedule]);

  const selectedRequestEquipment = useMemo(() => {
    return equipment.find((item) => item.id === requestForm.equipmentInstanceId) ?? null;
  }, [equipment, requestForm.equipmentInstanceId]);

  const requestProcedureOptions = useMemo(() => {
    if (!selectedRequestEquipment) {
      return [] as MaintenanceProcedure[];
    }

    return activeProcedures.filter((procedure) => procedure.modelSlug === selectedRequestEquipment.modelSlug);
  }, [activeProcedures, selectedRequestEquipment]);

  const selectedRequest = useMemo(() => {
    return requests.find((request) => request.id === recordForm.serviceRequestId) ?? null;
  }, [recordForm.serviceRequestId, requests]);

  const assigneeOptions = useMemo(() => {
    const serviceUserEmails = users
      .filter((user) => user.role !== 'viewer')
      .map((user) => user.email);

    return Array.from(new Set([
      ...serviceUserEmails,
      ...requests.map((request) => request.assignedTo).filter(Boolean),
      ...equipment.map((item) => item.responsible).filter(Boolean),
      ...records.map((record) => record.performedBy).filter(Boolean),
    ])).sort((left, right) => left.localeCompare(right, 'ru'));
  }, [equipment, records, requests, users]);

  const getUserOptionLabel = useCallback((email: string) => {
    const user = users.find((item) => item.email === email);
    return user ? `${user.email} · ${userRoleLabels[user.role]}` : email;
  }, [users]);

  const scheduleMonthOptions = useMemo(() => {
    return Array.from(new Set(schedule.map((item) => item.nextDueAt.slice(0, 7)))).sort();
  }, [schedule]);

  const normalizedSearch = filters.search.trim().toLowerCase();

  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      const matchesStatus = filters.equipmentStatus === 'all' || item.status === filters.equipmentStatus;
      const matchesModel = filters.modelSlug === 'all' || item.modelSlug === filters.modelSlug;
      const matchesSearch = !normalizedSearch || [
        item.inventoryNumber,
        item.modelTitle,
        item.serialNumber,
        item.location,
        item.responsible,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesModel && matchesSearch;
    });
  }, [equipment, filters.equipmentStatus, filters.modelSlug, normalizedSearch]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = filters.requestStatus === 'all'
        || (filters.requestStatus === 'open'
          ? request.status !== 'completed' && request.status !== 'canceled'
          : request.status === filters.requestStatus);
      const matchesType = filters.requestType === 'all' || request.type === filters.requestType;
      const matchesModel = filters.modelSlug === 'all' || request.modelSlug === filters.modelSlug;
      const matchesAssignee = !filters.assignedTo || request.assignedTo === filters.assignedTo;
      const matchesSearch = !normalizedSearch || [
        request.requestNumber,
        request.title,
        request.description,
        request.equipmentTitle,
        request.assignedTo,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesType && matchesModel && matchesAssignee && matchesSearch;
    });
  }, [filters.assignedTo, filters.modelSlug, filters.requestStatus, filters.requestType, normalizedSearch, requests]);

  const filteredProcedures = useMemo(() => {
    return procedures.filter((procedure) => {
      const matchesModel = filters.modelSlug === 'all' || procedure.modelSlug === filters.modelSlug;
      const matchesSearch = !normalizedSearch || [
        procedure.title,
        procedure.modelTitle,
        procedure.description,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesModel && matchesSearch;
    });
  }, [filters.modelSlug, normalizedSearch, procedures]);

  const filteredSchedule = useMemo(() => {
    return schedule.filter((item) => {
      const matchesModel = filters.modelSlug === 'all' || item.modelSlug === filters.modelSlug;
      const matchesMonth = filters.scheduleMonth === 'all' || item.nextDueAt.startsWith(filters.scheduleMonth);
      const matchesSearch = !normalizedSearch || [
        item.inventoryNumber,
        item.modelTitle,
        item.procedureTitle,
        item.location,
        item.responsible,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesModel && matchesMonth && matchesSearch;
    });
  }, [filters.modelSlug, filters.scheduleMonth, normalizedSearch, schedule]);

  const scheduleByMonth = useMemo(() => {
    return filteredSchedule.reduce<Array<{ month: string; items: MaintenanceScheduleItem[] }>>((groups, item) => {
      const month = item.nextDueAt.slice(0, 7);
      const current = groups.find((group) => group.month === month);
      if (current) {
        current.items.push(item);
      } else {
        groups.push({ month, items: [item] });
      }
      return groups;
    }, []);
  }, [filteredSchedule]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesModel = filters.modelSlug === 'all' || record.modelSlug === filters.modelSlug;
      const matchesAssignee = !filters.assignedTo || record.performedBy === filters.assignedTo;
      const matchesSearch = !normalizedSearch || [
        record.equipmentTitle,
        record.performedBy,
        record.summary,
        record.procedureTitle ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesModel && matchesAssignee && matchesSearch;
    });
  }, [filters.assignedTo, filters.modelSlug, normalizedSearch, records]);

  useEffect(() => {
    if (!recordForm.serviceRequestId || !selectedRequest) {
      return;
    }

    setRecordForm((current) => ({
      ...current,
      equipmentInstanceId: selectedRequest.equipmentInstanceId,
      performedBy: selectedRequest.assignedTo || current.performedBy,
      summary: current.summary || selectedRequest.title,
    }));
  }, [recordForm.serviceRequestId, selectedRequest]);

  const handleCreateEquipment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...equipmentForm,
        commissionedAt: equipmentForm.commissionedAt || null,
      };
      const response = equipmentEditingId
        ? await updateServiceEquipmentInstance({ ...payload, id: equipmentEditingId })
        : await createServiceEquipmentInstance(payload);
      setEquipment((current) => (
        equipmentEditingId
          ? current.map((item) => (item.id === response.item.id ? response.item : item))
          : [response.item, ...current]
      ));
      setEquipmentForm((current) => ({
        inventoryNumber: '',
        modelSlug: current.modelSlug,
        serialNumber: '',
        location: '',
        responsible: '',
        status: 'active',
        commissionedAt: '',
        notes: '',
      }));
      setEquipmentEditingId(null);
      setMessage(equipmentEditingId ? 'Экземпляр оборудования обновлен.' : 'Экземпляр оборудования создан.');
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const handleEditEquipment = (item: EquipmentInstance) => {
    setActiveTab('equipment');
    setEquipmentEditingId(item.id);
    setEquipmentForm({
      inventoryNumber: item.inventoryNumber,
      modelSlug: item.modelSlug,
      serialNumber: item.serialNumber,
      location: item.location,
      responsible: item.responsible,
      status: item.status,
      commissionedAt: toDateInputValue(item.commissionedAt),
      notes: item.notes,
    });
  };

  const handleArchiveEquipment = async (item: EquipmentInstance) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await updateServiceEquipmentInstance({
        id: item.id,
        inventoryNumber: item.inventoryNumber,
        modelSlug: item.modelSlug,
        serialNumber: item.serialNumber,
        location: item.location,
        responsible: item.responsible,
        status: 'retired',
        commissionedAt: item.commissionedAt,
        notes: item.notes,
      });
      setEquipment((current) => current.map((currentItem) => (
        currentItem.id === response.item.id ? response.item : currentItem
      )));
      setMessage('Оборудование списано в архив.');
      await load();
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...requestForm,
        requiredParts: splitLines(requestForm.requiredParts),
        procedureId: requestForm.procedureId || null,
        dueDate: requestForm.dueDate || null,
      };
      const response = requestEditingId
        ? await updateServiceRequest({ ...payload, id: requestEditingId })
        : await createServiceRequest(payload);
      setRequests((current) => (
        requestEditingId
          ? current.map((item) => (item.id === response.item.id ? response.item : item))
          : [response.item, ...current]
      ));
      setEquipment((current) =>
        current.map((item) =>
          item.id === response.item.equipmentInstanceId ? { ...item, status: 'maintenance' } : item,
        ),
      );
      setRequestForm((current) => ({
        equipmentInstanceId: current.equipmentInstanceId,
        type: 'repair',
        priority: 'normal',
        status: 'new',
        procedureId: '',
        title: '',
        description: '',
        assignedTo: '',
        requiredParts: '',
        dueDate: '',
      }));
      setRequestEditingId(null);
      setMessage(requestEditingId ? 'Заявка обновлена.' : 'Заявка создана.');
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const handleEditRequest = (request: ServiceRequest) => {
    setActiveTab('requests');
    setRequestEditingId(request.id);
    setRequestForm({
      equipmentInstanceId: request.equipmentInstanceId,
      type: request.type,
      priority: request.priority,
      status: request.status,
      procedureId: request.procedureId ?? '',
      title: request.title,
      description: request.description,
      assignedTo: request.assignedTo,
      requiredParts: request.requiredParts.join('\n'),
      dueDate: toDateInputValue(request.dueDate),
    });
  };

  const handleCreateScheduledRequest = async (item: MaintenanceScheduleItem) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await createScheduledServiceRequest({
        equipmentInstanceId: item.equipmentInstanceId,
        procedureId: item.procedureId,
        dueDate: item.nextDueAt,
        requiredParts: item.requiredParts,
      });
      setMessage('Плановая заявка создана по графику ТО.');
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProcedure = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        modelSlug: procedureForm.modelSlug,
        title: procedureForm.title,
        description: procedureForm.description,
        intervalDays: procedureForm.intervalDays ? Number(procedureForm.intervalDays) : null,
        estimatedMinutes: procedureForm.estimatedMinutes ? Number(procedureForm.estimatedMinutes) : null,
        tools: splitLines(procedureForm.tools),
        consumables: splitLines(procedureForm.consumables),
        checklistItems: buildChecklistItems(procedureForm.checklistItems),
      };
      const response = procedureEditingId
        ? await updateMaintenanceProcedure({ ...payload, id: procedureEditingId })
        : await createMaintenanceProcedure(payload);
      setProcedures((current) => (
        procedureEditingId
          ? current.map((item) => (item.id === response.item.id ? response.item : item))
          : [response.item, ...current]
      ));
      setProcedureForm((current) => ({
        modelSlug: current.modelSlug,
        title: '',
        description: '',
        intervalDays: '',
        estimatedMinutes: '',
        tools: '',
        consumables: '',
        checklistItems: '',
      }));
      setProcedureEditingId(null);
      setMessage(procedureEditingId ? 'Регламент обслуживания обновлен.' : 'Регламент обслуживания создан.');
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const handleEditProcedure = (procedure: MaintenanceProcedure) => {
    setActiveTab('procedures');
    setProcedureEditingId(procedure.id);
    setProcedureForm({
      modelSlug: procedure.modelSlug,
      title: procedure.title,
      description: procedure.description,
      intervalDays: procedure.intervalDays ? String(procedure.intervalDays) : '',
      estimatedMinutes: procedure.estimatedMinutes ? String(procedure.estimatedMinutes) : '',
      tools: procedure.tools.join('\n'),
      consumables: procedure.consumables.join('\n'),
      checklistItems: procedure.checklistItems.map((item) => item.title).join('\n'),
    });
  };

  const handleArchiveProcedure = async (procedure: MaintenanceProcedure) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await archiveMaintenanceProcedure(procedure.id);
      setProcedures((current) => current.map((item) => (
        item.id === response.item.id ? response.item : item
      )));
      setMessage('Регламент отправлен в архив.');
      await load();
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ServiceRequestStatus) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await updateServiceRequestStatus(id, status);
      setRequests((current) => current.map((item) => (item.id === response.item.id ? response.item : item)));
      setMessage('Статус заявки обновлен.');
      if (status === 'completed' || status === 'canceled') {
        await load();
      }
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRequest = async (request: ServiceRequest) => {
    const reason = (cancelReasons[request.id] ?? '').trim();
    if (!reason) {
      setError('Укажите причину отмены заявки.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await cancelServiceRequest(request.id, reason);
      setRequests((current) => current.map((item) => (item.id === response.item.id ? response.item : item)));
      setCancelReasons((current) => ({ ...current, [request.id]: '' }));
      setMessage('Заявка отменена.');
      await load();
    } catch (cancelError) {
      setError(getErrorMessage(cancelError));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateScheduleDueDate = async (item: MaintenanceScheduleItem) => {
    const nextDueAt = scheduleDueDateDrafts[item.id];
    if (!nextDueAt) {
      setError('Выберите новый срок ТО.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateMaintenanceScheduleDueDate({
        equipmentInstanceId: item.equipmentInstanceId,
        procedureId: item.procedureId,
        nextDueAt,
      });
      setMessage('Срок планового ТО перенесен.');
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await createMaintenanceRecord({
        serviceRequestId: recordForm.serviceRequestId || null,
        equipmentInstanceId: recordForm.equipmentInstanceId,
        performedBy: recordForm.performedBy,
        summary: recordForm.summary,
        actions: splitLines(recordForm.actions),
        replacedParts: splitLines(recordForm.replacedParts),
        resultStatus: recordForm.resultStatus,
      });
      setRecords((current) => [response.item, ...current]);
      setRecordForm({
        serviceRequestId: '',
        equipmentInstanceId: '',
        performedBy: '',
        summary: '',
        actions: '',
        replacedParts: '',
        resultStatus: 'active',
      });
      setMessage('Работа добавлена в историю обслуживания.');
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.adminServicePage__page}>
      <div className={styles.adminServicePage__topBar}>
        <div>
          <h1 className={styles.adminServicePage__title}>Сервисное обслуживание</h1>
          <p className={styles.adminServicePage__subtitle}>Экземпляры оборудования, заявки и история работ.</p>
        </div>
      </div>

      {error ? <p className={styles.adminServicePage__error}>{error}</p> : null}
      {message ? <p className={styles.adminServicePage__message}>{message}</p> : null}

      <section className={styles.adminServicePage__filtersPanel}>
        <label className={styles.adminServicePage__field}>
          <span>Поиск</span>
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Инвентарный номер, заявка, место, исполнитель"
          />
        </label>
        <label className={styles.adminServicePage__field}>
          <span>Модель</span>
          <select
            value={filters.modelSlug}
            onChange={(event) => setFilters((current) => ({ ...current, modelSlug: event.target.value }))}
          >
            <option value="all">Все модели</option>
            {models.map((model) => (
              <option key={model.slug} value={model.slug}>{model.title}</option>
            ))}
          </select>
        </label>
        <label className={styles.adminServicePage__field}>
          <span>Статус оборудования</span>
          <select
            value={filters.equipmentStatus}
            onChange={(event) => setFilters((current) => ({
              ...current,
              equipmentStatus: event.target.value as EquipmentInstanceStatus | 'all',
            }))}
          >
            <option value="all">Все статусы</option>
            {instanceStatusOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.adminServicePage__field}>
          <span>Статус заявок</span>
          <select
            value={filters.requestStatus}
            onChange={(event) => setFilters((current) => ({
              ...current,
              requestStatus: event.target.value as ServiceRequestStatus | 'open' | 'all',
            }))}
          >
            <option value="open">Открытые</option>
            <option value="all">Все заявки</option>
            {requestStatusOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.adminServicePage__field}>
          <span>Тип заявки</span>
          <select
            value={filters.requestType}
            onChange={(event) => setFilters((current) => ({
              ...current,
              requestType: event.target.value as ServiceRequestType | 'all',
            }))}
          >
            <option value="all">Все типы</option>
            {requestTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className={styles.adminServicePage__field}>
          <span>Исполнитель</span>
          <select
            value={filters.assignedTo}
            onChange={(event) => setFilters((current) => ({ ...current, assignedTo: event.target.value }))}
          >
            <option value="">Все исполнители</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee} value={assignee}>{getUserOptionLabel(assignee)}</option>
            ))}
          </select>
        </label>
        <label className={styles.adminServicePage__field}>
          <span>Месяц ТО</span>
          <select
            value={filters.scheduleMonth}
            onChange={(event) => setFilters((current) => ({ ...current, scheduleMonth: event.target.value }))}
          >
            <option value="all">Все месяцы</option>
            {scheduleMonthOptions.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </label>
      </section>

      <div className={styles.adminServicePage__summaryGrid}>
        <div className={styles.adminServicePage__metric}>
          <span>Оборудование</span>
          <strong>{equipment.length}</strong>
        </div>
        <div className={styles.adminServicePage__metric}>
          <span>Открытые заявки</span>
          <strong>{openRequests.length}</strong>
        </div>
        <div className={styles.adminServicePage__metric}>
          <span>Записи работ</span>
          <strong>{records.length}</strong>
        </div>
        <div className={styles.adminServicePage__metric}>
          <span>Регламенты</span>
          <strong>{procedures.length}</strong>
        </div>
        <div className={styles.adminServicePage__metric}>
          <span>Просрочено ТО</span>
          <strong>{serviceAnalytics.overdueSchedule.length}</strong>
        </div>
        <div className={styles.adminServicePage__metric}>
          <span>Скоро ТО</span>
          <strong>{serviceAnalytics.dueSoonSchedule.length}</strong>
        </div>
        <div className={styles.adminServicePage__metric}>
          <span>Неисправно</span>
          <strong>{serviceAnalytics.faultyEquipment.length}</strong>
        </div>
        <div className={styles.adminServicePage__metric}>
          <span>Закрытие заявок</span>
          <strong>{serviceAnalytics.completionRate}%</strong>
        </div>
      </div>

      <section className={styles.adminServicePage__alertsPanel}>
        <h2>Контроль сервиса</h2>
        <div className={styles.adminServicePage__alertsGrid}>
          <div>
            <strong>Просроченные заявки</strong>
            {serviceAnalytics.overdueRequests.length > 0 ? (
              serviceAnalytics.overdueRequests.slice(0, 4).map((request) => (
                <p key={request.id}>{request.requestNumber} · {request.title} · {formatDate(request.dueDate)}</p>
              ))
            ) : (
              <p>Просроченных заявок нет.</p>
            )}
          </div>
          <div>
            <strong>Ближайшие сроки</strong>
            {serviceAnalytics.dueSoonRequests.length > 0 ? (
              serviceAnalytics.dueSoonRequests.slice(0, 4).map((request) => (
                <p key={request.id}>{request.requestNumber} · {request.title} · {formatDate(request.dueDate)}</p>
              ))
            ) : (
              <p>На ближайшую неделю срочных сроков нет.</p>
            )}
          </div>
          <div>
            <strong>Проблемное оборудование</strong>
            {serviceAnalytics.faultyEquipment.length > 0 ? (
              serviceAnalytics.faultyEquipment.slice(0, 4).map((item) => (
                <p key={item.id}>{item.inventoryNumber} · {item.modelTitle} · {item.location || 'Без места'}</p>
              ))
            ) : (
              <p>Оборудование с критичным статусом не отмечено.</p>
            )}
          </div>
          <div>
            <strong>Плановое ТО</strong>
            {[...serviceAnalytics.overdueSchedule, ...serviceAnalytics.dueSoonSchedule].length > 0 ? (
              [...serviceAnalytics.overdueSchedule, ...serviceAnalytics.dueSoonSchedule].slice(0, 4).map((item) => (
                <p key={item.id}>
                  {item.inventoryNumber} · {item.procedureTitle} · {formatDate(item.nextDueAt)}
                </p>
              ))
            ) : (
              <p>Просроченного и ближайшего ТО нет.</p>
            )}
          </div>
        </div>
      </section>

      <AppSegmentedControl
        value={activeTab}
        options={serviceTabOptions}
        onChange={setActiveTab}
        ariaLabel="Разделы сервисного учета"
        className={styles.adminServicePage__tabs}
        buttonClassName={styles.adminServicePage__tabButton}
        activeButtonClassName={styles.adminServicePage__tabButtonActive}
      />

      <div className={styles.adminServicePage__layout}>
        {activeTab === 'equipment' ? (
        <form className={styles.adminServicePage__panel} onSubmit={handleCreateEquipment}>
          <h2>{equipmentEditingId ? 'Редактирование экземпляра' : 'Новый экземпляр'}</h2>
          <label className={styles.adminServicePage__field}>
            <span>Инвентарный номер</span>
            <input
              value={equipmentForm.inventoryNumber}
              onChange={(event) => setEquipmentForm((current) => ({ ...current, inventoryNumber: event.target.value }))}
              required
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Модель</span>
            <select
              value={equipmentForm.modelSlug}
              onChange={(event) => setEquipmentForm((current) => ({ ...current, modelSlug: event.target.value }))}
              required
            >
              <option value="" disabled>Выберите модель</option>
              {models.map((model) => (
                <option key={model.slug} value={model.slug}>{model.title}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Серийный номер</span>
            <input
              value={equipmentForm.serialNumber}
              onChange={(event) => setEquipmentForm((current) => ({ ...current, serialNumber: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Место эксплуатации</span>
            <input
              value={equipmentForm.location}
              onChange={(event) => setEquipmentForm((current) => ({ ...current, location: event.target.value }))}
              required
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Ответственный</span>
            <select
              value={equipmentForm.responsible}
              onChange={(event) => setEquipmentForm((current) => ({ ...current, responsible: event.target.value }))}
            >
              <option value="">Не назначен</option>
              {assigneeOptions.map((assignee) => (
                <option key={assignee} value={assignee}>{getUserOptionLabel(assignee)}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Дата ввода</span>
            <input
              type="date"
              value={equipmentForm.commissionedAt}
              onChange={(event) => setEquipmentForm((current) => ({ ...current, commissionedAt: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Статус</span>
            <select
              value={equipmentForm.status}
              onChange={(event) => setEquipmentForm((current) => ({ ...current, status: event.target.value as EquipmentInstanceStatus }))}
            >
              {instanceStatusOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Заметки</span>
            <textarea
              value={equipmentForm.notes}
              onChange={(event) => setEquipmentForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
          <AppButton type="submit" variant="primary" disabled={saving || loading || models.length === 0}>
            {equipmentEditingId ? 'Сохранить экземпляр' : 'Создать экземпляр'}
          </AppButton>
          {equipmentEditingId ? (
            <button
              type="button"
              className={styles.adminServicePage__plainButton}
              onClick={() => {
                setEquipmentEditingId(null);
                setEquipmentForm((current) => ({
                  inventoryNumber: '',
                  modelSlug: current.modelSlug,
                  serialNumber: '',
                  location: '',
                  responsible: '',
                  status: 'active',
                  commissionedAt: '',
                  notes: '',
                }));
              }}
            >
              Отменить редактирование
            </button>
          ) : null}
        </form>
        ) : null}

        {activeTab === 'procedures' ? (
        <form className={styles.adminServicePage__panel} onSubmit={handleCreateProcedure}>
          <h2>{procedureEditingId ? 'Редактирование регламента' : 'Регламент обслуживания'}</h2>
          <label className={styles.adminServicePage__field}>
            <span>Модель</span>
            <select
              value={procedureForm.modelSlug}
              onChange={(event) => setProcedureForm((current) => ({ ...current, modelSlug: event.target.value }))}
              required
            >
              <option value="" disabled>Выберите модель</option>
              {models.map((model) => (
                <option key={model.slug} value={model.slug}>{model.title}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Название регламента</span>
            <input
              value={procedureForm.title}
              onChange={(event) => setProcedureForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Периодичность, дней</span>
            <input
              type="number"
              min="1"
              value={procedureForm.intervalDays}
              onChange={(event) => setProcedureForm((current) => ({ ...current, intervalDays: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Оценка времени, минут</span>
            <input
              type="number"
              min="1"
              value={procedureForm.estimatedMinutes}
              onChange={(event) => setProcedureForm((current) => ({ ...current, estimatedMinutes: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Описание</span>
            <textarea
              value={procedureForm.description}
              onChange={(event) => setProcedureForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Инструменты, по одному на строку</span>
            <textarea
              value={procedureForm.tools}
              onChange={(event) => setProcedureForm((current) => ({ ...current, tools: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Расходники, по одному на строку</span>
            <textarea
              value={procedureForm.consumables}
              onChange={(event) => setProcedureForm((current) => ({ ...current, consumables: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Чек-лист, по одному пункту на строку</span>
            <textarea
              value={procedureForm.checklistItems}
              onChange={(event) => setProcedureForm((current) => ({ ...current, checklistItems: event.target.value }))}
              required
            />
          </label>
          <AppButton type="submit" variant="primary" disabled={saving || loading || models.length === 0}>
            {procedureEditingId ? 'Сохранить регламент' : 'Создать регламент'}
          </AppButton>
          {procedureEditingId ? (
            <button
              type="button"
              className={styles.adminServicePage__plainButton}
              onClick={() => {
                setProcedureEditingId(null);
                setProcedureForm((current) => ({
                  modelSlug: current.modelSlug,
                  title: '',
                  description: '',
                  intervalDays: '',
                  estimatedMinutes: '',
                  tools: '',
                  consumables: '',
                  checklistItems: '',
                }));
              }}
            >
              Отменить редактирование
            </button>
          ) : null}
        </form>
        ) : null}

        {activeTab === 'requests' ? (
        <form className={styles.adminServicePage__panel} onSubmit={handleCreateRequest}>
          <h2>{requestEditingId ? 'Редактирование заявки' : 'Новая заявка'}</h2>
          <label className={styles.adminServicePage__field}>
            <span>Оборудование</span>
            <select
              value={requestForm.equipmentInstanceId}
              onChange={(event) => setRequestForm((current) => ({ ...current, equipmentInstanceId: event.target.value }))}
              required
            >
              <option value="" disabled>Выберите экземпляр</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>{item.inventoryNumber} - {item.modelTitle}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Тип</span>
            <select
              value={requestForm.type}
              onChange={(event) => setRequestForm((current) => ({ ...current, type: event.target.value as ServiceRequestType }))}
            >
              {requestTypeOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Приоритет</span>
            <select
              value={requestForm.priority}
              onChange={(event) => setRequestForm((current) => ({ ...current, priority: event.target.value as ServiceRequestPriority }))}
            >
              {priorityOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          {requestEditingId ? (
            <label className={styles.adminServicePage__field}>
              <span>Статус</span>
              <select
                value={requestForm.status}
                onChange={(event) => setRequestForm((current) => ({
                  ...current,
                  status: event.target.value as ServiceRequestStatus,
                }))}
              >
                {requestStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={styles.adminServicePage__field}>
            <span>Регламент</span>
            <select
              value={requestForm.procedureId}
              onChange={(event) => setRequestForm((current) => ({ ...current, procedureId: event.target.value }))}
              disabled={!selectedRequestEquipment || requestProcedureOptions.length === 0}
            >
              <option value="">Без регламента</option>
              {requestProcedureOptions.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>{procedure.title}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Заголовок</span>
            <input
              value={requestForm.title}
              onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Исполнитель</span>
            <select
              value={requestForm.assignedTo}
              onChange={(event) => setRequestForm((current) => ({ ...current, assignedTo: event.target.value }))}
            >
              <option value="">Не назначен</option>
              {assigneeOptions.map((assignee) => (
                <option key={assignee} value={assignee}>{getUserOptionLabel(assignee)}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Нужные запчасти и материалы, по одной позиции на строку</span>
            <textarea
              value={requestForm.requiredParts}
              onChange={(event) => setRequestForm((current) => ({ ...current, requiredParts: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Срок</span>
            <input
              type="date"
              value={requestForm.dueDate}
              onChange={(event) => setRequestForm((current) => ({ ...current, dueDate: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Описание</span>
            <textarea
              value={requestForm.description}
              onChange={(event) => setRequestForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <AppButton type="submit" variant="primary" disabled={saving || loading || equipment.length === 0}>
            {requestEditingId ? 'Сохранить заявку' : 'Создать заявку'}
          </AppButton>
          {requestEditingId ? (
            <button
              type="button"
              className={styles.adminServicePage__plainButton}
              onClick={() => {
                setRequestEditingId(null);
                setRequestForm((current) => ({
                  equipmentInstanceId: current.equipmentInstanceId,
                  type: 'repair',
                  priority: 'normal',
                  status: 'new',
                  procedureId: '',
                  title: '',
                  description: '',
                  assignedTo: '',
                  requiredParts: '',
                  dueDate: '',
                }));
              }}
            >
              Отменить редактирование
            </button>
          ) : null}
        </form>
        ) : null}

        {activeTab === 'records' ? (
        <form className={styles.adminServicePage__panel} onSubmit={handleCreateRecord}>
          <h2>Запись работы</h2>
          <label className={styles.adminServicePage__field}>
            <span>Заявка</span>
            <select
              value={recordForm.serviceRequestId}
              onChange={(event) => setRecordForm((current) => ({ ...current, serviceRequestId: event.target.value }))}
            >
              <option value="">Без заявки</option>
              {openRequests.map((request) => (
                <option key={request.id} value={request.id}>{request.requestNumber} - {request.title}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Оборудование</span>
            <select
              value={recordForm.equipmentInstanceId}
              onChange={(event) => setRecordForm((current) => ({ ...current, equipmentInstanceId: event.target.value }))}
              required
            >
              <option value="" disabled>Выберите экземпляр</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>{item.inventoryNumber} - {item.modelTitle}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Исполнитель</span>
            <select
              value={recordForm.performedBy}
              onChange={(event) => setRecordForm((current) => ({ ...current, performedBy: event.target.value }))}
              disabled={Boolean(selectedRequest?.assignedTo)}
              required
            >
              <option value="" disabled>Выберите исполнителя</option>
              {assigneeOptions.map((assignee) => (
                <option key={assignee} value={assignee}>{getUserOptionLabel(assignee)}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Итоговый статус оборудования</span>
            <select
              value={recordForm.resultStatus}
              onChange={(event) => setRecordForm((current) => ({ ...current, resultStatus: event.target.value as EquipmentInstanceStatus }))}
            >
              {instanceStatusOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Итог работ</span>
            <textarea
              value={recordForm.summary}
              onChange={(event) => setRecordForm((current) => ({ ...current, summary: event.target.value }))}
              required
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Операции, по одной на строку</span>
            <textarea
              value={recordForm.actions}
              onChange={(event) => setRecordForm((current) => ({ ...current, actions: event.target.value }))}
            />
          </label>
          <label className={styles.adminServicePage__field}>
            <span>Замененные детали, по одной на строку</span>
            <textarea
              value={recordForm.replacedParts}
              onChange={(event) => setRecordForm((current) => ({ ...current, replacedParts: event.target.value }))}
            />
          </label>
          <AppButton type="submit" variant="primary" disabled={saving || loading || equipment.length === 0}>
            Сохранить работу
          </AppButton>
        </form>
        ) : null}
      </div>

      <AdminServiceDataGrid
        activeTab={activeTab}
        loading={loading}
        saving={saving}
        scheduleByMonth={scheduleByMonth}
        filteredScheduleLength={filteredSchedule.length}
        filteredEquipment={filteredEquipment}
        filteredRequests={filteredRequests}
        filteredProcedures={filteredProcedures}
        filteredRecords={filteredRecords}
        scheduleDueDateDrafts={scheduleDueDateDrafts}
        cancelReasons={cancelReasons}
        instanceStatusLabels={equipmentInstanceStatusLabels}
        requestStatusLabels={serviceRequestStatusLabels}
        requestStatusOptions={requestStatusOptions}
        requestTypeLabels={serviceRequestTypeLabels}
        priorityLabels={serviceRequestPriorityLabels}
        scheduleStatusLabels={maintenanceScheduleStatusLabels}
        formatDate={formatDate}
        toDateInputValue={toDateInputValue}
        setScheduleDueDateDrafts={setScheduleDueDateDrafts}
        setCancelReasons={setCancelReasons}
        onUpdateScheduleDueDate={(item) => void handleUpdateScheduleDueDate(item)}
        onCreateScheduledRequest={(item) => void handleCreateScheduledRequest(item)}
        onEditEquipment={handleEditEquipment}
        onArchiveEquipment={(item) => void handleArchiveEquipment(item)}
        onEditRequest={handleEditRequest}
        onStatusChange={(id, status) => void handleStatusChange(id, status)}
        onCancelRequest={(request) => void handleCancelRequest(request)}
        onEditProcedure={handleEditProcedure}
        onArchiveProcedure={(procedure) => void handleArchiveProcedure(procedure)}
      />
    </section>
  );
};
