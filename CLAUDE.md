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
├─ *.test.ts      optionnel — tests unitaires, ramassés automatiquement
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
| Identité du site (`--paper`, `--ink`, `--red`, le logo) | Mise en page interne d'un jeu |
| Chrome (`ProjectLayout` : retour, meta, badges, crédits) | Logique de règles |
| Moteur (`rng`, `storage`, `useGameLoop`) | |

L'identité **lucagioca** — crème, encre, rouge — habille l'accueil et le chrome,
jamais l'intérieur d'un jeu. `--paper` et `--ink` sont des rôles : en mode
sombre, leurs valeurs s'échangent et tout ce qui en dérive suit. `--red` ne
bouge jamais, et ne sert **jamais** de couleur de texte courant : il vaut 3,5:1
sur le crème, ce qui suffit à un aplat ou à un filet, pas à une phrase.

Un projet a le droit de redéfinir les jetons de chrome pour sa page — c'est ce
que fait `ton-temps` — afin que l'en-tête et le pied de page ne déchirent pas
son ambiance.

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
7. **Tout emprunt sous licence BY remplit `credits` dans `meta.ts`.** Son,
   police, jeu de données : si la licence exige l'attribution, elle exige
   qu'elle soit **visible depuis le site**, pas consignée dans le dépôt. Le
   champ est rendu en pied de page par `ProjectLayout`. Un `CREDITS.md` non
   reporté dans le manifeste est une infraction, pas une dette.

## Ce qu'on teste, et où

Deux niveaux, qui ne se recouvrent pas :

- **Vitest** (`src/**/*.test.ts`) pour la **logique pure** — le calcul, le
  découpage, l'aléa, le stockage. Le fichier de test est posé **à côté** du
  module qu'il couvre, donc dans le dossier du projet : un nouveau jeu apporte
  ses tests avec lui, sans rien enregistrer ailleurs.
- **Playwright** (`tests/e2e/`) pour la **page** — elle se charge, elle
  n'imprime pas d'erreur console, elle ne déborde pas. Paramétré sur le
  registre : chaque nouveau projet est couvert sans écrire une ligne.

Ce qui mérite un test unitaire : tout ce qui produit un **nombre affiché au
joueur**. Un calcul faux ne plante pas, il ment — et aucun test de bout en bout
ne le verra. Ce qui n'en mérite pas : les composants React, le Web Audio, le
DOM. Le smoke e2e y suffit.

Quand tu écris un test, vérifie qu'il **échoue** si tu casses le code qu'il
couvre. Un test vert du premier coup n'a encore rien prouvé.

## Commandes

```bash
pnpm dev        # serveur de dev, drafts inclus
pnpm test       # tests unitaires (pnpm test:watch pour le mode continu)
pnpm verify     # lint + typecheck + test + build + budget + e2e  ← avant de pousser
pnpm build      # build de prod dans dist/
```

Le budget perf (`scripts/check-budget.mjs`) échoue au-delà de 250 kB de JS gzip
au total ou 120 kB pour un seul fichier. Le relever est une décision consciente,
pas un réflexe.
