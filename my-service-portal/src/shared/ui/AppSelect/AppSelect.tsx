import { forwardRef, type SelectHTMLAttributes } from 'react';
import styles from './AppSelect.module.scss';

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  className?: string;
  invalid?: boolean;
};

export const AppSelect = forwardRef<HTMLSelectElement, SelectProps>(function AppSelect(
  { className, invalid = false, children, ...props },
  ref,
) {
  const classNames = [
    styles.appSelect__select,
    invalid ? styles.appSelect__invalid : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <select ref={ref} className={classNames} {...props}>
      {children}
    </select>
  );
});


