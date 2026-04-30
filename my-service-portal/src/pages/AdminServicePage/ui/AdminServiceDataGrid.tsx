import type { Dispatch, SetStateAction } from 'react';
import type {
  EquipmentInstance,
  EquipmentInstanceStatus,
  MaintenanceProcedure,
  MaintenanceRecord,
  MaintenanceScheduleItem,
  ServiceRequest,
  ServiceRequestStatus,
} from '@/features/admin-service';
import styles from './AdminServicePage.module.scss';

export type AdminServiceTab = 'equipment' | 'procedures' | 'requests' | 'records' | 'schedule';

interface AdminServiceDataGridProps {
  activeTab: AdminServiceTab;
  loading: boolean;
  saving: boolean;
  scheduleByMonth: Array<{ month: string; items: MaintenanceScheduleItem[] }>;
  filteredScheduleLength: number;
  filteredEquipment: EquipmentInstance[];
  filteredRequests: ServiceRequest[];
  filteredProcedures: MaintenanceProcedure[];
  filteredRecords: MaintenanceRecord[];
  scheduleDueDateDrafts: Record<string, string>;
  cancelReasons: Record<string, string>;
  instanceStatusLabels: Record<EquipmentInstanceStatus, string>;
  requestStatusLabels: Record<ServiceRequestStatus, string>;
  requestStatusOptions: Array<[ServiceRequestStatus, string]>;
  requestTypeLabels: Record<ServiceRequest['type'], string>;
  priorityLabels: Record<ServiceRequest['priority'], string>;
  scheduleStatusLabels: Record<MaintenanceScheduleItem['status'], string>;
  formatDate: (value: string | null) => string;
  toDateInputValue: (value: string | null) => string;
  setScheduleDueDateDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setCancelReasons: Dispatch<SetStateAction<Record<string, string>>>;
  onUpdateScheduleDueDate: (item: MaintenanceScheduleItem) => void;
  onCreateScheduledRequest: (item: MaintenanceScheduleItem) => void;
  onEditEquipment: (item: EquipmentInstance) => void;
  onArchiveEquipment: (item: EquipmentInstance) => void;
  onEditRequest: (request: ServiceRequest) => void;
  onStatusChange: (id: string, status: ServiceRequestStatus) => void;
  onCancelRequest: (request: ServiceRequest) => void;
  onEditProcedure: (procedure: MaintenanceProcedure) => void;
  onArchiveProcedure: (procedure: MaintenanceProcedure) => void;
}

export const AdminServiceDataGrid = ({
  activeTab,
  loading,
  saving,
  scheduleByMonth,
  filteredScheduleLength,
  filteredEquipment,
  filteredRequests,
  filteredProcedures,
  filteredRecords,
  scheduleDueDateDrafts,
  cancelReasons,
  instanceStatusLabels,
  requestStatusLabels,
  requestStatusOptions,
  requestTypeLabels,
  priorityLabels,
  scheduleStatusLabels,
  formatDate,
  toDateInputValue,
  setScheduleDueDateDrafts,
  setCancelReasons,
  onUpdateScheduleDueDate,
  onCreateScheduledRequest,
  onEditEquipment,
  onArchiveEquipment,
  onEditRequest,
  onStatusChange,
  onCancelRequest,
  onEditProcedure,
  onArchiveProcedure,
}: AdminServiceDataGridProps) => (
  <div className={styles.adminServicePage__dataGrid}>
    {activeTab === 'schedule' ? (
      <section className={styles.adminServicePage__listPanel}>
      <h2>График ТО</h2>
      <div className={styles.adminServicePage__list}>
        {scheduleByMonth.map((group) => (
          <div key={group.month} className={styles.adminServicePage__monthGroup}>
            <h3>{group.month}</h3>
            {group.items.map((item) => (
              <article key={item.id} className={styles.adminServicePage__item}>
                <div className={styles.adminServicePage__itemTop}>
                  <strong>{item.inventoryNumber}</strong>
                  <span className={styles.adminServicePage__badge}>{scheduleStatusLabels[item.status]}</span>
                </div>
                <p>{item.procedureTitle}</p>
                <small>
                  {item.modelTitle} · {item.location || 'Без места'} · срок {formatDate(item.nextDueAt)}
                  {item.isManuallyScheduled ? ' · перенесено вручную' : ''}
                </small>
                {item.lastCompletedAt ? <small>Последнее выполнение: {formatDate(item.lastCompletedAt)}</small> : null}
                {item.requiredParts.length > 0 ? (
                  <p className={styles.adminServicePage__partsLine}>
                    Материалы: {item.requiredParts.join(', ')}
                  </p>
                ) : null}
                <div className={styles.adminServicePage__inlineForm}>
                  <input
                    type="date"
                    value={scheduleDueDateDrafts[item.id] ?? toDateInputValue(item.nextDueAt)}
                    onChange={(event) => setScheduleDueDateDrafts((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))}
                  />
                  <button type="button" onClick={() => onUpdateScheduleDueDate(item)} disabled={saving}>
                    Перенести
                  </button>
                </div>
                <div className={styles.adminServicePage__statusActions}>
                  <button
                    type="button"
                    onClick={() => onCreateScheduledRequest(item)}
                    disabled={saving || Boolean(item.openRequestId)}
                  >
                    {item.openRequestNumber ? `Заявка ${item.openRequestNumber}` : 'Создать заявку'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ))}
        {!loading && filteredScheduleLength === 0 ? (
          <p className={styles.adminServicePage__empty}>
            График появится после создания регламентов с периодичностью или изменения фильтров.
          </p>
        ) : null}
      </div>
      </section>
    ) : null}

    {activeTab === 'equipment' ? (
      <section className={styles.adminServicePage__listPanel}>
      <h2>Оборудование</h2>
      <div className={styles.adminServicePage__list}>
        {filteredEquipment.map((item) => (
          <article key={item.id} className={styles.adminServicePage__item}>
            <div className={styles.adminServicePage__itemTop}>
              <strong>{item.inventoryNumber}</strong>
              <span className={`${styles.adminServicePage__badge} ${styles[`adminServicePage__status_${item.status}`]}`}>
                {instanceStatusLabels[item.status]}
              </span>
            </div>
            <p>{item.modelTitle}</p>
            <small>{item.location || 'Место не указано'} · {item.responsible || 'Ответственный не указан'}</small>
            <div className={styles.adminServicePage__statusActions}>
              <button type="button" onClick={() => onEditEquipment(item)} disabled={saving}>
                Редактировать
              </button>
              <button type="button" onClick={() => onArchiveEquipment(item)} disabled={saving || item.status === 'retired'}>
                Списать
              </button>
            </div>
          </article>
        ))}
        {!loading && filteredEquipment.length === 0 ? <p className={styles.adminServicePage__empty}>Экземпляры не найдены.</p> : null}
      </div>
      </section>
    ) : null}

    {activeTab === 'requests' ? (
      <section className={styles.adminServicePage__listPanel}>
      <h2>Заявки</h2>
      <div className={styles.adminServicePage__list}>
        {filteredRequests.map((request) => (
          <article key={request.id} className={styles.adminServicePage__item}>
            <div className={styles.adminServicePage__itemTop}>
              <strong>{request.requestNumber}</strong>
              <span className={`${styles.adminServicePage__badge} ${styles[`adminServicePage__request_${request.status}`]}`}>
                {requestStatusLabels[request.status]}
              </span>
            </div>
            <p>{request.title}</p>
            <small>
              {request.equipmentTitle} · {requestTypeLabels[request.type]} · {priorityLabels[request.priority]} · {request.procedureTitle ?? 'Без регламента'} · {formatDate(request.dueDate)}
            </small>
            {request.requiredParts.length > 0 ? (
              <p className={styles.adminServicePage__partsLine}>Запчасти: {request.requiredParts.join(', ')}</p>
            ) : null}
            {request.cancellationReason ? (
              <p className={styles.adminServicePage__partsLine}>Причина отмены: {request.cancellationReason}</p>
            ) : null}
            <div className={styles.adminServicePage__statusActions}>
              <button type="button" onClick={() => onEditRequest(request)} disabled={saving}>
                Редактировать
              </button>
              {requestStatusOptions.map(([status, label]) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusChange(request.id, status)}
                  disabled={saving || request.status === status}
                >
                  {label}
                </button>
              ))}
            </div>
            {request.status !== 'completed' && request.status !== 'canceled' ? (
              <div className={styles.adminServicePage__inlineForm}>
                <input
                  value={cancelReasons[request.id] ?? ''}
                  onChange={(event) => setCancelReasons((current) => ({
                    ...current,
                    [request.id]: event.target.value,
                  }))}
                  placeholder="Причина отмены"
                />
                <button type="button" onClick={() => onCancelRequest(request)} disabled={saving}>
                  Отменить
                </button>
              </div>
            ) : null}
          </article>
        ))}
        {!loading && filteredRequests.length === 0 ? <p className={styles.adminServicePage__empty}>Заявки не найдены.</p> : null}
      </div>
      </section>
    ) : null}

    {activeTab === 'procedures' ? (
      <section className={styles.adminServicePage__listPanel}>
      <h2>Регламенты</h2>
      <div className={styles.adminServicePage__list}>
        {filteredProcedures.map((procedure) => (
          <article key={procedure.id} className={styles.adminServicePage__item}>
            <div className={styles.adminServicePage__itemTop}>
              <strong>{procedure.title}</strong>
              <span>{procedure.archivedAt ? 'Архив' : `${procedure.checklistItems.length} пунктов`}</span>
            </div>
            <p>{procedure.modelTitle}</p>
            <small>
              {procedure.intervalDays ? `Каждые ${procedure.intervalDays} дн.` : 'Без периода'}
              {procedure.estimatedMinutes ? ` · ${procedure.estimatedMinutes} мин.` : ''}
            </small>
            <div className={styles.adminServicePage__statusActions}>
              <button type="button" onClick={() => onEditProcedure(procedure)} disabled={saving}>
                Редактировать
              </button>
              <button type="button" onClick={() => onArchiveProcedure(procedure)} disabled={saving || Boolean(procedure.archivedAt)}>
                В архив
              </button>
            </div>
          </article>
        ))}
        {!loading && filteredProcedures.length === 0 ? <p className={styles.adminServicePage__empty}>Регламенты не найдены.</p> : null}
      </div>
      </section>
    ) : null}

    {activeTab === 'records' ? (
      <section className={styles.adminServicePage__listPanel}>
      <h2>История работ</h2>
      <div className={styles.adminServicePage__list}>
        {filteredRecords.map((record) => (
          <article key={record.id} className={styles.adminServicePage__item}>
            <div className={styles.adminServicePage__itemTop}>
              <strong>{record.performedBy}</strong>
              <span>{formatDate(record.createdAt)}</span>
            </div>
            <p>{record.summary}</p>
            <small>
              {record.equipmentTitle} · {record.procedureTitle ?? 'Без регламента'} · {instanceStatusLabels[record.resultStatus]}
            </small>
          </article>
        ))}
        {!loading && filteredRecords.length === 0 ? <p className={styles.adminServicePage__empty}>История не найдена.</p> : null}
      </div>
      </section>
    ) : null}
  </div>
);
