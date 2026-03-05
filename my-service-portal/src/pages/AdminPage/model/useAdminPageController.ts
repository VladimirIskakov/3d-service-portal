import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectUserState } from '@/entities/user';
import { useAdminAuthController } from './useAdminAuthController';
import { useAdminCatalogController } from './useAdminCatalogController';

export const useAdminPageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuth, role, isAuthResolved } = useSelector(selectUserState);
  const isAdmin = isAuth && role === 'admin';

  const authController = useAdminAuthController({ dispatch, navigate });
  const catalogController = useAdminCatalogController({ isAdmin });

  return {
    isAuthResolved,
    isAdmin,
    ...authController,
    ...catalogController,
  };
};

