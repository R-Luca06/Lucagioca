import { describe, expect, it } from 'vitest';
import { BANDS, bestYears, lifeBucket, lifeLabels, worstYears } from './buckets';
import { countries } from './data/countries';

/**
 * Le découpage de la carte.
 *
 * Le piège est arithmétique : la division du plus long par la largeur de bande
 * tombe sur 5,000000000000003 et non sur 5, donc le pays le plus favorisé
 * sortirait du tableau des couleurs sans le `Math.min` de `lifeBucket`. C'est
 * exactement le genre de bug qui ne se voit qu'en production, sur un seul pays.
 */

describe('bornes des données', () => {
  it('encadre bien l’ensemble des pays', () => {
    for (const pays of countries) {
      expect(pays.years).toBeGreaterThanOrEqual(worstYears);
      expect(pays.years).toBeLessThanOrEqual(bestYears);
    }
  });

  it('couvre un écart qui vaut la peine d’être raconté', () => {
    expect(bestYears - worstYears).toBeGreaterThan(20);
  });
});

describe('lifeBucket', () => {
  it('place la vie la plus brève dans la première bande', () => {
    expect(lifeBucket(worstYears)).toBe(0);
  });

  it('place la vie la plus longue dans la dernière bande, et non au-delà', () => {
    // Sans le plafonnement, l'arrondi flottant renverrait 5 pour un tableau de 5 cases.
    expect(lifeBucket(bestYears)).toBe(BANDS - 1);
  });

  it('plafonne des deux côtés hors de la plage connue', () => {
    expect(lifeBucket(worstYears - 30)).toBe(0);
    expect(lifeBucket(0)).toBe(0);
    expect(lifeBucket(bestYears + 30)).toBe(BANDS - 1);
  });

  it('ne recule jamais quand l’espérance de vie augmente', () => {
    let precedent = 0;
    for (let annees = worstYears; annees <= bestYears; annees += 0.1) {
      const bande = lifeBucket(annees);
      expect(bande).toBeGreaterThanOrEqual(precedent);
      precedent = bande;
    }
  });

  it('donne à chaque pays une bande utilisable comme index', () => {
    for (const pays of countries) {
      const bande = lifeBucket(pays.years);
      expect(Number.isInteger(bande)).toBe(true);
      expect(bande).toBeGreaterThanOrEqual(0);
      expect(bande).toBeLessThan(BANDS);
    }
  });

  it('ne laisse aucune bande vide — une couleur de légende sans pays ne dit rien', () => {
    const effectifs = new Array<number>(BANDS).fill(0);
    for (const pays of countries) {
      const bande = lifeBucket(pays.years);
      effectifs[bande] = (effectifs[bande] ?? 0) + 1;
    }
    for (const effectif of effectifs) expect(effectif).toBeGreaterThan(0);
  });
});

describe('lifeLabels', () => {
  it('donne une étiquette par bande', () => {
    expect(lifeLabels).toHaveLength(BANDS);
  });

  it('part du minimum réel et finit au maximum réel', () => {
    expect(lifeLabels[0]).toContain(String(worstYears));
    expect(lifeLabels[BANDS - 1]).toContain(String(bestYears));
  });

  it('enchaîne les bandes sans trou ni recouvrement', () => {
    const bornes = lifeLabels.map((label) => label.split(' à ').map(Number));
    for (const [bas, haut] of bornes) {
      expect(bas).toBeDefined();
      expect(haut).toBeDefined();
    }
    for (let i = 1; i < bornes.length; i++) {
      expect(bornes[i]?.[0]).toBe(bornes[i - 1]?.[1]);
    }
  });

  it('reste lisible : un chiffre après la virgule, pas dix-sept', () => {
    for (const label of lifeLabels) {
      expect(label).toMatch(/^\d+(\.\d)? à \d+(\.\d)?$/);
    }
  });
});
