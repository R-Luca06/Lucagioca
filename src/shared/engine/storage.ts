import type { z } from 'zod';

/**
 * `localStorage` typé, versionné et tolérant aux pannes.
 *
 * Ne jamais appeler `localStorage` directement dans un jeu :
 *   - le mode privé de Safari peut lever une exception à l'écriture ;
 *   - les données d'une ancienne version du jeu cassent silencieusement le nouveau ;
 *   - les clés finissent par entrer en collision entre projets.
 *
 * Ici, chaque projet a son préfixe, chaque valeur est validée par un schéma
 * Zod à la lecture, et une valeur invalide ou périmée retombe sur le défaut.
 */
export interface Store<T> {
  read(): T;
  write(value: T): void;
  update(fn: (current: T) => T): T;
  clear(): void;
}

interface Envelope {
  v: number;
  data: unknown;
}

export interface StoreOptions<T> {
  /** Slug du projet — sert de préfixe de clé. */
  project: string;
  /** Nom de la donnée, ex. 'progression'. */
  key: string;
  /** Incrémente ce numéro quand la forme des données change de façon incompatible. */
  version: number;
  schema: z.ZodType<T>;
  fallback: T;
}

export function createStore<T>({
  project,
  key,
  version,
  schema,
  fallback,
}: StoreOptions<T>): Store<T> {
  const storageKey = `${project}:${key}`;

  const available = (): Storage | null => {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      // Cookies bloqués : le jeu doit rester jouable, simplement sans sauvegarde.
      return null;
    }
  };

  const read = (): T => {
    const storage = available();
    if (!storage) return fallback;
    try {
      const raw = storage.getItem(storageKey);
      if (raw === null) return fallback;
      const envelope = JSON.parse(raw) as Envelope;
      if (envelope?.v !== version) return fallback;
      const parsed = schema.safeParse(envelope.data);
      return parsed.success ? parsed.data : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (value: T): void => {
    const storage = available();
    if (!storage) return;
    try {
      storage.setItem(storageKey, JSON.stringify({ v: version, data: value } satisfies Envelope));
    } catch {
      // Quota dépassé ou écriture refusée : on perd la sauvegarde, pas la partie.
    }
  };

  return {
    read,
    write,
    update(fn) {
      const value = fn(read());
      write(value);
      return value;
    },
    clear() {
      available()?.removeItem(storageKey);
    },
  };
}
