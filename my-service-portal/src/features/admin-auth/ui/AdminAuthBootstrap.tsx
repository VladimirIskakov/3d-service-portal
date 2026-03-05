import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { logout, markAuthResolved, setAdminSession } from '@/entities/user';
import { getAdminSession } from '../model/adminAuthApi';

export const AdminAuthBootstrap = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let disposed = false;

    const hydrateSession = async () => {
      try {
        const session = await getAdminSession();

        if (disposed) {
          return;
        }

        if (session.authenticated && session.user) {
          dispatch(setAdminSession({ email: session.user.email }));
          return;
        }

        dispatch(logout());
      } catch {
        if (!disposed) {
          dispatch(markAuthResolved(true));
        }
      }
    };

    void hydrateSession();

    return () => {
      disposed = true;
    };
  }, [dispatch]);

  return null;
};
