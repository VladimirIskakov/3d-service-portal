import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  EquipmentPreviewCanvas,
  getEquipmentCategories,
  getEquipmentModelCatalog,
  type EquipmentCardPreviewKind,
  type EquipmentCatalogCategory,
  type EquipmentModelInfo,
} from '@/entities/equipment';
import { AppCombobox, AppSkeletonText, AppSpinner, type AppComboboxOption } from '@/shared/ui';
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
  const [activeCompanies, setActiveCompanies] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<{ from: number; to: number } | null>(null);
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
        title: 'Все категории',
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

  const categoryComboboxOptions = useMemo<AppComboboxOption[]>(() => {
    return categoryOptions.map((category) => ({
      value: category.id,
      label: `${category.title} (${category.count})`,
    }));
  }, [categoryOptions]);

  const companyOptions = useMemo(() => {
    return Array.from(
      new Set(
        models
          .map((model) => model.company)
          .filter((company): company is string => Boolean(company && company.trim())),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [models]);

  const companyComboboxOptions = useMemo<AppComboboxOption[]>(() => {
    return companyOptions.map((company) => ({ value: company, label: company }));
  }, [companyOptions]);

  const yearRangeOptions = useMemo(() => {
    return Array.from(
      new Set(models.map((model) => model.year).filter((year): year is number => Number.isInteger(year))),
    ).sort((left, right) => left - right);
  }, [models]);

  const minYearBound = yearRangeOptions[0] ?? null;
  const maxYearBound = yearRangeOptions.length > 0 ? yearRangeOptions[yearRangeOptions.length - 1] : null;

  useEffect(() => {
    if (!categoryOptions.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId('all');
    }
  }, [activeCategoryId, categoryOptions]);

  useEffect(() => {
    setActiveCompanies((current) => current.filter((company) => companyOptions.includes(company)));
  }, [companyOptions]);

  useEffect(() => {
    if (minYearBound === null || maxYearBound === null) {
      setYearRange(null);
      return;
    }

    setYearRange((current) => {
      if (!current) {
        return { from: minYearBound, to: maxYearBound };
      }

      const nextFrom = Math.min(Math.max(current.from, minYearBound), maxYearBound);
      const nextTo = Math.max(Math.min(current.to, maxYearBound), minYearBound);

      if (nextFrom > nextTo) {
        return { from: minYearBound, to: maxYearBound };
      }

      if (nextFrom === current.from && nextTo === current.to) {
        return current;
      }

      return { from: nextFrom, to: nextTo };
    });
  }, [maxYearBound, minYearBound]);

  const hasYearFilter = useMemo(() => {
    if (!yearRange || minYearBound === null || maxYearBound === null) {
      return false;
    }

    return yearRange.from !== minYearBound || yearRange.to !== maxYearBound;
  }, [maxYearBound, minYearBound, yearRange]);

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      if (activeCategoryId === 'uncategorized' && model.categoryId) {
        return false;
      }

      if (activeCategoryId !== 'all' && activeCategoryId !== 'uncategorized' && model.categoryId !== activeCategoryId) {
        return false;
      }

      if (activeCompanies.length > 0 && (!model.company || !activeCompanies.includes(model.company))) {
        return false;
      }

      if (hasYearFilter && yearRange) {
        if (!Number.isInteger(model.year)) {
          return false;
        }

        const modelYear = Number(model.year);
        if (modelYear < yearRange.from || modelYear > yearRange.to) {
          return false;
        }
      }

      return true;
    });
  }, [activeCategoryId, activeCompanies, hasYearFilter, models, yearRange]);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = [];

    if (activeCategoryId !== 'all') {
      const categoryLabel = categoryOptions.find((category) => category.id === activeCategoryId)?.title ?? 'Категория';
      chips.push({ key: 'category', label: `Категория: ${categoryLabel}` });
    }

    activeCompanies.forEach((company) => {
      chips.push({ key: `company:${company}`, label: `Компания: ${company}` });
    });

    if (hasYearFilter && yearRange) {
      chips.push({ key: 'year', label: `Год: ${yearRange.from} - ${yearRange.to}` });
    }

    return chips;
  }, [activeCategoryId, activeCompanies, categoryOptions, hasYearFilter, yearRange]);

  const hasActiveFilters = activeFilterChips.length > 0;

  const handleClearFilterChip = (key: string) => {
    if (key === 'category') {
      setActiveCategoryId('all');
      return;
    }

    if (key === 'year') {
      if (minYearBound !== null && maxYearBound !== null) {
        setYearRange({ from: minYearBound, to: maxYearBound });
      }
      return;
    }

    if (key.startsWith('company:')) {
      const company = key.slice('company:'.length);
      setActiveCompanies((current) => current.filter((item) => item !== company));
    }
  };

  const handleYearFromChange = (nextValue: number) => {
    if (!yearRange || minYearBound === null) {
      return;
    }

    const from = Math.max(minYearBound, Math.min(nextValue, yearRange.to));
    setYearRange((current) => (current ? { ...current, from } : current));
  };

  const handleYearToChange = (nextValue: number) => {
    if (!yearRange || maxYearBound === null) {
      return;
    }

    const to = Math.min(maxYearBound, Math.max(nextValue, yearRange.from));
    setYearRange((current) => (current ? { ...current, to } : current));
  };

  const yearSliderRangeStyle = useMemo<CSSProperties>(() => {
    if (!yearRange || minYearBound === null || maxYearBound === null || minYearBound === maxYearBound) {
      return {};
    }

    const distance = maxYearBound - minYearBound;
    const start = ((yearRange.from - minYearBound) / distance) * 100;
    const end = ((yearRange.to - minYearBound) / distance) * 100;

    return {
      left: `${start}%`,
      width: `${Math.max(end - start, 0)}%`,
    };
  }, [maxYearBound, minYearBound, yearRange]);

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
      </header>

      <div className={styles.catalogPage__layout}>
        <aside className={styles.catalogPage__filtersSidebar}>
          <h2 className={styles.catalogPage__filtersTitle}>Фильтры</h2>

          <div className={styles.catalogPage__filterSection}>
            <label className={styles.catalogPage__filterField}>
              <span>Категория</span>
              <AppCombobox
                value={activeCategoryId}
                options={categoryComboboxOptions}
                onChange={(nextValue) => setActiveCategoryId(typeof nextValue === 'string' ? nextValue : 'all')}
                ariaLabel="Выбор категории"
                placeholder="Все категории"
                searchPlaceholder="Найти категорию"
              />
            </label>
          </div>

          <div className={styles.catalogPage__filterSection}>
            <label className={styles.catalogPage__filterField}>
              <span>Компании</span>
              <AppCombobox
                value={activeCompanies}
                options={companyComboboxOptions}
                onChange={(nextValue) => setActiveCompanies(Array.isArray(nextValue) ? nextValue : [])}
                ariaLabel="Выбор компаний"
                placeholder="Все компании"
                searchPlaceholder="Найти компанию"
                multiple
                disabled={companyComboboxOptions.length === 0}
                emptyText="Компании не найдены"
              />
            </label>
          </div>

          <div className={styles.catalogPage__filterSection}>
            <h3 className={styles.catalogPage__filterLabel}>Диапазон годов</h3>
            {yearRange && minYearBound !== null && maxYearBound !== null ? (
              <div className={styles.catalogPage__yearRangeControl}>
                <div className={styles.catalogPage__yearRangeValue}>
                  <span>{yearRange.from}</span>
                  <span>{yearRange.to}</span>
                </div>

                <div className={styles.catalogPage__yearSliderWrap}>
                  <div className={styles.catalogPage__yearSliderTrack} aria-hidden="true" />
                  <div className={styles.catalogPage__yearSliderSelected} style={yearSliderRangeStyle} aria-hidden="true" />
                  <input
                    type="range"
                    min={minYearBound}
                    max={maxYearBound}
                    value={yearRange.from}
                    onChange={(event) => handleYearFromChange(Number(event.target.value))}
                    className={`${styles.catalogPage__yearSlider} ${styles.catalogPage__yearSliderFrom}`}
                    aria-label="Год от"
                  />
                  <input
                    type="range"
                    min={minYearBound}
                    max={maxYearBound}
                    value={yearRange.to}
                    onChange={(event) => handleYearToChange(Number(event.target.value))}
                    className={`${styles.catalogPage__yearSlider} ${styles.catalogPage__yearSliderTo}`}
                    aria-label="Год до"
                  />
                </div>

                <div className={styles.catalogPage__yearRangeBounds}>
                  <span>{minYearBound}</span>
                  <span>{maxYearBound}</span>
                </div>
              </div>
            ) : (
              <p className={styles.catalogPage__yearRangeEmpty}>Нет данных по годам.</p>
            )}
          </div>
        </aside>

        <div className={styles.catalogPage__content}>
          {hasActiveFilters ? (
            <div className={styles.catalogPage__activeFilters}>
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className={styles.catalogPage__activeFilterChip}
                  onClick={() => handleClearFilterChip(chip.key)}
                >
                  <span>{chip.label}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}

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
                  <h2 className={styles.catalogPage__stateTitle}>Нет моделей по выбранным фильтрам</h2>
                  <p className={styles.catalogPage__stateText}>Смени фильтры или сбрось дополнительные условия.</p>
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
                  {(model.company || model.year) ? (
                    <div className={styles.catalogPage__cardMeta}>
                      {model.company ? <span className={styles.catalogPage__cardMetaBadge}>{model.company}</span> : null}
                      {model.year ? <span className={styles.catalogPage__cardMetaBadge}>{model.year}</span> : null}
                    </div>
                  ) : null}
                </div>

                <div className={styles.catalogPage__cardFooter}>
                  <span className={styles.catalogPage__cardAction}>Открыть модель</span>
                  <span className={styles.catalogPage__cardArrow} aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
