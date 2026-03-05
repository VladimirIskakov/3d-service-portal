import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { invalidateCapped, startRenderActivity, stopRenderActivity } from '@/shared/lib/three';

interface ModelPartProps {
  mesh: THREE.Mesh;
  exploded: boolean;
  explosionOffset: THREE.Vector3;
  showConnectorLine?: boolean;
  connectorStart?: THREE.Vector3 | null;
  selected: boolean;
  groupHovered: boolean;
  silhouetteOpacity: number;
  silhouetteEdgeThresholdAngle: number;
  silhouetteShowEdges: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelect: () => void;
  onFocus: (mesh: THREE.Mesh) => void;
}

const RETURN_EPSILON_SQ = 0.0004;
const ANIMATION_DURATION = 0.65;

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

export const ModelPart = ({
  mesh,
  exploded,
  explosionOffset,
  showConnectorLine = true,
  connectorStart = null,
  selected,
  groupHovered,
  silhouetteOpacity,
  silhouetteEdgeThresholdAngle,
  silhouetteShowEdges,
  onHoverStart,
  onHoverEnd,
  onSelect,
  onFocus
}: ModelPartProps) => {
  const [showSilhouette, setShowSilhouette] = useState(exploded);
  const meshRef = useRef<THREE.Mesh>(null!);
  const lineGeometryRef = useRef<THREE.BufferGeometry>(null);
  const previousExplodedRef = useRef(exploded);
  const isAnimationActiveRef = useRef(false);
  const isTransitionRunningRef = useRef(false);
  const transitionProgressRef = useRef(1);
  const transitionFromRef = useRef(new THREE.Vector3());
  const transitionToRef = useRef(new THREE.Vector3());
  const animationActivityId = useMemo(() => `model-part-${mesh.uuid}`, [mesh.uuid]);

  const originalPos = useMemo(() => mesh.position.clone(), [mesh]);
  const originalPosition = useMemo(
    () => [originalPos.x, originalPos.y, originalPos.z] as [number, number, number],
    [originalPos]
  );
  const originalRotation = useMemo(
    () => [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z] as [number, number, number],
    [mesh]
  );
  const originalScale = useMemo(
    () => [mesh.scale.x, mesh.scale.y, mesh.scale.z] as [number, number, number],
    [mesh]
  );

  const explodedPos = useMemo(() => {
    return originalPos.clone().add(explosionOffset);
  }, [originalPos, explosionOffset]);

  const geometryCenterOffset = useMemo(() => {
    mesh.geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    mesh.geometry.boundingBox?.getCenter(center);
    return center;
  }, [mesh.geometry]);

  const partCenterOffset = useMemo(() => {
    return geometryCenterOffset.clone().multiply(mesh.scale).applyEuler(mesh.rotation);
  }, [geometryCenterOffset, mesh]);

  const linePositions = useMemo(() => new Float32Array(6), []);
  const lineStart = useMemo(() => new THREE.Vector3(), []);
  const lineEnd = useMemo(() => new THREE.Vector3(), []);
  const displacement = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    // Trigger first frame for start/return animation in demand mode.
    invalidateCapped();
  }, [exploded]);

  useEffect(() => {
    return () => {
      isTransitionRunningRef.current = false;
      if (isAnimationActiveRef.current) {
        stopRenderActivity(animationActivityId);
        isAnimationActiveRef.current = false;
      }
    };
  }, [animationActivityId]);

  useFrame((_, delta) => {
    const meshPosition = meshRef.current.position;

    const startTransition = (target: THREE.Vector3) => {
      transitionFromRef.current.copy(meshPosition);
      transitionToRef.current.copy(target);
      transitionProgressRef.current = 0;
      isTransitionRunningRef.current = true;

      if (!isAnimationActiveRef.current) {
        startRenderActivity(animationActivityId);
        isAnimationActiveRef.current = true;
      }
    };

    const wasExploded = previousExplodedRef.current;
    if (exploded && !wasExploded && !showSilhouette) {
      setShowSilhouette(true);
    }

    if (exploded !== wasExploded) {
      startTransition(exploded ? explodedPos : originalPos);
    }

    previousExplodedRef.current = exploded;

    if (!isTransitionRunningRef.current) {
      const target = exploded ? explodedPos : originalPos;
      if (meshPosition.distanceToSquared(target) > RETURN_EPSILON_SQ) {
        startTransition(target);
      }
    }

    if (isTransitionRunningRef.current) {
      const nextProgress = Math.min(transitionProgressRef.current + delta / ANIMATION_DURATION, 1);
      transitionProgressRef.current = nextProgress;

      const easedProgress = easeOutCubic(nextProgress);

      meshPosition.lerpVectors(
        transitionFromRef.current,
        transitionToRef.current,
        easedProgress
      );

      if (nextProgress >= 1) {
        meshPosition.copy(transitionToRef.current);
        isTransitionRunningRef.current = false;

        if (isAnimationActiveRef.current) {
          stopRenderActivity(animationActivityId);
          isAnimationActiveRef.current = false;
        }
      }
    } else if (isAnimationActiveRef.current) {
      stopRenderActivity(animationActivityId);
      isAnimationActiveRef.current = false;
    }

    if (
      !exploded
      && showSilhouette
      && !isTransitionRunningRef.current
      && meshPosition.distanceToSquared(originalPos) <= RETURN_EPSILON_SQ
    ) {
      meshPosition.copy(originalPos);
      setShowSilhouette(false);
    }

    if (!showSilhouette || !showConnectorLine) {
      return;
    }

    const lineGeometry = lineGeometryRef.current;
    if (!lineGeometry) {
      return;
    }

    const lineAttribute = lineGeometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!lineAttribute) {
      return;
    }

    if (connectorStart) {
      lineStart.copy(connectorStart);
      displacement.copy(meshPosition).sub(originalPos);
      lineEnd.copy(connectorStart).add(displacement);
    } else {
      lineStart.copy(originalPos).add(partCenterOffset);
      lineEnd.copy(meshPosition).add(partCenterOffset);
    }
    lineAttribute.setXYZ(0, lineStart.x, lineStart.y, lineStart.z);
    lineAttribute.setXYZ(1, lineEnd.x, lineEnd.y, lineEnd.z);
    lineAttribute.needsUpdate = true;
  });

  const hoverColor = useMemo(() => new THREE.Color('#5c7c99'), []);
  const selectedColor = useMemo(() => new THREE.Color('#9bb86f'), []);
  const fallbackEmissiveColor = useMemo(() => new THREE.Color(0x000000), []);
  const baseMaterial = useMemo(() => {
    const sourceMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    return sourceMaterial instanceof THREE.MeshStandardMaterial ? sourceMaterial : null;
  }, [mesh.material]);
  const baseMetalness = baseMaterial?.metalness ?? 0.05;
  const baseRoughness = baseMaterial?.roughness ?? 0.9;
  const baseEnvMapIntensity = baseMaterial?.envMapIntensity ?? 1;
  const baseEmissive = baseMaterial?.emissive ?? fallbackEmissiveColor;
  const baseEmissiveIntensity = baseMaterial?.emissiveIntensity ?? 0;
  const baseFlatShading = baseMaterial?.flatShading ?? false;
  const hoveredMetalness = Math.min(baseMetalness, 0.05);
  const hoveredRoughness = Math.max(baseRoughness, 0.92);
  const hoveredEnvMapIntensity = Math.min(baseEnvMapIntensity, 0.2);
  const isActive = groupHovered || selected;
  const activeColor = selected ? selectedColor : hoverColor;
  const safeSilhouetteOpacity = Number.isFinite(silhouetteOpacity)
    ? Math.min(1, Math.max(0, silhouetteOpacity))
    : 0.04;
  const safeSilhouetteEdgeThresholdAngle = Number.isFinite(silhouetteEdgeThresholdAngle)
    ? Math.min(180, Math.max(0, silhouetteEdgeThresholdAngle))
    : 45;
  const safeSilhouetteShowEdges = Boolean(silhouetteShowEdges);

  return (
    <group>
      <lineSegments visible={showSilhouette && showConnectorLine}>
        <bufferGeometry ref={lineGeometryRef}>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#6c7480" transparent opacity={0.28} depthWrite={false} />
      </lineSegments>

      <mesh
        visible={showSilhouette}
        geometry={mesh.geometry}
        position={originalPosition}
        rotation={originalRotation}
        scale={originalScale}
        raycast={() => {}}
      >
        <meshBasicMaterial color="#7b7b7b" transparent opacity={safeSilhouetteOpacity} depthWrite={false} />
        {safeSilhouetteShowEdges ? (
          <Edges threshold={safeSilhouetteEdgeThresholdAngle} color="#748092" scale={1.001} />
        ) : null}
      </mesh>

      <mesh
        ref={meshRef}
        geometry={mesh.geometry}
        position={originalPosition}
        rotation={originalRotation}
        scale={originalScale}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHoverStart();
        }}
        onPointerOut={() => onHoverEnd()}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect();
        }}
        onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect();
          onFocus(meshRef.current);
        }}
      >
        {baseMaterial ? (
          <meshStandardMaterial
            map={baseMaterial.map}
            normalMap={baseMaterial.normalMap}
            aoMap={baseMaterial.aoMap}
            roughnessMap={baseMaterial.roughnessMap}
            metalnessMap={baseMaterial.metalnessMap}
            emissiveMap={baseMaterial.emissiveMap}
            alphaMap={baseMaterial.alphaMap}
            envMap={baseMaterial.envMap}
            transparent={baseMaterial.transparent}
            opacity={baseMaterial.opacity}
            side={baseMaterial.side}
            color={isActive ? activeColor : baseMaterial.color}
            metalness={isActive ? hoveredMetalness : baseMetalness}
            roughness={isActive ? hoveredRoughness : baseRoughness}
            envMapIntensity={isActive ? hoveredEnvMapIntensity : baseEnvMapIntensity}
            flatShading={isActive || baseFlatShading}
            emissive={isActive ? activeColor : baseEmissive}
            emissiveIntensity={isActive ? 0.12 : baseEmissiveIntensity}
          />
        ) : (
          <meshStandardMaterial
            color={isActive ? activeColor : '#b0b0b0'}
            metalness={0.05}
            roughness={0.9}
            flatShading={isActive}
            emissive={isActive ? activeColor : fallbackEmissiveColor}
            emissiveIntensity={isActive ? 0.12 : 0}
          />
        )}
        {isActive && <Edges threshold={90} color={selected ? '#d7f0a5' : 'white'} scale={1.002} />}
      </mesh>
    </group>
  );
};
