import { useCallback, useMemo, useState } from 'react';
import { useCameraReset } from '@/shared/lib/hooks';
import { useSceneHotkeys } from './useSceneHotkeys';
import { useSceneKeyboardMove } from './useSceneKeyboardMove';

export const useSceneControls = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const { controlsRef, handleReset } = useCameraReset();

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const toggleExplode = useCallback(() => {
    setIsExploded(prev => !prev);
  }, []);

  const hotkeyHandlers = useMemo(
    () => ({
      resetFocus: handleReset,
      toggleExplode,
      toggleFullscreen
    }),
    [handleReset, toggleExplode, toggleFullscreen]
  );

  useSceneHotkeys(hotkeyHandlers);
  useSceneKeyboardMove(controlsRef);

  return {
    isFullscreen,
    isExploded,
    controlsRef,
    resetFocus: handleReset,
    toggleExplode,
    toggleFullscreen
  };
};
