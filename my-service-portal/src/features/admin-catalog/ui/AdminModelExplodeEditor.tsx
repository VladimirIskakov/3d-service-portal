import { RotateCcw } from 'lucide-react';
import { EquipmentScene } from '@/entities/equipment';
import { SceneToolbar } from '@/features/scene-controls';
import { AppButton, CanvasLayout } from '@/shared/ui';
import { EXPLODE_FIELD_META } from '../model/explodeEditorConfig';
import { useAdminExplodeController } from '../model/useAdminExplodeController';
import { AdminExplodeSettingsPanel } from './explode/AdminExplodeSettingsPanel';
import styles from './AdminModelExplodeEditor.module.scss';

interface Props {
  modelSlug: string;
}

export const AdminModelExplodeEditor = ({ modelSlug }: Props) => {
  const controller = useAdminExplodeController({ modelSlug });

  return (
    <div className={styles.adminModelExplodeEditor__root}>
      <div className={styles.adminModelExplodeEditor__layout}>
        <AdminExplodeSettingsPanel
          fieldMeta={EXPLODE_FIELD_META}
          settings={controller.settings}
          fieldErrors={controller.fieldErrors}
          savePending={controller.savePending}
          saveError={controller.saveError}
          saveSuccess={controller.saveSuccess}
          error={controller.error}
          onFieldChange={controller.handleFieldChange}
          onReset={controller.resetSettings}
          onSave={() => void controller.handleSaveSettings()}
        />

        <div className={styles.adminModelExplodeEditor__previewCard}>
          <div className={styles.adminModelExplodeEditor__previewHeader}>
            <div>
              <h3 className={styles.adminModelExplodeEditor__title}>Предпросмотр разлёта</h3>
              <p className={styles.adminModelExplodeEditor__subtitle}>Проверьте поведение модели с текущими настройками.</p>
            </div>
          </div>

          <div className={styles.adminModelExplodeEditor__previewCanvasWrap}>
            {controller.loading ? (
              <div className={styles.adminModelExplodeEditor__previewPlaceholder}>Загрузка модели...</div>
            ) : !controller.hasAsset || !controller.modelUrl ? (
              <div className={styles.adminModelExplodeEditor__previewPlaceholder}>У модели нет 3D-файла для предпросмотра.</div>
            ) : (
              <>
                <SceneToolbar
                  isExploded={controller.previewExploded}
                  onToggleExplode={() => controller.setPreviewExploded((value) => !value)}
                  onResetFocus={controller.resetCamera}
                  isFullscreen={false}
                  onToggleFullscreen={() => undefined}
                  showFullscreen={false}
                />

                <CanvasLayout controlsRef={controller.controlsRef} onReset={controller.resetCamera}>
                  <EquipmentScene
                    key={`${modelSlug}:${controller.sceneRevision}`}
                    modelSlug={modelSlug}
                    modelUrl={controller.modelUrl}
                    exploded={controller.previewExploded}
                    explosionSettings={controller.settings}
                    controlsRef={controller.controlsRef}
                    selectedPartId={controller.selectedPart?.id ?? null}
                    silhouetteOverrideByPartId={controller.silhouettePreviewOverride}
                    onSelectPart={controller.setSelectedPart}
                  />
                </CanvasLayout>
              </>
            )}
          </div>

          <div className={styles.adminModelExplodeEditor__subsection}>
            <div className={styles.adminModelExplodeEditor__subsectionHeader}>
              <h4 className={styles.adminModelExplodeEditor__subsectionTitle}>Силуэт детали</h4>
              {controller.selectedPart ? (
                <span className={styles.adminModelExplodeEditor__subsectionMeta}>{controller.selectedPart.title}</span>
              ) : null}
            </div>
            <div className={styles.adminModelExplodeEditor__subsectionBody}>
              {!controller.selectedPart ? (
                <div className={styles.adminModelExplodeEditor__silhouettePlaceholder}>
                  <p className={styles.adminModelExplodeEditor__fieldHint}>Выберите деталь на превью, чтобы настроить силуэт.</p>
                </div>
              ) : (
                <>
                  <div className={styles.adminModelExplodeEditor__inlineFields}>
                    <label className={styles.adminModelExplodeEditor__toggleRow}>
                      <span>Рисовать рёбра силуэта</span>
                      <span className={styles.adminModelExplodeEditor__toggleControl}>
                        <input
                          type="checkbox"
                          checked={controller.silhouetteSettings.showEdges}
                          onChange={controller.handleSilhouetteShowEdgesChange}
                        />
                        <span className={styles.adminModelExplodeEditor__toggleTrack} aria-hidden="true">
                          <span className={styles.adminModelExplodeEditor__toggleThumb} />
                        </span>
                      </span>
                    </label>

                    <label className={`${styles.adminModelExplodeEditor__field} ${controller.silhouetteErrors.opacity ? styles.adminModelExplodeEditor__fieldInvalid : ''}`}>
                      <span>Прозрачность</span>
                      <input
                        type="number"
                        value={controller.silhouetteSettings.opacity}
                        onChange={controller.handleSilhouetteChange('opacity')}
                        step={0.01}
                        min={0}
                        max={1}
                      />
                      {controller.silhouetteErrors.opacity ? (
                        <small className={styles.adminModelExplodeEditor__fieldError}>{controller.silhouetteErrors.opacity}</small>
                      ) : (
                        <small className={styles.adminModelExplodeEditor__fieldHint}>0..1</small>
                      )}
                    </label>

                    <label className={`${styles.adminModelExplodeEditor__field} ${controller.silhouetteErrors.edgeThresholdAngle ? styles.adminModelExplodeEditor__fieldInvalid : ''}`}>
                      <span>Порог рёбер (°)</span>
                      <input
                        type="number"
                        value={controller.silhouetteSettings.edgeThresholdAngle}
                        onChange={controller.handleSilhouetteChange('edgeThresholdAngle')}
                        step={1}
                        min={0}
                        max={180}
                      />
                      {controller.silhouetteErrors.edgeThresholdAngle ? (
                        <small className={styles.adminModelExplodeEditor__fieldError}>{controller.silhouetteErrors.edgeThresholdAngle}</small>
                      ) : (
                        <small className={styles.adminModelExplodeEditor__fieldHint}>0..180</small>
                      )}
                    </label>
                  </div>

                  <div className={styles.adminModelExplodeEditor__actions}>
                    <AppButton
                      variant="secondary"
                      iconOnly
                      className={styles.adminModelExplodeEditor__iconButton}
                      onClick={controller.handleResetSilhouette}
                      disabled={controller.silhouetteSavePending}
                      title="Сбросить параметры силуэта"
                      aria-label="Сбросить параметры силуэта"
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                    </AppButton>
                    <AppButton
                      variant="primary"
                      onClick={() => void controller.handleSaveSilhouette()}
                      disabled={controller.silhouetteSavePending}
                    >
                      {controller.silhouetteSavePending ? 'Сохраняем...' : 'Сохранить силуэт'}
                    </AppButton>
                  </div>

                  {controller.silhouetteSaveError ? <p className={styles.adminModelExplodeEditor__error}>{controller.silhouetteSaveError}</p> : null}
                  {controller.silhouetteSaveSuccess ? <p className={styles.adminModelExplodeEditor__success}>{controller.silhouetteSaveSuccess}</p> : null}
                </>
              )}
            </div>
          </div>

          <p className={styles.adminModelExplodeEditor__previewHint}>
            Если вид разлёта не подходит, измените параметры слева. После сохранения модель начнёт использовать новые настройки.
          </p>
        </div>
      </div>
    </div>
  );
};
