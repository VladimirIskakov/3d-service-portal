import { requestAdminApi } from '@/features/admin-auth';

const ADMIN_CATALOG_CACHE_TTL_MS = 10_000;
const getResponseCache = new Map<string, { expiresAt: number; payload: unknown }>();
const getInFlightRequests = new Map<string, Promise<unknown>>();

const getCacheKey = (path: string) => {
  return `GET:${path}`;
};

export const requestAdminCatalogGet = async <T>(
  path: string,
  options?: { forceFresh?: boolean; cacheTtlMs?: number },
): Promise<T> => {
  const forceFresh = options?.forceFresh ?? false;
  const cacheTtlMs = options?.cacheTtlMs ?? ADMIN_CATALOG_CACHE_TTL_MS;
  const cacheKey = getCacheKey(path);

  if (!forceFresh) {
    const cached = getResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload as T;
    }

    const inFlight = getInFlightRequests.get(cacheKey);
    if (inFlight) {
      return (await inFlight) as T;
    }
  }

  const requestPromise = (async () => {
    const payload = await requestAdminApi<T>(path, { method: 'GET' });
    getResponseCache.set(cacheKey, {
      expiresAt: Date.now() + cacheTtlMs,
      payload,
    });
    return payload;
  })();

  getInFlightRequests.set(cacheKey, requestPromise);

  try {
    return (await requestPromise) as T;
  } finally {
    getInFlightRequests.delete(cacheKey);
  }
};

export const invalidateAdminCatalogCache = (matcher: (cacheKey: string) => boolean) => {
  for (const key of getResponseCache.keys()) {
    if (matcher(key)) {
      getResponseCache.delete(key);
    }
  }
};

export const invalidateAdminCatalogCacheByModelSlug = (modelSlug: string) => {
  const encodedSlug = encodeURIComponent(modelSlug);
  const pathFragment = `/catalog/models/${encodedSlug}`;
  invalidateAdminCatalogCache((key) => key.includes(pathFragment) || key.includes('/catalog/models'));
};

export const clearAdminCatalogApiCache = () => {
  getResponseCache.clear();
  getInFlightRequests.clear();
};

