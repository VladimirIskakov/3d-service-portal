import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { type AdminAuditLogItem, getAdminAuditLogs } from '@/features/admin-audit';
import { AdminApiError } from '@/features/admin-auth';
import {
  equipmentInstanceStatusLabels,
  serviceRequestPriorityLabels,
  serviceRequestStatusLabels,
  serviceRequestTypeLabels,
} from '@/features/admin-service';
import { AppButton } from '@/shared/ui';
import styles from './AdminLogsPage.module.scss';

const PAGE_SIZE = 20;

const auditActionLabels: Record<string, string> = {
  catalog_category_create: 'Создание категории',
  catalog_model_create: 'Создание модели',
  catalog_model_update: 'Обновление модели',
  catalog_model_delete: 'Удаление модели',
  catalog_model_content_update: 'Обновление описания модели',
  catalog_model_disassembly_upsert: 'Обновление разборки модели',
  catalog_model_part_upsert: 'Обновление детали модели',
  catalog_model_part_delete: 'Удаление детали модели',
  catalog_model_meshes_replace: 'Обновление мешей модели',
  catalog_model_preview_camera_update: 'Обновление камеры предпросмотра',
  catalog_model_explode_settings_upsert: 'Обновление настроек разлета',
  service_equipment_create: 'Создание экземпляра оборудования',
  service_equipment_update: 'Обновление экземпляра оборудования',
  service_procedure_create: 'Создание регламента',
  service_procedure_update: 'Обновление регламента',
  service_procedure_archive: 'Архивация регламента',
  service_request_create: 'Создание заявки',
  service_request_update: 'Обновление заявки',
  service_schedule_request_create: 'Создание заявки из графика',
  service_schedule_due_date_update: 'Перенос даты ТО',
  service_request_status_update: 'Изменение статуса заявки',
  service_record_create: 'Создание записи работы',
};

const auditTargetTypeLabels: Record<string, string> = {
  catalogCategory: 'Категория справочника',
  equipmentModel: 'Модель оборудования',
  modelDisassembly: 'Разборка модели',
  modelPart: 'Деталь модели',
  modelMeshCatalog: 'Меши модели',
  modelPreviewCamera: 'Камера предпросмотра',
  modelExplodeSettings: 'Настройки разлета',
  equipmentInstance: 'Экземпляр оборудования',
  maintenanceProcedure: 'Регламент обслуживания',
  serviceRequest: 'Заявка',
  maintenanceSchedule: 'График ТО',
  maintenanceRecord: 'Запись работы',
};

const auditDetailKeyLabels: Record<string, string> = {
  inventoryNumber: 'Инвентарный номер',
  status: 'Статус',
  requestNumber: 'Номер заявки',
  equipmentInstanceId: 'ID экземпляра',
  serviceRequestId: 'ID заявки',
  slug: 'Код модели',
  categoryId: 'ID категории',
  modelSlug: 'Код модели',
  partId: 'ID детали',
  procedureId: 'ID регламента',
};

const getAuditLogsErrorMessage = (error: unknown) => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'unauthorized':
      return 'Сессия администратора истекла. Войдите снова.';
    case 'validation_error':
      return 'Некорректные параметры фильтра.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      return 'Не удалось загрузить логи.';
  }
};

const formatTimestamp = (isoString: string) => {
  const value = Date.parse(isoString);
  if (!Number.isFinite(value)) {
    return isoString;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
};

const getAuditActionLabel = (action: string) => auditActionLabels[action] ?? action;

const getAuditTargetTypeLabel = (targetType: string) => auditTargetTypeLabels[targetType] ?? targetType;

const formatDetails = (details: Record<string, unknown>) => {
  const translated = Object.fromEntries(
    Object.entries(details).map(([key, value]) => {
      const translatedKey = auditDetailKeyLabels[key] ?? key;

      if (typeof value !== 'string') {
        return [translatedKey, value];
      }

      return [
        translatedKey,
        serviceRequestStatusLabels[value as keyof typeof serviceRequestStatusLabels]
          ?? equipmentInstanceStatusLabels[value as keyof typeof equipmentInstanceStatusLabels]
          ?? serviceRequestTypeLabels[value as keyof typeof serviceRequestTypeLabels]
          ?? serviceRequestPriorityLabels[value as keyof typeof serviceRequestPriorityLabels]
          ?? value,
      ];
    }),
  );

  return JSON.stringify(translated, null, 2);
};

export const AdminLogsPage = () => {
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [targetId, setTargetId] = useState('');

  const [items, setItems] = useState<AdminAuditLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await getAdminAuditLogs({
          limit: PAGE_SIZE,
          cursor,
          action,
          targetType,
          actorEmail,
          targetId,
        });

        setItems((current) => (append ? [...current, ...response.items] : response.items));
        setNextCursor(response.nextCursor);
      } catch (loadError) {
        setError(getAuditLogsErrorMessage(loadError));
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [action, targetType, actorEmail, targetId],
  );

  useEffect(() => {
    void load(null, false);
  }, [load]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void load(null, false);
  };

  return (
    <section className={styles.adminLogsPage__page}>
      <div className={styles.adminLogsPage__topBar}>
        <h1 className={styles.adminLogsPage__title}>Логи админа</h1>
        <div className={styles.adminLogsPage__topActions}>
          <Link to="/admin" className={styles.adminLogsPage__linkButton}>
            К админке
          </Link>
        </div>
      </div>

      <div className={styles.adminLogsPage__card}>
        <form className={styles.adminLogsPage__filters} onSubmit={handleSubmit}>
          <label className={styles.adminLogsPage__field}>
            <span>Действие</span>
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="catalog_model_update"
            />
          </label>
          <label className={styles.adminLogsPage__field}>
            <span>Тип объекта</span>
            <input
              value={targetType}
              onChange={(event) => setTargetType(event.target.value)}
              placeholder="equipmentModel"
            />
          </label>
          <label className={styles.adminLogsPage__field}>
            <span>Email</span>
            <input
              value={actorEmail}
              onChange={(event) => setActorEmail(event.target.value)}
              placeholder="admin@example.com"
            />
          </label>
          <label className={styles.adminLogsPage__field}>
            <span>ID объекта</span>
            <input
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              placeholder="fpv-drone"
            />
          </label>
          <AppButton type="submit" variant="primary" disabled={loading || loadingMore}>
            {loading ? 'Загрузка...' : 'Применить фильтр'}
          </AppButton>
        </form>

        {error ? <p className={styles.adminLogsPage__error}>{error}</p> : null}

        <div className={styles.adminLogsPage__list}>
          {items.map((item) => (
            <article key={item.id} className={styles.adminLogsPage__logItem}>
              <div className={styles.adminLogsPage__logTop}>
                <strong>{getAuditActionLabel(item.action)}</strong>
                <span>{formatTimestamp(item.createdAt)}</span>
              </div>
              <p className={styles.adminLogsPage__logMeta}>
                <span>{getAuditTargetTypeLabel(item.targetType)}</span> · <code>{item.targetId}</code> · {item.actorEmail}
              </p>
              {item.details ? (
                <pre className={styles.adminLogsPage__details}>
                  {formatDetails(item.details)}
                </pre>
              ) : null}
            </article>
          ))}

          {!loading && items.length === 0 ? (
            <p className={styles.adminLogsPage__empty}>Логи не найдены.</p>
          ) : null}
        </div>

        {nextCursor ? (
          <AppButton
            variant="secondary"
            disabled={loadingMore || loading}
            onClick={() => void load(nextCursor, true)}
          >
            {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
          </AppButton>
        ) : null}
      </div>
    </section>
  );
};


