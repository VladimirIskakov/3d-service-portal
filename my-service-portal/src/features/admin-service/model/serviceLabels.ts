import type {
  EquipmentInstanceStatus,
  MaintenanceScheduleItem,
  ServiceRequestPriority,
  ServiceRequestStatus,
  ServiceRequestType,
} from './adminServiceApi';

export const equipmentInstanceStatusLabels: Record<EquipmentInstanceStatus, string> = {
  active: 'В работе',
  maintenance: 'На обслуживании',
  faulty: 'Неисправно',
  retired: 'Списано',
};

export const serviceRequestTypeLabels: Record<ServiceRequestType, string> = {
  scheduled: 'Плановое ТО',
  repair: 'Ремонт',
  diagnostics: 'Диагностика',
  incident: 'Авария',
};

export const serviceRequestPriorityLabels: Record<ServiceRequestPriority, string> = {
  low: 'Низкий',
  normal: 'Обычный',
  high: 'Высокий',
  critical: 'Критический',
};

export const serviceRequestStatusLabels: Record<ServiceRequestStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  waiting_parts: 'Ожидает запчасти',
  completed: 'Завершена',
  canceled: 'Отменена',
};

export const maintenanceScheduleStatusLabels = {
  planned: 'Запланировано',
  due_soon: 'Скоро',
  overdue: 'Просрочено',
  requested: 'Заявка создана',
} satisfies Record<MaintenanceScheduleItem['status'], string>;
