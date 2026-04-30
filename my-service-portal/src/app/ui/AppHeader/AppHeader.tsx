import { useEffect, useMemo, useState, type FocusEvent } from 'react';
import { NavLink, useNavigate, type NavLinkRenderProps } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { getEquipmentModelCatalog, type EquipmentModelInfo } from '@/entities/equipment';
import styles from './AppHeader.module.scss';

const getNavLinkClassName = ({ isActive }: NavLinkRenderProps) => {
  return isActive ? `${styles.appHeader__navLink} ${styles.appHeader__active}` : styles.appHeader__navLink;
};

const SEARCH_RESULTS_LIMIT = 8;
const TRIGRAM_SIZE = 3;
const TRIGRAM_MATCH_THRESHOLD = 0.34;

const normalizeSearchText = (value: string) => {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
};

const buildTrigramSet = (value: string) => {
  const normalized = normalizeSearchText(value);
  const trigrams = new Set<string>();

  if (normalized.length < TRIGRAM_SIZE) {
    return trigrams;
  }

  for (let index = 0; index <= normalized.length - TRIGRAM_SIZE; index += 1) {
    trigrams.add(normalized.slice(index, index + TRIGRAM_SIZE));
  }

  return trigrams;
};

const buildModelSearchIndex = (model: EquipmentModelInfo) => {
  return normalizeSearchText([
    model.title,
    model.description,
    model.categoryTitle ?? '',
    model.company ?? '',
    model.year ? String(model.year) : '',
    model.slug,
  ].join(' '));
};

const getTrigramMatchScore = (query: string, candidate: string) => {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedCandidate = normalizeSearchText(candidate);

  if (!normalizedQuery || !normalizedCandidate) {
    return 0;
  }

  if (normalizedQuery.length < TRIGRAM_SIZE) {
    const includeIndex = normalizedCandidate.indexOf(normalizedQuery);
    return includeIndex >= 0 ? 1 - includeIndex / Math.max(1, normalizedCandidate.length) : 0;
  }

  const queryTrigrams = buildTrigramSet(normalizedQuery);
  const candidateTrigrams = buildTrigramSet(normalizedCandidate);

  if (queryTrigrams.size === 0 || candidateTrigrams.size === 0) {
    return 0;
  }

  let overlap = 0;
  queryTrigrams.forEach((trigram) => {
    if (candidateTrigrams.has(trigram)) {
      overlap += 1;
    }
  });

  const baseScore = overlap / queryTrigrams.size;
  const startsWithBoost = normalizedCandidate.startsWith(normalizedQuery) ? 0.18 : 0;
  const includesBoost = normalizedCandidate.includes(normalizedQuery) ? 0.08 : 0;

  return baseScore + startsWithBoost + includesBoost;
};

export const AppHeader = () => {
  const navigate = useNavigate();
  const userRole = useAppSelector((state) => {
    return state.user.isAuth ? state.user.role : 'guest';
  });
  const isAuth = userRole !== 'guest';
  const canManageCatalog = userRole === 'admin';
  const canManageService = userRole === 'admin' || userRole === 'manager';
  const canWorkService = userRole === 'admin' || userRole === 'engineer';
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [catalogModels, setCatalogModels] = useState<EquipmentModelInfo[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogLoadFailed, setCatalogLoadFailed] = useState(false);

  useEffect(() => {
    let isAlive = true;

    const loadCatalogModels = async () => {
      setIsCatalogLoading(true);
      setCatalogLoadFailed(false);

      try {
        const models = await getEquipmentModelCatalog();

        if (!isAlive) {
          return;
        }

        setCatalogModels(models);
      } catch {
        if (!isAlive) {
          return;
        }

        setCatalogLoadFailed(true);
      } finally {
        if (isAlive) {
          setIsCatalogLoading(false);
        }
      }
    };

    void loadCatalogModels();

    return () => {
      isAlive = false;
    };
  }, []);

  const searchableModels = useMemo(() => {
    if (canManageCatalog) {
      return catalogModels;
    }

    return catalogModels.filter((model) => model.visibility === 'public');
  }, [canManageCatalog, catalogModels]);

  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);

    if (!normalizedQuery) {
      return [] as EquipmentModelInfo[];
    }

    const rankedModels = searchableModels
      .map((model) => {
        const score = getTrigramMatchScore(normalizedQuery, buildModelSearchIndex(model));
        return { model, score };
      })
      .filter(({ score }) => {
        if (normalizedQuery.length < TRIGRAM_SIZE) {
          return score > 0;
        }

        return score >= TRIGRAM_MATCH_THRESHOLD;
      })
      .sort((left, right) => right.score - left.score || left.model.title.localeCompare(right.model.title))
      .slice(0, SEARCH_RESULTS_LIMIT);

    return rankedModels.map(({ model }) => model);
  }, [searchQuery, searchableModels]);

  const shouldShowSearchDropdown = isSearchFocused && normalizeSearchText(searchQuery).length > 0;

  const handleSearchBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsSearchFocused(false);
  };

  const handleResultSelect = (modelSlug: string) => {
    setSearchQuery('');
    setIsSearchFocused(false);
    navigate(`/model/${encodeURIComponent(modelSlug)}`);
  };

  return (
    <header className={styles.appHeader__header}>
      <div className={styles.appHeader__brand}>
        <span className={styles.appHeader__brandMark} aria-hidden="true" />
        <div className={styles.appHeader__brandText}>
          <strong>Service Portal</strong>
          <span>3D inspection workspace</span>
        </div>
      </div>

      <div className={styles.appHeader__search} onBlur={handleSearchBlur}>
        <span className={styles.appHeader__searchIcon} aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          className={styles.appHeader__searchInput}
          placeholder="Поиск модели..."
          autoComplete="off"
          role="combobox"
          aria-label="Поиск модели"
          aria-expanded={shouldShowSearchDropdown}
          aria-controls="app-header-search-results"
        />

        {shouldShowSearchDropdown ? (
          <div className={styles.appHeader__searchDropdown}>
            {isCatalogLoading ? (
              <div className={styles.appHeader__searchState}>Загрузка моделей...</div>
            ) : catalogLoadFailed ? (
              <div className={styles.appHeader__searchState}>Не удалось загрузить справочник.</div>
            ) : searchResults.length > 0 ? (
              <ul id="app-header-search-results" className={styles.appHeader__searchResults} role="listbox">
                {searchResults.map((model) => (
                  <li key={model.id} role="option">
                    <button
                      type="button"
                      className={styles.appHeader__searchResultButton}
                      onClick={() => handleResultSelect(model.slug)}
                    >
                      <span>{model.title}</span>
                      <small>{model.categoryTitle ?? 'Без категории'}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.appHeader__searchState}>По запросу ничего не найдено.</div>
            )}
          </div>
        ) : null}
      </div>

      <nav className={styles.appHeader__nav} aria-label="Основная навигация">
        <NavLink to="/catalog" className={getNavLinkClassName}>
          Справочник
        </NavLink>
        {canWorkService ? (
          <NavLink to="/service-workspace" className={getNavLinkClassName}>
            Работы
          </NavLink>
        ) : null}
        {canManageService ? (
          <>
            <NavLink to="/admin/service" end className={getNavLinkClassName}>
              Сервис
            </NavLink>
            <NavLink to="/admin/service/report" className={getNavLinkClassName}>
              Отчет
            </NavLink>
          </>
        ) : null}
        {canManageCatalog ? (
          <>
            <NavLink to="/admin" end className={getNavLinkClassName}>
              Админка
            </NavLink>
          </>
        ) : null}
        <NavLink to="/account" className={getNavLinkClassName}>
          {isAuth ? 'Аккаунт' : 'Войти'}
        </NavLink>
      </nav>
    </header>
  );
};
