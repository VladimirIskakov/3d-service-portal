import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import type { UserRole } from '@/entities/user/model/slice';

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

  return <ProtectedRoute isAllowed={isAuth && role === 'admin'} redirectPath="/account" />;
};

const getRoleHomePath = (role: UserRole) => {
  if (role === 'admin') {
    return '/admin';
  }

  if (role === 'manager') {
    return '/admin/service';
  }

  if (role === 'engineer') {
    return '/service-workspace';
  }

  return '/catalog';
};

const RoleProtectedRoute = ({
  allowedRoles,
  redirectPath = '/account',
}: {
  allowedRoles: Array<Exclude<UserRole, 'guest'>>;
  redirectPath?: string;
}) => {
  const { isAuth, role, isAuthResolved } = useAppSelector((state) => state.user);

  if (!isAuthResolved) {
    return (
      <section aria-busy="true" aria-live="polite">
        Проверка сессии...
      </section>
    );
  }

  const fallbackPath = isAuth ? getRoleHomePath(role) : redirectPath;

  return (
    <ProtectedRoute
      isAllowed={isAuth && allowedRoles.includes(role as Exclude<UserRole, 'guest'>)}
      redirectPath={fallbackPath}
    />
  );
};

export const ServiceManagementProtectedRoute = () => (
  <RoleProtectedRoute allowedRoles={['admin', 'manager']} redirectPath="/account" />
);

export const ServiceWorkspaceProtectedRoute = () => (
  <RoleProtectedRoute allowedRoles={['admin', 'manager', 'engineer']} redirectPath="/account" />
);
