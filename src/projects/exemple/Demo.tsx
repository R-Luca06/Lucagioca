import { useState } from 'react';
import { createRng, dailySeed } from '@/shared/engine/rng';
import { useGameLoop } from '@/shared/engine/useGameLoop';

const rng = createRng(dailySeed('exemple'));
const MOTS = ['orbite', 'pixel', 'entropie', 'vertige', 'boucle', 'écho'] as const;

export default function Demo() {
  const [seconds, setSeconds] = useState(0);
  const [mot, setMot] = useState(() => rng.pick(MOTS));

  // dt est en secondes : la physique reste correcte en 60 comme en 144 Hz.
  useGameLoop((dt) => setSeconds((s) => s + dt));

  return (
    <div className="demo">
      <p className="demo__timer" aria-live="off">
        {seconds.toFixed(1)} s
      </p>
      <p>
        Mot du jour : <strong>{mot}</strong>
      </p>
      <button type="button" onClick={() => setMot(rng.pick(MOTS))}>
        Tirer un autre mot
      </button>
    </div>
  );
}
