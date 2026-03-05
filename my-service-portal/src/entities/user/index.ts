export { default as userReducer } from './model/slice';

export { setRole, setAdminSession, markAuthResolved, logout } from './model/slice';
export { selectIsAdminAuthenticated, selectUserState, type HasUserState } from './model/selectors';

export type { UserState } from './model/slice';
