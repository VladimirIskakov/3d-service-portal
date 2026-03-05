import { configureStore } from '@reduxjs/toolkit';
import { userReducer } from '@/entities/user';

export const store = configureStore({
  reducer: {
    user: userReducer,
    // Сюда добавишь остальные таблицы: equipment, logs и т.д.
  },
});

// Типы для хуков (чтобы TS знал, что лежит в сторе)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
