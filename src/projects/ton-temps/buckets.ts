/**
 * Le découpage de la carte, partagé par le rendu Astro et la légende React.
 *
 * L'écart entre le pays le plus bref (54,6 ans) et le plus long (84,6) fait
 * exactement trente ans, soit cinq tranches de six. Une seule variable est
 * encodée — l'espérance de vie absolue — mais avec deux rampes très
 * différentes : douce à l'écran de choix, où la carte doit vivre sans rien
 * éventer ; brutale au dernier écran, où c'est justement le propos.
 */
import { countries } from './data/countries';

const allYears = countries.map((c) => c.years);

export const bestYears = Math.max(...allYears);
export const worstYears = Math.min(...allYears);

export const BANDS = 5;
const BAND = (bestYears - worstYears) / BANDS;

/** 0 = l'espérance de vie la plus courte, 4 = la plus longue. */
export function lifeBucket(years: number): number {
  return Math.min(BANDS - 1, Math.max(0, Math.floor((years - worstYears) / BAND)));
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Légende, de la bande la plus courte à la plus longue. */
export const lifeLabels: readonly string[] = Array.from({ length: BANDS }, (_, i) => {
  const low = worstYears + i * BAND;
  return `${round(low)} à ${round(low + BAND)}`;
});
