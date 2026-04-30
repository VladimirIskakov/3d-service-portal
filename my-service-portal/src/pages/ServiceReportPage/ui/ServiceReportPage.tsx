import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMaintenanceRecords,
  getMaintenanceSchedule,
  getServiceEquipmentInstances,
  getServiceRequests,
  serviceRequestTypeLabels,
  type EquipmentInstance,
  type MaintenanceRecord,
  type MaintenanceScheduleItem,
  type ServiceRequest,
} from '@/features/admin-service';
import { AdminApiError } from '@/features/admin-auth';
import styles from './ServiceReportPage.module.scss';

const getErrorMessage = (error: unknown) => {
  const code = error instanceof AdminApiError ? error.code : '';

  if (code === 'unauthorized') {
    return 'Сессия истекла. Войдите снова.';
  }

  if (code === 'forbidden') {
    return 'Недостаточно прав для просмотра отчета.';
  }

  if (code === 'network_error') {
    return 'Нет соединения с API сервером.';
  }

  return 'Не удалось загрузить отчет.';
};

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Без даты';
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

const countBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const result = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item);
    result.set(key, (result.get(key) ?? 0) + 1);
  });
  return Array.from(result.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
};

const isInPeriod = (value: string | null, from: string, to: string) => {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const fromTimestamp = from ? Date.parse(from) : null;
  const toTimestamp = to ? Date.parse(`${to}T23:59:59`) : null;
  return (!fromTimestamp || timestamp >= fromTimestamp) && (!toTimestamp || timestamp <= toTimestamp);
};

export const ServiceReportPage = () => {
  const [equipment, setEquipment] = useState<EquipmentInstance[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [schedule, setSchedule] = useState<MaintenanceScheduleItem[]>([]);
  const [filters, setFilters] = useState({
    modelSlug: 'all',
    performedBy: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [equipmentResponse, requestResponse, recordResponse, scheduleResponse] = await Promise.all([
        getServiceEquipmentInstances(),
        getServiceRequests(),
        getMaintenanceRecords(),
        getMaintenanceSchedule(),
      ]);

      setEquipment(equipmentResponse.items);
      setRequests(requestResponse.items);
      setRecords(recordResponse.items);
      setSchedule(scheduleResponse.items);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const modelOptions = useMemo(() => {
    return Array.from(new Map(equipment.map((item) => [item.modelSlug, item.modelTitle])).entries())
      .sort((left, right) => left[1].localeCompare(right[1], 'ru'));
  }, [equipment]);

  const performerOptions = useMemo(() => {
    return Array.from(new Set(records.map((record) => record.performedBy).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, 'ru'));
  }, [records]);

  const analytics = useMemo(() => {
    const now = Date.now();
    const filteredEquipment = equipment.filter((item) => (
      filters.modelSlug === 'all' || item.modelSlug === filters.modelSlug
    ));
    const filteredRequests = requests.filter((request) => (
      (filters.modelSlug === 'all' || request.modelSlug === filters.modelSlug)
      && (!filters.dateFrom && !filters.dateTo
        ? true
        : isInPeriod(request.createdAt, filters.dateFrom, filters.dateTo)
          || isInPeriod(request.dueDate, filters.dateFrom, filters.dateTo))
    ));
    const filteredRecords = records.filter((record) => (
      (filters.modelSlug === 'all' || record.modelSlug === filters.modelSlug)
      && (filters.performedBy === 'all' || record.performedBy === filters.performedBy)
      && (!filters.dateFrom && !filters.dateTo ? true : isInPeriod(record.createdAt, filters.dateFrom, filters.dateTo))
    ));
    const filteredSchedule = schedule.filter((item) => (
      (filters.modelSlug === 'all' || item.modelSlug === filters.modelSlug)
      && (!filters.dateFrom && !filters.dateTo ? true : isInPeriod(item.nextDueAt, filters.dateFrom, filters.dateTo))
    ));
    const openRequests = filteredRequests.filter((request) => request.status !== 'completed' && request.status !== 'canceled');
    const completedRequests = filteredRequests.filter((request) => request.status === 'completed');
    const overdueRequests = openRequests.filter((request) => request.dueDate && Date.parse(request.dueDate) < now);
    const criticalRequests = openRequests.filter((request) => request.priority === 'critical' || request.priority === 'high');
    const faultyEquipment = filteredEquipment.filter((item) => item.status === 'faulty');
    const maintenanceEquipment = filteredEquipment.filter((item) => item.status === 'maintenance');
    const overdueSchedule = filteredSchedule.filter((item) => item.status === 'overdue');
    const dueSoonSchedule = filteredSchedule.filter((item) => item.status === 'due_soon');
    const requestedSchedule = filteredSchedule.filter((item) => item.status === 'requested');
    const completionRate = filteredRequests.length > 0 ? Math.round((completedRequests.length / filteredRequests.length) * 100) : 0;
    const recordsByModel = countBy(filteredRecords, (record) => record.equipmentTitle);
    const requestsByType = countBy(filteredRequests, (request) => serviceRequestTypeLabels[request.type]);
    const requestsByPerformer = countBy(filteredRecords, (record) => record.performedBy || 'Не указан');

    return {
      filteredEquipment,
      filteredRequests,
      filteredRecords,
      openRequests,
      completedRequests,
      overdueRequests,
      criticalRequests,
      faultyEquipment,
      maintenanceEquipment,
      overdueSchedule,
      dueSoonSchedule,
      requestedSchedule,
      completionRate,
      recordsByModel,
      requestsByType,
      requestsByPerformer,
    };
  }, [equipment, filters.dateFrom, filters.dateTo, filters.modelSlug, filters.performedBy, records, requests, schedule]);

  return (
    <section className={styles.serviceReportPage__page}>
      <div className={styles.serviceReportPage__topBar}>
        <div>
          <h1 className={styles.serviceReportPage__title}>Отчет по сервису</h1>
          <p className={styles.serviceReportPage__subtitle}>Состояние оборудования, заявки, просрочки и выполненные работы.</p>
        </div>
      </div>

      {error ? <p className={styles.serviceReportPage__error}>{error}</p> : null}
      {loading ? <p className={styles.serviceReportPage__empty}>Загрузка отчета...</p> : null}

      <section className={styles.serviceReportPage__filters}>
        <label>
          <span>Модель</span>
          <select
            value={filters.modelSlug}
            onChange={(event) => setFilters((current) => ({ ...current, modelSlug: event.target.value }))}
          >
            <option value="all">Все модели</option>
            {modelOptions.map(([slug, title]) => (
              <option key={slug} value={slug}>{title}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Исполнитель</span>
          <select
            value={filters.performedBy}
            onChange={(event) => setFilters((current) => ({ ...current, performedBy: event.target.value }))}
          >
            <option value="all">Все исполнители</option>
            {performerOptions.map((performer) => (
              <option key={performer} value={performer}>{performer}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Начало периода</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
          />
        </label>
        <label>
          <span>Конец периода</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
          />
        </label>
      </section>

      <div className={styles.serviceReportPage__metricGrid}>
        <div><span>Всего оборудования</span><strong>{analytics.filteredEquipment.length}</strong></div>
        <div><span>Открытые заявки</span><strong>{analytics.openRequests.length}</strong></div>
        <div><span>Просрочено</span><strong>{analytics.overdueRequests.length}</strong></div>
        <div><span>Просрочено ТО</span><strong>{analytics.overdueSchedule.length}</strong></div>
        <div><span>На обслуживании</span><strong>{analytics.maintenanceEquipment.length}</strong></div>
        <div><span>Неисправно</span><strong>{analytics.faultyEquipment.length}</strong></div>
        <div><span>Выполнено работ</span><strong>{analytics.filteredRecords.length}</strong></div>
        <div><span>Ближайшее ТО</span><strong>{analytics.dueSoonSchedule.length}</strong></div>
      </div>

      <div className={styles.serviceReportPage__layout}>
        <section className={styles.serviceReportPage__panel}>
          <h2>Просроченные заявки</h2>
          {analytics.overdueRequests.length > 0 ? (
            analytics.overdueRequests.map((request) => (
              <article key={request.id} className={styles.serviceReportPage__item}>
                <strong>{request.requestNumber}</strong>
                <p>{request.title}</p>
                <small>{request.equipmentTitle} · {formatDate(request.dueDate)}</small>
              </article>
            ))
          ) : (
            <p className={styles.serviceReportPage__empty}>Просроченных заявок нет.</p>
          )}
        </section>

        <section className={styles.serviceReportPage__panel}>
          <h2>График регламентного ТО</h2>
          {[...analytics.overdueSchedule, ...analytics.dueSoonSchedule].length > 0 ? (
            [...analytics.overdueSchedule, ...analytics.dueSoonSchedule].slice(0, 10).map((item) => (
              <article key={item.id} className={styles.serviceReportPage__item}>
                <strong>{item.inventoryNumber} · {item.procedureTitle}</strong>
                <p>{item.modelTitle}</p>
                <small>
                  срок {formatDate(item.nextDueAt)} · {item.openRequestNumber ? `заявка ${item.openRequestNumber}` : 'заявка не создана'}
                </small>
              </article>
            ))
          ) : (
            <p className={styles.serviceReportPage__empty}>Просроченного и ближайшего регламентного ТО нет.</p>
          )}
        </section>

        <section className={styles.serviceReportPage__panel}>
          <h2>Часто обслуживаемое оборудование</h2>
          {analytics.recordsByModel.length > 0 ? (
            analytics.recordsByModel.slice(0, 8).map((item) => (
              <article key={item.label} className={styles.serviceReportPage__row}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </article>
            ))
          ) : (
            <p className={styles.serviceReportPage__empty}>История работ пока пуста.</p>
          )}
        </section>

        <section className={styles.serviceReportPage__panel}>
          <h2>Типы заявок</h2>
          {analytics.requestsByType.length > 0 ? (
            analytics.requestsByType.map((item) => (
              <article key={item.label} className={styles.serviceReportPage__row}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </article>
            ))
          ) : (
            <p className={styles.serviceReportPage__empty}>Заявок пока нет.</p>
          )}
        </section>

        <section className={styles.serviceReportPage__panel}>
          <h2>Работы по исполнителям</h2>
          {analytics.requestsByPerformer.length > 0 ? (
            analytics.requestsByPerformer.slice(0, 8).map((item) => (
              <article key={item.label} className={styles.serviceReportPage__row}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </article>
            ))
          ) : (
            <p className={styles.serviceReportPage__empty}>Нет завершенных работ.</p>
          )}
        </section>

        <section className={styles.serviceReportPage__panelWide}>
          <h2>Последние работы</h2>
          {analytics.filteredRecords.length > 0 ? (
            analytics.filteredRecords.slice(0, 12).map((record) => (
              <article key={record.id} className={styles.serviceReportPage__item}>
                <strong>{record.summary}</strong>
                <p>{record.equipmentTitle}</p>
                <small>{record.performedBy} · {formatDate(record.createdAt)}</small>
              </article>
            ))
          ) : (
            <p className={styles.serviceReportPage__empty}>Работы еще не выполнялись.</p>
          )}
        </section>
      </div>
    </section>
  );
};
