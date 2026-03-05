import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGES_STORAGE_DIR, MODELS_STORAGE_DIR } from '../../config/paths.js';
import type { StoredImageFile, StoredModelFile } from './modelStorage.types.js';

const MODEL_FILE_EXTENSIONS = new Set(['.glb', '.gltf']);
const IMAGE_FILE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const getFileExtension = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
};

const listStoredFiles = <T extends StoredModelFile | StoredImageFile>(input: {
  dirPath: string;
  publicPrefix: string;
  allowedExtensions: Set<string>;
}): T[] => {
  if (!existsSync(input.dirPath)) {
    return [];
  }

  const entries = readdirSync(input.dirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .filter((entry) => input.allowedExtensions.has(getFileExtension(entry.name)))
    .map((entry) => {
      const fullPath = join(input.dirPath, entry.name);
      const stats = statSync(fullPath);

      return {
        fileName: entry.name,
        publicPath: `${input.publicPrefix}/${entry.name}`,
        sizeBytes: stats.size,
      } as T;
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName, 'en'));
};

const findStoredFileByName = <T extends StoredModelFile | StoredImageFile>(
  fileName: string,
  items: T[],
): T | null => {
  const normalized = fileName.trim();

  if (!normalized || normalized.includes('/') || normalized.includes('\\')) {
    return null;
  }

  return items.find((item) => item.fileName === normalized) ?? null;
};

export const createModelStorageService = () => {
  const listStoredModels = (): StoredModelFile[] => {
    return listStoredFiles<StoredModelFile>({
      dirPath: MODELS_STORAGE_DIR,
      publicPrefix: '/files/models',
      allowedExtensions: MODEL_FILE_EXTENSIONS,
    });
  };

  const listStoredImages = (): StoredImageFile[] => {
    return listStoredFiles<StoredImageFile>({
      dirPath: IMAGES_STORAGE_DIR,
      publicPrefix: '/files/images',
      allowedExtensions: IMAGE_FILE_EXTENSIONS,
    });
  };

  return {
    listStoredModels,
    listStoredImages,

    getStoredModelByFileName(fileName: string): StoredModelFile | null {
      return findStoredFileByName(fileName, listStoredModels());
    },

    getStoredImageByFileName(fileName: string): StoredImageFile | null {
      return findStoredFileByName(fileName, listStoredImages());
    },
  };
};
