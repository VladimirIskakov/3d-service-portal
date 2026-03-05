import type { ModelExplosionSettings, ModelSpecificationItem } from './modelCatalog.types.js';

interface SeedCategory {
  id: string;
  title: string;
  description: string;
}

interface SeedPart {
  id: string;
  title: string;
  description: string;
  meshIndexes: number[];
}

interface SeedMesh {
  meshIndex: number;
  nodeName: string;
  meshName: string;
  label: string;
}

interface SeedModel {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  assetPath: string | null;
  parts: SeedPart[];
  meshes: SeedMesh[];
  explodeSettings: ModelExplosionSettings;
  visibility: 'public' | 'private';
  deviceDescription: string;
  specifications: ModelSpecificationItem[];
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    id: 'drones',
    title: 'Дроны',
    description: 'Летательные модели и их узлы.',
  },
  {
    id: 'appliances',
    title: 'Бытовая техника',
    description: 'Модели для дома и сервисного обслуживания.',
  },
];

export const DEFAULT_SEED_EXPLOSION_SETTINGS: ModelExplosionSettings = {
  minDistance: 1.4,
  maxDistance: 3.8,
  axisSnapRatio: 0.22,
  coreVerticalSplitFactor: 0.28,
  coreVerticalBiasRatio: 0.6,
};

const FPV_DRONE_MESHES: SeedMesh[] = [
  { meshIndex: 0, nodeName: 'camera', meshName: '', label: 'camera' },
  { meshIndex: 1, nodeName: 'gps', meshName: '', label: 'gps' },
  { meshIndex: 2, nodeName: 'skeleton-down', meshName: '', label: 'skeleton-down' },
  { meshIndex: 3, nodeName: 'skeleton-up', meshName: '', label: 'skeleton-up' },
  { meshIndex: 4, nodeName: 'skeleton-center', meshName: '', label: 'skeleton-center' },
  { meshIndex: 5, nodeName: 'skeleton-blade-1', meshName: '', label: 'skeleton-blade-1' },
  { meshIndex: 6, nodeName: 'skeleton-blade-2', meshName: '', label: 'skeleton-blade-2' },
  { meshIndex: 7, nodeName: 'skeleton-blade-3', meshName: '', label: 'skeleton-blade-3' },
  { meshIndex: 8, nodeName: 'skeleton-blade-4', meshName: '', label: 'skeleton-blade-4' },
  { meshIndex: 9, nodeName: 'bolts-skeleton', meshName: '', label: 'bolts-skeleton' },
  { meshIndex: 10, nodeName: 'bolts-motors 1', meshName: '', label: 'bolts-motors 1' },
  { meshIndex: 11, nodeName: 'bolts-motors 2', meshName: '', label: 'bolts-motors 2' },
  { meshIndex: 12, nodeName: 'bolts-motors 3', meshName: '', label: 'bolts-motors 3' },
  { meshIndex: 13, nodeName: 'bolts-motors 4', meshName: '', label: 'bolts-motors 4' },
  { meshIndex: 14, nodeName: 'rods', meshName: '', label: 'rods' },
  { meshIndex: 15, nodeName: 'bracing-center', meshName: '', label: 'bracing-center' },
  { meshIndex: 16, nodeName: 'bracing 1', meshName: '', label: 'bracing 1' },
  { meshIndex: 17, nodeName: 'bracing 2', meshName: '', label: 'bracing 2' },
  { meshIndex: 18, nodeName: 'bracing 3', meshName: '', label: 'bracing 3' },
  { meshIndex: 19, nodeName: 'bracing 4', meshName: '', label: 'bracing 4' },
  { meshIndex: 20, nodeName: 'motors 1', meshName: '', label: 'motors 1' },
  { meshIndex: 21, nodeName: 'motors 2', meshName: '', label: 'motors 2' },
  { meshIndex: 22, nodeName: 'motors 3', meshName: '', label: 'motors 3' },
  { meshIndex: 23, nodeName: 'motors 4', meshName: '', label: 'motors 4' },
];

export const SEED_MODELS: SeedModel[] = [
  {
    slug: 'fpv-drone',
    title: 'FPV Drone',
    description: 'FPV-квадрокоптер для разборки на детали и демонстрации режима разлёта.',
    categoryId: 'drones',
    assetPath: '/files/models/fpv-drone.glb',
    meshes: FPV_DRONE_MESHES,
    explodeSettings: DEFAULT_SEED_EXPLOSION_SETTINGS,
    visibility: 'public',
    deviceDescription:
      'FPV-дрон используется для демонстрации структуры устройства, выделения деталей и настройки режима разлёта. Модель разбита на логические группы, чтобы удобно показывать устройство рамы, силовой установки и навесных компонентов.',
    specifications: [
      { id: 'type', label: 'Тип', value: 'FPV-квадрокоптер' },
      { id: 'motors', label: 'Количество моторов', value: '4' },
      { id: 'frame', label: 'Конфигурация рамы', value: 'X-образная' },
    ],
    parts: [
      { id: 'camera', title: 'Камера', description: 'Камера первого лица.', meshIndexes: [0] },
      { id: 'gps', title: 'GPS', description: 'GPS-модуль, установленный на дроне.', meshIndexes: [1] },
      {
        id: 'skeleton-blade',
        title: 'Лучи рамы',
        description: 'Несущие лучи для крепления моторов.',
        meshIndexes: [5, 6, 7, 8],
      },
      {
        id: 'skeleton-center',
        title: 'Центр рамы',
        description: 'Центральная часть рамы.',
        meshIndexes: [4],
      },
      {
        id: 'skeleton',
        title: 'Верх и низ рамы',
        description: 'Верхняя и нижняя пластины рамы.',
        meshIndexes: [2, 3],
      },
      {
        id: 'bolts',
        title: 'Болты',
        description: 'Крепёжные элементы для рамы и моторов.',
        meshIndexes: [9, 10, 11, 12, 13],
      },
      { id: 'rods', title: 'Тяги', description: 'Соединительные тяги.', meshIndexes: [14] },
      {
        id: 'bracing',
        title: 'Центральная распорка',
        description: 'Центральный усиливающий элемент.',
        meshIndexes: [15],
      },
      {
        id: 'blades',
        title: 'Пропеллеры',
        description: 'Винты квадрокоптера.',
        meshIndexes: [16, 17, 18, 19],
      },
      {
        id: 'motors',
        title: 'Моторы',
        description: 'Бесколлекторные двигатели пропеллеров.',
        meshIndexes: [20, 21, 22, 23],
      },
    ],
  },
  {
    slug: 'refrigerator',
    title: 'Refrigerator',
    description: 'Модель бытового холодильника (3D-файл пока не загружен).',
    categoryId: 'appliances',
    assetPath: null,
    meshes: [],
    explodeSettings: DEFAULT_SEED_EXPLOSION_SETTINGS,
    visibility: 'private',
    deviceDescription:
      'Демонстрационная карточка холодильника. Подходит для настройки описания, структуры разделов и характеристик до загрузки полноценной 3D-модели.',
    specifications: [
      { id: 'type', label: 'Тип', value: 'Бытовой холодильник' },
      { id: 'cameras', label: 'Камер', value: '2' },
    ],
    parts: [
      { id: 'cabinet', title: 'Корпус', description: 'Основной корпус холодильника.', meshIndexes: [] },
      { id: 'upper-door', title: 'Верхняя дверь', description: 'Дверца верхней камеры.', meshIndexes: [] },
      { id: 'lower-door', title: 'Нижняя дверь', description: 'Дверца нижней камеры.', meshIndexes: [] },
    ],
  },
];
