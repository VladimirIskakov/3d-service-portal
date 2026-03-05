import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ModelMeshCatalogItem {
  meshIndex: number;
  nodeName: string;
  meshName: string;
  label: string;
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<ModelMeshCatalogItem[]>>();

interface GLTFNode {
  name?: string;
  mesh?: number;
}

interface GLTFMesh {
  name?: string;
}

interface GLTFParserLike {
  json?: {
    nodes?: GLTFNode[];
    meshes?: GLTFMesh[];
  };
}

interface GLTFLikeWithParser {
  parser?: GLTFParserLike;
}

const toTrimmedString = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

const getMeshLabel = (
  nodeName: string,
  meshName: string,
  meshIndex: number,
) => {
  const normalizedNodeName = nodeName.trim();
  const normalizedMeshName = meshName.trim();

  if (normalizedNodeName && normalizedMeshName && normalizedNodeName !== normalizedMeshName) {
    return `${normalizedNodeName} (${normalizedMeshName})`;
  }

  if (normalizedNodeName) {
    return normalizedNodeName;
  }

  if (normalizedMeshName) {
    return normalizedMeshName;
  }

  return `Mesh #${meshIndex + 1}`;
};

const loadMeshCatalogUncached = async (modelUrl: string): Promise<ModelMeshCatalogItem[]> => {
  const gltf = await loader.loadAsync(modelUrl);
  const gltfWithParser = gltf as unknown as GLTFLikeWithParser;
  const sourceNodes = gltfWithParser.parser?.json?.nodes ?? [];
  const sourceMeshes = gltfWithParser.parser?.json?.meshes ?? [];

  const items: ModelMeshCatalogItem[] = sourceNodes
    .filter((node) => Number.isInteger(node.mesh))
    .map((node, meshIndex) => {
      const sourceMeshIndex = Number(node.mesh);
      const nodeName = toTrimmedString(node.name);
      const meshName = toTrimmedString(sourceMeshes[sourceMeshIndex]?.name);

      return {
        meshIndex,
        nodeName,
        meshName,
        label: getMeshLabel(nodeName, meshName, meshIndex),
      };
    });

  return items;
};

export const loadModelMeshCatalog = (
  modelUrl: string,
  options?: { forceReload?: boolean },
): Promise<ModelMeshCatalogItem[]> => {
  if (options?.forceReload) {
    cache.delete(modelUrl);
  } else {
    const cached = cache.get(modelUrl);
    if (cached) {
      return cached;
    }
  }

  const request = loadMeshCatalogUncached(modelUrl).catch((error) => {
    cache.delete(modelUrl);
    throw error;
  });

  cache.set(modelUrl, request);
  return request;
};
