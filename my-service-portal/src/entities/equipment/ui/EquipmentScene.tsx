import { useGLTF, Center, CameraControls } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS,
  DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS,
  type EquipmentExplosionSettings,
  getEquipmentPartCatalog,
  type EquipmentPartInfo,
} from '../model';
import { FALLBACK_EXPLOSION_OFFSET } from '../lib/autoExplosion';
import {
  buildLogicalMeshEntries,
  buildMeshEntries,
  createFallbackPart,
  type LogicalMeshEntry,
  X_AXIS_MARKER_POSITIONS,
  Y_AXIS_MARKER_POSITIONS,
  Z_AXIS_MARKER_POSITIONS,
} from '../model/equipmentSceneHelpers';
import { useEquipmentSceneComputedData } from '../model/useEquipmentSceneComputedData';
import { ModelPart } from './ModelPart';

interface EquipmentProps {
  modelSlug: string;
  modelUrl: string;
  partCatalog?: EquipmentPartInfo[] | null;
  exploded: boolean;
  explodedPartIds?: string[] | null;
  explosionSettings?: EquipmentExplosionSettings | null;
  silhouetteOverrideByPartId?: Record<string, EquipmentPartInfo['silhouette']> | null;
  controlsRef: React.RefObject<CameraControls | null>;
  selectedPartId: string | null;
  onSelectPart: (part: EquipmentPartInfo | null) => void;
  onPartCentersComputed?: (partCenters: Record<string, [number, number, number]>) => void;
  onMeshCentersComputed?: (meshCenters: Record<number, [number, number, number]>) => void;
}

export const EquipmentScene = ({
  modelSlug,
  modelUrl,
  partCatalog: partCatalogProp = null,
  exploded,
  explodedPartIds = null,
  explosionSettings,
  silhouetteOverrideByPartId,
  controlsRef,
  selectedPartId,
  onSelectPart,
  onPartCentersComputed,
  onMeshCentersComputed,
}: EquipmentProps) => {
  const { nodes } = useGLTF(modelUrl);
  const [loadedPartCatalog, setLoadedPartCatalog] = useState<EquipmentPartInfo[]>([]);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const hoverResetTimerRef = useRef<number | null>(null);

  const partCatalog = partCatalogProp ?? loadedPartCatalog;

  const rawMeshes = useMemo(() => {
    return Object.values(nodes).filter((node): node is THREE.Mesh => node instanceof THREE.Mesh);
  }, [nodes]);

  const logicalMeshEntries = useMemo<LogicalMeshEntry[]>(() => {
    return buildLogicalMeshEntries(rawMeshes);
  }, [rawMeshes]);

  const meshEntries = useMemo(() => {
    return buildMeshEntries(logicalMeshEntries);
  }, [logicalMeshEntries]);

  useEffect(() => {
    if (partCatalogProp) {
      return;
    }

    let isMounted = true;

    getEquipmentPartCatalog(modelSlug)
      .then((parts) => {
        if (isMounted) {
          setLoadedPartCatalog(parts);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadedPartCatalog([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [modelSlug, partCatalogProp]);

  const partByMeshIndex = useMemo(() => {
    const partLookup = new Map<number, EquipmentPartInfo>();

    partCatalog.forEach((part) => {
      part.meshIndexes.forEach((meshIndex) => {
        partLookup.set(meshIndex, part);
      });
    });

    return partLookup;
  }, [partCatalog]);

  const explodedPartIdSet = useMemo(() => {
    if (!Array.isArray(explodedPartIds) || explodedPartIds.length === 0) {
      return null;
    }

    return new Set(explodedPartIds.filter((value): value is string => Boolean(value && value.trim())));
  }, [explodedPartIds]);

  const effectiveExplosionSettings = explosionSettings ?? DEFAULT_EQUIPMENT_EXPLOSION_SETTINGS;
  const {
    explosionData,
    logicalCentersByKey,
    partCentersById,
    meshCentersByIndex,
    explosionCenterPosition,
  } = useEquipmentSceneComputedData({
    logicalMeshEntries,
    partByMeshIndex,
    exploded,
    explodedPartIdSet,
    explosionSettings: effectiveExplosionSettings,
  });

  useEffect(() => {
    return () => {
      if (hoverResetTimerRef.current !== null) {
        window.clearTimeout(hoverResetTimerRef.current);
        hoverResetTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    onPartCentersComputed?.(partCentersById);
  }, [onPartCentersComputed, partCentersById]);

  useEffect(() => {
    onMeshCentersComputed?.(meshCentersByIndex);
  }, [meshCentersByIndex, onMeshCentersComputed]);

  const handleFocus = (target: THREE.Mesh) => {
    if (controlsRef.current) {
      controlsRef.current.fitToBox(target, true, {
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 1,
        paddingBottom: 1,
      });
    }
  };

  const handleSelect = useCallback((meshOrderIndex: number) => {
    const selectedPart = partByMeshIndex.get(meshOrderIndex) ?? createFallbackPart(meshOrderIndex);

    if (selectedPartId === selectedPart.id) {
      onSelectPart(null);
      return;
    }

    onSelectPart(selectedPart);
  }, [onSelectPart, partByMeshIndex, selectedPartId]);

  const handleHoverStart = useCallback((partId: string) => {
    if (hoverResetTimerRef.current !== null) {
      window.clearTimeout(hoverResetTimerRef.current);
      hoverResetTimerRef.current = null;
    }

    setHoveredPartId((current) => (current === partId ? current : partId));
  }, []);

  const handleHoverEnd = useCallback((partId: string) => {
    if (hoverResetTimerRef.current !== null) {
      window.clearTimeout(hoverResetTimerRef.current);
    }

    hoverResetTimerRef.current = window.setTimeout(() => {
      setHoveredPartId((current) => (current === partId ? null : current));
      hoverResetTimerRef.current = null;
    }, 0);
  }, []);

  return (
    <Center>
      <group>
        {meshEntries.map(({ mesh, meshOrderIndex, logicalKey, logicalMeshLocalIndex }) => {
          const part = partByMeshIndex.get(meshOrderIndex) ?? createFallbackPart(meshOrderIndex);
          const partId = part.id;
          const effectiveSilhouette = silhouetteOverrideByPartId?.[partId] ?? part.silhouette;
          const shouldExplode = exploded && (!explodedPartIdSet || explodedPartIdSet.has(partId));

          return (
            <ModelPart
              key={mesh.uuid}
              mesh={mesh}
              exploded={shouldExplode}
              explosionOffset={explosionData.offsetsByMeshId.get(logicalKey) ?? FALLBACK_EXPLOSION_OFFSET}
              showConnectorLine={logicalMeshLocalIndex === 0}
              connectorStart={logicalCentersByKey.get(logicalKey) ?? null}
              selected={partId === selectedPartId}
              groupHovered={partId === hoveredPartId}
              silhouetteOpacity={effectiveSilhouette?.opacity ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.opacity}
              silhouetteEdgeThresholdAngle={
                effectiveSilhouette?.edgeThresholdAngle ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.edgeThresholdAngle
              }
              silhouetteShowEdges={
                effectiveSilhouette?.showEdges ?? DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS.showEdges
              }
              onHoverStart={() => handleHoverStart(partId)}
              onHoverEnd={() => handleHoverEnd(partId)}
              onSelect={() => handleSelect(meshOrderIndex)}
              onFocus={handleFocus}
            />
          );
        })}

        {exploded ? (
          <group position={explosionCenterPosition}>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[X_AXIS_MARKER_POSITIONS, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#ff4d4f" depthTest={false} />
            </lineSegments>

            <lineSegments>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[Y_AXIS_MARKER_POSITIONS, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#52c41a" depthTest={false} />
            </lineSegments>

            <lineSegments>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[Z_AXIS_MARKER_POSITIONS, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#1677ff" depthTest={false} />
            </lineSegments>
          </group>
        ) : null}
      </group>
    </Center>
  );
};

