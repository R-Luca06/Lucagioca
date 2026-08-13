# Projets

Une collection de petites expériences interactives, dans l'esprit de
[neal.fun](https://neal.fun) : chaque projet est autonome, avec sa propre
identité visuelle, sous un même domaine.

## Démarrer

```bash
pnpm install
pnpm dev          # http://localhost:4321
```

## Ajouter un projet

Créer un dossier — il n'y a rien d'autre à faire, aucun fichier central à éditer.

```bash
mkdir src/projects/mon-jeu
```

`src/projects/mon-jeu/meta.ts` :

```ts
import { defineProject } from '@/shared/project';

export default defineProject({
  slug: 'mon-jeu',            // identique au nom du dossier
  title: 'Mon Jeu',
  blurb: 'Une phrase qui donne envie de cliquer.',
  publishedAt: '2026-08-12',
  status: 'draft',            // visible en dev, absent de la prod
  accent: '#e8503a',
});
```

`src/projects/mon-jeu/Page.astro` :

```astro
---
import Jeu from './Jeu';
import './mon-jeu.css';
---

<div class="mon-jeu">
  <Jeu client:visible />
</div>
```

Le projet est alors accessible sur `/p/mon-jeu`, listé sur l'accueil dès que
`status` passe à `live`, et couvert par les tests e2e automatiquement.

## Scripts

| Commande | Rôle |
|---|---|
| `pnpm dev` | Serveur de développement, brouillons inclus |
| `pnpm build` | Build statique dans `dist/` |
| `pnpm preview` | Sert le build de prod localement |
| `pnpm lint` / `pnpm format` | Biome, vérification / correction |
| `pnpm typecheck` | `astro check` |
| `pnpm test` | Tests unitaires (Vitest), `pnpm test:watch` en continu |
| `pnpm test:e2e` | Playwright (nécessite un `build` préalable) |
| `pnpm budget` | Vérifie le poids JS |
| `pnpm verify` | Toute la chaîne — à lancer avant de pousser |

Les conventions détaillées sont dans [CLAUDE.md](./CLAUDE.md).
