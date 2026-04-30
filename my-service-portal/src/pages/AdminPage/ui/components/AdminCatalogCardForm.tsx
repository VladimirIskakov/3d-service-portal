import { type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type {
  EquipmentCatalogCategory,
  EquipmentModelVisibility,
} from '@/entities/equipment';
import type {
  AdminCatalogPreviewKind,
  AdminStorageFile,
} from '@/features/admin-catalog';
import { AppButton, AppSegmentedControl, AppSelect, type AppSegmentedOption } from '@/shared/ui';
import type {
  CardField,
  CategoryField,
  FieldErrors,
} from '../../model/form';
import styles from '../AdminPage.module.scss';

interface AdminCatalogCardFormProps {
  isEditMode: boolean;
  editingSlug: string | null;
  title: string;
  description: string;
  company: string;
  year: string;
  selectedCategoryId: string;
  catalogCategories: EquipmentCatalogCategory[];
  categoryEditorOpen: boolean;
  newCategoryTitle: string;
  categoryFieldErrors: FieldErrors<CategoryField>;
  categorySavePending: boolean;
  categorySaveError: string | null;
  categorySaveSuccess: string | null;
  visibility: EquipmentModelVisibility;
  previewKind: AdminCatalogPreviewKind;
  currentStorageFiles: AdminStorageFile[];
  currentStorageEmpty: boolean;
  selectedStorageFileName: string;
  storageLoading: boolean;
  selectedFileHint: string | null;
  storageError: string | null;
  saveError: string | null;
  saveSuccess: string | null;
  savePending: boolean;
  deletePending: boolean;
  cardFieldErrors: FieldErrors<CardField>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onToggleCategoryEditor: () => void;
  onNewCategoryTitleChange: (value: string) => void;
  onCreateCategory: () => void;
  onCancelCategoryEditor: () => void;
  onVisibilityChange: (value: EquipmentModelVisibility) => void;
  onPreviewKindChange: (value: AdminCatalogPreviewKind) => void;
  onStorageFileChange: (value: string) => void;
  onDeleteCard: () => void;
  onCancelEdit: () => void;
}

export const AdminCatalogCardForm = ({
  isEditMode,
  editingSlug,
  title,
  description,
  company,
  year,
  selectedCategoryId,
  catalogCategories,
  categoryEditorOpen,
  newCategoryTitle,
  categoryFieldErrors,
  categorySavePending,
  categorySaveError,
  categorySaveSuccess,
  visibility,
  previewKind,
  currentStorageFiles,
  currentStorageEmpty,
  selectedStorageFileName,
  storageLoading,
  selectedFileHint,
  storageError,
  saveError,
  saveSuccess,
  savePending,
  deletePending,
  cardFieldErrors,
  onSubmit,
  onTitleChange,
  onDescriptionChange,
  onCompanyChange,
  onYearChange,
  onCategoryChange,
  onToggleCategoryEditor,
  onNewCategoryTitleChange,
  onCreateCategory,
  onCancelCategoryEditor,
  onVisibilityChange,
  onPreviewKindChange,
  onStorageFileChange,
  onDeleteCard,
  onCancelEdit,
}: AdminCatalogCardFormProps) => {
  const visibilityOptions: AppSegmentedOption<EquipmentModelVisibility>[] = [
    { value: 'private', label: 'Закрытая' },
    { value: 'public', label: 'Публичная' },
  ];

  const previewKindOptions: AppSegmentedOption<AdminCatalogPreviewKind>[] = [
    { value: 'model', label: '3D модель' },
    { value: 'image', label: 'Изображение' },
  ];

  return (
    <div className={`${styles.adminPage__card} ${styles.adminPage__editorCard}`}>
      <div className={styles.adminPage__panelHeader}>
        <div>
          <h1 className={styles.adminPage__title}>
            {isEditMode ? 'Редактирование карточки' : 'Новая карточка'}
          </h1>
          <p className={styles.adminPage__subtitle}>
            Карточка справочника с превью в виде модели или изображения.
          </p>
        </div>
        <div className={styles.adminPage__headerActions}>
          {isEditMode && editingSlug ? (
            <Link
              to={`/admin/models/${editingSlug}/parts`}
              className={`${styles.adminPage__inlineLink} ${styles.adminPage__editorInlineLink}`}
            >
              Перейти в редактор
            </Link>
          ) : null}
        </div>
      </div>

      <form className={styles.adminPage__form} onSubmit={onSubmit} noValidate>
        <label className={`${styles.adminPage__field} ${cardFieldErrors.title ? styles.adminPage__fieldInvalid : ''}`}>
          <span>Название карточки</span>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Например: FPV Drone V2"
            maxLength={120}
            aria-invalid={cardFieldErrors.title ? 'true' : 'false'}
            required
          />
          {cardFieldErrors.title ? (
            <span className={styles.adminPage__fieldErrorText}>{cardFieldErrors.title}</span>
          ) : null}
        </label>

        <label className={styles.adminPage__field}>
          <span>Описание</span>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Короткое описание модели для справочника"
            rows={3}
            maxLength={400}
          />
        </label>

        <label className={styles.adminPage__field}>
          <span>Компания</span>
          <input
            type="text"
            value={company}
            onChange={(event) => onCompanyChange(event.target.value)}
            placeholder="Например: SkyLab"
            maxLength={80}
          />
        </label>

        <label className={`${styles.adminPage__field} ${cardFieldErrors.year ? styles.adminPage__fieldInvalid : ''}`}>
          <span>Год</span>
          <input
            type="number"
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
            placeholder="Например: 2024"
            min={1950}
            max={2100}
            step={1}
            aria-invalid={cardFieldErrors.year ? 'true' : 'false'}
          />
          {cardFieldErrors.year ? (
            <span className={styles.adminPage__fieldErrorText}>{cardFieldErrors.year}</span>
          ) : null}
        </label>

        <label className={styles.adminPage__field}>
          <span>Категория</span>
          <AppSelect value={selectedCategoryId} onChange={(event) => onCategoryChange(event.target.value)}>
            <option value="">Без категории</option>
            {catalogCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </AppSelect>
          <div className={styles.adminPage__categoryTools}>
            <AppButton variant="ghost" onClick={onToggleCategoryEditor}>
              {categoryEditorOpen ? 'Скрыть форму категории' : 'Новая категория'}
            </AppButton>
            {selectedCategoryId ? (
              <span className={styles.adminPage__helperTextInline}>Выбрана категория</span>
            ) : (
              <span className={styles.adminPage__helperTextInline}>Карточка будет без категории</span>
            )}
          </div>
        </label>

        {categoryEditorOpen ? (
          <div className={styles.adminPage__inlinePanel}>
            <div className={styles.adminPage__inlinePanelHeader}>
              <strong>Создание категории</strong>
              <span>Добавь категорию и она сразу станет доступна в списке.</span>
            </div>

            <label className={`${styles.adminPage__field} ${categoryFieldErrors.title ? styles.adminPage__fieldInvalid : ''}`}>
              <span>Название категории</span>
              <input
                type="text"
                value={newCategoryTitle}
                onChange={(event) => onNewCategoryTitleChange(event.target.value)}
                placeholder="Например: Бытовая техника"
                aria-invalid={categoryFieldErrors.title ? 'true' : 'false'}
              />
              {categoryFieldErrors.title ? (
                <span className={styles.adminPage__fieldErrorText}>{categoryFieldErrors.title}</span>
              ) : null}
            </label>

            <div className={styles.adminPage__formActions}>
              <AppButton variant="primary" onClick={onCreateCategory} disabled={categorySavePending}>
                {categorySavePending ? 'Создание...' : 'Создать категорию'}
              </AppButton>
              <AppButton variant="ghost" onClick={onCancelCategoryEditor} disabled={categorySavePending}>
                Отмена
              </AppButton>
            </div>

            {categorySaveError ? <p className={styles.adminPage__error}>{categorySaveError}</p> : null}
            {categorySaveSuccess ? <p className={styles.adminPage__success}>{categorySaveSuccess}</p> : null}
          </div>
        ) : null}

        <div className={`${styles.adminPage__field} ${cardFieldErrors.visibility ? styles.adminPage__fieldInvalid : ''}`}>
          <span>Открытость</span>
          <AppSegmentedControl
            value={visibility}
            options={visibilityOptions}
            onChange={onVisibilityChange}
            ariaLabel="Открытость карточки"
            className={styles.adminPage__segmented}
            buttonClassName={styles.adminPage__segmentedButton}
            activeButtonClassName={styles.adminPage__segmentedButtonActive}
          />
          {cardFieldErrors.visibility ? (
            <span className={styles.adminPage__fieldErrorText}>{cardFieldErrors.visibility}</span>
          ) : null}
        </div>

        <div className={styles.adminPage__field}>
          <span>Тип превью</span>
          <AppSegmentedControl
            value={previewKind}
            options={previewKindOptions}
            onChange={onPreviewKindChange}
            ariaLabel="Тип превью карточки"
            className={styles.adminPage__segmented}
            buttonClassName={styles.adminPage__segmentedButton}
            activeButtonClassName={styles.adminPage__segmentedButtonActive}
          />
        </div>

        <label className={`${styles.adminPage__field} ${cardFieldErrors.storageFileName ? styles.adminPage__fieldInvalid : ''}`}>
          <span>
            {previewKind === 'model'
              ? 'Файл модели (storage/models)'
              : 'Изображение (storage/images)'}
          </span>
          <AppSelect
            value={selectedStorageFileName}
            onChange={(event) => onStorageFileChange(event.target.value)}
            disabled={storageLoading || currentStorageEmpty}
            invalid={Boolean(cardFieldErrors.storageFileName)}
            required
          >
            {currentStorageEmpty ? (
              <option value="">
                {storageLoading
                  ? 'Загрузка...'
                  : previewKind === 'model'
                    ? 'Нет файлов в storage/models'
                    : 'Нет файлов в storage/images'}
              </option>
            ) : (
              currentStorageFiles.map((file) => (
                <option key={file.fileName} value={file.fileName}>
                  {file.fileName}
                </option>
              ))
            )}
          </AppSelect>
          {cardFieldErrors.storageFileName ? (
            <span className={styles.adminPage__fieldErrorText}>{cardFieldErrors.storageFileName}</span>
          ) : null}
        </label>

        {selectedFileHint ? (
          <p className={styles.adminPage__helperText}>
            Выбран файл: <code>{selectedFileHint}</code>
          </p>
        ) : null}
        {storageError ? <p className={styles.adminPage__error}>{storageError}</p> : null}
        {saveError ? <p className={styles.adminPage__error}>{saveError}</p> : null}
        {saveSuccess ? <p className={styles.adminPage__success}>{saveSuccess}</p> : null}

        <div className={styles.adminPage__formActions}>
          <AppButton
            type="submit"
            variant="primary"
            disabled={savePending || deletePending || storageLoading || currentStorageEmpty}
          >
            {savePending
              ? 'Сохранение...'
              : isEditMode
                ? 'Сохранить изменения'
                : 'Создать карточку'}
          </AppButton>

          {isEditMode ? (
            <>
              <AppButton variant="danger" onClick={onDeleteCard} disabled={savePending || deletePending}>
                {deletePending ? 'Удаление...' : 'Удалить карточку'}
              </AppButton>
              <AppButton variant="ghost" onClick={onCancelEdit} disabled={savePending || deletePending}>
                Отмена
              </AppButton>
            </>
          ) : null}
        </div>
      </form>
    </div>
  );
};


