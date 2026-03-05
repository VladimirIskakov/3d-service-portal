import type { Firestore, WriteBatch } from 'firebase-admin/firestore';
import { SEED_CATEGORIES, SEED_MODELS } from '../../../../../modules/model-catalog/modelCatalog.seed.js';

const MODELS_COLLECTION = 'equipmentModels';
const CATEGORIES_COLLECTION = 'catalogCategories';
const SPECIFICATIONS_SUBCOLLECTION = 'specifications';
const CONTENT_SECTIONS_SUBCOLLECTION = 'contentSections';
const DEFAULT_EXPLODE_PRESET_ID = 'default';

const buildBatchOperations = (firestore: Firestore, batch: WriteBatch) => {
  SEED_CATEGORIES.forEach((category, categoryIndex) => {
    const categoryRef = firestore.collection(CATEGORIES_COLLECTION).doc(category.id);
    batch.set(
      categoryRef,
      {
        title: category.title,
        description: category.description,
        sortOrder: categoryIndex,
      },
      { merge: true },
    );
  });

  SEED_MODELS.forEach((model, modelIndex) => {
    const modelRef = firestore.collection(MODELS_COLLECTION).doc(model.slug);
    const category = SEED_CATEGORIES.find((item) => item.id === model.categoryId) ?? null;

    batch.set(
      modelRef,
      {
        slug: model.slug,
        title: model.title,
        description: model.description,
        visibility: model.visibility,
        categoryId: model.categoryId,
        categoryTitle: category?.title ?? null,
        assetPath: model.assetPath,
        previewKind: model.assetPath ? 'model' : null,
        previewPath: model.assetPath,
        deviceDescription: model.deviceDescription,
        specifications: model.specifications,
        sortOrder: modelIndex,
      },
      { merge: true },
    );

    model.parts.forEach((part, partIndex) => {
      const partRef = modelRef.collection('parts').doc(part.id);

      batch.set(
        partRef,
        {
          partKey: part.id,
          title: part.title,
          description: part.description,
          meshIndexes: part.meshIndexes,
          sortOrder: partIndex,
        },
        { merge: true },
      );
    });

    model.meshes.forEach((mesh, meshIndex) => {
      const meshRef = modelRef.collection('meshes').doc(String(mesh.meshIndex));

      batch.set(
        meshRef,
        {
          meshIndex: mesh.meshIndex,
          nodeName: mesh.nodeName,
          meshName: mesh.meshName,
          label: mesh.label,
          sortOrder: meshIndex,
        },
        { merge: true },
      );
    });

    const explodePresetRef = modelRef.collection('explodePresets').doc(DEFAULT_EXPLODE_PRESET_ID);
    batch.set(
      explodePresetRef,
      {
        ...model.explodeSettings,
      },
      { merge: true },
    );

    model.specifications.forEach((specification, specIndex) => {
      const specRef = modelRef.collection(SPECIFICATIONS_SUBCOLLECTION).doc(specification.id);
      batch.set(
        specRef,
        {
          id: specification.id,
          label: specification.label,
          value: specification.value,
          sortOrder: specIndex,
        },
        { merge: true },
      );
    });

    if (model.deviceDescription.trim()) {
      const contentSectionRef = modelRef.collection(CONTENT_SECTIONS_SUBCOLLECTION).doc('device-description');
      batch.set(
        contentSectionRef,
        {
          id: 'device-description',
          title: 'Описание устройства',
          content: model.deviceDescription,
          sortOrder: 0,
        },
        { merge: true },
      );
    }

  });
};

export const seedFirestoreModelCatalogIfNeeded = async (firestore: Firestore) => {
  const firstModelSnapshot = await firestore.collection(MODELS_COLLECTION).limit(1).get();

  if (!firstModelSnapshot.empty) {
    return;
  }

  const batch = firestore.batch();
  buildBatchOperations(firestore, batch);
  await batch.commit();
};
