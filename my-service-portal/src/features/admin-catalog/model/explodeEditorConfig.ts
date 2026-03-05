import { type EquipmentExplosionSettings } from '@/entities/equipment';
import { AdminApiError } from '@/features/admin-auth';

export type ExplosionField = keyof EquipmentExplosionSettings;
export type SilhouetteField = 'opacity' | 'edgeThresholdAngle';

export type ExplosionFieldErrors = Partial<Record<ExplosionField, string>>;
export type SilhouetteFieldErrors = Partial<Record<SilhouetteField, string>>;

export const EXPLODE_FIELD_META: Array<{
  field: ExplosionField;
  label: string;
  step: number;
  min?: number;
  max?: number;
  hint: string;
}> = [
  {
    field: 'minDistance',
    label: 'Минимальная дистанция',
    step: 0.1,
    min: 0.1,
    hint: 'Базовая длина смещения деталей от центра модели.',
  },
  {
    field: 'maxDistance',
    label: 'Максимальная дистанция',
    step: 0.1,
    min: 0.1,
    hint: 'Предел, дальше которого детали не разлетаются от центра.',
  },
  {
    field: 'axisSnapRatio',
    label: 'Привязка к осям',
    step: 0.01,
    min: 0,
    max: 1,
    hint: 'Чем выше значение, тем чаще детали будут выравниваться по осям.',
  },
  {
    field: 'coreVerticalSplitFactor',
    label: 'Радиус центральной зоны',
    step: 0.01,
    min: 0,
    max: 2,
    hint: 'Размер центральной зоны, где детали делятся вверх и вниз.',
  },
  {
    field: 'coreVerticalBiasRatio',
    label: 'Вертикальный приоритет',
    step: 0.05,
    min: 0,
    max: 4,
    hint: 'Сила приоритета оси Y внутри центральной зоны.',
  },
];

export const getExplodeErrorMessage = (error: unknown, action: 'load' | 'save') => {
  const code = error instanceof AdminApiError ? error.code : '';

  switch (code) {
    case 'model_not_found':
      return 'Модель не найдена.';
    case 'validation_error':
      return 'Проверьте значения параметров разлёта.';
    case 'unauthorized':
      return 'Сессия администратора истекла. Войдите снова.';
    case 'network_error':
      return 'Нет соединения с API сервера.';
    default:
      return action === 'save'
        ? 'Не удалось сохранить параметры разлёта.'
        : 'Не удалось загрузить параметры разлёта.';
  }
};

export const validateExplosionSettings = (settings: EquipmentExplosionSettings): ExplosionFieldErrors => {
  const errors: ExplosionFieldErrors = {};

  if (!(settings.minDistance > 0)) {
    errors.minDistance = 'Значение должно быть больше 0';
  }

  if (!(settings.maxDistance > 0)) {
    errors.maxDistance = 'Значение должно быть больше 0';
  } else if (settings.maxDistance < settings.minDistance) {
    errors.maxDistance = 'Не может быть меньше минимальной дистанции';
  }

  if (settings.axisSnapRatio < 0 || settings.axisSnapRatio > 1) {
    errors.axisSnapRatio = 'Диапазон: 0..1';
  }

  if (settings.coreVerticalSplitFactor < 0 || settings.coreVerticalSplitFactor > 2) {
    errors.coreVerticalSplitFactor = 'Диапазон: 0..2';
  }

  if (settings.coreVerticalBiasRatio < 0 || settings.coreVerticalBiasRatio > 4) {
    errors.coreVerticalBiasRatio = 'Диапазон: 0..4';
  }

  return errors;
};

export const parseNumericInput = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const validateSilhouetteSettings = (settings: { opacity: number; edgeThresholdAngle: number }) => {
  const errors: SilhouetteFieldErrors = {};

  if (!Number.isFinite(settings.opacity) || settings.opacity < 0 || settings.opacity > 1) {
    errors.opacity = 'Диапазон: 0..1';
  }

  if (
    !Number.isFinite(settings.edgeThresholdAngle)
    || settings.edgeThresholdAngle < 0
    || settings.edgeThresholdAngle > 180
  ) {
    errors.edgeThresholdAngle = 'Диапазон: 0..180';
  }

  return errors;
};

