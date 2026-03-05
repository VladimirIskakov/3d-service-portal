import type { EquipmentPartInfo } from '@/entities/equipment';
import { AppButton } from '@/shared/ui';
import type { ModelMeshCatalogItem } from '../../model/loadModelMeshCatalog';
import type { PartFieldErrors } from '../../model/partsEditor';
import styles from '../AdminModelPartsEditor.module.scss';

interface Props {
  loading: boolean;
  error: string | null;
  parts: EquipmentPartInfo[];
  selectedPartId: string | null;
  onSelectPart: (part: EquipmentPartInfo) => void;
  fieldErrors: PartFieldErrors;
  partId: string;
  title: string;
  description: string;
  onPartIdChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  meshSearch: string;
  onMeshSearchChange: (value: string) => void;
  onClearMeshSelection: () => void;
  selectedMeshIndexes: number[];
  meshCatalog: ModelMeshCatalogItem[];
  availableMeshCount: number;
  meshCatalogError: string | null;
  meshCatalogLoading: boolean;
  filteredMeshCatalog: ModelMeshCatalogItem[];
  selectedMeshIndexSet: Set<number>;
  meshOwnersByIndex: Map<number, EquipmentPartInfo[]>;
  onToggleMeshSelection: (meshIndex: number) => void;
  selectedMeshSummary: string;
  saveError: string | null;
  saveSuccess: string | null;
  savePending: boolean;
  deletePending: boolean;
  isEditMode: boolean;
  onSave: () => void;
  onDelete: () => void;
  formatMeshOwnerLabel: (part: EquipmentPartInfo) => string;
}

export const AdminModelPartsTab = ({
  loading,
  error,
  parts,
  selectedPartId,
  onSelectPart,
  fieldErrors,
  partId,
  title,
  description,
  onPartIdChange,
  onTitleChange,
  onDescriptionChange,
  meshSearch,
  onMeshSearchChange,
  onClearMeshSelection,
  selectedMeshIndexes,
  meshCatalog,
  availableMeshCount,
  meshCatalogError,
  meshCatalogLoading,
  filteredMeshCatalog,
  selectedMeshIndexSet,
  meshOwnersByIndex,
  onToggleMeshSelection,
  selectedMeshSummary,
  saveError,
  saveSuccess,
  savePending,
  deletePending,
  isEditMode,
  onSave,
  onDelete,
  formatMeshOwnerLabel: getOwnerLabel,
}: Props) => {
  return (
    <div className={styles.adminModelPartsEditor__layout}>
      <div className={styles.adminModelPartsEditor__listPane}>
        {error ? <p className={styles.adminModelPartsEditor__error}>{error}</p> : null}

        <div className={styles.adminModelPartsEditor__list}>
          {parts.map((part) => (
            <button
              key={part.id}
              type="button"
              className={`${styles.adminModelPartsEditor__listItem} ${selectedPartId === part.id ? styles.adminModelPartsEditor__listItemActive : ''}`}
              onClick={() => onSelectPart(part)}
            >
              <span className={styles.adminModelPartsEditor__listItemTitle}>{part.title}</span>
              <span className={styles.adminModelPartsEditor__listItemMeta}>ID: {part.id}</span>
              <span className={styles.adminModelPartsEditor__listItemMeta}>Мешей: {part.meshIndexes.length}</span>
            </button>
          ))}

          {!loading && parts.length === 0 ? (
            <div className={styles.adminModelPartsEditor__emptyList}>У этой модели пока нет деталей.</div>
          ) : null}
        </div>
      </div>

      <div className={styles.adminModelPartsEditor__formPane}>
        <div className={styles.adminModelPartsEditor__formGrid}>
          <label className={`${styles.adminModelPartsEditor__field} ${fieldErrors.partId ? styles.adminModelPartsEditor__fieldInvalid : ''}`}>
            <span>ID детали</span>
            <input
              type="text"
              value={partId}
              onChange={(event) => onPartIdChange(event.target.value)}
              placeholder="camera-module"
              aria-invalid={fieldErrors.partId ? 'true' : 'false'}
              disabled={isEditMode}
            />
            {fieldErrors.partId ? <span className={styles.adminModelPartsEditor__fieldErrorText}>{fieldErrors.partId}</span> : null}
          </label>

          <label className={`${styles.adminModelPartsEditor__field} ${fieldErrors.title ? styles.adminModelPartsEditor__fieldInvalid : ''}`}>
            <span>Название</span>
            <input
              type="text"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Камера"
              aria-invalid={fieldErrors.title ? 'true' : 'false'}
            />
            {fieldErrors.title ? <span className={styles.adminModelPartsEditor__fieldErrorText}>{fieldErrors.title}</span> : null}
          </label>

          <label className={styles.adminModelPartsEditor__field}>
            <span>Описание детали</span>
            <textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              rows={3}
              placeholder="Описание детали"
            />
          </label>

          <div className={`${styles.adminModelPartsEditor__field} ${fieldErrors.meshIndexes ? styles.adminModelPartsEditor__fieldInvalid : ''}`}>
            <span>Меши</span>

            <div className={styles.adminModelPartsEditor__meshToolbar}>
              <input
                type="text"
                className={styles.adminModelPartsEditor__meshSearchInput}
                value={meshSearch}
                onChange={(event) => onMeshSearchChange(event.target.value)}
                placeholder="Поиск меша по имени"
              />
              <AppButton
                variant="secondary"
                onClick={onClearMeshSelection}
                disabled={selectedMeshIndexes.length === 0 || savePending || deletePending}
              >
                Очистить
              </AppButton>
            </div>

            <div className={styles.adminModelPartsEditor__meshStats}>
              <span>Всего: {meshCatalog.length}</span>
              <span>Доступно: {availableMeshCount}</span>
              <span>Выбрано: {selectedMeshIndexes.length}</span>
            </div>

            {meshCatalogError ? <p className={styles.adminModelPartsEditor__error}>{meshCatalogError}</p> : null}

            <div className={styles.adminModelPartsEditor__meshList} aria-busy={meshCatalogLoading ? 'true' : 'false'}>
              {meshCatalogLoading ? (
                <div className={styles.adminModelPartsEditor__emptyList}>Загрузка списка мешей...</div>
              ) : filteredMeshCatalog.length === 0 ? (
                <div className={styles.adminModelPartsEditor__emptyList}>
                  {meshCatalog.length === 0 ? 'Меши не найдены.' : 'Поиск не дал результатов.'}
                </div>
              ) : (
                filteredMeshCatalog.map((mesh) => {
                  const owners = meshOwnersByIndex.get(mesh.meshIndex) ?? [];
                  const ownerFromOtherPart =
                    owners.find((owner) => owner.id !== selectedPartId) ?? null;
                  const selected = selectedMeshIndexSet.has(mesh.meshIndex);
                  const disabled = Boolean(ownerFromOtherPart) && !selected;

                  return (
                    <label
                      key={mesh.meshIndex}
                      className={`${styles.adminModelPartsEditor__meshItem} ${selected ? styles.adminModelPartsEditor__meshItemSelected : ''} ${
                        disabled ? styles.adminModelPartsEditor__meshItemDisabled : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={disabled || savePending || deletePending}
                        onChange={() => onToggleMeshSelection(mesh.meshIndex)}
                      />

                      <div className={styles.adminModelPartsEditor__meshItemMain}>
                        <span className={styles.adminModelPartsEditor__meshItemTitle}>{mesh.label}</span>
                        <span className={styles.adminModelPartsEditor__meshItemMeta}>
                          #{mesh.meshIndex}
                          {mesh.nodeName ? ` | узел: ${mesh.nodeName}` : ''}
                          {mesh.meshName && mesh.meshName !== mesh.nodeName
                            ? ` | меш: ${mesh.meshName}`
                            : ''}
                        </span>
                      </div>

                      {ownerFromOtherPart ? (
                        <span className={styles.adminModelPartsEditor__meshItemBadge}>
                          Занят: {getOwnerLabel(ownerFromOtherPart)}
                        </span>
                      ) : selected ? (
                        <span className={styles.adminModelPartsEditor__meshItemBadge}>Выбран</span>
                      ) : null}
                    </label>
                  );
                })
              )}
            </div>

            {fieldErrors.meshIndexes ? (
              <span className={styles.adminModelPartsEditor__fieldErrorText}>{fieldErrors.meshIndexes}</span>
            ) : (
              <span className={styles.adminModelPartsEditor__helperText}>{selectedMeshSummary}</span>
            )}
          </div>
        </div>

        {saveError ? <p className={styles.adminModelPartsEditor__error}>{saveError}</p> : null}
        {saveSuccess ? <p className={styles.adminModelPartsEditor__success}>{saveSuccess}</p> : null}

        <div className={styles.adminModelPartsEditor__actions}>
          <AppButton
            variant="primary"
            onClick={onSave}
            disabled={savePending || deletePending || meshCatalogLoading || meshCatalog.length === 0}
          >
            {savePending
              ? 'Сохранение...'
              : isEditMode
                ? 'Сохранить деталь'
                : 'Создать деталь'}
          </AppButton>

          {isEditMode ? (
            <AppButton
              variant="danger"
              onClick={onDelete}
              disabled={savePending || deletePending}
            >
              {deletePending ? 'Удаление...' : 'Удалить'}
            </AppButton>
          ) : null}
        </div>
      </div>
    </div>
  );
};
