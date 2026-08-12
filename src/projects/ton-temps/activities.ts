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

export interface Activity {
  readonly id: string;
  readonly label: string;
  /** Le coût dit en français, affiché sur la carte. */
  readonly detail: string;
  /** D'où sort le chiffre. Affiché en petit : un jeu de données doit être vérifiable. */
  readonly source: string;
  readonly emoji: string;
  readonly cost: Cost;
}

/**
 * Ce que la vie prend sans vraiment demander.
 *
 * Elles sont présentées comme facultatives — le compteur laisse refuser de
 * dormir. Personne ne le fait, et voir le tiers de sa vie partir d'un clic
 * frappe plus fort qu'une ligne déjà déduite qu'on subit sans la choisir.
 */
export const habits: readonly Activity[] = [
  {
    id: 'dormir',
    label: 'Dormir',
    detail: '8 h par nuit, toute la vie',
    source: 'durée recommandée pour un adulte',
    emoji: '😴',
    cost: { kind: 'daily', hours: 8 },
  },
  {
    id: 'manger',
    label: 'Manger',
    detail: '1 h 30 par jour, courses et cuisine comprises',
    source: 'enquêtes emploi du temps, moyenne européenne',
    emoji: '🍽️',
    cost: { kind: 'daily', hours: 1.5 },
  },
  {
    id: 'ecole',
    label: 'Aller à l’école',
    detail: '30 h par semaine, de 6 à 18 ans',
    source: '36 semaines de classe par an',
    emoji: '🎒',
    cost: { kind: 'weekly', hours: 30, weeksPerYear: 36, fromAge: 6, toAge: 18 },
  },
  {
    id: 'travailler',
    label: 'Travailler',
    detail: '35 h par semaine, de 22 à 64 ans',
    source: '47 semaines par an, congés déduits',
    emoji: '💼',
    cost: { kind: 'weekly', hours: 35, weeksPerYear: 47, fromAge: 22, toAge: 64 },
  },
  {
    id: 'trajets',
    label: 'Aller au travail',
    detail: '1 h par jour ouvré, aller-retour',
    source: 'moyenne des trajets domicile-travail',
    emoji: '🚌',
    cost: { kind: 'weekly', hours: 5, weeksPerYear: 47, fromAge: 22, toAge: 64 },
  },
  {
    id: 'menage',
    label: 'Tenir la maison',
    detail: '1 h 24 par jour de tâches domestiques',
    source: 'moyenne adulte, enquêtes emploi du temps',
    emoji: '🧺',
    cost: { kind: 'daily', hours: 1.4 },
  },
  {
    id: 'ecrans',
    label: 'Faire défiler',
    detail: '2 h 24 par jour sur les réseaux',
    source: 'moyenne mondiale 2024, DataReportal',
    emoji: '📱',
    cost: { kind: 'daily', hours: 2.4 },
  },
  {
    id: 'sport',
    label: 'Faire du sport',
    detail: '3 séances d’1 h par semaine',
    source: 'seuil d’activité recommandé par l’OMS',
    emoji: '🏃',
    cost: { kind: 'weekly', hours: 3 },
  },
];

/** Ce qu'on choisit vraiment. Quantité libre. */
export const pursuits: readonly Activity[] = [
  {
    id: 'roman',
    label: 'Lire un roman',
    detail: '8 h',
    source: '≈ 100 000 mots à 250 mots/minute',
    emoji: '📖',
    cost: { kind: 'once', hours: 8 },
  },
  {
    id: 'the-office',
    label: 'Regarder The Office en entier',
    detail: '74 h',
    source: '201 épisodes de 22 minutes',
    emoji: '📺',
    cost: { kind: 'once', hours: 74 },
  },
  {
    id: 'marvel',
    label: 'Voir toute la saga Marvel',
    detail: '80 h',
    source: '35 films d’environ 2 h 15',
    emoji: '🦸',
    cost: { kind: 'once', hours: 80 },
  },
  {
    id: 'permis',
    label: 'Passer le permis',
    detail: '50 h',
    source: '20 h de conduite minimum, plus le code et la pratique réelle',
    emoji: '🚗',
    cost: { kind: 'once', hours: 50 },
  },
  {
    id: 'marathon',
    label: 'Courir un marathon',
    detail: '110 h',
    source: 'plan de préparation de 18 semaines, course comprise',
    emoji: '🥇',
    cost: { kind: 'once', hours: 110 },
  },
  {
    id: 'langue',
    label: 'Apprendre une langue',
    detail: '750 h',
    source: 'niveau B2 pour une langue proche, estimation Foreign Service Institute',
    emoji: '🗣️',
    cost: { kind: 'once', hours: 750 },
  },
  {
    id: 'coder',
    label: 'Apprendre à coder',
    detail: '1 500 h',
    source: 'jusqu’au niveau où l’on peut en vivre',
    emoji: '⌨️',
    cost: { kind: 'once', hours: 1500 },
  },
  {
    id: 'piano',
    label: 'Apprendre le piano',
    detail: '3 000 h',
    source: 'jusqu’à jouer correctement, pas jusqu’au concert',
    emoji: '🎹',
    cost: { kind: 'once', hours: 3000 },
  },
  {
    id: 'tour-du-monde',
    label: 'Faire le tour du monde',
    detail: '8 766 h',
    source: 'une année entière, sac au dos',
    emoji: '🌍',
    cost: { kind: 'once', hours: 8766 },
  },
  {
    id: 'enfant',
    label: 'Élever un enfant',
    detail: '11 000 h',
    source: 'temps de soin actif jusqu’à ses 18 ans',
    emoji: '🧸',
    cost: { kind: 'once', hours: 11000 },
  },
];

export const allActivities: readonly Activity[] = [...habits, ...pursuits];

export const byActivityId = new Map(allActivities.map((a) => [a.id, a]));

/** Heures d'une vie entière. C'est le budget du joueur. */
export function lifetimeHours(years: number): number {
  return years * DAYS_PER_YEAR * 24;
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
