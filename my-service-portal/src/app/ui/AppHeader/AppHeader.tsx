import { NavLink, type NavLinkRenderProps } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import styles from './AppHeader.module.scss';

const getNavLinkClassName = ({ isActive }: NavLinkRenderProps) => {
  return isActive ? `${styles.appHeader__navLink} ${styles.appHeader__active}` : styles.appHeader__navLink;
};

export const AppHeader = () => {
  const isAdminAuthenticated = useAppSelector((state) => {
    return state.user.isAuth && state.user.role === 'admin';
  });

  return (
    <header className={styles.appHeader__header}>
      <div className={styles.appHeader__brand}>
        <span className={styles.appHeader__brandMark} aria-hidden="true" />
        <div className={styles.appHeader__brandText}>
          <strong>Service Portal</strong>
          <span>3D inspection workspace</span>
        </div>
      </div>

      <nav className={styles.appHeader__nav} aria-label="Основная навигация">
        <NavLink to="/catalog" className={getNavLinkClassName}>
          Каталог
        </NavLink>
        {isAdminAuthenticated ? (
          <NavLink to="/admin" className={getNavLinkClassName}>
            Админка
          </NavLink>
        ) : null}
      </nav>
    </header>
  );
};


