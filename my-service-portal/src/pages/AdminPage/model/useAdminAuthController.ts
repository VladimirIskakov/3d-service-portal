import { type FormEvent, useState } from 'react';
import { type NavigateFunction } from 'react-router-dom';
import { clearAdminCatalogApiCache } from '@/features/admin-catalog';
import { loginAdmin, logoutAdmin } from '@/features/admin-auth';
import { logout as logoutUser, setAdminSession } from '@/entities/user';
import {
  clearFieldError,
  type FieldErrors,
  getLoginErrorMessage,
  type LoginField,
  validateLoginForm,
} from './form';

interface UseAdminAuthControllerInput {
  dispatch: (action: any) => any;
  navigate: NavigateFunction;
}

export const useAdminAuthController = ({ dispatch, navigate }: UseAdminAuthControllerInput) => {
  const [login, setLoginState] = useState('');
  const [password, setPasswordState] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [loginFieldErrors, setLoginFieldErrors] = useState<FieldErrors<LoginField>>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextFieldErrors = validateLoginForm(login, password);
    setLoginFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setError(null);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const session = await loginAdmin(login.trim(), password);

      if (session.authenticated && session.user) {
        dispatch(setAdminSession({ email: session.user.email }));
      }

      navigate('/', { replace: true });
    } catch (submitError) {
      setError(getLoginErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setLogoutPending(true);

    try {
      await logoutAdmin();
      clearAdminCatalogApiCache();
      dispatch(logoutUser());
    } finally {
      setLogoutPending(false);
    }
  };

  return {
    login,
    password,
    submitting,
    error,
    logoutPending,
    loginFieldErrors,
    handleSubmit,
    handleLogout,
    setLogin: (value: string) => {
      setLoginState(value);
      clearFieldError(setLoginFieldErrors, 'login');
    },
    setPassword: (value: string) => {
      setPasswordState(value);
      clearFieldError(setLoginFieldErrors, 'password');
    },
  };
};
