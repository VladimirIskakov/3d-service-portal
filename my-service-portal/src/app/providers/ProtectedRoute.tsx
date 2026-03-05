import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';

interface Props {
  isAllowed: boolean;
  redirectPath?: string;
}

export const ProtectedRoute = ({ 
  isAllowed, 
  redirectPath = '/login' 
}: Props) => {
  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

export const AdminProtectedRoute = () => {
  const { isAuth, role, isAuthResolved } = useAppSelector((state) => state.user);

  if (!isAuthResolved) {
    return (
      <section aria-busy="true" aria-live="polite">
        Проверка сессии...
      </section>
    );
  }

  return <ProtectedRoute isAllowed={isAuth && role === 'admin'} redirectPath="/admin" />;
};
