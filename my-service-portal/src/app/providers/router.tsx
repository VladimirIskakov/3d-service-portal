import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { App } from '@/app/App';
import {
  AdminProtectedRoute,
  ServiceManagementProtectedRoute,
  ServiceWorkspaceProtectedRoute,
} from '@/app/providers/ProtectedRoute';

const CatalogPage = lazy(() => import('@/pages/CatalogPage').then((module) => ({ default: module.CatalogPage })));
const ModelPage = lazy(() => import('@/pages/ModelPage').then((module) => ({ default: module.ModelPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const AdminLogsPage = lazy(() => import('@/pages/AdminLogsPage').then((module) => ({ default: module.AdminLogsPage })));
const AdminServicePage = lazy(() => import('@/pages/AdminServicePage').then((module) => ({ default: module.AdminServicePage })));
const ServiceWorkspacePage = lazy(() =>
  import('@/pages/ServiceWorkspacePage').then((module) => ({ default: module.ServiceWorkspacePage })),
);
const ServiceReportPage = lazy(() =>
  import('@/pages/ServiceReportPage').then((module) => ({ default: module.ServiceReportPage })),
);
const AdminModelPartsPage = lazy(() =>
  import('@/pages/AdminModelPartsPage').then((module) => ({ default: module.AdminModelPartsPage })),
);
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

const withSuspense = (node: ReactNode) => {
  return (
    <Suspense fallback={<section aria-busy="true">Загрузка страницы...</section>}>
      {node}
    </Suspense>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/catalog" replace />,
      },
      {
        path: 'catalog',
        element: withSuspense(<CatalogPage />),
      },
      {
        path: 'model',
        element: <Navigate to="/catalog" replace />,
      },
      {
        path: 'model/:slug',
        element: withSuspense(<ModelPage />),
      },
      {
        path: 'admin',
        element: withSuspense(<AdminPage />),
      },
      {
        path: 'account',
        element: withSuspense(<AdminPage />),
      },
      {
        element: <AdminProtectedRoute />,
        children: [
          {
            path: 'admin/logs',
            element: withSuspense(<AdminLogsPage />),
          },
          {
            path: 'admin/models/:slug/parts',
            element: withSuspense(<AdminModelPartsPage />),
          },
        ],
      },
      {
        element: <ServiceManagementProtectedRoute />,
        children: [
          {
            path: 'admin/service',
            element: withSuspense(<AdminServicePage />),
          },
          {
            path: 'admin/service/report',
            element: withSuspense(<ServiceReportPage />),
          },
        ],
      },
      {
        element: <ServiceWorkspaceProtectedRoute />,
        children: [
          {
            path: 'service-workspace',
            element: withSuspense(<ServiceWorkspacePage />),
          },
        ],
      },
      {
        path: '*',
        element: withSuspense(<NotFoundPage />),
      },
    ],
  },
]);
