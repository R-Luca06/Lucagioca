# Conventions du projet

Collection d'expériences interactives indépendantes sous un même domaine, dans
l'esprit de neal.fun.

**Stack** : Astro 5 (statique, islands) · React 19 pour l'interactivité · TypeScript
strict · Biome (lint + format) · Playwright (e2e) · pnpm.

## La règle qui prime sur les autres

**Ajouter un projet ne doit modifier aucun fichier existant.** On crée un dossier
dans `src/projects/<slug>/`, et la route, la carte d'accueil, les meta OG et les
tests e2e en découlent automatiquement via `src/registry.ts`.

Si une évolution t'oblige à éditer un fichier central pour chaque nouveau jeu,
c'est le signe qu'il faut plutôt étendre le manifeste.

## Anatomie d'un projet

```
src/projects/<slug>/
├─ meta.ts        obligatoire — export default defineProject({ ... })
├─ Page.astro     obligatoire — le contenu de la page
├─ <Jeu>.tsx      optionnel — island React
├─ <slug>.css     optionnel — styles LOCAUX, préfixés par .<slug>
└─ assets/        optionnel
```

- `slug` dans `meta.ts` **doit** être identique au nom du dossier (vérifié au build).
- On démarre en `status: 'draft'` : visible en dev, absent du build de prod.
- `archived` conserve l'URL mais retire la carte de l'accueil.

## Ce qu'on partage, et ce qu'on ne partage pas

`src/shared/` reste **délibérément petit**. Chaque projet doit pouvoir avoir une
identité visuelle radicalement différente ; un design system uniformisant tuerait
l'intérêt du site.

| Partagé | Jamais partagé |
|---|---|
| Tokens d'espacement, rayons, anneau de focus | Couleurs de jeu, typographies, animations |
| Chrome (`ProjectLayout` : retour, meta, badges) | Mise en page interne d'un jeu |
| Moteur (`rng`, `storage`, `useGameLoop`) | Logique de règles |

Un besoin qui n'apparaît que dans un projet reste dans ce projet. On ne remonte
dans `shared/` qu'à partir du **troisième** usage réel.

## Règles techniques non négociables

1. **Jamais `Math.random()`** dans un jeu — utiliser `createRng()` de
   `@/shared/engine/rng`. Un aléa seedé rend les bugs reproductibles et offre
   les défis quotidiens gratuitement via `dailySeed()`.
2. **Jamais `localStorage` en direct** — passer par `createStore()`, qui gère le
   versionnement, la validation Zod et l'échec silencieux en navigation privée.
3. **`prefers-reduced-motion` géré dès le premier commit d'un jeu.** Le garde-fou
   CSS global ne couvre pas les animations pilotées en JS : utiliser
   `usePrefersReducedMotion()`.
4. **La directive d'hydratation la plus paresseuse qui marche** :
   `client:idle` > `client:visible` > `client:load`. Ne jamais mettre
   `client:only` sans raison écrite en commentaire.
5. **CSS scopé par projet** : toutes les règles sous une classe racine `.<slug>`.
   Aucun sélecteur d'élément nu (`h1 { }`) en dehors de `tokens.css`.
6. **Le backend est optionnel par jeu.** Un jeu doit rester jouable si l'API
   est indisponible.

## Commandes

```bash
pnpm dev        # serveur de dev, drafts inclus
pnpm verify     # lint + typecheck + build + budget + e2e  ← avant de pousser
pnpm build      # build de prod dans dist/
```

Le budget perf (`scripts/check-budget.mjs`) échoue au-delà de 250 kB de JS gzip
au total ou 120 kB pour un seul fichier. Le relever est une décision consciente,
pas un réflexe.
