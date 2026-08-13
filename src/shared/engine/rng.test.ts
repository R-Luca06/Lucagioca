import { describe, expect, it } from 'vitest';
import { createRng, dailySeed, seedFrom } from './rng';

/**
 * Le générateur est le socle sur lequel s'appuiera chaque futur jeu. Ce qu'on
 * fige ici, ce n'est pas l'implémentation de mulberry32 mais le contrat public :
 * même graine, même suite, et des bornes qu'on peut croire sur parole.
 */

describe('seedFrom', () => {
  it('donne toujours la même graine pour la même chaîne', () => {
    expect(seedFrom('ton-temps')).toBe(seedFrom('ton-temps'));
  });

  it('sépare deux chaînes proches', () => {
    expect(seedFrom('jour-1')).not.toBe(seedFrom('jour-2'));
  });

  it('reste un entier non signé sur 32 bits', () => {
    for (const text of ['', 'a', 'ton-temps:2026-08-13', '🎹 accents éàü']) {
      const seed = seedFrom(text);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('createRng', () => {
  const suite = (seed: number | string, count = 20) => {
    const rng = createRng(seed);
    return Array.from({ length: count }, () => rng.next());
  };

  it('rejoue exactement la même suite à graine égale', () => {
    expect(suite(12345)).toEqual(suite(12345));
  });

  it('accepte une graine texte, équivalente à son hash', () => {
    expect(suite('ton-temps')).toEqual(suite(seedFrom('ton-temps')));
  });

  it('produit des suites différentes pour des graines différentes', () => {
    expect(suite(1)).not.toEqual(suite(2));
  });

  it('reste dans [0, 1)', () => {
    const rng = createRng('bornes');
    for (let i = 0; i < 2000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  describe('int', () => {
    it('respecte les bornes, incluses des deux côtés', () => {
      const rng = createRng('des');
      const vus = new Set<number>();
      for (let i = 0; i < 2000; i++) {
        const value = rng.int(1, 6);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
        vus.add(value);
      }
      // Les deux extrêmes doivent tomber : un intervalle exclusif se verrait ici.
      expect(vus).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    });

    it('gère un intervalle réduit à une seule valeur', () => {
      const rng = createRng('fixe');
      expect(rng.int(7, 7)).toBe(7);
    });
  });

  it('float reste dans [min, max)', () => {
    const rng = createRng('flottants');
    for (let i = 0; i < 1000; i++) {
      const value = rng.float(-2, 5);
      expect(value).toBeGreaterThanOrEqual(-2);
      expect(value).toBeLessThan(5);
    }
  });

  describe('chance', () => {
    it('ne se déclenche jamais à 0 et toujours à 1', () => {
      const rng = createRng('probabilites');
      for (let i = 0; i < 500; i++) {
        expect(rng.chance(0)).toBe(false);
        expect(rng.chance(1)).toBe(true);
      }
    });

    it('approche la probabilité demandée sur un grand nombre de tirages', () => {
      const rng = createRng('un-tiers');
      let succes = 0;
      for (let i = 0; i < 10_000; i++) if (rng.chance(0.3)) succes++;
      expect(succes / 10_000).toBeCloseTo(0.3, 1);
    });
  });

  describe('pick', () => {
    it('renvoie un élément du tableau', () => {
      const rng = createRng('choix');
      const items = ['a', 'b', 'c'] as const;
      for (let i = 0; i < 200; i++) {
        expect(items).toContain(rng.pick(items));
      }
    });

    it('atteint tous les éléments, y compris le dernier', () => {
      const rng = createRng('couverture');
      const items = [0, 1, 2, 3];
      const vus = new Set(Array.from({ length: 500 }, () => rng.pick(items)));
      expect(vus).toEqual(new Set(items));
    });

    it('échoue franchement sur un tableau vide plutôt que de renvoyer undefined', () => {
      expect(() => createRng(1).pick([])).toThrow(/vide/);
    });
  });

  describe('shuffle', () => {
    it("n'altère pas le tableau d'origine", () => {
      const source = [1, 2, 3, 4, 5];
      const copie = [...source];
      createRng('melange').shuffle(source);
      expect(source).toEqual(copie);
    });

    it('renvoie une permutation, sans perte ni doublon', () => {
      const source = Array.from({ length: 50 }, (_, i) => i);
      const melange = createRng('permutation').shuffle(source);
      expect(melange).toHaveLength(source.length);
      expect([...melange].sort((a, b) => a - b)).toEqual(source);
    });

    it('mélange réellement, et de façon reproductible', () => {
      const source = Array.from({ length: 50 }, (_, i) => i);
      const premier = createRng('graine').shuffle(source);
      expect(premier).not.toEqual(source);
      expect(createRng('graine').shuffle(source)).toEqual(premier);
    });

    it('supporte les tailles dégénérées', () => {
      const rng = createRng(1);
      expect(rng.shuffle([])).toEqual([]);
      expect(rng.shuffle(['seul'])).toEqual(['seul']);
    });
  });
});

describe('dailySeed', () => {
  it('ne bouge pas au cours de la même journée UTC', () => {
    const matin = new Date('2026-08-13T00:00:00Z');
    const soir = new Date('2026-08-13T23:59:59Z');
    expect(dailySeed('ton-temps', matin)).toBe(dailySeed('ton-temps', soir));
  });

  it('change le lendemain', () => {
    const jour = new Date('2026-08-13T12:00:00Z');
    const lendemain = new Date('2026-08-14T12:00:00Z');
    expect(dailySeed('ton-temps', jour)).not.toBe(dailySeed('ton-temps', lendemain));
  });

  it('sépare deux jeux le même jour', () => {
    const jour = new Date('2026-08-13T12:00:00Z');
    expect(dailySeed('ton-temps', jour)).not.toBe(dailySeed('autre-jeu', jour));
  });
});
