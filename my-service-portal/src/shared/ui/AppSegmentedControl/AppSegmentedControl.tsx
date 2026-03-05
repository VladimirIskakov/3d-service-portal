import { type ReactNode } from 'react';
import styles from './AppSegmentedControl.module.scss';

export interface AppSegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

interface AppSegmentedControlProps<T extends string> {
  value: T;
  options: ReadonlyArray<AppSegmentedOption<T>>;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  activeButtonClassName?: string;
}

const joinClassNames = (...classNames: Array<string | undefined>) => {
  return classNames.filter(Boolean).join(' ');
};

export const AppSegmentedControl = <T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  buttonClassName,
  activeButtonClassName,
}: AppSegmentedControlProps<T>) => {
  const useDefaultContainerStyle = !className;
  const useDefaultButtonStyle = !buttonClassName;
  const useDefaultActiveButtonStyle = !activeButtonClassName;

  return (
    <div
      className={joinClassNames(
        useDefaultContainerStyle ? styles.appSegmentedControl : undefined,
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={option.disabled}
            className={joinClassNames(
              useDefaultButtonStyle ? styles.appSegmentedControl__button : undefined,
              buttonClassName,
              isActive && useDefaultActiveButtonStyle ? styles['appSegmentedControl__button--active'] : undefined,
              isActive ? activeButtonClassName : undefined,
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
