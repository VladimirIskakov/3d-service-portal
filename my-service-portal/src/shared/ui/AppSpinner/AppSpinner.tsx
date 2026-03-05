import type { HTMLAttributes } from 'react';
import styles from './AppSpinner.module.scss';

type AppSpinnerSize = 'sm' | 'md';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  size?: AppSpinnerSize;
}

export const AppSpinner = ({ size = 'md', className = '', ...rest }: Props) => {
  const sizeClass = size === 'sm' ? styles['appSpinner--sm'] : '';
  const nextClassName = [styles.appSpinner, sizeClass, className].filter(Boolean).join(' ');

  return <span {...rest} className={nextClassName} />;
};
