import type { Project } from '@/shared/project';

/**
 * Découverte automatique des projets.
 *
 * `import.meta.glob` est résolu par Vite au build : ajouter un dossier dans
 * `src/projects/` suffit à enregistrer le projet partout. Aucun fichier
 * central à éditer — c'est la propriété qu'on protège en priorité.
 */
const metaModules = import.meta.glob<{ default: Project }>('./projects/*/meta.ts', {
  eager: true,
});

function folderNameOf(path: string): string {
  // './projects/mon-jeu/meta.ts' → 'mon-jeu'
  const segments = path.split('/');
  return segments[segments.length - 2] ?? '';
}

/** Tous les projets, drafts et archives compris, du plus récent au plus ancien. */
export const allProjects: readonly Project[] = Object.entries(metaModules)
  .map(([path, module]) => {
    const project = module.default;
    const folder = folderNameOf(path);
    if (project.slug !== folder) {
      throw new Error(
        `[registry] ${path} : slug "${project.slug}" ≠ nom du dossier "${folder}". ` +
          'Les deux doivent être identiques.',
      );
    }
    return project;
  })
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

// Un slug dupliqué produirait deux routes identiques : on échoue au build.
const seen = new Set<string>();
for (const project of allProjects) {
  if (seen.has(project.slug)) {
    throw new Error(`[registry] slug dupliqué : "${project.slug}"`);
  }
  seen.add(project.slug);
}

/**
 * Les projets qui obtiennent une route.
 * Les drafts sont routés en dev pour pouvoir travailler dessus, jamais en prod.
 */
export const routedProjects: readonly Project[] = allProjects.filter(
  (p) => p.status !== 'draft' || import.meta.env.DEV,
);

/** Les projets listés sur l'accueil : les archives gardent leur URL mais disparaissent. */
export const listedProjects: readonly Project[] = routedProjects.filter(
  (p) => p.status !== 'archived',
);
