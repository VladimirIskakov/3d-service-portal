import { AppButton, AppSpinner } from '@/shared/ui';
import { useAdminDisassemblyController } from '../model/useAdminDisassemblyController';
import { AdminDisassemblyStepList } from './disassembly/AdminDisassemblyStepList';
import { AdminDisassemblyStepForm } from './disassembly/AdminDisassemblyStepForm';
import styles from './AdminModelDisassemblyEditor.module.scss';

interface Props {
  modelSlug: string;
}

export const AdminModelDisassemblyEditor = ({ modelSlug }: Props) => {
  const controller = useAdminDisassemblyController({ modelSlug });

  if (controller.loading && !controller.error && controller.steps.length === 0) {
    return (
      <div className={styles.adminModelDisassemblyEditor__root}>
        <div className={styles.adminModelDisassemblyEditor__loadingState} role="status" aria-live="polite">
          <AppSpinner aria-hidden="true" />
          <span>Загрузка данных разборки...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminModelDisassemblyEditor__root}>
      <div className={styles.adminModelDisassemblyEditor__layout}>
        <AdminDisassemblyStepList
          loading={controller.loading}
          savePending={controller.savePending}
          error={controller.error}
          steps={controller.steps}
          selectedStepId={controller.selectedStepId}
          dragOverStepId={controller.dragOverStepId}
          onCreateStep={controller.handleCreateStep}
          onSelectStep={controller.setSelectedStepId}
          onStepDragStart={controller.handleStepDragStart}
          onStepDragOver={controller.handleStepDragOver}
          onStepDrop={controller.handleStepDrop}
          onStepDragEnd={controller.handleStepDragEnd}
        />

        <div className={styles.adminModelDisassemblyEditor__formPane}>
          <AdminDisassemblyStepForm
            modelSlug={modelSlug}
            loading={controller.loading}
            savePending={controller.savePending}
            selectedStep={controller.selectedStep}
            partOptions={controller.partOptions}
            selectedStepFocusMeshOptions={controller.selectedStepFocusMeshOptions}
            getMeshOptionLabel={controller.getMeshOptionLabel}
            onDeleteStep={controller.handleDeleteStep}
            onUpdateStep={controller.updateSelectedStep}
            onStepPartChange={controller.handleStepPartChange}
            onFocusMeshChange={controller.handleFocusMeshChange}
            modelUrl={controller.modelUrl}
            modelUrlLoading={controller.modelUrlLoading}
            previewExplodedPartIds={controller.previewExplodedPartIds}
            explosionSettings={controller.explosionSettings}
            previewPose={controller.previewPose}
            controlsRef={controller.staticControlsRef}
            onSelectPreviewPart={controller.handlePreviewSelectPart}
            onPartCentersComputed={controller.setPartCentersById}
            onMeshCentersComputed={controller.setMeshCentersByIndex}
          />

          {controller.saveError ? <p className={styles.adminModelDisassemblyEditor__error}>{controller.saveError}</p> : null}
          {controller.saveSuccess ? <p className={styles.adminModelDisassemblyEditor__success}>{controller.saveSuccess}</p> : null}

          <div className={styles.adminModelDisassemblyEditor__actions}>
            <AppButton
              variant="primary"
              onClick={() => void controller.handleSave()}
              disabled={controller.loading || controller.savePending}
            >
              {controller.savePending ? 'Сохранение...' : 'Сохранить шаги'}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
};
