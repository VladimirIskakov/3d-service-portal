import * as THREE from 'three';
import {
  DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS,
  type EquipmentPartInfo,
} from './types';

export type MeshEntry = {
  mesh: THREE.Mesh;
  meshOrderIndex: number;
  logicalKey: string;
  logicalMeshLocalIndex: number;
};

export type LogicalMeshEntry = {
  meshOrderIndex: number;
  logicalKey: string;
  meshes: THREE.Mesh[];
};

const EXPLOSION_CENTER_MARKER_SIZE = 0.45;

export const X_AXIS_MARKER_POSITIONS = new Float32Array([
  -EXPLOSION_CENTER_MARKER_SIZE, 0, 0,
  EXPLOSION_CENTER_MARKER_SIZE, 0, 0,
]);
export const Y_AXIS_MARKER_POSITIONS = new Float32Array([
  0, -EXPLOSION_CENTER_MARKER_SIZE, 0,
  0, EXPLOSION_CENTER_MARKER_SIZE, 0,
]);
export const Z_AXIS_MARKER_POSITIONS = new Float32Array([
  0, 0, -EXPLOSION_CENTER_MARKER_SIZE,
  0, 0, EXPLOSION_CENTER_MARKER_SIZE,
]);

export const getFallbackPartId = (meshOrderIndex: number) => `mesh-${meshOrderIndex}`;

export const createFallbackPart = (meshOrderIndex: number): EquipmentPartInfo => ({
  id: getFallbackPartId(meshOrderIndex),
  title: `Деталь #${meshOrderIndex + 1}`,
  description: 'Для этой детали пока нет описания.',
  meshIndexes: [meshOrderIndex],
  silhouette: DEFAULT_EQUIPMENT_PART_SILHOUETTE_SETTINGS,
});

export const getMeshCenter = (mesh: THREE.Mesh, geometryCenterByUuid: Map<string, THREE.Vector3>) => {
  let geometryCenter = geometryCenterByUuid.get(mesh.geometry.uuid);
  if (!geometryCenter) {
    mesh.geometry.computeBoundingBox();
    geometryCenter = new THREE.Vector3();
    mesh.geometry.boundingBox?.getCenter(geometryCenter);
    geometryCenterByUuid.set(mesh.geometry.uuid, geometryCenter.clone());
  }

  return geometryCenter
    .clone()
    .multiply(mesh.scale)
    .applyEuler(mesh.rotation)
    .add(mesh.position);
};

export const getMeshBounds = (mesh: THREE.Mesh) => {
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
};

const isPrimitiveSplitGroup = (parent: THREE.Group) => {
  const meshChildren = parent.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  if (meshChildren.length <= 1 || meshChildren.length !== parent.children.length) {
    return false;
  }

  const first = meshChildren[0];

  return meshChildren.every((child) => (
    child.position.distanceToSquared(first.position) <= 1e-10
    && child.scale.distanceToSquared(first.scale) <= 1e-10
    && child.quaternion.angleTo(first.quaternion) <= 1e-7
  ));
};

export const buildLogicalMeshEntries = (rawMeshes: THREE.Mesh[]): LogicalMeshEntry[] => {
  const entriesByKey = new Map<string, LogicalMeshEntry>();
  const orderedEntries: LogicalMeshEntry[] = [];

  rawMeshes.forEach((mesh) => {
    const parent = mesh.parent;
    const hasPrimitiveParentGroup = parent instanceof THREE.Group && isPrimitiveSplitGroup(parent);
    const logicalKey = hasPrimitiveParentGroup ? `group:${parent.uuid}` : `mesh:${mesh.uuid}`;

    const existing = entriesByKey.get(logicalKey);
    if (existing) {
      existing.meshes.push(mesh);
      return;
    }

    const nextEntry: LogicalMeshEntry = {
      meshOrderIndex: orderedEntries.length,
      logicalKey,
      meshes: [mesh],
    };

    entriesByKey.set(logicalKey, nextEntry);
    orderedEntries.push(nextEntry);
  });

  return orderedEntries;
};

export const buildMeshEntries = (logicalMeshEntries: LogicalMeshEntry[]): MeshEntry[] => {
  const entries: MeshEntry[] = [];

  logicalMeshEntries.forEach((logicalEntry) => {
    logicalEntry.meshes.forEach((mesh, logicalMeshLocalIndex) => {
      entries.push({
        mesh,
        meshOrderIndex: logicalEntry.meshOrderIndex,
        logicalKey: logicalEntry.logicalKey,
        logicalMeshLocalIndex,
      });
    });
  });

  return entries;
};

