import { z } from 'zod';

/**
 * Le contrat que chaque expérience doit remplir.
 *
 * Un projet = un dossier dans `src/projects/<slug>/` contenant au minimum :
 *   - `meta.ts`   → `export default defineProject({ ... })`
 *   - `Page.astro` → le contenu de la page (libre : island React, canvas, statique…)
 *
 * Rien d'autre à modifier ailleurs : la homepage, la route, les meta OG
 * et les tests e2e sont dérivés d'ici automatiquement.
 */
export const projectSchema = z.object({
  /** Kebab-case, doit être identique au nom du dossier. Devient l'URL /p/<slug>. */
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'le slug doit être en kebab-case (ex: mon-super-jeu)'),

  /** Affiché sur la carte d'accueil et dans le <title>. */
  title: z.string().min(1).max(60),

  /** Une phrase. Sert de sous-titre sur la carte et de description OG. */
  blurb: z.string().min(1).max(160),

  /** ISO `YYYY-MM-DD`. Sert au tri de l'accueil (plus récent en premier). */
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format attendu : YYYY-MM-DD'),

  /**
   * `draft`    → visible en dev uniquement, absent du build de production.
   * `live`     → publié.
   * `archived` → conservé et accessible par URL, retiré de l'accueil.
   */
  status: z.enum(['draft', 'live', 'archived']).default('draft'),

  tags: z.array(z.string()).default([]),

  /** Couleur d'accent du projet, exposée en CSS via `--accent`. */
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'couleur hex sur 6 chiffres attendue (ex: #e8503a)')
    .default('#5b8def'),

  /** Chemin d'image relatif à `public/`, ex. `/covers/mon-jeu.webp`. */
  cover: z.string().startsWith('/').optional(),

  /** À `true` si le jeu exige souris/clavier — on avertit alors sur mobile. */
  needsPointer: z.boolean().default(false),
});

export type Project = z.output<typeof projectSchema>;
export type ProjectInput = z.input<typeof projectSchema>;

/** Valide un manifeste au build. Une erreur ici casse le build, c'est voulu. */
export function defineProject(input: ProjectInput): Project {
  const result = projectSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  · ${i.path.join('.') || '(racine)'} : ${i.message}`)
      .join('\n');
    throw new Error(`Manifeste de projet invalide (${input.slug ?? '?'}) :\n${issues}`);
  }
  return result.data;
}
