import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EquipmentPreviewCanvas,
  getEquipmentCategories,
  getEquipmentModelCatalog,
  type EquipmentCardPreviewKind,
  type EquipmentCatalogCategory,
  type EquipmentModelInfo,
} from '@/entities/equipment';
import { AppSegmentedControl, AppSkeletonText, AppSpinner, type AppSegmentedOption } from '@/shared/ui';
import styles from './CatalogPage.module.scss';

const getPreviewBadgeLabel = (previewKind: EquipmentCardPreviewKind) => {
  if (previewKind === 'model') {
    return '3D';
  }

  if (previewKind === 'image') {
    return 'Изображение';
  }

  return 'Без превью';
};

export const CatalogPage = () => {
  const [models, setModels] = useState<EquipmentModelInfo[]>([]);
  const [categories, setCategories] = useState<EquipmentCatalogCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [modelsItems, categoryItems] = await Promise.all([
          getEquipmentModelCatalog(),
          getEquipmentCategories().catch(() => []),
        ]);

        if (!isMounted) {
          return;
        }

        setModels(modelsItems);
        setCategories(categoryItems);
      } catch {
        if (isMounted) {
          setError('Не удалось загрузить каталог моделей.');
          setModels([]);
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    models.forEach((model) => {
      const key = model.categoryId ?? 'uncategorized';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return counts;
  }, [models]);

  const categoryOptions = useMemo(() => {
    const uncategorizedCount = categoryCounts.get('uncategorized') ?? 0;

    const base = [
      {
        id: 'all',
        title: 'Все',
        count: models.length,
      },
      ...categories
        .map((category) => ({
          id: category.id,
          title: category.title,
          count: categoryCounts.get(category.id) ?? 0,
        }))
        .filter((category) => category.count > 0),
    ];

    if (uncategorizedCount > 0) {
      base.push({
        id: 'uncategorized',
        title: 'Без категории',
        count: uncategorizedCount,
      });
    }

    return base;
  }, [categories, categoryCounts, models.length]);

  const filteredModels = useMemo(() => {
    if (activeCategoryId === 'all') {
      return models;
    }

    if (activeCategoryId === 'uncategorized') {
      return models.filter((model) => !model.categoryId);
    }

    return models.filter((model) => model.categoryId === activeCategoryId);
  }, [activeCategoryId, models]);

  const categoryTabOptions = useMemo<AppSegmentedOption<string>[]>(() => {
    return categoryOptions.map((category) => ({
      value: category.id,
      label: (
        <>
          <span>{category.title}</span>
          <span className={styles.catalogPage__categoryTabCount}>{category.count}</span>
        </>
      ),
    }));
  }, [categoryOptions]);

  if (loading) {
    return (
      <section className={styles.catalogPage__page}>
        <header className={styles.catalogPage__header}>
          <AppSkeletonText
            className={styles.catalogPage__loadingTextGroup}
            lines={['wide', 'normal']}
            aria-hidden="true"
          />
        </header>

        <div className={styles.catalogPage__grid} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`skeleton-${index}`} className={`${styles.catalogPage__card} ${styles.catalogPage__cardSkeleton}`}>
              <div className={styles.catalogPage__previewWrap}>
                <div className={styles.catalogPage__previewSkeleton}>
                  <AppSpinner aria-hidden="true" />
                </div>
              </div>

              <div className={styles.catalogPage__cardBody}>
                <AppSkeletonText lines={['wide', 'normal', 'short']} aria-hidden="true" />
              </div>

              <div className={styles.catalogPage__cardFooter}>
                <AppSkeletonText lines={['short']} aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.catalogPage__page}>
        <div className={styles.catalogPage__stateWrap}>
          <div className={`${styles.catalogPage__stateCard} ${styles.catalogPage__errorState}`}>
            <div className={styles.catalogPage__stateTextGroup}>
              <h2 className={styles.catalogPage__stateTitle}>Ошибка загрузки</h2>
              <p className={styles.catalogPage__stateText}>{error}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.catalogPage__page}>
      <header className={styles.catalogPage__header}>
        <h1>Каталог моделей</h1>
        <p>Выберите карточку, чтобы открыть страницу просмотра модели.</p>

        {categoryOptions.length > 1 ? (
          <AppSegmentedControl
            value={activeCategoryId}
            options={categoryTabOptions}
            onChange={setActiveCategoryId}
            ariaLabel="Категории каталога"
            className={styles.catalogPage__categoryTabs}
            buttonClassName={styles.catalogPage__categoryTab}
            activeButtonClassName={styles.catalogPage__categoryTabActive}
          />
        ) : null}
      </header>

      {models.length === 0 ? (
        <div className={styles.catalogPage__stateWrap}>
          <div className={styles.catalogPage__stateCard}>
            <div className={styles.catalogPage__stateTextGroup}>
              <h2 className={styles.catalogPage__stateTitle}>Каталог пуст</h2>
              <p className={styles.catalogPage__stateText}>Пока не создано ни одной модели, которую можно открыть.</p>
            </div>
          </div>
        </div>
      ) : null}

      {models.length > 0 && filteredModels.length === 0 ? (
        <div className={styles.catalogPage__stateWrap}>
          <div className={styles.catalogPage__stateCard}>
            <div className={styles.catalogPage__stateTextGroup}>
              <h2 className={styles.catalogPage__stateTitle}>Нет моделей в категории</h2>
              <p className={styles.catalogPage__stateText}>Выберите другую категорию или добавьте модель в текущую.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.catalogPage__grid}>
        {filteredModels.map((model) => (
          <Link key={model.slug} to={`/model/${model.slug}`} className={styles.catalogPage__card} aria-label={`Открыть модель ${model.title}`}>
            <div className={styles.catalogPage__previewWrap}>
              <div
                className={`${styles.catalogPage__previewBadge} ${
                  model.previewKind === 'model'
                    ? styles.catalogPage__previewBadgeReady
                    : model.previewKind === 'image'
                      ? styles.catalogPage__previewBadgeImage
                      : styles.catalogPage__previewBadgeEmpty
                }`}
              >
                {getPreviewBadgeLabel(model.previewKind)}
              </div>

              {model.categoryTitle ? <div className={styles.catalogPage__cardCategory}>{model.categoryTitle}</div> : null}

              {model.previewKind === 'model' && model.previewUrl ? (
                <EquipmentPreviewCanvas modelUrl={model.previewUrl} cameraSettings={model.previewCamera} />
              ) : model.previewKind === 'image' && model.previewUrl ? (
                <img className={styles.catalogPage__previewImage} src={model.previewUrl} alt="" loading="lazy" decoding="async" />
              ) : (
                <div className={styles.catalogPage__previewPlaceholder}>
                  <span>Превью не загружено</span>
                </div>
              )}
            </div>

            <div className={styles.catalogPage__cardBody}>
              <h2 className={styles.catalogPage__cardTitle}>{model.title}</h2>
              <p className={styles.catalogPage__cardDescription}>{model.description?.trim() || 'Описание модели пока не заполнено.'}</p>
            </div>

            <div className={styles.catalogPage__cardFooter}>
              <span className={styles.catalogPage__cardAction}>Открыть модель</span>
              <span className={styles.catalogPage__cardArrow} aria-hidden="true">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};


