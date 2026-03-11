import type { Dispatch, SetStateAction } from 'react';
import type { EquipmentModelInfo, EquipmentModelVisibility } from '@/entities/equipment';
import { AdminApiError } from '@/features/admin-auth';

export type LoginField = 'login' | 'password';
export type CardField = 'title' | 'storageFileName' | 'visibility' | 'year';
export type CategoryField = 'title';
export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export const getLoginErrorMessage = (error: unknown) => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'invalid_credentials':
      return 'Неверный логин или пароль.';
    case 'admin_forbidden':
      return 'Пользователь не входит в список администраторов.';
    case 'firebase_rate_limited':
      return 'Слишком много попыток входа. Попробуйте позже.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    case 'server_misconfigured':
      return 'Сервер авторизации не настроен.';
    default:
      return 'Не удалось выполнить вход.';
  }
};

export const getCatalogActionErrorMessage = (
  error: unknown,
  action: 'create' | 'update' | 'delete' = 'create',
) => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'storage_file_not_found':
      return 'Выбранный файл не найден в storage.';
    case 'validation_error':
      return 'Заполни название, выбери тип превью и файл.';
    case 'model_not_found':
      return 'Карточка не найдена.';
    case 'unauthorized':
      return 'Сессия администратора истекла. Войди снова.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      return action === 'update'
        ? 'Не удалось сохранить изменения карточки.'
        : action === 'delete'
          ? 'Не удалось удалить карточку модели.'
          : 'Не удалось создать карточку модели.';
  }
};

export const getCategoryActionErrorMessage = (error: unknown) => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'validation_error':
      return 'Укажи название категории.';
    case 'unauthorized':
      return 'Сессия администратора истекла. Войди снова.';
    case 'network_error':
      return 'Нет соединения с API сервером.';
    default:
      return 'Не удалось создать категорию.';
  }
};

export const formatFileSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const kb = sizeBytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
};

export const getFileNameFromUrl = (url: string | null) => {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.split('/').pop() ?? '');
  } catch {
    const normalized = url.split('?')[0] ?? '';
    return decodeURIComponent(normalized.split('/').pop() ?? '');
  }
};

export const getPreviewKindLabel = (kind: EquipmentModelInfo['previewKind']) => {
  if (kind === 'model') {
    return '3D';
  }

  if (kind === 'image') {
    return 'Изображение';
  }

  return 'Без превью';
};

export const validateLoginForm = (loginValue: string, passwordValue: string): FieldErrors<LoginField> => {
  const nextErrors: FieldErrors<LoginField> = {};
  const normalizedLogin = loginValue.trim();

  if (!normalizedLogin) {
    nextErrors.login = 'Укажи email.';
  } else if (!EMAIL_REGEX.test(normalizedLogin)) {
    nextErrors.login = 'Некорректный формат email.';
  }

  if (!passwordValue) {
    nextErrors.password = 'Укажи пароль.';
  } else if (passwordValue.length < 6) {
    nextErrors.password = 'Пароль должен быть не короче 6 символов.';
  }

  return nextErrors;
};

export const validateCardForm = (input: {
  title: string;
  storageFileName: string;
  visibility: EquipmentModelVisibility;
  year: string;
}): FieldErrors<CardField> => {
  const nextErrors: FieldErrors<CardField> = {};

  if (input.title.trim().length < 2) {
    nextErrors.title = 'Название должно быть не короче 2 символов.';
  }

  if (!input.storageFileName.trim()) {
    nextErrors.storageFileName = 'Выбери файл для превью.';
  }

  if (input.visibility !== 'public' && input.visibility !== 'private') {
    nextErrors.visibility = 'Выбери тип открытости.';
  }

  const normalizedYear = input.year.trim();
  if (normalizedYear) {
    const parsedYear = Number(normalizedYear);
    if (!Number.isInteger(parsedYear) || parsedYear < 1950 || parsedYear > 2100) {
      nextErrors.year = 'Год должен быть целым числом в диапазоне 1950-2100.';
    }
  }

  return nextErrors;
};

export const validateCategoryForm = (title: string): FieldErrors<CategoryField> => {
  const nextErrors: FieldErrors<CategoryField> = {};

  if (title.trim().length < 2) {
    nextErrors.title = 'Название категории должно быть не короче 2 символов.';
  }

  return nextErrors;
};

export const clearFieldError = <T extends string>(
  setErrors: Dispatch<SetStateAction<FieldErrors<T>>>,
  field: T,
) => {
  setErrors((current) => {
    if (!current[field]) {
      return current;
    }

    return {
      ...current,
      [field]: undefined,
    };
  });
};

