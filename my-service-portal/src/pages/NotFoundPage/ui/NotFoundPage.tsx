import { Link, useLocation } from 'react-router-dom';
import styles from './NotFoundPage.module.scss';

export const NotFoundPage = () => {
  const location = useLocation();

  return (
    <section className={styles.notFoundPage__page}>
      <div className={styles.notFoundPage__card}>
        <p className={styles.notFoundPage__code}>404</p>
        <h1 className={styles.notFoundPage__title}>Страница не найдена</h1>
        <p className={styles.notFoundPage__description}>
          Адрес <code>{location.pathname}</code> не существует или был изменен.
        </p>
        <div className={styles.notFoundPage__actions}>
          <Link to="/catalog" className={styles.notFoundPage__link}>
            В справочник
          </Link>
          <Link to="/" className={styles.notFoundPage__linkSecondary}>
            На главную
          </Link>
        </div>
      </div>
    </section>
  );
};
