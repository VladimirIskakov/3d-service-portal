import type { HTMLAttributes } from 'react';
import styles from './AppSkeletonText.module.scss';

export type AppSkeletonTextLineWidth = 'wide' | 'normal' | 'short';

interface Props extends HTMLAttributes<HTMLDivElement> {
  lines?: AppSkeletonTextLineWidth[];
}

const getLineClassName = (line: AppSkeletonTextLineWidth) => {
  if (line === 'wide') {
    return styles['appSkeletonText__line--wide'];
  }

  if (line === 'short') {
    return styles['appSkeletonText__line--short'];
  }

  return '';
};

export const AppSkeletonText = ({ lines = ['wide', 'normal'], className = '', ...rest }: Props) => {
  const nextClassName = [styles.appSkeletonText, className].filter(Boolean).join(' ');

  return (
    <div {...rest} className={nextClassName}>
      {lines.map((line, index) => (
        <span
          key={`${line}-${index}`}
          className={[styles.appSkeletonText__line, getLineClassName(line)].filter(Boolean).join(' ')}
        />
      ))}
    </div>
  );
};
