import type { ReactNode } from 'react';
import styles from './SceneControlButton.module.scss';

type SceneControlButtonSize = 'default' | 'compact';

interface SceneControlButtonProps {
  onClick: () => void;
  tooltip: string;
  children: ReactNode;
  size?: SceneControlButtonSize;
}

export const SceneControlButton = ({
  onClick,
  tooltip,
  children,
  size = 'default'
}: SceneControlButtonProps) => {
  const className = size === 'compact'
    ? `${styles.sceneControlButton__button} ${styles.sceneControlButton__compact}`
    : `${styles.sceneControlButton__button} ${styles.sceneControlButton__default}`;

  return (
    <button
      className={className}
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      type="button"
    >
      {children}
    </button>
  );
};


