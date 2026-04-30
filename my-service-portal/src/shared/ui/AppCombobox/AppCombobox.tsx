import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import styles from './AppCombobox.module.scss';

export interface AppComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type AppComboboxValue = string | string[];

interface AppComboboxProps {
  value: AppComboboxValue;
  options: ReadonlyArray<AppComboboxOption>;
  onChange: (nextValue: AppComboboxValue) => void;
  ariaLabel: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

const joinClassNames = (...classNames: Array<string | undefined | false>) => {
  return classNames.filter(Boolean).join(' ');
};

const normalizeSearchText = (value: string) => {
  return value.trim().toLowerCase();
};

export const AppCombobox = ({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Выберите значение',
  searchPlaceholder = 'Поиск...',
  emptyText = 'Ничего не найдено',
  multiple = false,
  disabled = false,
  className,
}: AppComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const selectedValues = useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : [];
    }

    return typeof value === 'string' && value ? [value] : [];
  }, [multiple, value]);

  const selectedOptions = useMemo(() => {
    const selectedSet = new Set(selectedValues);
    return options.filter((option) => selectedSet.has(option.value));
  }, [options, selectedValues]);

  const triggerLabel = useMemo(() => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }

    if (!multiple) {
      return selectedOptions[0].label;
    }

    if (selectedOptions.length === 1) {
      return selectedOptions[0].label;
    }

    return `Выбрано: ${selectedOptions.length}`;
  }, [multiple, placeholder, selectedOptions]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      return normalizeSearchText(option.label).includes(normalizedQuery);
    });
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onDocumentPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setQuery('');
        setIsOpen(false);
      }
    };

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQuery('');
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', onDocumentPointerDown);
    window.addEventListener('keydown', onDocumentKeyDown);

    return () => {
      window.removeEventListener('mousedown', onDocumentPointerDown);
      window.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      queryInputRef.current?.focus();
    }
  }, [isOpen]);

  const toggleOpen = () => {
    if (disabled) {
      return;
    }

    if (isOpen) {
      setQuery('');
    }

    setIsOpen((current) => !current);
  };

  const handleOptionSelect = (option: AppComboboxOption) => {
    if (option.disabled) {
      return;
    }

    if (!multiple) {
      onChange(option.value);
      setQuery('');
      setIsOpen(false);
      return;
    }

    const currentValues = Array.isArray(value) ? value : [];
    const isSelected = currentValues.includes(option.value);
    const nextValues = isSelected
      ? currentValues.filter((item) => item !== option.value)
      : [...currentValues, option.value];

    onChange(nextValues);
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  return (
    <div ref={rootRef} className={joinClassNames(styles.appCombobox, className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        className={joinClassNames(
          styles.appCombobox__trigger,
          isOpen && styles.appCombobox__triggerOpen,
          disabled && styles.appCombobox__triggerDisabled,
          selectedOptions.length === 0 && styles.appCombobox__triggerPlaceholder,
        )}
      >
        {triggerLabel}
      </button>
      <span className={styles.appCombobox__caret} aria-hidden="true" />

      {isOpen ? (
        <div className={styles.appCombobox__panel}>
          <input
            ref={queryInputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className={styles.appCombobox__search}
          />

          {filteredOptions.length > 0 ? (
            <ul id={listboxId} className={styles.appCombobox__list} role="listbox" aria-multiselectable={multiple || undefined}>
              {filteredOptions.map((option) => {
                const isSelected = selectedSet.has(option.value);

                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={joinClassNames(
                        styles.appCombobox__option,
                        isSelected && styles.appCombobox__optionSelected,
                        option.disabled && styles.appCombobox__optionDisabled,
                      )}
                      onClick={() => handleOptionSelect(option)}
                      disabled={option.disabled}
                    >
                      <span>{option.label}</span>
                      {isSelected ? <span className={styles.appCombobox__check}>✓</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.appCombobox__empty}>{emptyText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
};
