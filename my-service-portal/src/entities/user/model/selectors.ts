import type { UserState } from './slice';

export interface HasUserState {
  user: UserState;
}

export const selectUserState = (state: HasUserState) => state.user;

export const selectIsAdminAuthenticated = (state: HasUserState) => {
  const user = selectUserState(state);
  return user.isAuth && user.role === 'admin';
};

