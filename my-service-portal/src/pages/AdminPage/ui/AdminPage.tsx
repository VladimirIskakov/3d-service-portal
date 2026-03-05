import { Link } from 'react-router-dom';
import { AppButton } from '@/shared/ui';
import { formatFileSize, getPreviewKindLabel } from '../model/form';
import { useAdminPageController } from '../model/useAdminPageController';
import {
  AdminCatalogCardForm,
  AdminCatalogList,
  AdminLoginForm,
} from './components';
import styles from './AdminPage.module.scss';

export const AdminPage = () => {
  const controller = useAdminPageController();

  if (!controller.isAuthResolved) {
    return (
      <section className={styles.adminPage__page}>
        <div className={styles.adminPage__card}>
          <div className={styles.adminPage__loaderBlock}>
            <span className={styles.adminPage__spinner} aria-hidden="true" />
          </div>
        </div>
      </section>
    );
  }

  if (!controller.isAdmin) {
    return (
      <AdminLoginForm
        login={controller.login}
        password={controller.password}
        submitting={controller.submitting}
        error={controller.error}
        loginFieldErrors={controller.loginFieldErrors}
        onSubmit={controller.handleSubmit}
        onLoginChange={controller.setLogin}
        onPasswordChange={controller.setPassword}
      />
    );
  }

  const currentStorageEmpty = controller.currentStorageFiles.length === 0;
  const selectedFileHint = controller.selectedStorageFile
    ? `${controller.selectedStorageFile.fileName} (${formatFileSize(controller.selectedStorageFile.sizeBytes)})`
    : null;

  return (
    <section className={styles.adminPage__page}>
      <div className={styles.adminPage__pageTopBar}>
        <Link to="/admin/logs" className={styles.adminPage__secondaryButton}>
          Логи
        </Link>
        <AppButton
          variant="secondary"
          onClick={controller.handleLogout}
          disabled={controller.logoutPending}
        >
          {controller.logoutPending ? 'Выход...' : 'Выйти'}
        </AppButton>
      </div>

      <div className={styles.adminPage__adminLayout}>
        <AdminCatalogCardForm
          isEditMode={controller.isEditMode}
          editingSlug={controller.editingSlug}
          title={controller.title}
          description={controller.description}
          selectedCategoryId={controller.selectedCategoryId}
          catalogCategories={controller.catalogCategories}
          categoryEditorOpen={controller.categoryEditorOpen}
          newCategoryTitle={controller.newCategoryTitle}
          categoryFieldErrors={controller.categoryFieldErrors}
          categorySavePending={controller.categorySavePending}
          categorySaveError={controller.categorySaveError}
          categorySaveSuccess={controller.categorySaveSuccess}
          visibility={controller.visibility}
          previewKind={controller.previewKind}
          currentStorageFiles={controller.currentStorageFiles}
          currentStorageEmpty={currentStorageEmpty}
          selectedStorageFileName={controller.selectedStorageFileName}
          storageLoading={controller.storageLoading}
          selectedFileHint={selectedFileHint}
          storageError={controller.storageError}
          saveError={controller.saveError}
          saveSuccess={controller.saveSuccess}
          savePending={controller.savePending}
          deletePending={controller.deletePending}
          cardFieldErrors={controller.cardFieldErrors}
          onSubmit={controller.handleSaveCard}
          onTitleChange={controller.setTitle}
          onDescriptionChange={controller.setDescription}
          onCategoryChange={controller.setSelectedCategoryId}
          onToggleCategoryEditor={controller.toggleCategoryEditor}
          onNewCategoryTitleChange={controller.setNewCategoryTitle}
          onCreateCategory={() => void controller.handleCreateCategory()}
          onCancelCategoryEditor={controller.cancelCategoryEditor}
          onVisibilityChange={controller.setVisibility}
          onPreviewKindChange={controller.setPreviewKind}
          onStorageFileChange={controller.setStorageFileName}
          onDeleteCard={() => void controller.handleDeleteCard()}
          onCancelEdit={controller.handleCancelEdit}
        />

        <AdminCatalogList
          catalogModels={controller.catalogModels}
          catalogError={controller.catalogError}
          catalogLoading={controller.catalogLoading}
          editingSlug={controller.editingSlug}
          savePending={controller.savePending}
          deletePending={controller.deletePending}
          storageLoading={controller.storageLoading}
          onCreateCard={controller.handleCancelEdit}
          onReload={() => void controller.loadAdminData()}
          onStartEdit={controller.handleStartEdit}
          getPreviewKindLabel={getPreviewKindLabel}
        />
      </div>
    </section>
  );
};
