export interface AppError extends Error {
  code: string;
}

export const createAppError = (code: string, message: string): AppError => {
  const error = new Error(message) as AppError;
  error.code = code;
  return error;
};

export const getErrorCode = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code?: unknown }).code);
  }

  return fallback;
};

