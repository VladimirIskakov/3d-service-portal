import { Plus, RefreshCw } from 'lucide-react';
import type { EquipmentModelInfo } from '@/entities/equipment';
import { AppButton } from '@/shared/ui';
import styles from '../AdminPage.module.scss';

interface AdminCatalogListProps {
  catalogModels: EquipmentModelInfo[];
  catalogError: string | null;
  catalogLoading: boolean;
  editingSlug: string | null;
  savePending: boolean;
  deletePending: boolean;
  storageLoading: boolean;
  onCreateCard: () => void;
  onReload: () => void;
  onStartEdit: (model: EquipmentModelInfo) => void;
  getPreviewKindLabel: (kind: EquipmentModelInfo['previewKind']) => string;
}

export const AdminCatalogList = ({
  catalogModels,
  catalogError,
  catalogLoading,
  editingSlug,
  savePending,
  deletePending,
  storageLoading,
  onCreateCard,
  onReload,
  onStartEdit,
  getPreviewKindLabel,
}: AdminCatalogListProps) => {
  return (
    <div className={`${styles.adminPage__card} ${styles.adminPage__listCard}`}>
      <div className={styles.adminPage__panelHeader}>
        <div>
          <h2 className={styles.adminPage__title}>Карточки каталога</h2>
          <p className={styles.adminPage__subtitle}>Выбери карточку для редактирования.</p>
        </div>
        <div className={styles.adminPage__headerActions}>
          <AppButton
            variant="ghost"
            iconOnly
            onClick={onCreateCard}
            disabled={savePending || deletePending}
            title="Новая карточка"
            aria-label="Переключиться в режим создания новой карточки"
          >
            <Plus size={18} aria-hidden="true" />
          </AppButton>
          <AppButton
            variant="ghost"
            iconOnly
            onClick={onReload}
            disabled={catalogLoading || storageLoading || savePending || deletePending}
            title="Обновить"
            aria-label="Обновить список карточек каталога"
          >
            <RefreshCw size={16} aria-hidden="true" className={catalogLoading ? styles.adminPage__iconSpin : undefined} />
          </AppButton>
        </div>
      </div>

      {catalogError ? <p className={styles.adminPage__error}>{catalogError}</p> : null}

      <div className={styles.adminPage__list}>
        {catalogModels.map((model) => (
          <button
            key={model.slug}
            type="button"
            className={`${styles.adminPage__listItem} ${editingSlug === model.slug ? styles.adminPage__listItemActive : ''}`}
            onClick={() => onStartEdit(model)}
          >
            <div className={styles.adminPage__listItemMain}>
              <div className={styles.adminPage__listItemTop}>
                <span className={styles.adminPage__listItemTitle}>{model.title}</span>
                <span className={styles.adminPage__listItemBadge}>{getPreviewKindLabel(model.previewKind)}</span>
                <span className={styles.adminPage__listItemBadge}>
                  {model.visibility === 'public' ? 'Публичная' : 'Закрытая'}
                </span>
              </div>
              <span className={styles.adminPage__listItemSlug}>/{model.slug}</span>
              <span className={styles.adminPage__listItemDescription}>
                {model.description?.trim() || 'Описание не заполнено'}
              </span>
            </div>
          </button>
        ))}

        {!catalogLoading && catalogModels.length === 0 ? (
          <div className={styles.adminPage__emptyList}>В каталоге пока нет карточек.</div>
        ) : null}
      </div>
    </div>
  );
};


