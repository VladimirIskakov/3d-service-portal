import { useCallback, useRef } from 'react';
import { CameraControls } from '@react-three/drei';

export const useCameraReset = () => {
  const controlsRef = useRef<CameraControls>(null);

  const handleReset = useCallback(() => {
    if (controlsRef.current) {
      // Плавный переход в начальное состояние, которое было при загрузке
      controlsRef.current.reset(true); 
    }
  }, []);

  return { controlsRef, handleReset };
};