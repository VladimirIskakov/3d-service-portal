const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const apiBaseUrl = (rawApiBaseUrl && rawApiBaseUrl.length > 0
  ? rawApiBaseUrl
  : 'http://localhost:8787'
).replace(/\/+$/, '');

const adminApiUrl = `${apiBaseUrl}/api/admin`;
const ADMIN_SESSION_TOKEN_STORAGE_KEY = 'admin_access_token';

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

interface AdminLoginResponse extends AdminSessionResponse {
  sessionToken: string | null;
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

const canUseStorage = () => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

const readAdminSessionToken = () => {
  if (!canUseStorage()) {
    return null;
  }

  const rawToken = window.localStorage.getItem(ADMIN_SESSION_TOKEN_STORAGE_KEY);
  const token = rawToken?.trim();
  return token ? token : null;
};

const writeAdminSessionToken = (token: string | null | undefined) => {
  if (!canUseStorage()) {
    return;
  }

  const normalizedToken = token?.trim();

  if (normalizedToken) {
    window.localStorage.setItem(ADMIN_SESSION_TOKEN_STORAGE_KEY, normalizedToken);
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_TOKEN_STORAGE_KEY);
};

export const clearAdminSessionToken = () => {
  writeAdminSessionToken(null);
};

const buildAdminApiHeaders = (initHeaders: HeadersInit | undefined, shouldSetJsonContentType: boolean) => {
  const headers = new Headers(initHeaders);

  if (shouldSetJsonContentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const sessionToken = readAdminSessionToken();
  if (sessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  return headers;
};

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
  const headers = buildAdminApiHeaders(init?.headers, hasBody && !(init?.body instanceof FormData));

  try {
    response = await fetch(`${adminApiUrl}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new AdminApiError('Failed to reach auth API server.', 'network_error', 0);
  }

  const payload = await parseJson<T | ApiErrorPayload>(response);

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;

    if (response.status === 401) {
      clearAdminSessionToken();
    }

    throw new AdminApiError(
      errorPayload?.error?.message ?? 'API error.',
      errorPayload?.error?.code ?? 'api_error',
      response.status,
    );
  }

  return payload as T;
};

export const getAdminSession = async () => {
  const session = await requestAdminApi<AdminSessionResponse>('/session', {
    method: 'GET',
  });

  if (!session.authenticated) {
    clearAdminSessionToken();
  }

  return session;
};

export const loginAdmin = async (login: string, password: string) => {
  const session = await requestAdminApi<AdminLoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });

  if (session.authenticated && session.user && session.sessionToken) {
    writeAdminSessionToken(session.sessionToken);
  } else {
    clearAdminSessionToken();
  }

  return session;
};

export const logoutAdmin = async () => {
  try {
    return await requestAdminApi<{ ok: true }>('/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } finally {
    clearAdminSessionToken();
  }
};
