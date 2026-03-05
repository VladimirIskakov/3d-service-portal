import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import { invalidateCapped, startRenderActivity, stopRenderActivity } from '@/shared/lib/three';

interface ManagedCameraControlsProps {
  controlsRef: React.RefObject<CameraControls | null>;
  minDistance?: number;
  maxDistance?: number;
}

const CAMERA_ACTIVITY = 'camera-controls';

let controlsInstalled = false;

const ensureInstalled = () => {
  if (controlsInstalled) {
    return;
  }

  CameraControlsImpl.install({ THREE });
  controlsInstalled = true;
};

export const ManagedCameraControls = ({
  controlsRef,
  minDistance = 2,
  maxDistance = 20
}: ManagedCameraControlsProps) => {
  ensureInstalled();

  const camera = useThree(state => state.camera);
  const gl = useThree(state => state.gl);
  const events = useThree(state => state.events);
  const set = useThree(state => state.set);
  const get = useThree(state => state.get);

  const controls = useMemo(() => {
    const nextControls = new CameraControlsImpl(camera);
    nextControls.minDistance = minDistance;
    nextControls.maxDistance = maxDistance;
    return nextControls;
  }, [camera, minDistance, maxDistance]);

  useEffect(() => {
    const domElement = (events.connected || gl.domElement) as HTMLElement;
    controls.connect(domElement);

    return () => {
      controls.disconnect();
    };
  }, [controls, events.connected, gl.domElement]);

  useEffect(() => {
    return () => {
      controls.dispose();
    };
  }, [controls]);

  useEffect(() => {
    controlsRef.current = controls as unknown as CameraControls;

    return () => {
      if (controlsRef.current === controls) {
        controlsRef.current = null;
      }
    };
  }, [controlsRef, controls]);

  useEffect(() => {
    const previousControls = get().controls;
    set({ controls: controls as unknown as typeof previousControls });

    return () => {
      set({ controls: previousControls });
    };
  }, [controls, get, set]);

  useEffect(() => {
    const handleStart = () => {
      startRenderActivity(CAMERA_ACTIVITY);
      invalidateCapped();
    };
    const handleStop = () => {
      stopRenderActivity(CAMERA_ACTIVITY);
    };

    controls.addEventListener('controlstart', handleStart);
    controls.addEventListener('transitionstart', handleStart);
    controls.addEventListener('wake', handleStart);
    controls.addEventListener('rest', handleStop);
    controls.addEventListener('sleep', handleStop);

    return () => {
      controls.removeEventListener('controlstart', handleStart);
      controls.removeEventListener('transitionstart', handleStart);
      controls.removeEventListener('wake', handleStart);
      controls.removeEventListener('rest', handleStop);
      controls.removeEventListener('sleep', handleStop);
      stopRenderActivity(CAMERA_ACTIVITY);
    };
  }, [controls]);

  useFrame((_, delta) => {
    controls.update(delta);
  }, -1);

  return null;
};
