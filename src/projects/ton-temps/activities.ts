/**
 * Le catalogue, et le calcul de ce que coûte une vie.
 *
 * Deux natures de coût, et c'est toute la mécanique du jeu :
 *
 *   · `once`            — un achat, avec une quantité. Regarder une série, apprendre
 *                         le piano. Le coût ne dépend pas du pays.
 *   · `daily` / `weekly` — une habitude, prise pour la vie. Là, le coût dépend de
 *                         l'espérance de vie : dormir 8 h par nuit ne coûte pas la
 *                         même chose selon le temps qu'on a.
 *
 * Les habitudes bornées par un âge (école, travail) sont *tronquées* par
 * l'espérance de vie. Ce n'est pas un détail technique : dans un pays où l'on
 * meurt à 54 ans, on n'atteint jamais la retraite, et le calcul le dit tout seul.
 *
 * ── Règles d'ajout ────────────────────────────────────────────────────────
 *
 * 1. **Aucun chiffre sans origine.** La `source` dit d'où il sort, et le
 *    meilleur type de source est un calcul que le joueur peut refaire lui-même
 *    (« 62 épisodes de 47 minutes »). Un chiffre invérifiable décrédibilise
 *    tout l'écran, y compris ceux qui sont justes.
 * 2. **Jamais deux lignes qui comptent le même temps.** Rêver se passe pendant
 *    qu'on dort : ce serait une belle ligne, et une double dépense. Le budget
 *    n'a de sens que si les postes sont disjoints.
 * 3. **Borner par l'âge quand c'est vrai.** Personne ne lit la presse à trois
 *    ans. `fromAge` coûte une ligne et rend le total honnête.
 */

const DAYS_PER_YEAR = 365.25;
const WEEKS_PER_YEAR = 52.18;

export type Cost =
  | { readonly kind: 'once'; readonly hours: number }
  | {
      readonly kind: 'daily';
      readonly hours: number;
      readonly fromAge?: number;
      readonly toAge?: number;
    }
  | {
      readonly kind: 'weekly';
      readonly hours: number;
      /** Par défaut 52,18. Sert à l'école (36 semaines) et au travail (47, congés déduits). */
      readonly weeksPerYear?: number;
      readonly fromAge?: number;
      readonly toAge?: number;
    };

/**
 * Les rayons du catalogue.
 *
 * Ils n'existent que pour l'affichage : à cinquante lignes, une liste plate
 * n'est plus lisible. `habitudes` a une valeur particulière — c'est le seul
 * groupe dont le coût dépend du pays, et donc le seul qui porte le propos.
 */
export type GroupId = 'habitudes' | 'histoires' | 'apprentissages' | 'aventures';

export interface Group {
  readonly id: GroupId;
  readonly label: string;
  readonly note: string;
}

export const groups: readonly Group[] = [
  {
    id: 'habitudes',
    label: 'Ce que la vie prend',
    note: 'Ces lignes-là coûtent plus cher à qui vit plus longtemps. Ce sont les seules.',
  },
  {
    id: 'histoires',
    label: 'Ce qu’on regarde, lit et écoute',
    note: 'Des durées qui se recalculent : un nombre d’épisodes, un nombre de mots.',
  },
  {
    id: 'apprentissages',
    label: 'Ce qu’on apprend',
    note: 'Jusqu’au niveau où l’on s’en sert vraiment, pas jusqu’au premier cours.',
  },
  {
    id: 'aventures',
    label: 'Ce qu’on entreprend',
    note: 'Une fois dans une vie, ou jamais.',
  },
];

export interface Activity {
  readonly id: string;
  readonly label: string;
  readonly group: GroupId;
  /**
   * Le rythme dit en français — « 8 h par nuit », pas « 8 h ». Omis quand le
   * coût calculé se suffit : le répéter ici l'afficherait deux fois sur la carte.
   */
  readonly detail?: string;
  /** D'où sort le chiffre. Affiché en petit : un jeu de données doit être vérifiable. */
  readonly source: string;
  readonly emoji: string;
  readonly cost: Cost;
  /** Déduit d'office. La carte reste visible, mais on ne peut pas y renoncer. */
  readonly mandatory?: boolean;
}

/**
 * Ce que la vie prend sans vraiment demander.
 *
 * Le sommeil, lui, ne se refuse pas : il est `mandatory` et part du budget dès
 * l'ouverture. On perd le clic qui faisait disparaître un tiers de la vie, mais
 * l'animation d'ouverture reprend ce rôle — et une perte subie porte plus
 * qu'une perte qu'on a choisie.
 */
export const habits: readonly Activity[] = [
  {
    id: 'dormir',
    label: 'Dormir',
    group: 'habitudes',
    detail: '8 h par nuit, toute la vie',
    source: 'durée recommandée pour un adulte',
    emoji: '😴',
    cost: { kind: 'daily', hours: 8 },
    mandatory: true,
  },
  {
    id: 'manger',
    label: 'Manger',
    group: 'habitudes',
    detail: '1 h 30 par jour, courses et cuisine comprises',
    source: 'enquêtes emploi du temps, moyenne européenne',
    emoji: '🍽️',
    cost: { kind: 'daily', hours: 1.5 },
  },
  {
    id: 'se-preparer',
    label: 'Se laver et s’habiller',
    group: 'habitudes',
    detail: '50 min par jour, douche comprise',
    source: 'enquêtes emploi du temps, poste « soins personnels »',
    emoji: '🚿',
    cost: { kind: 'daily', hours: 0.83 },
  },
  {
    id: 'dents',
    label: 'Se brosser les dents',
    group: 'habitudes',
    detail: '2 fois 2 min par jour, à partir de 3 ans',
    source: 'durée recommandée par les dentistes — 4 min par jour',
    emoji: '🪥',
    cost: { kind: 'daily', hours: 4 / 60, fromAge: 3 },
  },
  {
    id: 'ecole',
    label: 'Aller à l’école',
    group: 'habitudes',
    detail: '30 h par semaine, de 6 à 18 ans',
    source: '36 semaines de classe par an',
    emoji: '🎒',
    cost: { kind: 'weekly', hours: 30, weeksPerYear: 36, fromAge: 6, toAge: 18 },
  },
  {
    id: 'travailler',
    label: 'Travailler',
    group: 'habitudes',
    detail: '35 h par semaine, de 22 à 64 ans',
    source: '47 semaines par an, congés déduits',
    emoji: '💼',
    cost: { kind: 'weekly', hours: 35, weeksPerYear: 47, fromAge: 22, toAge: 64 },
  },
  {
    id: 'trajets',
    label: 'Aller au travail',
    group: 'habitudes',
    detail: '1 h par jour ouvré, aller-retour',
    source: 'moyenne des trajets domicile-travail',
    emoji: '🚌',
    cost: { kind: 'weekly', hours: 5, weeksPerYear: 47, fromAge: 22, toAge: 64 },
  },
  {
    id: 'reunions',
    label: 'Être en réunion',
    group: 'habitudes',
    detail: '4 h par semaine travaillée, de 22 à 64 ans',
    source: 'moyenne des emplois de bureau — la moitié jugée inutile par ceux qui y assistent',
    emoji: '🗓️',
    cost: { kind: 'weekly', hours: 4, weeksPerYear: 47, fromAge: 22, toAge: 64 },
  },
  {
    id: 'menage',
    label: 'Tenir la maison',
    group: 'habitudes',
    detail: '1 h 24 par jour de tâches domestiques',
    source: 'moyenne adulte, enquêtes emploi du temps',
    emoji: '🧺',
    cost: { kind: 'daily', hours: 1.4 },
  },
  {
    id: 'ecrans',
    label: 'Faire défiler',
    group: 'habitudes',
    detail: '2 h 24 par jour sur les réseaux',
    source: 'moyenne mondiale 2024, DataReportal',
    emoji: '📱',
    cost: { kind: 'daily', hours: 2.4 },
  },
  {
    id: 'television',
    label: 'Regarder un écran, assis',
    group: 'habitudes',
    detail: '1 h 30 par jour, hors réseaux, à partir de 6 ans',
    source: 'télévision et vidéo à la demande, poste distinct du défilement',
    emoji: '📺',
    cost: { kind: 'daily', hours: 1.5, fromAge: 6 },
  },
  {
    id: 'musique',
    label: 'Écouter de la musique',
    group: 'habitudes',
    detail: '1 h par jour en écoute attentive, à partir de 10 ans',
    source: 'écoute comme activité principale, hors fond sonore',
    emoji: '🎧',
    cost: { kind: 'daily', hours: 1, fromAge: 10 },
  },
  {
    id: 'parler',
    label: 'Parler avec ses proches',
    group: 'habitudes',
    detail: '1 h par jour de conversation',
    source: 'enquêtes emploi du temps, poste « sociabilité »',
    emoji: '💬',
    cost: { kind: 'daily', hours: 1 },
  },
  {
    id: 'nouvelles',
    label: 'Suivre l’actualité',
    group: 'habitudes',
    detail: '20 min par jour, à partir de 18 ans',
    source: 'presse, radio et fils d’information confondus',
    emoji: '📰',
    cost: { kind: 'daily', hours: 1 / 3, fromAge: 18 },
  },
  {
    id: 'attendre',
    label: 'Faire la queue',
    group: 'habitudes',
    detail: '15 min par jour, à partir de 18 ans',
    source: 'caisses, guichets, salles d’attente et transports',
    emoji: '🧍',
    cost: { kind: 'daily', hours: 0.25, fromAge: 18 },
  },
  {
    id: 'sport',
    label: 'Faire du sport',
    group: 'habitudes',
    detail: '3 séances d’1 h par semaine',
    source: 'seuil d’activité recommandé par l’OMS',
    emoji: '🏃',
    cost: { kind: 'weekly', hours: 3 },
  },
];

/**
 * Ce qu'on choisit vraiment. Quantité libre.
 *
 * Pas de `detail` ici : leur coût ne dépend pas du pays, donc l'étiquette
 * l'affiche déjà tel quel. L'écrire une deuxième fois à la main, c'était le
 * même nombre deux lignes de suite sur chaque carte. La `source` justifie.
 *
 * Les durées de lecture sont calculées à 250 mots par minute, la vitesse
 * moyenne d'un adulte sur de la prose. Les durées de série sont le nombre
 * d'épisodes par leur durée moyenne, hors générique.
 */
export const pursuits: readonly Activity[] = [
  // ── Ce qu'on regarde, lit et écoute ───────────────────────────────────
  {
    id: 'roman',
    label: 'Lire un roman',
    group: 'histoires',
    source: '≈ 100 000 mots à 250 mots/minute',
    emoji: '📖',
    cost: { kind: 'once', hours: 8 },
  },
  {
    id: 'lotr-films',
    label: 'Voir Le Seigneur des Anneaux',
    group: 'histoires',
    source: 'les trois versions longues, 11 h 22 bout à bout',
    emoji: '💍',
    cost: { kind: 'once', hours: 11 },
  },
  {
    id: 'star-wars',
    label: 'Voir la saga Skywalker',
    group: 'histoires',
    source: '9 films d’environ 2 h 15',
    emoji: '🌌',
    cost: { kind: 'once', hours: 20 },
  },
  {
    id: 'breaking-bad',
    label: 'Regarder Breaking Bad',
    group: 'histoires',
    source: '62 épisodes de 47 minutes',
    emoji: '🧪',
    cost: { kind: 'once', hours: 49 },
  },
  {
    id: 'the-office',
    label: 'Regarder The Office en entier',
    group: 'histoires',
    source: '201 épisodes de 22 minutes',
    emoji: '📺',
    cost: { kind: 'once', hours: 74 },
  },
  {
    id: 'game-of-thrones',
    label: 'Regarder Game of Thrones',
    group: 'histoires',
    source: '73 épisodes de 57 minutes',
    emoji: '🐉',
    cost: { kind: 'once', hours: 69 },
  },
  {
    id: 'friends',
    label: 'Regarder Friends en entier',
    group: 'histoires',
    source: '236 épisodes de 22 minutes',
    emoji: '☕',
    cost: { kind: 'once', hours: 87 },
  },
  {
    id: 'marvel',
    label: 'Voir toute la saga Marvel',
    group: 'histoires',
    source: '35 films d’environ 2 h 15',
    emoji: '🦸',
    cost: { kind: 'once', hours: 80 },
  },
  {
    id: 'beatles',
    label: 'Écouter tous les Beatles',
    group: 'histoires',
    source: 'les 13 albums studio, environ 10 h',
    emoji: '🎸',
    cost: { kind: 'once', hours: 10 },
  },
  {
    id: 'beethoven',
    label: 'Écouter les 9 symphonies de Beethoven',
    group: 'histoires',
    source: 'environ 10 h, de la Première à la Neuvième',
    emoji: '🎻',
    cost: { kind: 'once', hours: 10 },
  },
  {
    id: 'bible',
    label: 'Lire la Bible en entier',
    group: 'histoires',
    source: '≈ 800 000 mots à 250 mots/minute',
    emoji: '📜',
    cost: { kind: 'once', hours: 53 },
  },
  {
    id: 'harry-potter',
    label: 'Lire Harry Potter en entier',
    group: 'histoires',
    source: 'les 7 tomes, ≈ 1 084 000 mots à 250 mots/minute',
    emoji: '⚡',
    cost: { kind: 'once', hours: 72 },
  },
  {
    id: 'proust',
    label: 'Lire À la recherche du temps perdu',
    group: 'histoires',
    source: '≈ 1 267 000 mots à 250 mots/minute — le plus long roman jamais publié',
    emoji: '🫖',
    cost: { kind: 'once', hours: 84 },
  },
  {
    id: 'cent-romans',
    label: 'Lire cent romans',
    group: 'histoires',
    source: '100 fois 8 h — deux romans par an pendant cinquante ans',
    emoji: '📚',
    cost: { kind: 'once', hours: 800 },
  },

  // ── Ce qu'on apprend ──────────────────────────────────────────────────
  {
    id: 'jongler',
    label: 'Apprendre à jongler',
    group: 'apprentissages',
    source: 'trois balles, en cascade, sans faire tomber',
    emoji: '🤹',
    cost: { kind: 'once', hours: 6 },
  },
  {
    id: 'velo',
    label: 'Apprendre à faire du vélo',
    group: 'apprentissages',
    source: 'jusqu’à tenir seul, quelques après-midi',
    emoji: '🚲',
    cost: { kind: 'once', hours: 12 },
  },
  {
    id: 'nager',
    label: 'Apprendre à nager',
    group: 'apprentissages',
    source: 'jusqu’à traverser un bassin sans s’arrêter',
    emoji: '🏊',
    cost: { kind: 'once', hours: 40 },
  },
  {
    id: 'permis',
    label: 'Passer le permis',
    group: 'apprentissages',
    source: '20 h de conduite minimum, plus le code et la pratique réelle',
    emoji: '🚗',
    cost: { kind: 'once', hours: 50 },
  },
  {
    id: 'cuisiner',
    label: 'Apprendre à cuisiner',
    group: 'apprentissages',
    source: 'jusqu’à improviser un repas sans recette',
    emoji: '🔪',
    cost: { kind: 'once', hours: 300 },
  },
  {
    id: 'echecs',
    label: 'Devenir bon aux échecs',
    group: 'apprentissages',
    source: 'jusqu’à 1500 Elo, le niveau d’un joueur de club',
    emoji: '♟️',
    cost: { kind: 'once', hours: 500 },
  },
  {
    id: 'langue',
    label: 'Apprendre une langue proche',
    group: 'apprentissages',
    source: 'niveau B2 pour l’espagnol ou l’italien, estimation Foreign Service Institute',
    emoji: '🗣️',
    cost: { kind: 'once', hours: 750 },
  },
  {
    id: 'coder',
    label: 'Apprendre à coder',
    group: 'apprentissages',
    source: 'jusqu’au niveau où l’on peut en vivre',
    emoji: '⌨️',
    cost: { kind: 'once', hours: 1500 },
  },
  {
    id: 'japonais',
    label: 'Apprendre le japonais',
    group: 'apprentissages',
    source: '2 200 h selon le Foreign Service Institute — trois fois une langue proche',
    emoji: '🗾',
    cost: { kind: 'once', hours: 2200 },
  },
  {
    id: 'piano',
    label: 'Apprendre le piano',
    group: 'apprentissages',
    source: 'jusqu’à jouer correctement, pas jusqu’au concert',
    emoji: '🎹',
    cost: { kind: 'once', hours: 3000 },
  },
  {
    id: 'these',
    label: 'Faire une thèse',
    group: 'apprentissages',
    source: 'trois ans à plein temps, congés déduits',
    emoji: '🎓',
    cost: { kind: 'once', hours: 5000 },
  },
  {
    id: 'expert',
    label: 'Devenir expert en quelque chose',
    group: 'apprentissages',
    source: 'la règle des 10 000 heures, d’après les travaux d’Anders Ericsson',
    emoji: '🏅',
    cost: { kind: 'once', hours: 10000 },
  },

  // ── Ce qu'on entreprend ───────────────────────────────────────────────
  {
    id: 'couchers-soleil',
    label: 'Regarder cent couchers de soleil',
    group: 'aventures',
    source: '100 fois 30 minutes, sans rien faire d’autre',
    emoji: '🌇',
    cost: { kind: 'once', hours: 50 },
  },
  {
    id: 'marathon',
    label: 'Courir un marathon',
    group: 'aventures',
    source: 'plan de préparation de 18 semaines, course comprise',
    emoji: '🥇',
    cost: { kind: 'once', hours: 110 },
  },
  {
    id: 'compostelle',
    label: 'Marcher jusqu’à Compostelle',
    group: 'aventures',
    source: 'le Camino Francés, 780 km en une trentaine d’étapes de 6 h',
    emoji: '🐚',
    cost: { kind: 'once', hours: 200 },
  },
  {
    id: 'everest',
    label: 'Gravir l’Everest',
    group: 'aventures',
    source: 'deux mois sur place, acclimatation comprise',
    emoji: '🏔️',
    cost: { kind: 'once', hours: 1460 },
  },
  {
    id: 'benevolat',
    label: 'Donner de son temps',
    group: 'aventures',
    source: '2 h par semaine de bénévolat, pendant vingt ans',
    emoji: '🤝',
    cost: { kind: 'once', hours: 2080 },
  },
  {
    id: 'tour-du-monde',
    label: 'Faire le tour du monde',
    group: 'aventures',
    source: 'une année entière, sac au dos',
    emoji: '🌍',
    cost: { kind: 'once', hours: 8766 },
  },
  {
    id: 'enfant',
    label: 'Élever un enfant',
    group: 'aventures',
    source: 'temps de soin actif jusqu’à ses 18 ans',
    emoji: '🧸',
    cost: { kind: 'once', hours: 11000 },
  },
];

export const allActivities: readonly Activity[] = [...habits, ...pursuits];

export const byActivityId = new Map(allActivities.map((a) => [a.id, a]));

/** Le catalogue rangé par rayon, dans l'ordre déclaré par `groups`. */
export const activitiesByGroup: readonly (Group & { activities: readonly Activity[] })[] =
  groups.map((group) => ({
    ...group,
    activities: allActivities.filter((a) => a.group === group.id),
  }));

/** Heures d'une vie entière. C'est le budget du joueur. */
export function lifetimeHours(years: number): number {
  return years * DAYS_PER_YEAR * 24;
}

/** L'inverse. Un compteur en heures ne se ressent pas ; en années, si. */
export function yearsFromHours(hours: number): number {
  return hours / (DAYS_PER_YEAR * 24);
}

/**
 * Le nombre d'années réellement vécues dans la tranche d'âge d'une habitude.
 * Mourir à 54 ans tronque la carrière : c'est voulu, et c'est le sujet du jeu.
 */
function yearsInRange(lifeYears: number, fromAge = 0, toAge?: number): number {
  const start = Math.min(fromAge, lifeYears);
  const end = Math.min(toAge ?? lifeYears, lifeYears);
  return Math.max(0, end - start);
}

/** Ce que coûte une unité d'activité à quelqu'un qui vivra `lifeYears` années. */
export function hoursFor(activity: Activity, lifeYears: number): number {
  const { cost } = activity;
  if (cost.kind === 'once') return cost.hours;

  const span = yearsInRange(lifeYears, cost.fromAge, cost.toAge);
  if (cost.kind === 'daily') return cost.hours * DAYS_PER_YEAR * span;
  return cost.hours * (cost.weeksPerYear ?? WEEKS_PER_YEAR) * span;
}

export type Basket = Readonly<Record<string, number>>;

/** Ce qui est déjà déduit avant le premier clic. */
export const mandatoryIds: readonly string[] = allActivities
  .filter((a) => a.mandatory)
  .map((a) => a.id);

/**
 * Rétablit les lignes obligatoires dans un panier.
 *
 * Sert au démarrage, mais aussi à la relecture d'une sauvegarde écrite quand
 * dormir se refusait encore : sans ça, une vieille partie rouvrirait sans sommeil.
 */
export function withMandatory(basket: Basket): Record<string, number> {
  const next = { ...basket };
  for (const id of mandatoryIds) {
    if ((next[id] ?? 0) <= 0) next[id] = 1;
  }
  return next;
}

/** Total dépensé par un panier, recalculé pour l'espérance de vie donnée. */
export function basketHours(basket: Basket, lifeYears: number): number {
  let total = 0;
  for (const [id, quantity] of Object.entries(basket)) {
    const activity = byActivityId.get(id);
    if (!activity || quantity <= 0) continue;
    total += hoursFor(activity, lifeYears) * quantity;
  }
  return total;
}

/**
 * Traduit un nombre d'heures en choses concrètes qu'on aurait pu en faire.
 *
 * C'est le ressort du jeu original : « 262 980 heures » ne dit rien, « 32 869
 * romans ou 350 langues apprises » se sent. On ne garde que les activités dont
 * le compte est parlant — ni 0, ni un nombre à sept chiffres.
 */
export function translate(hours: number, limit = 4): { activity: Activity; count: number }[] {
  if (hours <= 0) return [];
  return pursuits
    .map((activity) => ({ activity, count: Math.floor(hours / hoursFor(activity, 0)) }))
    .filter((entry) => entry.count >= 1 && entry.count <= 100_000)
    .sort((a, b) => a.count - b.count)
    .slice(0, limit);
}
