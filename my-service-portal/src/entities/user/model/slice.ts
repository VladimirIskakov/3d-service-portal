import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'guest' | 'admin' | 'manager' | 'engineer' | 'viewer';

export interface UserState {
  role: UserRole;
  isAuth: boolean;
  email: string | null;
  isAuthResolved: boolean;
}

const initialState: UserState = {
  role: 'guest',
  isAuth: false,
  email: null,
  isAuthResolved: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setRole: (state, action: PayloadAction<UserState['role']>) => {
      state.role = action.payload;
      state.isAuth = action.payload !== 'guest';
      state.email = action.payload === 'guest' ? null : state.email;
      state.isAuthResolved = true;
    },
    setAdminSession: (state, action: PayloadAction<{ email: string | null; role?: Exclude<UserRole, 'guest'> }>) => {
      state.role = action.payload.role ?? 'admin';
      state.isAuth = true;
      state.email = action.payload.email;
      state.isAuthResolved = true;
    },
    markAuthResolved: (state, action: PayloadAction<boolean | undefined>) => {
      state.isAuthResolved = action.payload ?? true;
    },
    logout: (state) => {
      state.role = 'guest';
      state.isAuth = false;
      state.email = null;
      state.isAuthResolved = true;
    },
  },
});

export const { setRole, setAdminSession, markAuthResolved, logout } = userSlice.actions;
export default userSlice.reducer;
