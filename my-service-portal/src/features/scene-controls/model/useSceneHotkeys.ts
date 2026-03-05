import { useEffect } from 'react';
import { SCENE_HOTKEY_ACTIONS_BY_CODE, type SceneHotkeyHandlers } from './hotkeys';

const isEditableElement = (target: EventTarget | null): target is HTMLElement => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
  );
};

export const useSceneHotkeys = (handlers: SceneHotkeyHandlers) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented || isEditableElement(event.target)) {
        return;
      }

      const action = SCENE_HOTKEY_ACTIONS_BY_CODE[event.code];

      if (!action) {
        return;
      }

      event.preventDefault();
      handlers[action]();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
};
