const SCENE_HOTKEY_ACTIONS = ['resetFocus', 'toggleExplode', 'toggleFullscreen'] as const;

export type SceneHotkeyAction = (typeof SCENE_HOTKEY_ACTIONS)[number];

type SceneHotkeyBinding = {
  code: string;
  keyLabel: string;
};

type SceneHotkeyConfigItem = {
  selected: string;
  options: Record<string, SceneHotkeyBinding>;
};

type SceneHotkeyConfig = Record<SceneHotkeyAction, SceneHotkeyConfigItem>;

// Edit only `selected` to switch active key for each action.
export const SCENE_HOTKEY_CONFIG: SceneHotkeyConfig = {
  resetFocus: {
    selected: 'escape',
    options: {
      escape: { code: 'Escape', keyLabel: 'Esc' },
      keyR: { code: 'KeyR', keyLabel: 'R' }
    }
  },
  toggleExplode: {
    selected: 'keyE',
    options: {
      keyE: { code: 'KeyE', keyLabel: 'E' },
      keyX: { code: 'KeyX', keyLabel: 'X' }
    }
  },
  toggleFullscreen: {
    selected: 'keyF',
    options: {
      keyF: { code: 'KeyF', keyLabel: 'F' },
      keyM: { code: 'KeyM', keyLabel: 'M' }
    }
  }
};

const resolveSelectedHotkey = ({ selected, options }: SceneHotkeyConfigItem): SceneHotkeyBinding => {
  const selectedBinding = options[selected];

  if (selectedBinding) {
    return selectedBinding;
  }

  const fallbackBinding = Object.values(options)[0];

  if (!fallbackBinding) {
    throw new Error('Scene hotkey config must contain at least one key option.');
  }

  return fallbackBinding;
};

export const SCENE_HOTKEYS = SCENE_HOTKEY_ACTIONS.reduce<Record<SceneHotkeyAction, SceneHotkeyBinding>>(
  (acc, action) => {
    acc[action] = resolveSelectedHotkey(SCENE_HOTKEY_CONFIG[action]);
    return acc;
  },
  {} as Record<SceneHotkeyAction, SceneHotkeyBinding>
);

export const SCENE_HOTKEY_ACTIONS_BY_CODE = SCENE_HOTKEY_ACTIONS.reduce<Record<string, SceneHotkeyAction>>(
  (acc, action) => {
    acc[SCENE_HOTKEYS[action].code] = action;
    return acc;
  },
  {}
);

export type SceneHotkeyHandlers = Record<SceneHotkeyAction, () => void>;

export const getHotkeyTooltip = (label: string, action: SceneHotkeyAction) => {
  return `${label} (${SCENE_HOTKEYS[action].keyLabel})`;
};
