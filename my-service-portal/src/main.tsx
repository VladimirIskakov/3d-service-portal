import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/providers/router'
import { Provider } from 'react-redux';
import { store } from '@/app/store';
import { AdminAuthBootstrap } from '@/features/admin-auth';
import './index.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AdminAuthBootstrap />
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
