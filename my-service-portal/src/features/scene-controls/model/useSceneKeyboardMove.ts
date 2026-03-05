import { useEffect, type RefObject } from 'react';
import type { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import { startRenderActivity, stopRenderActivity } from '@/shared/lib/three';

const MOVE_SPEED = 4;
const MOVE_KEY_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
const KEYBOARD_ACTIVITY = 'keyboard-move';

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

export const useSceneKeyboardMove = (controlsRef: RefObject<CameraControls | null>) => {
  useEffect(() => {
    const pressedKeys = new Set<string>();
    const upAxis = new THREE.Vector3(0, 1, 0);
    const cameraPosition = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const movement = new THREE.Vector3();

    let animationFrameId: number | null = null;
    let previousTimestamp = 0;

    const stopLoop = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = null;
      previousTimestamp = 0;
      stopRenderActivity(KEYBOARD_ACTIVITY);
    };

    const frame = (timestamp: number) => {
      const controls = controlsRef.current;

      if (!controls || pressedKeys.size === 0) {
        stopLoop();
        return;
      }

      if (previousTimestamp === 0) {
        previousTimestamp = timestamp;
      }

      const deltaTime = Math.min((timestamp - previousTimestamp) / 1000, 0.05);
      previousTimestamp = timestamp;

      controls.getPosition(cameraPosition);
      controls.getTarget(cameraTarget);

      forward.subVectors(cameraTarget, cameraPosition);
      forward.y = 0;

      if (forward.lengthSq() < 1e-8) {
        forward.set(0, 0, -1);
      } else {
        forward.normalize();
      }

      right.crossVectors(forward, upAxis).normalize();
      movement.set(0, 0, 0);

      if (pressedKeys.has('KeyW')) {
        movement.add(forward);
      }
      if (pressedKeys.has('KeyS')) {
        movement.sub(forward);
      }
      if (pressedKeys.has('KeyD')) {
        movement.add(right);
      }
      if (pressedKeys.has('KeyA')) {
        movement.sub(right);
      }

      if (movement.lengthSq() > 0) {
        movement.normalize().multiplyScalar(MOVE_SPEED * deltaTime);
        cameraPosition.add(movement);
        cameraTarget.add(movement);
        controls.setLookAt(
          cameraPosition.x,
          cameraPosition.y,
          cameraPosition.z,
          cameraTarget.x,
          cameraTarget.y,
          cameraTarget.z,
          false
        );
      }

      animationFrameId = window.requestAnimationFrame(frame);
    };

    const startLoop = () => {
      if (animationFrameId !== null) {
        return;
      }

      startRenderActivity(KEYBOARD_ACTIVITY);
      animationFrameId = window.requestAnimationFrame(frame);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || isEditableElement(event.target)
      ) {
        return;
      }

      if (!MOVE_KEY_CODES.has(event.code)) {
        return;
      }

      event.preventDefault();
      pressedKeys.add(event.code);
      startLoop();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!MOVE_KEY_CODES.has(event.code)) {
        return;
      }

      pressedKeys.delete(event.code);

      if (pressedKeys.size === 0) {
        stopLoop();
      }
    };

    const handleWindowBlur = () => {
      pressedKeys.clear();
      stopLoop();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      pressedKeys.clear();
      stopLoop();
    };
  }, [controlsRef]);
};
