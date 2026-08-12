import { useEffect, useRef, useSyncExternalStore } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * `true` si l'utilisateur demande moins d'animations, réactif au changement
 * de réglage système. Renvoie `false` au rendu serveur (on ne peut pas savoir),
 * donc à utiliser pour *atténuer* une animation, jamais pour décider du HTML initial.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

export interface GameLoopOptions {
  /** Mettre à `false` pour suspendre (menu ouvert, partie terminée…). */
  running?: boolean;
  /**
   * Plafond du delta en secondes. Sans ça, revenir sur un onglet en arrière-plan
   * produit un `dt` énorme qui téléporte tout à travers les murs.
   */
  maxDelta?: number;
  /** Suspendre automatiquement quand l'onglet passe en arrière-plan. */
  pauseWhenHidden?: boolean;
}

/**
 * Boucle de jeu sur `requestAnimationFrame`.
 *
 * `tick(dt, elapsed)` reçoit des secondes, pas des millisecondes : toute la
 * physique s'écrit alors en unités/seconde et reste correcte quel que soit
 * le taux de rafraîchissement de l'écran (60 Hz, 120 Hz, 144 Hz…).
 *
 * Le callback est lu via une ref : tu peux passer une closure inline sans
 * relancer la boucle à chaque rendu.
 */
export function useGameLoop(
  tick: (dt: number, elapsed: number) => void,
  { running = true, maxDelta = 1 / 15, pauseWhenHidden = true }: GameLoopOptions = {},
): void {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!running) return;

    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    let stopped = false;

    const step = (now: number) => {
      if (stopped) return;
      const dt = Math.min((now - last) / 1000, maxDelta);
      last = now;
      elapsed += dt;
      tickRef.current(dt, elapsed);
      frame = requestAnimationFrame(step);
    };

    const onVisibility = () => {
      if (document.hidden) return;
      // Repartir de maintenant, sinon le premier dt au retour couvre toute l'absence.
      last = performance.now();
    };

    if (pauseWhenHidden) document.addEventListener('visibilitychange', onVisibility);
    frame = requestAnimationFrame(step);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      if (pauseWhenHidden) document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [running, maxDelta, pauseWhenHidden]);
}
