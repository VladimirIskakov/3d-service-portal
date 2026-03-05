import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AdminModelPartsEditor, getAdminCatalogModelBySlug } from '@/features/admin-catalog';
import styles from './AdminModelPartsPage.module.scss';

export const AdminModelPartsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [modelTitle, setModelTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let isMounted = true;

    const loadModelTitle = async () => {
      try {
        const model = await getAdminCatalogModelBySlug(slug);
        if (isMounted) {
          setModelTitle(model.title || null);
        }
      } catch {
        if (isMounted) {
          setModelTitle(null);
        }
      }
    };

    void loadModelTitle();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (!slug) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <section className={styles.adminModelPartsPage__page}>
      <div className={styles.adminModelPartsPage__headerCard}>
        <div>
          <h1 className={styles.adminModelPartsPage__title}>{modelTitle ?? slug}</h1>
          <p className={styles.adminModelPartsPage__subtitle}>Модель: /{slug}</p>
        </div>

        <div className={styles.adminModelPartsPage__headerActions}>
          <Link to={`/model/${slug}`} className={styles.adminModelPartsPage__inlineLink}>
            Открыть модель
          </Link>
          <Link to="/admin" className={styles.adminModelPartsPage__inlineLink}>
            К админке
          </Link>
        </div>
      </div>

      <AdminModelPartsEditor modelSlug={slug} className={styles.adminModelPartsPage__editor} />
    </section>
  );
};


