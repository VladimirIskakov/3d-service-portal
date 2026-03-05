const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const apiBaseUrl = (rawApiBaseUrl && rawApiBaseUrl.length > 0
  ? rawApiBaseUrl
  : 'http://localhost:8787'
).replace(/\/+$/, '');

const adminApiUrl = `${apiBaseUrl}/api/admin`;

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

export interface AdminSessionUser {
  email: string;
  uid: string;
  role: 'admin';
}

export interface AdminSessionResponse {
  authenticated: boolean;
  user: AdminSessionUser | null;
}

export class AdminApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
  }
}

const parseJson = async <T>(response: Response): Promise<T | null> => {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return (await response.json()) as T;
};

export const requestAdminApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  const hasBody = typeof init?.body !== 'undefined' && init.body !== null;
  const shouldSetJsonContentType = hasBody && !(init?.body instanceof FormData);

  try {
    response = await fetch(`${adminApiUrl}${path}`, {
      credentials: 'include',
      headers: {
        ...(shouldSetJsonContentType ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch {
    throw new AdminApiError('Failed to reach auth API server.', 'network_error', 0);
  }

  const payload = await parseJson<T | ApiErrorPayload>(response);

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    throw new AdminApiError(
      errorPayload?.error?.message ?? 'API error.',
      errorPayload?.error?.code ?? 'api_error',
      response.status,
    );
  }

  return payload as T;
};

export const getAdminSession = () => {
  return requestAdminApi<AdminSessionResponse>('/session', {
    method: 'GET',
  });
};

export const loginAdmin = (login: string, password: string) => {
  return requestAdminApi<AdminSessionResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
};

export const logoutAdmin = () => {
  return requestAdminApi<{ ok: true }>('/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
};
