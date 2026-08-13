import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createStore } from './storage';

/**
 * Tout l'intérêt de `createStore` tient dans ses chemins d'échec : navigation
 * privée, quota dépassé, sauvegarde écrite par une version précédente du jeu.
 * Le chemin heureux, lui, ne casse jamais. C'est donc l'inverse d'un test
 * habituel — ce qui est couvert ici en priorité, ce sont les pannes.
 */

const schema = z.object({ score: z.number(), nom: z.string() });
type Progression = z.infer<typeof schema>;

const fallback: Progression = { score: 0, nom: 'anonyme' };

/** Un `localStorage` en mémoire, suffisant pour ce que le module en attend. */
class FauxStorage {
  readonly map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

function monter(storage: unknown = new FauxStorage()) {
  vi.stubGlobal('localStorage', storage);
  return createStore({
    project: 'ton-temps',
    key: 'progression',
    version: 2,
    schema,
    fallback,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chemin nominal', () => {
  it('relit ce qu’il vient d’écrire', () => {
    const store = monter();
    store.write({ score: 42, nom: 'luca' });
    expect(store.read()).toEqual({ score: 42, nom: 'luca' });
  });

  it('préfixe la clé par le projet, pour éviter les collisions entre jeux', () => {
    const faux = new FauxStorage();
    monter(faux).write({ score: 1, nom: 'a' });
    expect([...faux.map.keys()]).toEqual(['ton-temps:progression']);
  });

  it('enveloppe la donnée avec son numéro de version', () => {
    const faux = new FauxStorage();
    monter(faux).write({ score: 1, nom: 'a' });
    expect(JSON.parse(faux.map.get('ton-temps:progression') ?? '')).toEqual({
      v: 2,
      data: { score: 1, nom: 'a' },
    });
  });

  it('retombe sur le défaut quand rien n’a jamais été écrit', () => {
    expect(monter().read()).toEqual(fallback);
  });

  it('update lit, transforme et écrit d’un seul geste', () => {
    const store = monter();
    store.write({ score: 10, nom: 'luca' });
    const rendu = store.update((current) => ({ ...current, score: current.score + 5 }));
    expect(rendu).toEqual({ score: 15, nom: 'luca' });
    expect(store.read()).toEqual({ score: 15, nom: 'luca' });
  });

  it('update part du défaut si la case est vide', () => {
    expect(monter().update((c) => ({ ...c, score: c.score + 1 }))).toEqual({
      score: 1,
      nom: 'anonyme',
    });
  });

  it('clear ramène au défaut', () => {
    const store = monter();
    store.write({ score: 99, nom: 'luca' });
    store.clear();
    expect(store.read()).toEqual(fallback);
  });
});

describe('données inexploitables', () => {
  const ecrire = (brut: string) => {
    const faux = new FauxStorage();
    faux.map.set('ton-temps:progression', brut);
    return monter(faux);
  };

  it('ignore une sauvegarde écrite par une version antérieure du jeu', () => {
    const store = ecrire(JSON.stringify({ v: 1, data: { score: 42, nom: 'luca' } }));
    expect(store.read()).toEqual(fallback);
  });

  it('ignore une sauvegarde d’une version future', () => {
    const store = ecrire(JSON.stringify({ v: 3, data: { score: 42, nom: 'luca' } }));
    expect(store.read()).toEqual(fallback);
  });

  it('ignore une donnée qui ne passe pas le schéma', () => {
    const store = ecrire(JSON.stringify({ v: 2, data: { score: 'beaucoup' } }));
    expect(store.read()).toEqual(fallback);
  });

  it('survit à du JSON corrompu', () => {
    expect(ecrire('{ ceci n’est pas du JSON').read()).toEqual(fallback);
  });

  it('survit à une enveloppe absente', () => {
    expect(ecrire('null').read()).toEqual(fallback);
    expect(ecrire('"une chaîne"').read()).toEqual(fallback);
  });
});

describe('stockage indisponible', () => {
  it('reste jouable sans localStorage du tout', () => {
    const store = monter(undefined);
    expect(store.read()).toEqual(fallback);
    expect(() => store.write({ score: 1, nom: 'a' })).not.toThrow();
    expect(() => store.clear()).not.toThrow();
    expect(store.read()).toEqual(fallback);
  });

  it('reste jouable quand le seul accès à localStorage lève — navigation privée', () => {
    const descripteur = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('accès refusé', 'SecurityError');
      },
    });
    try {
      const store = createStore({
        project: 'ton-temps',
        key: 'progression',
        version: 2,
        schema,
        fallback,
      });
      expect(store.read()).toEqual(fallback);
      expect(() => store.write({ score: 1, nom: 'a' })).not.toThrow();
      expect(() => store.clear()).not.toThrow();
    } finally {
      if (descripteur) Object.defineProperty(globalThis, 'localStorage', descripteur);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('perd la sauvegarde mais pas la partie quand le quota est dépassé', () => {
    const sature = new FauxStorage();
    sature.setItem = () => {
      throw new DOMException('quota dépassé', 'QuotaExceededError');
    };
    const store = monter(sature);
    expect(() => store.write({ score: 1, nom: 'a' })).not.toThrow();
    expect(store.read()).toEqual(fallback);
  });
});
