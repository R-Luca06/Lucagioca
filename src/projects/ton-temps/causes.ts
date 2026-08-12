/**
 * Ce qu'il y a derrière l'écart, et où agir.
 *
 * Tous les chiffres portent leur source et leur millésime, comme les données
 * de la carte : un jeu qui se termine sur un appel à agir ne peut pas se
 * permettre d'être approximatif là où il demande de la confiance. Aucun
 * arrondi maison — les valeurs sont celles publiées par les organismes cités.
 *
 * À revérifier à chaque nouvelle édition des rapports (généralement au
 * printemps pour le GRFC, en début d'année pour l'ONU IGME).
 */

export interface Chiffre {
  readonly id: string;
  readonly value: number;
  /** « plus de », « près de »… quand la source ne donne pas un chiffre net. */
  readonly prefix?: string;
  readonly label: string;
  readonly source: string;
}

export const chiffres: readonly Chiffre[] = [
  {
    id: 'moins-de-cinq',
    value: 4_900_000,
    label: 'enfants sont morts avant leur cinquième anniversaire, en 2024.',
    source: 'ONU IGME / UNICEF, Levels and Trends in Child Mortality, rapport 2025',
  },
  {
    id: 'nouveau-nes',
    value: 2_300_000,
    label: 'd’entre eux n’ont pas passé leur premier mois.',
    source: 'ONU IGME / UNICEF, rapport 2025',
  },
  {
    id: 'malnutrition',
    value: 100_000,
    prefix: 'plus de',
    label: 'sont morts directement de malnutrition aiguë sévère.',
    source: 'ONU IGME / UNICEF, rapport 2025 — première estimation de ce type',
  },
  {
    id: 'faim',
    value: 266_000_000,
    label: 'personnes ont connu une insécurité alimentaire aiguë, dans 47 pays.',
    source: 'Global Report on Food Crises, données 2025',
  },
  {
    id: 'eau',
    value: 2_100_000_000,
    label: 'personnes n’ont pas d’eau potable gérée en toute sécurité.',
    source: 'OMS / UNICEF, programme commun de suivi (JMP), rapport 2025',
  },
];

export interface Organisation {
  readonly name: string;
  readonly url: string;
  readonly mission: string;
}

/**
 * Quatre organisations dont le travail porte sur les causes directes de
 * l'écart d'espérance de vie : survie de l'enfant, malnutrition, accès aux
 * soins, accès à l'eau. Chaque lien a été vérifié.
 */
export const organisations: readonly Organisation[] = [
  {
    name: 'UNICEF France',
    url: 'https://www.unicef.fr/faire-un-don/',
    mission: 'Survie de l’enfant, vaccination, nutrition',
  },
  {
    name: 'Action contre la Faim',
    url: 'https://www.actioncontrelafaim.org/',
    mission: 'Malnutrition aiguë, eau, assainissement',
  },
  {
    name: 'Médecins Sans Frontières',
    url: 'https://www.msf.fr/',
    mission: 'Soins d’urgence là où le système de santé a cédé',
  },
  {
    name: 'Solidarités International',
    url: 'https://www.solidarites.org/',
    mission: 'Accès à l’eau potable et à l’assainissement',
  },
];
