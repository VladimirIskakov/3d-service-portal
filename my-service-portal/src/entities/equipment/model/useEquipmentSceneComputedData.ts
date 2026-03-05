import { useMemo } from 'react';
import * as THREE from 'three';
import type { EquipmentExplosionSettings, EquipmentPartInfo } from './types';
import { buildAutomaticExplosionData, FALLBACK_EXPLOSION_OFFSET } from '../lib/autoExplosion';
import { createFallbackPart, getMeshBounds, getMeshCenter, type LogicalMeshEntry } from './equipmentSceneHelpers';

interface UseEquipmentSceneComputedDataInput {
  logicalMeshEntries: LogicalMeshEntry[];
  partByMeshIndex: Map<number, EquipmentPartInfo>;
  exploded: boolean;
  explodedPartIdSet: Set<string> | null;
  explosionSettings: EquipmentExplosionSettings;
}

export const useEquipmentSceneComputedData = ({
  logicalMeshEntries,
  partByMeshIndex,
  exploded,
  explodedPartIdSet,
  explosionSettings,
}: UseEquipmentSceneComputedDataInput) => {
  const explosionData = useMemo(() => {
    const geometryCenterByUuid = new Map<string, THREE.Vector3>();

    return buildAutomaticExplosionData(
      logicalMeshEntries
        .filter((entry) => entry.meshes.length > 0)
        .map((entry) => {
          const bounds = new THREE.Box3();
          const centerSum = new THREE.Vector3();

          entry.meshes.forEach((mesh) => {
            centerSum.add(getMeshCenter(mesh, geometryCenterByUuid));

            const meshBounds = getMeshBounds(mesh);
            if (meshBounds) {
              bounds.expandByPoint(meshBounds.min);
              bounds.expandByPoint(meshBounds.max);
            }
          });

          const partCenter = centerSum.divideScalar(entry.meshes.length);
          const transformedBounds = bounds.isEmpty() ? undefined : bounds;

          return {
            id: entry.logicalKey,
            mesh: entry.meshes[0],
            partCenter,
            transformedBounds,
          };
        }),
      explosionSettings,
    );
  }, [explosionSettings, logicalMeshEntries]);

  const logicalCentersByKey = useMemo(() => {
    const geometryCenterByUuid = new Map<string, THREE.Vector3>();
    const centers = new Map<string, THREE.Vector3>();

    logicalMeshEntries.forEach((entry) => {
      const center = new THREE.Vector3();
      entry.meshes.forEach((mesh) => {
        center.add(getMeshCenter(mesh, geometryCenterByUuid));
      });
      center.divideScalar(Math.max(1, entry.meshes.length));
      centers.set(entry.logicalKey, center);
    });

    return centers;
  }, [logicalMeshEntries]);

  const partCentersById = useMemo(() => {
    const sumByPartId = new Map<string, THREE.Vector3>();
    const countByPartId = new Map<string, number>();
    const geometryCenterByUuid = new Map<string, THREE.Vector3>();

    logicalMeshEntries.forEach((entry) => {
      const part = partByMeshIndex.get(entry.meshOrderIndex) ?? createFallbackPart(entry.meshOrderIndex);
      const partId = part.id;
      const shouldExplode = exploded && (!explodedPartIdSet || explodedPartIdSet.has(partId));
      const logicalCenter = new THREE.Vector3();

      entry.meshes.forEach((mesh) => {
        logicalCenter.add(getMeshCenter(mesh, geometryCenterByUuid));
      });
      logicalCenter.divideScalar(Math.max(1, entry.meshes.length));

      if (shouldExplode) {
        logicalCenter.add(explosionData.offsetsByMeshId.get(entry.logicalKey) ?? FALLBACK_EXPLOSION_OFFSET);
      }

      const currentSum = sumByPartId.get(partId);
      if (currentSum) {
        currentSum.add(logicalCenter);
      } else {
        sumByPartId.set(partId, logicalCenter);
      }

      countByPartId.set(partId, (countByPartId.get(partId) ?? 0) + 1);
    });

    const result: Record<string, [number, number, number]> = {};
    sumByPartId.forEach((sum, partId) => {
      const count = countByPartId.get(partId) ?? 1;
      result[partId] = [sum.x / count, sum.y / count, sum.z / count];
    });

    return result;
  }, [exploded, explodedPartIdSet, explosionData.offsetsByMeshId, logicalMeshEntries, partByMeshIndex]);

  const meshCentersByIndex = useMemo(() => {
    const geometryCenterByUuid = new Map<string, THREE.Vector3>();
    const result: Record<number, [number, number, number]> = {};

    logicalMeshEntries.forEach((entry) => {
      const part = partByMeshIndex.get(entry.meshOrderIndex) ?? createFallbackPart(entry.meshOrderIndex);
      const shouldExplode = exploded && (!explodedPartIdSet || explodedPartIdSet.has(part.id));
      const logicalCenter = new THREE.Vector3();

      entry.meshes.forEach((mesh) => {
        logicalCenter.add(getMeshCenter(mesh, geometryCenterByUuid));
      });
      logicalCenter.divideScalar(Math.max(1, entry.meshes.length));

      if (shouldExplode) {
        logicalCenter.add(explosionData.offsetsByMeshId.get(entry.logicalKey) ?? FALLBACK_EXPLOSION_OFFSET);
      }

      result[entry.meshOrderIndex] = [logicalCenter.x, logicalCenter.y, logicalCenter.z];
    });

    return result;
  }, [exploded, explodedPartIdSet, explosionData.offsetsByMeshId, logicalMeshEntries, partByMeshIndex]);

  const explosionCenterPosition = useMemo(
    () => [
      explosionData.modelCenter.x,
      explosionData.modelCenter.y,
      explosionData.modelCenter.z,
    ] as [number, number, number],
    [explosionData],
  );

  return {
    explosionData,
    logicalCentersByKey,
    partCentersById,
    meshCentersByIndex,
    explosionCenterPosition,
  };
};

