import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import {
  createMaintenanceRecord,
  equipmentInstanceStatusLabels,
  getMaintenanceProcedures,
  getServiceEquipmentInstances,
  getServiceRequests,
  serviceRequestStatusLabels,
  updateServiceRequestStatus,
  type EquipmentInstance,
  type EquipmentInstanceStatus,
  type MaintenanceProcedure,
  type MaintenanceProcedureChecklistItem,
  type ServiceRequest,
  type ServiceRequestStatus,
} from '@/features/admin-service';
import { AdminApiError } from '@/features/admin-auth';
import { AppButton } from '@/shared/ui';
import styles from './ServiceWorkspacePage.module.scss';

type RecordRequestStatus = Exclude<ServiceRequestStatus, 'new' | 'canceled'>;

const recordRequestStatusLabels: Record<RecordRequestStatus, string> = {
  in_progress: 'Оставить в работе',
  waiting_parts: 'Ожидает запчасти',
  completed: 'Завершить заявку',
};

const getErrorMessage = (error: unknown) => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'unauthorized':
      return 'Сессия истекла. Войдите снова.';
    case 'equipment_not_found':
      return 'Экземпляр оборудования не найден.';
    case 'request_not_found':
      return 'Заявка не найдена.';
    case 'validation_error':
      return 'Заполните обязательные поля.';
    case 'forbidden':
      return 'Нельзя выполнить заявку, назначенную другому исполнителю.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      return 'Не удалось выполнить операцию.';
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

export const ServiceWorkspacePage = () => {
  const currentUserEmail = useAppSelector((state) => state.user.email);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [equipment, setEquipment] = useState<EquipmentInstance[]>([]);
  const [procedures, setProcedures] = useState<MaintenanceProcedure[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState('');
  const [resultStatus, setResultStatus] = useState<EquipmentInstanceStatus>('active');
  const [requestStatusAfterRecord, setRequestStatusAfterRecord] = useState<RecordRequestStatus>('completed');
  const [requestScope, setRequestScope] = useState<'all' | 'mine'>('mine');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [requestsResponse, equipmentResponse, proceduresResponse] = await Promise.all([
        getServiceRequests(),
        getServiceEquipmentInstances(),
        getMaintenanceProcedures(),
      ]);
      const openRequests = requestsResponse.items.filter((request) => (
        request.status !== 'completed' && request.status !== 'canceled'
      ));

      setRequests(openRequests);
      setEquipment(equipmentResponse.items);
      setProcedures(proceduresResponse.items);
      setSelectedRequestId((current) => current || openRequests[0]?.id || '');
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  const visibleRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesScope = requestScope === 'all'
        || !currentUserEmail
        || request.assignedTo === currentUserEmail
        || !request.assignedTo;
      const matchesSearch = !normalizedSearch || [
        request.requestNumber,
        request.title,
        request.equipmentTitle,
        request.assignedTo,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesScope && matchesSearch;
    });
  }, [currentUserEmail, requestScope, requests, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRequest = useMemo(() => {
    return visibleRequests.find((request) => request.id === selectedRequestId) ?? visibleRequests[0] ?? null;
  }, [selectedRequestId, visibleRequests]);
  const effectivePerformedBy = selectedRequest?.assignedTo || currentUserEmail || '';

  const selectedEquipment = useMemo(() => {
    return selectedRequest
      ? equipment.find((item) => item.id === selectedRequest.equipmentInstanceId) ?? null
      : null;
  }, [equipment, selectedRequest]);

  const selectedProcedure = useMemo(() => {
    if (!selectedRequest?.procedureId) {
      return null;
    }

    return procedures.find((procedure) => procedure.id === selectedRequest.procedureId) ?? null;
  }, [procedures, selectedRequest]);

  const checklistItems = useMemo(() => selectedProcedure?.checklistItems ?? [], [selectedProcedure]);

  useEffect(() => {
    setCheckedItems({});
    setSummary(selectedRequest?.title ?? '');
  }, [selectedRequest?.id, selectedRequest?.title]);

  const checkedActionTitles = useMemo(() => {
    return checklistItems
      .filter((item) => checkedItems[item.id])
      .map((item) => item.title);
  }, [checkedItems, checklistItems]);

  const requiredChecklistDone = useMemo(() => {
    const requiredItems = checklistItems.filter((item) => item.required);
    if (requiredItems.length === 0) {
      return true;
    }

    return requiredItems.every((item) => checkedItems[item.id]);
  }, [checkedItems, checklistItems]);

  const toggleChecklistItem = (item: MaintenanceProcedureChecklistItem) => {
    setCheckedItems((current) => ({
      ...current,
      [item.id]: !current[item.id],
    }));
  };

  const handleStartWork = async () => {
    if (!selectedRequest) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await updateServiceRequestStatus(selectedRequest.id, 'in_progress');
      setRequests((current) => current.map((item) => (item.id === response.item.id ? response.item : item)));
      setMessage('Заявка переведена в работу.');
    } catch (startError) {
      setError(getErrorMessage(startError));
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await createMaintenanceRecord({
        serviceRequestId: selectedRequest.id,
        equipmentInstanceId: selectedRequest.equipmentInstanceId,
        performedBy: effectivePerformedBy,
        summary,
        actions: checkedActionTitles.length > 0 ? checkedActionTitles : [selectedRequest.title],
        replacedParts: selectedRequest.requiredParts,
        resultStatus,
        serviceRequestStatus: requestStatusAfterRecord,
      });
      setSummary('');
      setCheckedItems({});
      setResultStatus('active');
      setRequestStatusAfterRecord('completed');
      setMessage(
        requestStatusAfterRecord === 'completed'
          ? 'Работа завершена, запись добавлена в историю.'
          : 'Запись добавлена в историю, заявка осталась открытой.',
      );
      await load();
    } catch (completeError) {
      setError(getErrorMessage(completeError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.serviceWorkspacePage__page}>
      <div className={styles.serviceWorkspacePage__topBar}>
        <div>
          <h1 className={styles.serviceWorkspacePage__title}>Рабочее место</h1>
          <p className={styles.serviceWorkspacePage__subtitle}>Открытые заявки, 3D-модель и чек-лист обслуживания.</p>
        </div>
      </div>

      {error ? <p className={styles.serviceWorkspacePage__error}>{error}</p> : null}
      {message ? <p className={styles.serviceWorkspacePage__message}>{message}</p> : null}

      <div className={styles.serviceWorkspacePage__layout}>
        <aside className={styles.serviceWorkspacePage__requestList}>
          <h2>Открытые заявки</h2>
          <div className={styles.serviceWorkspacePage__filters}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по заявкам"
            />
            <div>
              <button
                type="button"
                className={requestScope === 'mine' ? styles.serviceWorkspacePage__filterActive : undefined}
                onClick={() => setRequestScope('mine')}
              >
                Мои
              </button>
              <button
                type="button"
                className={requestScope === 'all' ? styles.serviceWorkspacePage__filterActive : undefined}
                onClick={() => setRequestScope('all')}
              >
                Все
              </button>
            </div>
          </div>
          {visibleRequests.map((request) => (
            <button
              key={request.id}
              type="button"
              className={
                request.id === selectedRequestId
                  ? `${styles.serviceWorkspacePage__requestButton} ${styles.serviceWorkspacePage__requestButtonActive}`
                  : styles.serviceWorkspacePage__requestButton
              }
              onClick={() => setSelectedRequestId(request.id)}
            >
              <strong>{request.requestNumber}</strong>
              <span>{request.title}</span>
              <small>{request.equipmentTitle} · {request.assignedTo || 'Без исполнителя'} · {formatDate(request.dueDate)}</small>
            </button>
          ))}
          {!loading && visibleRequests.length === 0 ? (
            <p className={styles.serviceWorkspacePage__empty}>Подходящих открытых заявок нет.</p>
          ) : null}
        </aside>

        <main className={styles.serviceWorkspacePage__workPanel}>
          {selectedRequest ? (
            <>
              <div className={styles.serviceWorkspacePage__workHeader}>
                <div>
                  <h2>{selectedRequest.title}</h2>
                  <p>{selectedRequest.description || 'Описание заявки не заполнено.'}</p>
                </div>
                <span>{serviceRequestStatusLabels[selectedRequest.status]}</span>
              </div>

              <div className={styles.serviceWorkspacePage__metaGrid}>
                <div>
                  <span>Оборудование</span>
                  <strong>{selectedRequest.equipmentTitle}</strong>
                </div>
                <div>
                  <span>Регламент</span>
                  <strong>{selectedProcedure?.title ?? 'Не выбран'}</strong>
                </div>
                <div>
                  <span>Место</span>
                  <strong>{selectedEquipment?.location ?? 'Не указано'}</strong>
                </div>
                <div>
                  <span>Исполнитель заявки</span>
                  <strong>{selectedRequest.assignedTo || 'Не назначен'}</strong>
                </div>
              </div>

              <div className={styles.serviceWorkspacePage__actions}>
                <Link to={`/model/${encodeURIComponent(selectedRequest.modelSlug)}`} className={styles.serviceWorkspacePage__linkButton}>
                  Открыть 3D-модель
                </Link>
                <AppButton
                  type="button"
                  variant="secondary"
                  disabled={saving || selectedRequest.status === 'in_progress'}
                  onClick={() => void handleStartWork()}
                >
                  Взять в работу
                </AppButton>
              </div>

              <section className={styles.serviceWorkspacePage__partsPanel}>
                <h3>Нужные запчасти и материалы</h3>
                {selectedRequest.requiredParts.length > 0 ? (
                  <ul>
                    {selectedRequest.requiredParts.map((part) => (
                      <li key={part}>{part}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.serviceWorkspacePage__empty}>Для заявки не указан список запчастей.</p>
                )}
              </section>

              <form className={styles.serviceWorkspacePage__completionForm} onSubmit={handleComplete}>
                <section className={styles.serviceWorkspacePage__checklist}>
                  <h3>Чек-лист</h3>
                  {checklistItems.length > 0 ? (
                    checklistItems.map((item) => (
                      <label key={item.id} className={styles.serviceWorkspacePage__checkItem}>
                        <input
                          type="checkbox"
                          checked={Boolean(checkedItems[item.id])}
                          onChange={() => toggleChecklistItem(item)}
                        />
                        <span>
                          <strong>{item.title}</strong>
                          {item.description ? <small>{item.description}</small> : null}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className={styles.serviceWorkspacePage__empty}>У заявки нет привязанного регламента.</p>
                  )}
                </section>

                <div className={styles.serviceWorkspacePage__staticField}>
                  <span>Исполнитель</span>
                  <strong>{effectivePerformedBy || 'Не определен'}</strong>
                </div>
                <label className={styles.serviceWorkspacePage__field}>
                  <span>Итог работ</span>
                  <textarea
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    required
                  />
                </label>
                <label className={styles.serviceWorkspacePage__field}>
                  <span>Статус оборудования после работ</span>
                  <select
                    value={resultStatus}
                    onChange={(event) => setResultStatus(event.target.value as EquipmentInstanceStatus)}
                  >
                    {(Object.entries(equipmentInstanceStatusLabels) as Array<[EquipmentInstanceStatus, string]>).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className={styles.serviceWorkspacePage__field}>
                  <span>Статус заявки после записи</span>
                  <select
                    value={requestStatusAfterRecord}
                    onChange={(event) => setRequestStatusAfterRecord(event.target.value as RecordRequestStatus)}
                  >
                    {(Object.entries(recordRequestStatusLabels) as Array<[RecordRequestStatus, string]>).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <AppButton
                  type="submit"
                  variant="primary"
                  disabled={saving || !effectivePerformedBy || (requestStatusAfterRecord === 'completed' && !requiredChecklistDone)}
                >
                  {requestStatusAfterRecord === 'completed' ? 'Завершить работу' : 'Сохранить запись'}
                </AppButton>
              </form>
            </>
          ) : (
            <p className={styles.serviceWorkspacePage__empty}>Выберите заявку для выполнения.</p>
          )}
        </main>
      </div>
    </section>
  );
};
