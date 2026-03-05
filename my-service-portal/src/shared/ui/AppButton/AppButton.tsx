import { type ButtonHTMLAttributes } from 'react';
import styles from './AppButton.module.scss';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type AppButtonSize = 'md' | 'sm';

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  iconOnly?: boolean;
}

export const AppButton = ({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  className,
  type = 'button',
  children,
  ...props
}: AppButtonProps) => {
  const classNames = [
    styles.appButton,
    styles[`appButton--${variant}`],
    size === 'sm' ? styles['appButton--sm'] : '',
    iconOnly ? styles['appButton--icon-only'] : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classNames} {...props}>
      {children}
    </button>
  );
};
