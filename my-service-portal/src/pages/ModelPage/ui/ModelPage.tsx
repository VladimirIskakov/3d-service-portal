import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EquipmentScene } from '@/entities/equipment';
import { SceneToolbar } from '@/features/scene-controls';
import { AppSkeletonText, AppSpinner, CanvasLayout } from '@/shared/ui';
import { useModelPageController } from '../model/useModelPageController';
import styles from './ModelPage.module.scss';

export const ModelPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const controller = useModelPageController({ slug });

  const isModelLoading = controller.loading && !controller.error;

  const partInfoTitle = controller.isDisassemblyMode ? 'Шаг разборки' : 'Выбранная деталь';

  const partInfoContent: ReactNode = isModelLoading ? (
    <AppSkeletonText className={styles.modelPage__loadingTextGroup} lines={['wide', 'normal']} aria-hidden="true" />
  ) : controller.isDisassemblyMode ? (
    controller.activeDisassemblyStep ? (
      <>
        <p className={styles.modelPage__partTitle}>{controller.activeDisassemblyStep.title || 'Шаг разборки'}</p>
        <p>{controller.activeDisassemblyStep.description || 'Описание шага пока не заполнено.'}</p>
      </>
    ) : (
      <p>Для этой модели шаги разборки пока не настроены.</p>
    )
  ) : controller.selectedPart ? (
    <>
      <p className={styles.modelPage__partTitle}>{controller.selectedPart.title}</p>
      <p>{controller.selectedPart.description}</p>
    </>
  ) : (
    <p>
      {controller.model?.hasAsset
        ? 'Кликни по детали на модели, чтобы увидеть описание.'
        : 'Для этой модели пока не загружен 3D-файл.'}
    </p>
  );

  const detailedDescriptionLines = useMemo(() => {
    return (controller.model?.deviceDescription ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [controller.model?.deviceDescription]);

  const specifications = controller.model?.specifications ?? [];
  const modelHeaderBadges = useMemo(() => {
    if (!controller.model) {
      return [] as string[];
    }

    const badges: string[] = [];

    if (controller.model.categoryTitle) {
      badges.push(controller.model.categoryTitle);
    }

    if (controller.model.company) {
      badges.push(controller.model.company);
    }

    if (controller.model.year) {
      badges.push(String(controller.model.year));
    }

    return badges;
  }, [controller.model]);

  const sceneContent = controller.loading ? (
    <div className={styles.modelPage__canvasFallback}>
      <AppSpinner aria-hidden="true" />
      <p className={styles.modelPage__canvasFallbackTitle}>Загрузка модели...</p>
    </div>
  ) : controller.error ? (
    <div className={styles.modelPage__canvasFallback}>
      <p className={styles.modelPage__canvasFallbackTitle}>Ошибка</p>
      <p>{controller.error}</p>
      <Link to="/catalog" className={styles.modelPage__catalogBackLink}>Вернуться в справочник</Link>
    </div>
  ) : controller.model?.assetUrl ? (
    <CanvasLayout controlsRef={controller.controlsRef} onReset={controller.resetFocus}>
      <EquipmentScene
        modelSlug={controller.model.slug}
        modelUrl={controller.model.assetUrl}
        partCatalog={controller.partCatalog}
        exploded={controller.effectiveExploded}
        explodedPartIds={controller.disassemblyExplodedPartIds}
        explosionSettings={controller.explosionSettings}
        controlsRef={controller.controlsRef}
        selectedPartId={controller.effectiveSelectedPartId}
        onSelectPart={controller.setSelectedPart}
        onPartCentersComputed={controller.setPartCentersById}
        onMeshCentersComputed={controller.setMeshCentersByIndex}
      />
    </CanvasLayout>
  ) : (
    <div className={styles.modelPage__canvasFallback}>
      <p className={styles.modelPage__canvasFallbackTitle}>{controller.model?.title ?? 'Модель недоступна'}</p>
      <p>3D-файл для этой модели пока не загружен на сервер.</p>
      <Link to="/catalog" className={styles.modelPage__catalogBackLink}>Вернуться в справочник</Link>
    </div>
  );

  const renderPartInfoCard = (cardClassName: string) => (
    <div className={`${styles.modelPage__partInfoCard} ${cardClassName}`}>
      <div className={styles.modelPage__disassemblyControls}>
        <button
          type="button"
          className={styles.modelPage__disassemblyToggleButton}
          onClick={controller.handleToggleDisassemblyMode}
          disabled={controller.loading || !controller.model?.hasAsset}
        >
          {controller.isDisassemblyMode ? 'Выключить шаги' : 'Режим разборки'}
        </button>
        {controller.isDisassemblyMode ? (
          <div className={styles.modelPage__disassemblyStepControls}>
            <button
              type="button"
              className={styles.modelPage__disassemblyStepButton}
              onClick={() => controller.handleDisassemblyStepChange(-1)}
              disabled={controller.disassemblyStepIndex <= 0 || controller.disassemblySteps.length === 0}
            >
              Назад
            </button>
            <span className={styles.modelPage__disassemblyStepLabel}>
              {controller.disassemblySteps.length > 0
                ? `Шаг ${controller.disassemblyStepIndex + 1}/${controller.disassemblySteps.length}`
                : 'Нет шагов'}
            </span>
            <button
              type="button"
              className={styles.modelPage__disassemblyStepButton}
              onClick={() => controller.handleDisassemblyStepChange(1)}
              disabled={
                controller.disassemblyStepIndex >= controller.disassemblySteps.length - 1
                || controller.disassemblySteps.length === 0
              }
            >
              Далее
            </button>
          </div>
        ) : null}
      </div>

      <h3>{partInfoTitle}</h3>
      {partInfoContent}
    </div>
  );

  const renderViewportSection = (fullscreenMode: boolean) => (
    <section
      className={
        fullscreenMode
          ? `${styles.modelPage__viewportSection} ${styles.modelPage__fullscreen}`
          : styles.modelPage__viewportSection
      }
    >
      <SceneToolbar
        isExploded={controller.effectiveExploded}
        onToggleExplode={controller.toggleExplode}
        onResetFocus={controller.resetFocus}
        isFullscreen={controller.isFullscreen}
        onToggleFullscreen={controller.toggleFullscreen}
      />

      {sceneContent}

      {fullscreenMode ? renderPartInfoCard(styles.modelPage__partInfoCardOverlay) : null}
    </section>
  );

  return (
    <div className={styles.modelPage__modelPageContainer}>
      {!controller.isFullscreen ? (
        <div className={styles.modelPage__viewportColumn}>
          <div className={styles.modelPage__modelHeaderCard}>
            <div>
              {isModelLoading ? (
                <AppSkeletonText className={styles.modelPage__loadingTextGroup} lines={['wide', 'short']} aria-hidden="true" />
              ) : (
                <>
                  <h1 className={styles.modelPage__modelTitle}>{controller.model?.title ?? 'Модель'}</h1>
                  {modelHeaderBadges.length > 0 ? (
                    <div className={styles.modelPage__modelHeaderMetaRow}>
                      {modelHeaderBadges.map((badge) => (
                        <span key={badge} className={styles.modelPage__modelHeaderMetaBadge}>{badge}</span>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <Link to="/catalog" className={styles.modelPage__modelHeaderLink}>
              Вернуться в справочник
            </Link>
          </div>

          {renderViewportSection(false)}
          {renderPartInfoCard(styles.modelPage__partInfoCardInline)}
        </div>
      ) : null}

      {controller.isFullscreen ? renderViewportSection(true) : null}

      {!controller.isFullscreen ? (
        <aside className={styles.modelPage__infoSection}>
          <section className={styles.modelPage__infoCard}>
            <h2>Описание устройства</h2>
            {isModelLoading ? (
              <AppSkeletonText className={styles.modelPage__loadingTextGroup} lines={['wide', 'wide', 'normal']} aria-hidden="true" />
            ) : controller.error ? (
              <p className={styles.modelPage__mutedText}>Данные модели пока недоступны.</p>
            ) : detailedDescriptionLines.length > 0 ? (
              <div className={styles.modelPage__sectionText}>
                {detailedDescriptionLines.map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}
              </div>
            ) : (
              <p className={styles.modelPage__mutedText}>Подробное описание пока не заполнено.</p>
            )}
          </section>

          <section className={styles.modelPage__infoCard}>
            <h2>Характеристики</h2>
            {isModelLoading ? (
              <AppSkeletonText className={styles.modelPage__loadingTextGroup} lines={['wide', 'normal', 'short']} aria-hidden="true" />
            ) : controller.error ? (
              <p className={styles.modelPage__mutedText}>Данные модели пока недоступны.</p>
            ) : specifications.length > 0 ? (
              <dl className={styles.modelPage__specList}>
                {specifications.map((spec) => (
                  <div key={spec.id} className={styles.modelPage__specRow}>
                    <dt className={styles.modelPage__specName}>{spec.label}</dt>
                    <dd className={styles.modelPage__specValue}>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className={styles.modelPage__mutedText}>Характеристики пока не заполнены.</p>
            )}
          </section>
        </aside>
      ) : null}
    </div>
  );
};

