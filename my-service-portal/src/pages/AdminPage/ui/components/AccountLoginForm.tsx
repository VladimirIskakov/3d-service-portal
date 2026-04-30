import { type FormEvent } from 'react';
import { AppButton } from '@/shared/ui';
import type { FieldErrors, LoginField } from '../../model/form';
import styles from '../AdminPage.module.scss';

interface AccountLoginFormProps {
  login: string;
  password: string;
  submitting: boolean;
  error: string | null;
  loginFieldErrors: FieldErrors<LoginField>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLoginChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

export const AccountLoginForm = ({
  login,
  password,
  submitting,
  error,
  loginFieldErrors,
  onSubmit,
  onLoginChange,
  onPasswordChange,
}: AccountLoginFormProps) => {
  return (
    <section className={styles.adminPage__page}>
      <div className={styles.adminPage__card}>
        <div className={styles.adminPage__panelHeader}>
          <h1 className={styles.adminPage__title}>Вход в систему</h1>
        </div>

        <form className={styles.adminPage__form} onSubmit={onSubmit} noValidate>
          <label className={`${styles.adminPage__field} ${loginFieldErrors.login ? styles.adminPage__fieldInvalid : ''}`}>
            <span>Логин (email)</span>
            <input
              type="email"
              value={login}
              onChange={(event) => onLoginChange(event.target.value)}
              placeholder="user@example.com"
              autoComplete="username"
              aria-invalid={loginFieldErrors.login ? 'true' : 'false'}
              required
            />
            {loginFieldErrors.login ? (
              <span className={styles.adminPage__fieldErrorText}>{loginFieldErrors.login}</span>
            ) : null}
          </label>

          <label className={`${styles.adminPage__field} ${loginFieldErrors.password ? styles.adminPage__fieldInvalid : ''}`}>
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={loginFieldErrors.password ? 'true' : 'false'}
              required
            />
            {loginFieldErrors.password ? (
              <span className={styles.adminPage__fieldErrorText}>{loginFieldErrors.password}</span>
            ) : null}
          </label>

          {error ? <p className={styles.adminPage__error}>{error}</p> : null}

          <AppButton type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Вход...' : 'Войти'}
          </AppButton>
        </form>
      </div>
    </section>
  );
};


