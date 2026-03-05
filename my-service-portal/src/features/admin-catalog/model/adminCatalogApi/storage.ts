import { requestAdminCatalogGet } from './client';
import type { StorageFilesResponse } from './types';

export const getAdminStorageModelFiles = () => {
  return requestAdminCatalogGet<StorageFilesResponse>('/storage/models');
};

export const getAdminStorageImageFiles = () => {
  return requestAdminCatalogGet<StorageFilesResponse>('/storage/images');
};

