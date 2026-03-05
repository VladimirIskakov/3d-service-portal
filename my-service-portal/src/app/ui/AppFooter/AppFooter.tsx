import styles from './AppFooter.module.scss';

export const AppFooter = () => {
  return (
    <footer className={styles.appFooter__footer}>
      <span>Service Portal</span>
      <span className={styles.appFooter__divider} aria-hidden="true">
        ·
      </span>
      <span>3D Model Inspection</span>
    </footer>
  );
};

