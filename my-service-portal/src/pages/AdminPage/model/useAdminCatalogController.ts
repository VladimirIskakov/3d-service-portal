import { type FormEvent, useCallback, useMemo, useEffect, useState } from 'react';
import type {
  EquipmentCatalogCategory,
  EquipmentModelInfo,
  EquipmentModelVisibility,
} from '@/entities/equipment';
import {
  createAdminCatalogCategory,
  getAdminCatalogCategories,
  getAdminCatalogModelList,
  createAdminCatalogModelCard,
  deleteAdminCatalogModelCard,
  getAdminStorageImageFiles,
  getAdminStorageModelFiles,
  updateAdminCatalogModelCard,
  type AdminCatalogPreviewKind,
  type AdminStorageFile,
} from '@/features/admin-catalog';
import {
  type CardField,
  type CategoryField,
  type FieldErrors,
  getCatalogActionErrorMessage,
  getCategoryActionErrorMessage,
  getFileNameFromUrl,
  validateCardForm,
  validateCategoryForm,
} from './form';
import { useAdminCatalogFieldSetters } from './useAdminCatalogFieldSetters';

interface UseAdminCatalogControllerInput {
  isAdmin: boolean;
}

export const useAdminCatalogController = ({ isAdmin }: UseAdminCatalogControllerInput) => {
  const [catalogModels, setCatalogModels] = useState<EquipmentModelInfo[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<EquipmentCatalogCategory[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [modelFiles, setModelFiles] = useState<AdminStorageFile[]>([]);
  const [imageFiles, setImageFiles] = useState<AdminStorageFile[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const [title, setTitleState] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryIdState] = useState('');
  const [previewKind, setPreviewKindState] = useState<AdminCatalogPreviewKind>('model');
  const [visibility, setVisibilityState] = useState<EquipmentModelVisibility>('private');
  const [selectedModelFileName, setSelectedModelFileName] = useState('');
  const [selectedImageFileName, setSelectedImageFileName] = useState('');
  const [cardFieldErrors, setCardFieldErrors] = useState<FieldErrors<CardField>>({});

  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [newCategoryTitle, setNewCategoryTitleState] = useState('');
  const [categoryFieldErrors, setCategoryFieldErrors] = useState<FieldErrors<CategoryField>>({});
  const [categorySavePending, setCategorySavePending] = useState(false);
  const [categorySaveError, setCategorySaveError] = useState<string | null>(null);
  const [categorySaveSuccess, setCategorySaveSuccess] = useState<string | null>(null);

  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const isEditMode = Boolean(editingSlug);

  const currentStorageFiles = previewKind === 'model' ? modelFiles : imageFiles;
  const selectedStorageFileName = previewKind === 'model' ? selectedModelFileName : selectedImageFileName;

  const selectedStorageFile = useMemo(() => {
    return currentStorageFiles.find((file) => file.fileName === selectedStorageFileName) ?? null;
  }, [currentStorageFiles, selectedStorageFileName]);

  const resetEditorState = useCallback(() => {
    setModelFiles([]);
    setImageFiles([]);
    setCatalogModels([]);
    setCatalogCategories([]);
    setSelectedModelFileName('');
    setSelectedImageFileName('');
    setSelectedCategoryIdState('');
    setStorageError(null);
    setCatalogError(null);
    setSaveError(null);
    setSaveSuccess(null);
    setDeletePending(false);
    setEditingSlug(null);
    setVisibilityState('private');
    setCardFieldErrors({});
    setCategoryEditorOpen(false);
    setNewCategoryTitleState('');
    setCategoryFieldErrors({});
    setCategorySaveError(null);
    setCategorySaveSuccess(null);
  }, []);

  const resetFormState = useCallback(() => {
    setEditingSlug(null);
    setTitleState('');
    setDescription('');
    setSelectedCategoryIdState('');
    setVisibilityState('private');
    setSaveError(null);
    setSaveSuccess(null);
    setCardFieldErrors({});
    setCategorySaveError(null);
    setCategorySaveSuccess(null);
  }, []);

  const selectDefaultStorageFile = useCallback((
    nextPreviewKind: AdminCatalogPreviewKind,
    nextModelFiles: AdminStorageFile[],
    nextImageFiles: AdminStorageFile[],
  ) => {
    if (nextPreviewKind === 'model') {
      setSelectedModelFileName((current) =>
        current && nextModelFiles.some((file) => file.fileName === current)
          ? current
          : (nextModelFiles[0]?.fileName ?? ''),
      );
      return;
    }

    setSelectedImageFileName((current) =>
      current && nextImageFiles.some((file) => file.fileName === current)
        ? current
        : (nextImageFiles[0]?.fileName ?? ''),
    );
  }, []);

  const loadAdminData = useCallback(async () => {
    setStorageLoading(true);
    setCatalogLoading(true);
    setStorageError(null);
    setCatalogError(null);

    try {
      const [modelsResponse, imagesResponse, catalogItems, categoriesResponse] = await Promise.all([
        getAdminStorageModelFiles(),
        getAdminStorageImageFiles(),
        getAdminCatalogModelList(),
        getAdminCatalogCategories(),
      ]);

      setModelFiles(modelsResponse.items);
      setImageFiles(imagesResponse.items);
      setCatalogModels(catalogItems);
      setCatalogCategories(categoriesResponse.items);
      setSelectedCategoryIdState((current) =>
        current === ''
          ? ''
          : (
              current && categoriesResponse.items.some((category) => category.id === current)
                ? current
                : (categoriesResponse.items[0]?.id ?? '')
            ),
      );

      setPreviewKindState((current) => {
        if (current === 'model' && modelsResponse.items.length === 0 && imagesResponse.items.length > 0) {
          return 'image';
        }

        if (current === 'image' && imagesResponse.items.length === 0 && modelsResponse.items.length > 0) {
          return 'model';
        }

        return current;
      });

      selectDefaultStorageFile('model', modelsResponse.items, imagesResponse.items);
      selectDefaultStorageFile('image', modelsResponse.items, imagesResponse.items);
    } catch (loadError) {
      const message = getCatalogActionErrorMessage(loadError);
      setStorageError(message);
      setCatalogError(message);
      setModelFiles([]);
      setImageFiles([]);
      setCatalogModels([]);
      setCatalogCategories([]);
    } finally {
      setStorageLoading(false);
      setCatalogLoading(false);
    }
  }, [selectDefaultStorageFile]);

  useEffect(() => {
    if (!isAdmin) {
      resetEditorState();
      return;
    }

    void loadAdminData();
  }, [isAdmin, loadAdminData, resetEditorState]);

  const handleStartEdit = (model: EquipmentModelInfo) => {
    if (editingSlug === model.slug) {
      resetFormState();
      setSelectedCategoryIdState(catalogCategories[0]?.id ?? '');
      return;
    }

    setEditingSlug(model.slug);
    setTitleState(model.title);
    setDescription(model.description ?? '');
    setSelectedCategoryIdState(model.categoryId ?? '');
    setVisibilityState(model.visibility ?? 'private');

    const nextKind: AdminCatalogPreviewKind = model.previewKind === 'image' ? 'image' : 'model';
    setPreviewKindState(nextKind);

    const fileName = getFileNameFromUrl(model.previewUrl ?? model.assetUrl ?? null);
    if (nextKind === 'model') {
      setSelectedModelFileName(fileName);
    } else {
      setSelectedImageFileName(fileName);
    }

    setSaveError(null);
    setSaveSuccess(null);
    setCardFieldErrors({});
    setCategorySaveError(null);
    setCategorySaveSuccess(null);
  };

  const handleCancelEdit = () => {
    resetFormState();
  };

  const handleCreateCategory = async () => {
    const nextErrors = validateCategoryForm(newCategoryTitle);
    setCategoryFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setCategorySaveError(null);
      setCategorySaveSuccess(null);
      return;
    }

    setCategorySavePending(true);
    setCategorySaveError(null);
    setCategorySaveSuccess(null);

    try {
      const created = await createAdminCatalogCategory({
        title: newCategoryTitle.trim(),
        description: '',
      });

      setCatalogCategories((current) => [...current, created]);
      setSelectedCategoryIdState(created.id);
      setNewCategoryTitleState('');
      setCategoryFieldErrors({});
      setCategoryEditorOpen(false);
      setCategorySaveSuccess(`Категория создана: ${created.title}`);
    } catch (saveCategoryError) {
      setCategorySaveError(getCategoryActionErrorMessage(saveCategoryError));
    } finally {
      setCategorySavePending(false);
    }
  };

  const handleSaveCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const storageFileName = previewKind === 'model' ? selectedModelFileName : selectedImageFileName;
    const nextFieldErrors = validateCardForm({
      title,
      storageFileName,
      visibility,
    });

    setCardFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setSaveError(null);
      setSaveSuccess(null);
      return;
    }

    setSavePending(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        categoryId: selectedCategoryId.trim() || null,
        visibility,
        previewKind,
        storageFileName,
      };

      const saved = editingSlug
        ? await updateAdminCatalogModelCard(editingSlug, payload)
        : await createAdminCatalogModelCard(payload);

      await loadAdminData();

      setSaveSuccess(
        editingSlug
          ? `Карточка обновлена: ${saved.title}`
          : `Карточка создана: ${saved.title}`,
      );

      if (editingSlug) {
        setEditingSlug(null);
      }

      setTitleState('');
      setDescription('');
      setSelectedCategoryIdState('');
      setVisibilityState('private');
      setCardFieldErrors({});
      setCategorySaveError(null);
      setCategorySaveSuccess(null);
    } catch (saveCardError) {
      setSaveError(getCatalogActionErrorMessage(saveCardError, editingSlug ? 'update' : 'create'));
    } finally {
      setSavePending(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!editingSlug) {
      return;
    }

    const targetModel = catalogModels.find((model) => model.slug === editingSlug);
    const targetLabel = targetModel?.title?.trim() || editingSlug;

    if (!window.confirm(`Удалить карточку "${targetLabel}"?`)) {
      return;
    }

    setDeletePending(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await deleteAdminCatalogModelCard(editingSlug);
      await loadAdminData();
      handleCancelEdit();
      setSaveSuccess(`Карточка удалена: ${targetLabel}`);
    } catch (deleteCardError) {
      setSaveError(getCatalogActionErrorMessage(deleteCardError, 'delete'));
    } finally {
      setDeletePending(false);
    }
  };

  const fieldSetters = useAdminCatalogFieldSetters({
    previewKind,
    setTitleState,
    setDescriptionState: setDescription,
    setSelectedCategoryIdState,
    setPreviewKindState,
    setVisibilityState,
    setSelectedModelFileName,
    setSelectedImageFileName,
    setCardFieldErrors,
    setCategoryEditorOpen,
    setNewCategoryTitleState,
    setCategoryFieldErrors,
    setCategorySaveError,
    setCategorySaveSuccess,
    setSaveError,
    setSaveSuccess,
  });

  return {
    catalogModels,
    catalogCategories,
    catalogLoading,
    catalogError,
    modelFiles,
    imageFiles,
    storageLoading,
    storageError,
    title,
    description,
    selectedCategoryId,
    previewKind,
    visibility,
    selectedModelFileName,
    selectedImageFileName,
    cardFieldErrors,
    categoryEditorOpen,
    newCategoryTitle,
    categoryFieldErrors,
    categorySavePending,
    categorySaveError,
    categorySaveSuccess,
    editingSlug,
    savePending,
    deletePending,
    saveError,
    saveSuccess,
    isEditMode,
    currentStorageFiles,
    selectedStorageFileName,
    selectedStorageFile,
    loadAdminData,
    handleStartEdit,
    handleCancelEdit,
    handleCreateCategory,
    handleSaveCard,
    handleDeleteCard,
    ...fieldSetters,
  };
};
