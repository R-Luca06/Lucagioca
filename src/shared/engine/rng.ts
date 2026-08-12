/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 *
 * Pourquoi ne jamais utiliser `Math.random()` dans un jeu :
 *   - un bug signalé devient reproductible si on connaît la graine ;
 *   - les tests e2e deviennent stables ;
 *   - on obtient gratuitement les « défis du jour » via `dailySeed()`.
 */
export interface Rng {
  /** Flottant dans [0, 1). */
  next(): number;
  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number;
  /** Flottant dans [min, max). */
  float(min: number, max: number): number;
  /** `true` avec la probabilité donnée (0 → jamais, 1 → toujours). */
  chance(probability: number): boolean;
  /** Un élément au hasard. Lève une erreur si le tableau est vide. */
  pick<T>(items: readonly T[]): T;
  /** Copie mélangée (Fisher-Yates). N'altère pas l'entrée. */
  shuffle<T>(items: readonly T[]): T[];
}

/** Hash une chaîne en graine 32 bits (xfnv1a). */
export function seedFrom(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Graine stable sur la journée (UTC) — même défi pour tout le monde. */
export function dailySeed(namespace: string, date: Date = new Date()): number {
  return seedFrom(`${namespace}:${date.toISOString().slice(0, 10)}`);
}

export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? seedFrom(seed) : seed) >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick() sur un tableau vide');
      // biome-ignore lint/style/noNonNullAssertion: index borné par la longueur
      return items[Math.floor(next() * items.length)]!;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        // biome-ignore lint/style/noNonNullAssertion: i et j sont dans les bornes
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
}
