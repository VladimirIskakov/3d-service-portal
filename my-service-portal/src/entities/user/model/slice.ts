import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Типизируем состояние
export interface UserState {
  role: 'guest' | 'master' | 'admin';
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
    // Метод для смены роли (например, для демонстрации на защите)
    setRole: (state, action: PayloadAction<UserState['role']>) => {
      state.role = action.payload;
      state.isAuth = action.payload !== 'guest';
      state.email = action.payload === 'guest' ? null : state.email;
      state.isAuthResolved = true;
    },
    setAdminSession: (state, action: PayloadAction<{ email: string | null }>) => {
      state.role = 'admin';
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
