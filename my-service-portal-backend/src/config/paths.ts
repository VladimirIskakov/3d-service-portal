import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));

export const BACKEND_ROOT_DIR = resolve(configDir, '..', '..');
export const STORAGE_DIR = resolve(BACKEND_ROOT_DIR, 'storage');
export const MODELS_STORAGE_DIR = resolve(STORAGE_DIR, 'models');
export const IMAGES_STORAGE_DIR = resolve(STORAGE_DIR, 'images');
