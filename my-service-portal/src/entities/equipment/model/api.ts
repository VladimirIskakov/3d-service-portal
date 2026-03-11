const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const apiBaseUrl = (rawApiBaseUrl && rawApiBaseUrl.length > 0
  ? rawApiBaseUrl
  : 'http://localhost:8787'
).replace(/\/+$/, '');

export const buildApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const EQUIPMENT_API_CACHE_TTL_MS = 10_000;
const responseCache = new Map<string, { expiresAt: number; payload: unknown }>();
const inFlightRequests = new Map<string, Promise<unknown>>();

interface RequestEquipmentApiOptions {
  forceFresh?: boolean;
  cacheTtlMs?: number;
}

export const requestEquipmentApi = async <T>(
  path: string,
  options?: RequestEquipmentApiOptions,
): Promise<T> => {
  const requestUrl = buildApiUrl(path);
  const forceFresh = options?.forceFresh ?? false;
  const cacheTtlMs = options?.cacheTtlMs ?? EQUIPMENT_API_CACHE_TTL_MS;

  if (!forceFresh) {
    const cached = responseCache.get(requestUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload as T;
    }

    const inFlight = inFlightRequests.get(requestUrl);
    if (inFlight) {
      return (await inFlight) as T;
    }
  }

  const requestPromise = (async () => {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      throw new Error(`Equipment API request failed: ${response.status}`);
    }

    const payload = (await response.json()) as T;
    responseCache.set(requestUrl, {
      expiresAt: Date.now() + cacheTtlMs,
      payload,
    });
    return payload;
  })();

  inFlightRequests.set(requestUrl, requestPromise);

  try {
    return (await requestPromise) as T;
  } finally {
    inFlightRequests.delete(requestUrl);
  }
};
