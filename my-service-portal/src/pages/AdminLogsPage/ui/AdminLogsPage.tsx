import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { type AdminAuditLogItem, getAdminAuditLogs } from '@/features/admin-audit';
import { AdminApiError } from '@/features/admin-auth';
import { AppButton } from '@/shared/ui';
import styles from './AdminLogsPage.module.scss';

const PAGE_SIZE = 20;

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
            <span>Action</span>
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="catalog_model_update"
            />
          </label>
          <label className={styles.adminLogsPage__field}>
            <span>Target Type</span>
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
            <span>Target ID</span>
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
                <strong>{item.action}</strong>
                <span>{formatTimestamp(item.createdAt)}</span>
              </div>
              <p className={styles.adminLogsPage__logMeta}>
                <code>{item.targetType}</code> · <code>{item.targetId}</code> · {item.actorEmail}
              </p>
              {item.details ? (
                <pre className={styles.adminLogsPage__details}>
                  {JSON.stringify(item.details, null, 2)}
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


