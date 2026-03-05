import { invalidate } from '@react-three/fiber';

const TARGET_FPS = 40;
const FRAME_MS = 1000 / TARGET_FPS;

let lastInvalidateAt = 0;
let scheduledInvalidateTimer: number | null = null;
let scheduledActivityTimer: number | null = null;
const activeSources = new Set<string>();

const runInvalidate = () => {
  lastInvalidateAt = performance.now();
  invalidate();
};

const scheduleActivityTick = () => {
  if (scheduledActivityTimer !== null || activeSources.size === 0) {
    return;
  }

  const now = performance.now();
  const elapsed = now - lastInvalidateAt;
  const delay = Math.max(FRAME_MS - elapsed, 0);

  scheduledActivityTimer = window.setTimeout(() => {
    scheduledActivityTimer = null;

    if (activeSources.size === 0) {
      return;
    }

    runInvalidate();
    scheduleActivityTick();
  }, delay);
};

export const invalidateCapped = () => {
  const now = performance.now();
  const elapsed = now - lastInvalidateAt;

  if (elapsed >= FRAME_MS) {
    runInvalidate();
    return;
  }

  if (scheduledInvalidateTimer !== null) {
    return;
  }

  const delay = Math.max(FRAME_MS - elapsed, 0);
  scheduledInvalidateTimer = window.setTimeout(() => {
    scheduledInvalidateTimer = null;
    runInvalidate();
  }, delay);
};

export const startRenderActivity = (source: string) => {
  activeSources.add(source);

  if (activeSources.size === 1) {
    invalidateCapped();
  }

  scheduleActivityTick();
};

export const stopRenderActivity = (source: string) => {
  activeSources.delete(source);

  if (activeSources.size === 0 && scheduledActivityTimer !== null) {
    window.clearTimeout(scheduledActivityTimer);
    scheduledActivityTimer = null;
  }
};
