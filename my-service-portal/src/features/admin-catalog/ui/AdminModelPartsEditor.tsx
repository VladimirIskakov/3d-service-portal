import { useMemo } from 'react';
import { AppButton, AppSegmentedControl } from '@/shared/ui';
import { formatMeshOwnerLabel } from '../model/partsEditor';
import { useAdminModelPartsController } from '../model/useAdminModelPartsController';
import { AdminModelContentEditor } from './AdminModelContentEditor';
import { AdminModelDisassemblyEditor } from './AdminModelDisassemblyEditor';
import { AdminModelExplodeEditor } from './AdminModelExplodeEditor';
import { AdminModelPreviewCameraEditor } from './AdminModelPreviewCameraEditor';
import { AdminModelPartsTab } from './parts/AdminModelPartsTab';
import styles from './AdminModelPartsEditor.module.scss';

interface Props {
  modelSlug: string | null;
  className?: string;
}

export const AdminModelPartsEditor = ({ modelSlug, className }: Props) => {
  const controller = useAdminModelPartsController({ modelSlug });

  const rootClassName = useMemo(
    () => `${styles.adminModelPartsEditor__root} ${className ?? ''}`,
    [className],
  );

  if (!modelSlug) {
    return (
      <div className={rootClassName}>
        <div className={styles.adminModelPartsEditor__card}>
          <div className={styles.adminModelPartsEditor__header}>
            <h2 className={styles.adminModelPartsEditor__title}>Редактор</h2>
            <p className={styles.adminModelPartsEditor__subtitle}>
              Выбери карточку модели, чтобы редактировать превью, контент, детали и настройки разлёта.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <div className={styles.adminModelPartsEditor__card}>
        <div className={styles.adminModelPartsEditor__header}>
          <div className={styles.adminModelPartsEditor__headerSpacer} aria-hidden="true" />
          <div className={styles.adminModelPartsEditor__headerActions}>
            <AppButton
              variant="secondary"
              onClick={controller.handleRefresh}
              disabled={controller.loading || controller.meshCatalogLoading || controller.savePending || controller.deletePending}
            >
              {controller.loading || controller.meshCatalogLoading ? 'Загрузка...' : 'Обновить'}
            </AppButton>
            {controller.activeTab === 'parts' ? (
              <AppButton
                variant="secondary"
                onClick={controller.resetForm}
                disabled={controller.savePending || controller.deletePending}
              >
                Новая деталь
              </AppButton>
            ) : null}
          </div>
        </div>

        <AppSegmentedControl
          value={controller.activeTab}
          options={controller.tabOptions}
          onChange={controller.setActiveTab}
          ariaLabel="Вкладки редактора модели"
          className={styles.adminModelPartsEditor__tabs}
          buttonClassName={styles.adminModelPartsEditor__tabButton}
          activeButtonClassName={styles.adminModelPartsEditor__tabButtonActive}
        />

        {controller.activeTab === 'parts' ? (
          <p className={styles.adminModelPartsEditor__tabHint}>
            Один меш может принадлежать только одной детали.
          </p>
        ) : null}

        {controller.activeTab === 'preview' ? (
          <AdminModelPreviewCameraEditor modelSlug={modelSlug} />
        ) : controller.activeTab === 'content' ? (
          <AdminModelContentEditor modelSlug={modelSlug} />
        ) : controller.activeTab === 'parts' ? (
          <AdminModelPartsTab
            loading={controller.loading}
            error={controller.error}
            parts={controller.parts}
            selectedPartId={controller.selectedPartId}
            onSelectPart={controller.handleSelectPart}
            fieldErrors={controller.fieldErrors}
            partId={controller.partId}
            title={controller.title}
            description={controller.description}
            onPartIdChange={controller.handlePartIdChange}
            onTitleChange={controller.handleTitleChange}
            onDescriptionChange={controller.handleDescriptionChange}
            meshSearch={controller.meshSearch}
            onMeshSearchChange={controller.handleMeshSearchChange}
            onClearMeshSelection={controller.handleClearMeshSelection}
            selectedMeshIndexes={controller.selectedMeshIndexes}
            meshCatalog={controller.meshCatalog}
            availableMeshCount={controller.availableMeshCount}
            meshCatalogError={controller.meshCatalogError}
            meshCatalogLoading={controller.meshCatalogLoading}
            filteredMeshCatalog={controller.filteredMeshCatalog}
            selectedMeshIndexSet={controller.selectedMeshIndexSet}
            meshOwnersByIndex={controller.meshOwnersByIndex}
            onToggleMeshSelection={controller.handleToggleMeshSelection}
            selectedMeshSummary={controller.selectedMeshSummary}
            saveError={controller.saveError}
            saveSuccess={controller.saveSuccess}
            savePending={controller.savePending}
            deletePending={controller.deletePending}
            isEditMode={controller.isEditMode}
            onSave={() => void controller.handleSave()}
            onDelete={() => void controller.handleDelete()}
            formatMeshOwnerLabel={formatMeshOwnerLabel}
          />
        ) : controller.activeTab === 'explode' ? (
          <AdminModelExplodeEditor modelSlug={modelSlug} />
        ) : (
          <AdminModelDisassemblyEditor modelSlug={modelSlug} />
        )}
      </div>
    </div>
  );
};

