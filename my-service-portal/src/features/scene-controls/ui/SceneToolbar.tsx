import { Maximize2, Minimize2, Box, Layers, RotateCcw } from 'lucide-react';
import { getHotkeyTooltip } from '../model/hotkeys';
import { SceneControlButton } from './SceneControlButton';
import styles from './SceneToolbar.module.scss';

interface SceneToolbarProps {
  isExploded: boolean;
  onToggleExplode: () => void;
  onResetFocus: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  showFullscreen?: boolean;
}

export const SceneToolbar = ({
  isExploded,
  onToggleExplode,
  onResetFocus,
  isFullscreen,
  onToggleFullscreen,
  showFullscreen = true,
}: SceneToolbarProps) => {
  const resetTitle = getHotkeyTooltip('Сбросить ракурс', 'resetFocus');
  const explodeTitle = getHotkeyTooltip(isExploded ? 'Собрать' : 'Разобрать', 'toggleExplode');
  const fullscreenTitle = getHotkeyTooltip(
    isFullscreen ? 'Свернуть' : 'На весь экран',
    'toggleFullscreen'
  );

  return (
    <div className={styles.sceneToolbar__sceneToolbar}>
      <SceneControlButton onClick={onResetFocus} tooltip={resetTitle}>
        <RotateCcw size={18} />
      </SceneControlButton>

      <SceneControlButton onClick={onToggleExplode} tooltip={explodeTitle}>
        {isExploded ? <Box size={20} /> : <Layers size={20} />}
      </SceneControlButton>

      {showFullscreen ? (
        <SceneControlButton onClick={onToggleFullscreen} tooltip={fullscreenTitle} size="compact">
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </SceneControlButton>
      ) : null}
    </div>
  );
};


