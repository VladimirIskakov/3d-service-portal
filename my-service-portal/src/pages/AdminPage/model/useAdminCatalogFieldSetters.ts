import type { Dispatch, SetStateAction } from 'react';
import type { EquipmentModelVisibility } from '@/entities/equipment';
import type { AdminCatalogPreviewKind } from '@/features/admin-catalog';
import { clearFieldError, type CardField, type CategoryField, type FieldErrors } from './form';

interface UseAdminCatalogFieldSettersInput {
  previewKind: AdminCatalogPreviewKind;
  setTitleState: Dispatch<SetStateAction<string>>;
  setDescriptionState: Dispatch<SetStateAction<string>>;
  setCompanyState: Dispatch<SetStateAction<string>>;
  setYearState: Dispatch<SetStateAction<string>>;
  setSelectedCategoryIdState: Dispatch<SetStateAction<string>>;
  setPreviewKindState: Dispatch<SetStateAction<AdminCatalogPreviewKind>>;
  setVisibilityState: Dispatch<SetStateAction<EquipmentModelVisibility>>;
  setSelectedModelFileName: Dispatch<SetStateAction<string>>;
  setSelectedImageFileName: Dispatch<SetStateAction<string>>;
  setCardFieldErrors: Dispatch<SetStateAction<FieldErrors<CardField>>>;
  setCategoryEditorOpen: Dispatch<SetStateAction<boolean>>;
  setNewCategoryTitleState: Dispatch<SetStateAction<string>>;
  setCategoryFieldErrors: Dispatch<SetStateAction<FieldErrors<CategoryField>>>;
  setCategorySaveError: Dispatch<SetStateAction<string | null>>;
  setCategorySaveSuccess: Dispatch<SetStateAction<string | null>>;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  setSaveSuccess: Dispatch<SetStateAction<string | null>>;
}

export const useAdminCatalogFieldSetters = ({
  previewKind,
  setTitleState,
  setDescriptionState,
  setCompanyState,
  setYearState,
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
}: UseAdminCatalogFieldSettersInput) => {
  return {
    setTitle: (value: string) => {
      setTitleState(value);
      clearFieldError(setCardFieldErrors, 'title');
    },
    setDescription: setDescriptionState,
    setCompany: (value: string) => {
      setCompanyState(value);
      setSaveError(null);
      setSaveSuccess(null);
    },
    setYear: (value: string) => {
      setYearState(value);
      clearFieldError(setCardFieldErrors, 'year');
      setSaveError(null);
      setSaveSuccess(null);
    },
    setSelectedCategoryId: (value: string) => {
      setSelectedCategoryIdState(value);
      setSaveError(null);
      setSaveSuccess(null);
    },
    toggleCategoryEditor: () => {
      setCategoryEditorOpen((current) => !current);
      setCategorySaveError(null);
      setCategorySaveSuccess(null);
    },
    setNewCategoryTitle: (value: string) => {
      setNewCategoryTitleState(value);
      clearFieldError(setCategoryFieldErrors, 'title');
      setCategorySaveError(null);
      setCategorySaveSuccess(null);
    },
    cancelCategoryEditor: () => {
      setCategoryEditorOpen(false);
      setNewCategoryTitleState('');
      setCategoryFieldErrors({});
      setCategorySaveError(null);
    },
    setVisibility: (value: EquipmentModelVisibility) => {
      setVisibilityState(value);
      clearFieldError(setCardFieldErrors, 'visibility');
    },
    setPreviewKind: (value: AdminCatalogPreviewKind) => {
      setPreviewKindState(value);
      clearFieldError(setCardFieldErrors, 'storageFileName');
    },
    setStorageFileName: (value: string) => {
      if (previewKind === 'model') {
        setSelectedModelFileName(value);
      } else {
        setSelectedImageFileName(value);
      }
      clearFieldError(setCardFieldErrors, 'storageFileName');
    },
  };
};
