import type { Firestore } from 'firebase-admin/firestore';
import type {
  CreateModelCatalogItemInput,
  ModelDisassemblyProcedure,
  ModelDisassemblyStep,
  ModelDisassemblyStepCameraPreset,
  ModelContentSectionItem,
  ModelCatalogCategory,
  ModelCatalogItem,
  ModelCatalogRepository,
  ModelExplosionSettings,
  ModelMeshInfo,
  ModelPartInfo,
  ModelPartSilhouetteSettings,
  ModelPreviewCameraSettings,
  ModelPreviewKind,
  ModelSpecificationItem,
  ModelVisibility,
  ReplaceModelMeshesInput,
  UpsertModelExplosionSettingsInput,
  UpsertModelDisassemblyProcedureInput,
  UpsertModelPartInput,
  UpdateModelContentInput,
  UpdateModelCatalogItemInput,
  UpdateModelPreviewCameraInput,
} from '../../../../../modules/model-catalog/modelCatalog.types.js';
import { DEFAULT_MODEL_PART_SILHOUETTE_SETTINGS as DEFAULT_PART_SILHOUETTE } from '../../../../../modules/model-catalog/modelCatalog.types.js';

const MODELS_COLLECTION = 'equipmentModels';
const CATEGORIES_COLLECTION = 'catalogCategories';
const SERVICE_PROCEDURES_COLLECTION = 'serviceProcedures';
const PARTS_SUBCOLLECTION = 'parts';
const MESHES_SUBCOLLECTION = 'meshes';
const SPECIFICATIONS_SUBCOLLECTION = 'specifications';
const CONTENT_SECTIONS_SUBCOLLECTION = 'contentSections';
const PROCEDURE_STEPS_SUBCOLLECTION = 'steps';
const EXPLODE_PRESETS_SUBCOLLECTION = 'explodePresets';
const DEFAULT_EXPLODE_PRESET_ID = 'default';

const MAX_BATCH_DELETE = 400;

interface FirestoreCategoryDoc {
  title: string;
  description: string;
  sortOrder?: number;
}

interface FirestoreModelDoc {
  slug: string;
  title: string;
  description: string;
  visibility?: ModelVisibility;
  categoryId?: string | null;
  categoryTitle?: string | null;
  assetPath: string | null;
  previewKind?: ModelPreviewKind | null;
  previewPath?: string | null;
  previewCamera?: {
    position?: number[];
    fov?: number;
  };
  deviceDescription?: string;
  contentSections?: FirestoreContentSectionDoc[];
  specifications?: FirestoreSpecificationDoc[];
  sortOrder?: number;
}

interface FirestoreSpecificationDoc {
  id?: string;
  label?: string;
  value?: string;
  sortOrder?: number;
}

interface FirestoreContentSectionDoc {
  id?: string;
  title?: string;
  content?: string;
  sortOrder?: number;
}

interface FirestorePartDoc {
  partKey: string;
  title: string;
  description: string;
  meshIndexes?: number[];
  silhouette?: {
    opacity?: number;
    edgeThresholdAngle?: number;
    showEdges?: boolean;
  };
  sortOrder?: number;
}

interface FirestoreMeshDoc {
  meshIndex: number;
  nodeName?: string;
  meshName?: string;
  label?: string;
  sortOrder?: number;
}

interface FirestoreExplosionSettingsDoc {
  minDistance?: number;
  maxDistance?: number;
  axisSnapRatio?: number;
  coreVerticalSplitFactor?: number;
  coreVerticalBiasRatio?: number;
}

interface FirestoreDisassemblyProcedureDoc {
  modelSlug: string;
  title: string;
  sortOrder?: number;
}

interface FirestoreDisassemblyStepDoc {
  id?: string;
  title?: string;
  description?: string;
  partId?: string | null;
  focusMeshIndex?: number | null;
  cameraPreset?: {
    position?: number[];
    target?: number[];
    fov?: number;
  };
  sortOrder?: number;
}

const normalizePreviewKind = (value: unknown): ModelPreviewKind | null => {
  return value === 'model' || value === 'image' ? value : null;
};

const normalizeVisibility = (value: unknown): ModelVisibility => {
  return value === 'public' ? 'public' : 'private';
};

const normalizeSpecifications = (value: unknown): ModelSpecificationItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (typeof item !== 'object' || !item) {
        return null;
      }

      const raw = item as { id?: unknown; label?: unknown; value?: unknown };
      const label = typeof raw.label === 'string' ? raw.label : '';
      const specValue = typeof raw.value === 'string' ? raw.value : '';
      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : `spec-${index + 1}`;

      if (!label.trim() && !specValue.trim()) {
        return null;
      }

      return {
        id,
        label,
        value: specValue,
      } satisfies ModelSpecificationItem;
    })
    .filter((item): item is ModelSpecificationItem => Boolean(item));
};

const normalizeContentSections = (value: unknown): ModelContentSectionItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (typeof item !== 'object' || !item) {
        return null;
      }

      const raw = item as { id?: unknown; title?: unknown; content?: unknown };
      const title = typeof raw.title === 'string' ? raw.title : '';
      const content = typeof raw.content === 'string' ? raw.content : '';
      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : `section-${index + 1}`;

      if (!title.trim() && !content.trim()) {
        return null;
      }

      return {
        id,
        title,
        content,
      } satisfies ModelContentSectionItem;
    })
    .filter((item): item is ModelContentSectionItem => Boolean(item));
};

const buildDeviceDescriptionFromSections = (sections: ModelContentSectionItem[]): string => {
  if (sections.length === 0) {
    return '';
  }

  const descriptionSection = sections.find((section) => section.id === 'device-description')
    ?? sections.find((section) => section.title.trim().toLowerCase() === 'описание устройства')
    ?? sections[0];

  return descriptionSection.content ?? '';
};

const toSafeNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const DEFAULT_PREVIEW_CAMERA_SETTINGS: ModelPreviewCameraSettings = {
  position: [2.8, 2.35, 3.1],
  fov: 33,
};

const DEFAULT_DISASSEMBLY_CAMERA_PRESET: ModelDisassemblyStepCameraPreset = {
  position: [45, 18, 3.2],
  target: [0, 0, 0],
  fov: 33,
};

const normalizePreviewCamera = (value: unknown): ModelPreviewCameraSettings => {
  const raw = typeof value === 'object' && value ? (value as { position?: unknown; fov?: unknown }) : {};
  const pos = Array.isArray(raw.position) ? raw.position : [];
  const px = typeof pos[0] === 'number' && Number.isFinite(pos[0]) ? pos[0] : DEFAULT_PREVIEW_CAMERA_SETTINGS.position[0];
  const py = typeof pos[1] === 'number' && Number.isFinite(pos[1]) ? pos[1] : DEFAULT_PREVIEW_CAMERA_SETTINGS.position[1];
  const pz = typeof pos[2] === 'number' && Number.isFinite(pos[2]) ? pos[2] : DEFAULT_PREVIEW_CAMERA_SETTINGS.position[2];
  const fov = typeof raw.fov === 'number' && Number.isFinite(raw.fov) ? raw.fov : DEFAULT_PREVIEW_CAMERA_SETTINGS.fov;

  return {
    position: [px, py, pz],
    fov,
  };
};

const normalizePartSilhouette = (value: unknown): ModelPartSilhouetteSettings => {
  const raw = typeof value === 'object' && value
    ? (value as { opacity?: unknown; edgeThresholdAngle?: unknown; showEdges?: unknown })
    : {};
  const opacity = toSafeNumber(raw.opacity);
  const edgeThresholdAngle = toSafeNumber(raw.edgeThresholdAngle);
  const showEdges = typeof raw.showEdges === 'boolean' ? raw.showEdges : DEFAULT_PART_SILHOUETTE.showEdges;

  return {
    opacity: opacity === null ? DEFAULT_PART_SILHOUETTE.opacity : clamp(opacity, 0, 1),
    edgeThresholdAngle:
      edgeThresholdAngle === null
        ? DEFAULT_PART_SILHOUETTE.edgeThresholdAngle
        : clamp(edgeThresholdAngle, 0, 180),
    showEdges,
  };
};

const normalizeDisassemblyCameraPreset = (value: unknown): ModelDisassemblyStepCameraPreset => {
  const raw = typeof value === 'object' && value
    ? (value as { position?: unknown; target?: unknown; fov?: unknown })
    : {};
  const rawPosition = Array.isArray(raw.position) ? raw.position : [];
  const rawTarget = Array.isArray(raw.target) ? raw.target : [];

  const px = typeof rawPosition[0] === 'number' && Number.isFinite(rawPosition[0])
    ? rawPosition[0]
    : DEFAULT_DISASSEMBLY_CAMERA_PRESET.position[0];
  const py = typeof rawPosition[1] === 'number' && Number.isFinite(rawPosition[1])
    ? rawPosition[1]
    : DEFAULT_DISASSEMBLY_CAMERA_PRESET.position[1];
  const pz = typeof rawPosition[2] === 'number' && Number.isFinite(rawPosition[2])
    ? rawPosition[2]
    : DEFAULT_DISASSEMBLY_CAMERA_PRESET.position[2];
  const tx = typeof rawTarget[0] === 'number' && Number.isFinite(rawTarget[0])
    ? rawTarget[0]
    : DEFAULT_DISASSEMBLY_CAMERA_PRESET.target[0];
  const ty = typeof rawTarget[1] === 'number' && Number.isFinite(rawTarget[1])
    ? rawTarget[1]
    : DEFAULT_DISASSEMBLY_CAMERA_PRESET.target[1];
  const tz = typeof rawTarget[2] === 'number' && Number.isFinite(rawTarget[2])
    ? rawTarget[2]
    : DEFAULT_DISASSEMBLY_CAMERA_PRESET.target[2];
  const fov = typeof raw.fov === 'number' && Number.isFinite(raw.fov)
    ? raw.fov
    : DEFAULT_DISASSEMBLY_CAMERA_PRESET.fov;

  return {
    position: [clamp(px, -360, 360), clamp(py, -89, 89), clamp(Math.abs(pz), 0.2, 100)],
    target: [clamp(tx, -50, 50), clamp(ty, -50, 50), clamp(tz, -50, 50)],
    fov: clamp(fov, 10, 90),
  };
};

export const createFirestoreModelCatalogRepository = (firestore: Firestore): ModelCatalogRepository => {
  const deleteCollectionDocs = async (collection: FirebaseFirestore.CollectionReference) => {
    while (true) {
      const snapshot = await collection.limit(MAX_BATCH_DELETE).get();
      if (snapshot.empty) {
        return;
      }

      const batch = firestore.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      if (snapshot.size < MAX_BATCH_DELETE) {
        return;
      }
    }
  };

  const mapCategoryDoc = (
    doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
  ) => {
    const data = doc.data() as FirestoreCategoryDoc | undefined;

    return {
      id: doc.id,
      title: data?.title ?? '',
      description: data?.description ?? '',
    } satisfies ModelCatalogCategory;
  };

  const mapPartDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) => {
    const data = doc.data() as FirestorePartDoc | undefined;

    return {
      id: data?.partKey || doc.id,
      title: data?.title ?? '',
      description: data?.description ?? '',
      meshIndexes: Array.isArray(data?.meshIndexes)
        ? data.meshIndexes.filter((value): value is number => Number.isInteger(value))
        : [],
      silhouette: normalizePartSilhouette(data?.silhouette),
    } satisfies ModelPartInfo;
  };

  const mapMeshDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) => {
    const data = doc.data() as FirestoreMeshDoc | undefined;
    const meshIndex = Number.isInteger(data?.meshIndex) ? Number(data?.meshIndex) : Number(doc.id);
    const nodeName = typeof data?.nodeName === 'string' ? data.nodeName : '';
    const meshName = typeof data?.meshName === 'string' ? data.meshName : '';
    const label = typeof data?.label === 'string' && data.label.trim() ? data.label : nodeName || meshName || `Mesh #${meshIndex + 1}`;

    return {
      meshIndex,
      nodeName,
      meshName,
      label,
    } satisfies ModelMeshInfo;
  };

  const mapSpecificationDoc = (
    doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
    fallbackIndex = 0,
  ) => {
    const data = doc.data() as FirestoreSpecificationDoc | undefined;
    const label = typeof data?.label === 'string' ? data.label : '';
    const value = typeof data?.value === 'string' ? data.value : '';
    const id = typeof data?.id === 'string' && data.id.trim() ? data.id : doc.id || `spec-${fallbackIndex + 1}`;

    return {
      id,
      label,
      value,
    } satisfies ModelSpecificationItem;
  };

  const mapContentSectionDoc = (
    doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
    fallbackIndex = 0,
  ) => {
    const data = doc.data() as FirestoreContentSectionDoc | undefined;
    const title = typeof data?.title === 'string' ? data.title : '';
    const content = typeof data?.content === 'string' ? data.content : '';
    const id = typeof data?.id === 'string' && data.id.trim() ? data.id : doc.id || `section-${fallbackIndex + 1}`;

    return {
      id,
      title,
      content,
    } satisfies ModelContentSectionItem;
  };

  const getModelSpecificationsFromSubcollection = async (modelRef: FirebaseFirestore.DocumentReference) => {
    const snapshot = await modelRef.collection(SPECIFICATIONS_SUBCOLLECTION).orderBy('sortOrder', 'asc').get();
    return snapshot.docs
      .map((doc, index) => mapSpecificationDoc(doc, index))
      .filter((item) => item.label.trim() || item.value.trim());
  };

  const getModelContentSectionsFromSubcollection = async (modelRef: FirebaseFirestore.DocumentReference) => {
    const snapshot = await modelRef.collection(CONTENT_SECTIONS_SUBCOLLECTION).orderBy('sortOrder', 'asc').get();
    return snapshot.docs
      .map((doc, index) => mapContentSectionDoc(doc, index))
      .filter((item) => item.title.trim() || item.content.trim());
  };

  const mapDisassemblyStepDoc = (
    doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
    fallbackIndex = 0,
  ) => {
    const data = doc.data() as FirestoreDisassemblyStepDoc | undefined;
    const id = typeof data?.id === 'string' && data.id.trim() ? data.id : doc.id || `step-${fallbackIndex + 1}`;
    const title = typeof data?.title === 'string' ? data.title : '';
    const description = typeof data?.description === 'string' ? data.description : '';
    const partId = typeof data?.partId === 'string' && data.partId.trim() ? data.partId : null;
    const focusMeshIndex = Number.isInteger(data?.focusMeshIndex) && Number(data?.focusMeshIndex) >= 0
      ? Number(data?.focusMeshIndex)
      : null;

    return {
      id,
      title,
      description,
      partId,
      focusMeshIndex: partId ? focusMeshIndex : null,
      order: Number(data?.sortOrder ?? fallbackIndex),
      cameraPreset: normalizeDisassemblyCameraPreset(data?.cameraPreset),
    } satisfies ModelDisassemblyStep;
  };

  const getDisassemblyProcedureRef = (modelSlug: string) =>
    firestore.collection(SERVICE_PROCEDURES_COLLECTION).doc(modelSlug);

  const getDisassemblyProcedureByRef = async (
    procedureRef: FirebaseFirestore.DocumentReference,
  ): Promise<ModelDisassemblyProcedure | null> => {
    const procedureDoc = await procedureRef.get();
    if (!procedureDoc.exists) {
      return null;
    }

    const data = procedureDoc.data() as FirestoreDisassemblyProcedureDoc | undefined;
    const stepsSnapshot = await procedureRef.collection(PROCEDURE_STEPS_SUBCOLLECTION).orderBy('sortOrder', 'asc').get();
    const steps = stepsSnapshot.docs
      .map((doc, index) => mapDisassemblyStepDoc(doc, index))
      .filter((step) => step.title.trim() || step.description.trim());

    return {
      id: procedureDoc.id,
      modelSlug: data?.modelSlug ?? procedureDoc.id,
      title: data?.title ?? '',
      steps,
    } satisfies ModelDisassemblyProcedure;
  };

  const mapExplosionSettingsDoc = (
    doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
  ) => {
    const data = doc.data() as FirestoreExplosionSettingsDoc | undefined;
    if (!data) {
      return null;
    }

    const minDistance = toSafeNumber(data.minDistance);
    const maxDistance = toSafeNumber(data.maxDistance);
    const axisSnapRatio = toSafeNumber(data.axisSnapRatio);
    const coreVerticalSplitFactor = toSafeNumber(data.coreVerticalSplitFactor);
    const coreVerticalBiasRatio = toSafeNumber(data.coreVerticalBiasRatio);

    if (
      minDistance === null
      || maxDistance === null
      || axisSnapRatio === null
      || coreVerticalSplitFactor === null
      || coreVerticalBiasRatio === null
    ) {
      return null;
    }

    return {
      minDistance,
      maxDistance,
      axisSnapRatio,
      coreVerticalSplitFactor,
      coreVerticalBiasRatio,
    } satisfies ModelExplosionSettings;
  };

  const mapModelDoc = (
    doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
  ) => {
    const data = doc.data() as FirestoreModelDoc | undefined;
    const assetPath = data?.assetPath ?? null;

    let previewKind = normalizePreviewKind(data?.previewKind);
    let previewPath = typeof data?.previewPath === 'string' ? data.previewPath : null;

    if (!previewKind && assetPath) {
      previewKind = 'model';
    }

    if (!previewPath && previewKind === 'model' && assetPath) {
      previewPath = assetPath;
    }

    const specifications = normalizeSpecifications(data?.specifications);
    const contentSectionsFromDoc = normalizeContentSections(data?.contentSections);
    const contentSections = contentSectionsFromDoc.length > 0
      ? contentSectionsFromDoc
      : typeof data?.deviceDescription === 'string' && data.deviceDescription.trim()
        ? [
            {
              id: 'device-description',
              title: 'Описание устройства',
              content: data.deviceDescription,
            } satisfies ModelContentSectionItem,
          ]
        : [];

    return {
      id: doc.id,
      slug: data?.slug || doc.id,
      title: data?.title ?? '',
      description: data?.description ?? '',
      visibility: normalizeVisibility(data?.visibility),
      categoryId: typeof data?.categoryId === 'string' ? data.categoryId : null,
      categoryTitle: typeof data?.categoryTitle === 'string' ? data.categoryTitle : null,
      assetPath,
      hasAsset: Boolean(assetPath),
      previewKind,
      previewPath,
      previewCamera: normalizePreviewCamera(data?.previewCamera),
      deviceDescription: typeof data?.deviceDescription === 'string' ? data.deviceDescription : '',
      contentSections,
      specifications,
    } satisfies ModelCatalogItem;
  };

  const getModelRef = (modelSlug: string) => firestore.collection(MODELS_COLLECTION).doc(modelSlug);

  const replaceModelSpecifications = async (
    modelRef: FirebaseFirestore.DocumentReference,
    specifications: ModelSpecificationItem[],
  ) => {
    const collection = modelRef.collection(SPECIFICATIONS_SUBCOLLECTION);
    await deleteCollectionDocs(collection);

    if (specifications.length === 0) {
      return;
    }

    const batch = firestore.batch();
    specifications.forEach((specification, index) => {
      batch.set(
        collection.doc(specification.id),
        {
          id: specification.id,
          label: specification.label,
          value: specification.value,
          sortOrder: index,
        } satisfies FirestoreSpecificationDoc,
      );
    });

    await batch.commit();
  };

  const replaceModelContentSections = async (
    modelRef: FirebaseFirestore.DocumentReference,
    sections: ModelContentSectionItem[],
    fallbackDeviceDescription: string,
  ) => {
    const collection = modelRef.collection(CONTENT_SECTIONS_SUBCOLLECTION);
    await deleteCollectionDocs(collection);

    const normalizedSections = sections.length > 0
      ? sections
      : (fallbackDeviceDescription.trim()
          ? [{
              id: 'device-description',
              title: 'Описание устройства',
              content: fallbackDeviceDescription.trim(),
            } satisfies ModelContentSectionItem]
          : []);

    if (normalizedSections.length === 0) {
      return;
    }

    const batch = firestore.batch();
    normalizedSections.forEach((section, index) => {
      batch.set(
        collection.doc(section.id),
        {
          id: section.id,
          title: section.title,
          content: section.content,
          sortOrder: index,
        } satisfies FirestoreContentSectionDoc,
      );
    });

    await batch.commit();
  };

  const getModelWithContentByRef = async (modelRef: FirebaseFirestore.DocumentReference) => {
    const modelDoc = await modelRef.get();
    if (!modelDoc.exists) {
      return null;
    }

    const baseModel = mapModelDoc(modelDoc);
    const [specifications, contentSections] = await Promise.all([
      getModelSpecificationsFromSubcollection(modelRef),
      getModelContentSectionsFromSubcollection(modelRef),
    ]);

    return {
      ...baseModel,
      specifications: specifications.length > 0 ? specifications : baseModel.specifications,
      contentSections: contentSections.length > 0 ? contentSections : baseModel.contentSections,
      deviceDescription:
        contentSections.length > 0
          ? buildDeviceDescriptionFromSections(contentSections)
          : baseModel.deviceDescription,
    } satisfies ModelCatalogItem;
  };

  const replaceDisassemblyProcedure = async (
    input: UpsertModelDisassemblyProcedureInput,
  ): Promise<ModelDisassemblyProcedure | null> => {
    const modelRef = getModelRef(input.modelSlug);
    const modelDoc = await modelRef.get();

    if (!modelDoc.exists) {
      return null;
    }

    const procedureRef = getDisassemblyProcedureRef(input.modelSlug);
    await procedureRef.set(
      {
        modelSlug: input.modelSlug,
        title: input.title,
      } satisfies FirestoreDisassemblyProcedureDoc,
      { merge: true },
    );

    const stepsCollection = procedureRef.collection(PROCEDURE_STEPS_SUBCOLLECTION);
    await deleteCollectionDocs(stepsCollection);

    if (input.steps.length > 0) {
      const batch = firestore.batch();
      input.steps.forEach((step, index) => {
        batch.set(
          stepsCollection.doc(step.id),
          {
            id: step.id,
            title: step.title,
            description: step.description,
            partId: step.partId,
            focusMeshIndex: step.partId ? step.focusMeshIndex : null,
            cameraPreset: {
              position: step.cameraPreset.position,
              target: step.cameraPreset.target,
              fov: step.cameraPreset.fov,
            },
            sortOrder: index,
          } satisfies FirestoreDisassemblyStepDoc,
        );
      });
      await batch.commit();
    }

    return getDisassemblyProcedureByRef(procedureRef);
  };

  return {
    async listCategories() {
      const snapshot = await firestore.collection(CATEGORIES_COLLECTION).orderBy('sortOrder', 'asc').get();
      return snapshot.docs.map((doc) => mapCategoryDoc(doc));
    },

    async getCategoryById(categoryId: string) {
      const doc = await firestore.collection(CATEGORIES_COLLECTION).doc(categoryId).get();
      if (!doc.exists) {
        return null;
      }

      return mapCategoryDoc(doc);
    },

    async createCategory(input: { id: string; title: string; description: string }) {
      const categoriesCollection = firestore.collection(CATEGORIES_COLLECTION);
      const categoryRef = categoriesCollection.doc(input.id);

      const existing = await categoryRef.get();
      if (existing.exists) {
        throw new Error('category_id_conflict');
      }

      const lastSnapshot = await categoriesCollection.orderBy('sortOrder', 'desc').limit(1).get();
      const lastSortOrder = lastSnapshot.empty
        ? -1
        : Number((lastSnapshot.docs[0].data() as FirestoreCategoryDoc).sortOrder ?? -1);

      await categoryRef.set({
        title: input.title,
        description: input.description,
        sortOrder: lastSortOrder + 1,
      } satisfies FirestoreCategoryDoc);

      const created = await categoryRef.get();
      return mapCategoryDoc(created);
    },

    async listModels(includePrivate = false) {
      const snapshot = await firestore.collection(MODELS_COLLECTION).orderBy('sortOrder', 'asc').get();
      const items = snapshot.docs.map((doc) => mapModelDoc(doc));
      return includePrivate ? items : items.filter((item) => item.visibility === 'public');
    },

    async hasModelBySlug(modelSlug: string) {
      const modelDoc = await getModelRef(modelSlug).get();
      return modelDoc.exists;
    },

    async getModelBySlug(modelSlug: string) {
      return getModelWithContentByRef(getModelRef(modelSlug));
    },

    async getPartsByModelSlug(modelSlug: string) {
      const modelRef = getModelRef(modelSlug);
      const modelDoc = await modelRef.get();

      if (!modelDoc.exists) {
        return null;
      }

      const snapshot = await modelRef.collection(PARTS_SUBCOLLECTION).orderBy('sortOrder', 'asc').get();
      return snapshot.docs.map((doc) => mapPartDoc(doc));
    },

    async getMeshesByModelSlug(modelSlug: string) {
      const modelRef = getModelRef(modelSlug);
      const modelDoc = await modelRef.get();

      if (!modelDoc.exists) {
        return null;
      }

      const snapshot = await modelRef.collection(MESHES_SUBCOLLECTION).orderBy('meshIndex', 'asc').get();
      return snapshot.docs.map((doc) => mapMeshDoc(doc));
    },

    async replaceMeshes(input: ReplaceModelMeshesInput) {
      const modelRef = getModelRef(input.modelSlug);
      const modelDoc = await modelRef.get();

      if (!modelDoc.exists) {
        return null;
      }

      const meshesCollection = modelRef.collection(MESHES_SUBCOLLECTION);
      const existingSnapshot = await meshesCollection.get();
      const batch = firestore.batch();

      existingSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

      input.meshes.forEach((mesh, index) => {
        const ref = meshesCollection.doc(String(mesh.meshIndex));
        batch.set(ref, {
          meshIndex: mesh.meshIndex,
          nodeName: mesh.nodeName,
          meshName: mesh.meshName,
          label: mesh.label,
          sortOrder: index,
        } satisfies FirestoreMeshDoc);
      });

      await batch.commit();

      const updatedSnapshot = await meshesCollection.orderBy('meshIndex', 'asc').get();
      return updatedSnapshot.docs.map((doc) => mapMeshDoc(doc));
    },

    async getExplosionSettingsByModelSlug(modelSlug: string) {
      const modelRef = getModelRef(modelSlug);
      const modelDoc = await modelRef.get();

      if (!modelDoc.exists) {
        return null;
      }

      const presetDoc = await modelRef.collection(EXPLODE_PRESETS_SUBCOLLECTION).doc(DEFAULT_EXPLODE_PRESET_ID).get();
      if (!presetDoc.exists) {
        return null;
      }

      return mapExplosionSettingsDoc(presetDoc);
    },

    async upsertExplosionSettings(input: UpsertModelExplosionSettingsInput) {
      const modelRef = getModelRef(input.modelSlug);
      const modelDoc = await modelRef.get();

      if (!modelDoc.exists) {
        return null;
      }

      const presetRef = modelRef.collection(EXPLODE_PRESETS_SUBCOLLECTION).doc(DEFAULT_EXPLODE_PRESET_ID);
      await presetRef.set(
        {
          ...input.settings,
        } satisfies FirestoreExplosionSettingsDoc,
        { merge: true },
      );

      const updatedDoc = await presetRef.get();
      return mapExplosionSettingsDoc(updatedDoc);
    },

    async updateModelPreviewCamera(input: UpdateModelPreviewCameraInput) {
      const modelRef = getModelRef(input.modelSlug);
      const existing = await modelRef.get();

      if (!existing.exists) {
        return null;
      }

      await modelRef.set(
        {
          previewCamera: {
            position: input.previewCamera.position,
            fov: input.previewCamera.fov,
          },
        } satisfies Partial<FirestoreModelDoc>,
        { merge: true },
      );

      const updated = await modelRef.get();
      return mapModelDoc(updated);
    },

    async getDisassemblyProcedureByModelSlug(modelSlug: string) {
      const modelRef = getModelRef(modelSlug);
      const modelDoc = await modelRef.get();
      if (!modelDoc.exists) {
        return null;
      }

      return getDisassemblyProcedureByRef(getDisassemblyProcedureRef(modelSlug));
    },

    async upsertDisassemblyProcedure(input: UpsertModelDisassemblyProcedureInput) {
      return replaceDisassemblyProcedure(input);
    },

    async createModel(input: CreateModelCatalogItemInput) {
      const modelsCollection = firestore.collection(MODELS_COLLECTION);
      const modelRef = modelsCollection.doc(input.slug);

      const existing = await modelRef.get();
      if (existing.exists) {
        throw new Error('model_slug_conflict');
      }

      const lastSnapshot = await modelsCollection.orderBy('sortOrder', 'desc').limit(1).get();
      const lastSortOrder = lastSnapshot.empty
        ? -1
        : Number((lastSnapshot.docs[0].data() as FirestoreModelDoc).sortOrder ?? -1);

      await modelRef.set({
        slug: input.slug,
        title: input.title,
        description: input.description,
        visibility: input.visibility,
        categoryId: input.categoryId,
        categoryTitle: input.categoryTitle,
        assetPath: input.assetPath,
        previewKind: input.previewKind,
        previewPath: input.previewPath,
        deviceDescription: input.deviceDescription,
        specifications: input.specifications,
        sortOrder: lastSortOrder + 1,
      } satisfies FirestoreModelDoc);

      await Promise.all([
        replaceModelSpecifications(modelRef, input.specifications),
        replaceModelContentSections(modelRef, input.contentSections ?? [], input.deviceDescription),
      ]);

      const created = await getModelWithContentByRef(modelRef);
      if (!created) {
        throw new Error('model_create_failed');
      }
      return created;
    },

    async updateModel(input: UpdateModelCatalogItemInput) {
      const modelRef = getModelRef(input.slug);
      const existing = await modelRef.get();

      if (!existing.exists) {
        return null;
      }

      await modelRef.set(
        {
          title: input.title,
          description: input.description,
          visibility: input.visibility,
          categoryId: input.categoryId,
          categoryTitle: input.categoryTitle,
          assetPath: input.assetPath,
          previewKind: input.previewKind,
          previewPath: input.previewPath,
        } satisfies Partial<FirestoreModelDoc>,
        { merge: true },
      );

      const updated = await modelRef.get();
      return mapModelDoc(updated);
    },

    async deleteModel(modelSlug: string) {
      const modelRef = getModelRef(modelSlug);
      const existing = await modelRef.get();

      if (!existing.exists) {
        return false;
      }

      const disassemblyRef = getDisassemblyProcedureRef(modelSlug);
      await deleteCollectionDocs(modelRef.collection(PARTS_SUBCOLLECTION));
      await deleteCollectionDocs(modelRef.collection(MESHES_SUBCOLLECTION));
      await deleteCollectionDocs(modelRef.collection(SPECIFICATIONS_SUBCOLLECTION));
      await deleteCollectionDocs(modelRef.collection(CONTENT_SECTIONS_SUBCOLLECTION));
      await deleteCollectionDocs(modelRef.collection(EXPLODE_PRESETS_SUBCOLLECTION));
      await deleteCollectionDocs(disassemblyRef.collection(PROCEDURE_STEPS_SUBCOLLECTION));
      await disassemblyRef.delete();
      await modelRef.delete();

      return true;
    },

    async updateModelContent(input: UpdateModelContentInput) {
      const modelRef = getModelRef(input.modelSlug);
      const existing = await modelRef.get();

      if (!existing.exists) {
        return null;
      }

      await modelRef.set(
        {
          deviceDescription: input.deviceDescription,
          specifications: input.specifications,
        } satisfies Partial<FirestoreModelDoc>,
        { merge: true },
      );

      await Promise.all([
        replaceModelSpecifications(modelRef, input.specifications),
        replaceModelContentSections(modelRef, input.contentSections ?? [], input.deviceDescription),
      ]);

      return getModelWithContentByRef(modelRef);
    },

    async upsertPart(input: UpsertModelPartInput) {
      const modelRef = getModelRef(input.modelSlug);
      const modelDoc = await modelRef.get();

      if (!modelDoc.exists) {
        return null;
      }

      const partRef = modelRef.collection(PARTS_SUBCOLLECTION).doc(input.partId);
      const partDoc = await partRef.get();

      let sortOrder: number;
      if (partDoc.exists) {
        sortOrder = Number((partDoc.data() as FirestorePartDoc).sortOrder ?? 0);
      } else {
        const lastPartSnapshot = await modelRef.collection(PARTS_SUBCOLLECTION).orderBy('sortOrder', 'desc').limit(1).get();
        sortOrder = lastPartSnapshot.empty
          ? 0
          : Number((lastPartSnapshot.docs[0].data() as FirestorePartDoc).sortOrder ?? -1) + 1;
      }

      await partRef.set(
        {
          partKey: input.partId,
          title: input.title,
          description: input.description,
          meshIndexes: input.meshIndexes,
          silhouette: {
            opacity: input.silhouette.opacity,
            edgeThresholdAngle: input.silhouette.edgeThresholdAngle,
            showEdges: input.silhouette.showEdges,
          },
          sortOrder,
        } satisfies FirestorePartDoc,
        { merge: true },
      );

      const updatedPart = await partRef.get();
      return mapPartDoc(updatedPart);
    },

    async deletePart(modelSlug: string, partId: string) {
      const modelRef = getModelRef(modelSlug);
      const modelDoc = await modelRef.get();

      if (!modelDoc.exists) {
        return null;
      }

      const partRef = modelRef.collection(PARTS_SUBCOLLECTION).doc(partId);
      const partDoc = await partRef.get();

      if (!partDoc.exists) {
        return false;
      }

      await partRef.delete();
      return true;
    },
  };
};
