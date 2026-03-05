import * as THREE from 'three';
import type { EquipmentExplosionSettings } from '../model';

export interface ExplosionMeshEntryInput {
  id?: string;
  mesh: THREE.Mesh;
  partCenter?: THREE.Vector3;
  transformedBounds?: THREE.Box3;
}

export interface AutomaticExplosionData {
  offsetsByMeshId: Map<string, THREE.Vector3>;
  modelCenter: THREE.Vector3;
}

const EPSILON = 1e-4;
const FALLBACK_EXPLOSION_OFFSET = new THREE.Vector3(1, 1, 1).normalize();

const getFallbackDirectionFromString = (value: string) => {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const x = ((hash & 0xff) / 255) * 2 - 1;
  const y = (((hash >>> 8) & 0xff) / 255) * 2 - 1;
  const z = (((hash >>> 16) & 0xff) / 255) * 2 - 1;

  const direction = new THREE.Vector3(x, y, z);

  if (direction.lengthSq() < EPSILON) {
    direction.set(1, 1, 1);
  }

  return direction.normalize();
};

export const buildAutomaticExplosionData = (
  meshEntries: ExplosionMeshEntryInput[],
  settings: EquipmentExplosionSettings,
): AutomaticExplosionData => {
  const modelBounds = new THREE.Box3();

  const centers = meshEntries.map(({ id, mesh, partCenter, transformedBounds }) => {
    const resolvedPartCenter = partCenter ?? (() => {
      mesh.geometry.computeBoundingBox();

      const geometryCenter = new THREE.Vector3();
      mesh.geometry.boundingBox?.getCenter(geometryCenter);

      const centerOffset = geometryCenter.clone().multiply(mesh.scale).applyEuler(mesh.rotation);
      return mesh.position.clone().add(centerOffset);
    })();
    const resolvedBounds = transformedBounds ?? (() => {
      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }

      if (!mesh.geometry.boundingBox) {
        return null;
      }

      const bounds = mesh.geometry.boundingBox.clone();
      const transform = new THREE.Matrix4().compose(mesh.position, mesh.quaternion, mesh.scale);
      bounds.applyMatrix4(transform);
      return bounds;
    })();

    if (resolvedBounds) {
      modelBounds.expandByPoint(resolvedBounds.min);
      modelBounds.expandByPoint(resolvedBounds.max);
    }

    return { id, mesh, partCenter: resolvedPartCenter };
  });

  const modelCenter = new THREE.Vector3();
  const modelSize = new THREE.Vector3();
  if (!modelBounds.isEmpty()) {
    modelBounds.getCenter(modelCenter);
    modelBounds.getSize(modelSize);
  }

  const coreVerticalSplitRadius = Math.max(modelSize.x, modelSize.z) * settings.coreVerticalSplitFactor;

  const maxDistanceFromCenter = centers.reduce((maxValue, item) => {
    const distance = item.partCenter.distanceTo(modelCenter);
    return Math.max(maxValue, distance);
  }, 0);

  const offsetsByMeshId = new Map<string, THREE.Vector3>();

  centers.forEach(({ id, mesh, partCenter }) => {
    const dx = partCenter.x - modelCenter.x;
    const dy = partCenter.y - modelCenter.y;
    const dz = partCenter.z - modelCenter.z;
    const direction = new THREE.Vector3(dx, dy, dz);
    const distanceFromCenter = Math.hypot(dx, dy, dz);
    const horizontalDistance = Math.hypot(dx, dz);
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const absZ = Math.abs(dz);

    const key = id ?? mesh.uuid;

    if (distanceFromCenter < EPSILON) {
      direction.copy(getFallbackDirectionFromString(key));
    } else {
      const snapToVerticalCore =
        horizontalDistance <= coreVerticalSplitRadius
        && absY > EPSILON
        && absY >= horizontalDistance * settings.coreVerticalBiasRatio;
      const snapToX =
        absX >= absY
        && absX >= absZ
        && absY <= absX * settings.axisSnapRatio
        && absZ <= absX * settings.axisSnapRatio;
      const snapToY =
        absY >= absX
        && absY >= absZ
        && absX <= absY * settings.axisSnapRatio
        && absZ <= absY * settings.axisSnapRatio;
      const snapToZ =
        absZ >= absX
        && absZ >= absY
        && absX <= absZ * settings.axisSnapRatio
        && absY <= absZ * settings.axisSnapRatio;

      if (snapToVerticalCore) {
        direction.set(0, Math.sign(dy) || 1, 0);
      } else if (snapToX) {
        direction.set(Math.sign(dx) || 1, 0, 0);
      } else if (snapToY) {
        direction.set(0, Math.sign(dy) || 1, 0);
      } else if (snapToZ) {
        direction.set(0, 0, Math.sign(dz) || 1);
      } else {
        direction.divideScalar(distanceFromCenter);
      }
    }

    const normalizedDistance = maxDistanceFromCenter > EPSILON ? distanceFromCenter / maxDistanceFromCenter : 0;
    const explosionDistance = THREE.MathUtils.lerp(settings.minDistance, settings.maxDistance, normalizedDistance);
    offsetsByMeshId.set(key, direction.multiplyScalar(explosionDistance));
  });

  return { offsetsByMeshId, modelCenter };
};

export { FALLBACK_EXPLOSION_OFFSET };
