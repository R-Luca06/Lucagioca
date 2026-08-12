import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { createStore } from '@/shared/engine/storage';
import { useGameLoop, usePrefersReducedMotion } from '@/shared/engine/useGameLoop';
import {
  type Activity,
  type Basket,
  basketHours,
  habits,
  hoursFor,
  lifetimeHours,
  pursuits,
  translate,
} from './activities';
import { byId, type Country, countries, dataYear, worldAverage } from './data/countries';

const nf = new Intl.NumberFormat('fr-FR');
const yearsFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

const hours = (n: number) => nf.format(Math.max(0, Math.round(n)));
const years = (n: number) => yearsFmt.format(n);

const best = countries.reduce((a, b) => (b.years > a.years ? b : a));
const worst = countries.reduce((a, b) => (b.years < a.years ? b : a));

const store = createStore({
  project: 'ton-temps',
  key: 'partie',
  version: 1,
  schema: z.object({
    countryId: z.string().nullable(),
    basket: z.record(z.string(), z.number()),
  }),
  fallback: { countryId: null as string | null, basket: {} as Record<string, number> },
});

type Phase = 'choix' | 'depense' | 'bilan';

/**
 * Fait défiler le compteur au lieu de le téléporter.
 *
 * C'est une animation pilotée en JS : le garde-fou CSS global ne la couvrirait
 * pas, d'où `usePrefersReducedMotion` qui la remplace par un saut net.
 */
function useCountUp(target: number): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(target);
  const current = useRef(target);
  const settled = Math.abs(display - target) < 1;

  useGameLoop(
    (dt) => {
      const diff = target - current.current;
      if (Math.abs(diff) < 1) {
        current.current = target;
        setDisplay(target);
        return;
      }
      current.current += diff * Math.min(1, dt * 9);
      setDisplay(current.current);
    },
    { running: !reduced && !settled },
  );

  useEffect(() => {
    if (!reduced) return;
    current.current = target;
    setDisplay(target);
  }, [reduced, target]);

  return Math.round(reduced ? target : display);
}

export default function TonTemps({ carte }: { carte?: ReactNode }) {
  const [countryId, setCountryId] = useState<string | null>(null);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>('choix');

  // La sauvegarde n'est lue qu'après le montage : au rendu serveur elle
  // n'existe pas, et repartir de zéro éviterait une divergence d'hydratation.
  useEffect(() => {
    const saved = store.read();
    if (saved.countryId && byId.has(saved.countryId)) {
      setCountryId(saved.countryId);
      setBasket(saved.basket);
      setPhase('depense');
    }
  }, []);

  useEffect(() => {
    if (countryId) store.write({ countryId, basket });
  }, [countryId, basket]);

  const country = countryId ? (byId.get(countryId) ?? null) : null;

  const budget = country ? lifetimeHours(country.years) : 0;
  const spent = useMemo(
    () => (country ? basketHours(basket, country.years) : 0),
    [basket, country],
  );
  const remaining = budget - spent;

  const reset = () => {
    store.clear();
    setCountryId(null);
    setBasket({});
    setPhase('choix');
  };

  if (phase === 'choix' || !country) {
    return (
      <Choix
        carte={carte}
        selected={countryId}
        onSelect={setCountryId}
        onStart={() => setPhase('depense')}
      />
    );
  }

  if (phase === 'bilan') {
    return (
      <Bilan
        carte={carte}
        country={country}
        basket={basket}
        spent={spent}
        budget={budget}
        onReplay={reset}
        onBack={() => setPhase('depense')}
      />
    );
  }

  return (
    <Depense
      country={country}
      basket={basket}
      budget={budget}
      spent={spent}
      remaining={remaining}
      onChange={setBasket}
      onFinish={() => setPhase('bilan')}
      onReset={reset}
    />
  );
}

/* --- Écran 1 : le choix du pays -------------------------------------------- */

function Choix({
  carte,
  selected,
  onSelect,
  onStart,
}: {
  carte?: ReactNode;
  selected: string | null;
  onSelect: (id: string) => void;
  onStart: () => void;
}) {
  const country = selected ? (byId.get(selected) ?? null) : null;

  // Délégation : les 169 pays sont du HTML statique, un seul écouteur suffit.
  const onMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const path = (event.target as Element).closest?.('path[data-id]');
    const id = path?.getAttribute('data-id');
    if (id) onSelect(id);
  };

  return (
    <section className="ecran">
      <h1 className="titre">Ton temps</h1>
      <p className="intro">
        Tu n’as pas d’argent à dépenser ici, seulement des heures. Ton pays de naissance décide
        combien.
      </p>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: la carte est un
          raccourci à la souris ; le <select> ci-dessous fait le même travail
          au clavier et au lecteur d'écran. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: idem. */}
      <div
        className={`carte-boite${selected ? ' a-choisi' : ''}`}
        data-choisi={selected ?? undefined}
        onClick={onMapClick}
      >
        {carte}
      </div>

      <div className="choix-barre">
        <label className="choix-label" htmlFor="pays">
          Pays de naissance
          <select
            id="pays"
            value={selected ?? ''}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="" disabled>
              Choisis un pays…
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {country ? (
          <p className="choix-resume">
            <strong>{country.name}</strong> — espérance de vie {years(country.years)} ans, soit{' '}
            <strong>{hours(lifetimeHours(country.years))} heures</strong>.
          </p>
        ) : (
          <p className="choix-resume muet">Clique un pays sur la carte, ou prends la liste.</p>
        )}

        <button type="button" className="bouton primaire" disabled={!country} onClick={onStart}>
          Commencer ma vie
        </button>
      </div>
    </section>
  );
}

/* --- Écran 2 : la dépense --------------------------------------------------- */

function Depense({
  country,
  basket,
  budget,
  spent,
  remaining,
  onChange,
  onFinish,
  onReset,
}: {
  country: Country;
  basket: Basket;
  budget: number;
  spent: number;
  remaining: number;
  onChange: (basket: Record<string, number>) => void;
  onFinish: () => void;
  onReset: () => void;
}) {
  const affiche = useCountUp(remaining);
  const part = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

  const set = (id: string, quantity: number) => {
    const next = { ...basket };
    if (quantity <= 0) delete next[id];
    else next[id] = quantity;
    onChange(next);
  };

  const canAfford = (activity: Activity, extra: number) =>
    hoursFor(activity, country.years) * extra <= remaining + 0.5;

  return (
    <section className="ecran">
      <header className="compteur">
        <div className="compteur-chiffre">
          <span className="compteur-valeur">{hours(affiche)}</span>
          <span className="compteur-unite">heures qu’il te reste</span>
        </div>
        <div className="jauge" aria-hidden="true">
          <div className="jauge-remplie" style={{ width: `${part}%` }} />
        </div>
        <p className="compteur-pays">
          {country.name} · {years(country.years)} ans · {hours(budget)} h au départ
        </p>
        <div className="compteur-actions">
          <button type="button" className="bouton primaire" onClick={onFinish}>
            Voir ma vie
          </button>
          <button type="button" className="bouton discret" onClick={onReset}>
            Changer de pays
          </button>
        </div>
      </header>

      <h2 className="section-titre">Ce que la vie prend</h2>
      <p className="section-note">
        Rien ne t’oblige à cocher ces cases. C’est bien ça le problème.
      </p>
      <ul className="grille">
        {habits.map((activity) => {
          const cost = hoursFor(activity, country.years);
          const pris = (basket[activity.id] ?? 0) > 0;
          return (
            <li key={activity.id} className={`carte-activite${pris ? ' prise' : ''}`}>
              <Etiquette activity={activity} cost={cost} budget={budget} />
              <button
                type="button"
                className={`bouton ${pris ? 'discret' : 'primaire'}`}
                disabled={!pris && !canAfford(activity, 1)}
                onClick={() => set(activity.id, pris ? 0 : 1)}
              >
                {pris ? 'Y renoncer' : 'Prendre cette habitude'}
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className="section-titre">Ce que tu choisis</h2>
      <p className="section-note">Avec ce qui reste.</p>
      <ul className="grille">
        {pursuits.map((activity) => {
          const cost = hoursFor(activity, country.years);
          const quantity = basket[activity.id] ?? 0;
          return (
            <li key={activity.id} className={`carte-activite${quantity > 0 ? ' prise' : ''}`}>
              <Etiquette activity={activity} cost={cost} budget={budget} />
              <div className="quantite">
                <button
                  type="button"
                  className="bouton rond"
                  disabled={quantity === 0}
                  onClick={() => set(activity.id, quantity - 1)}
                  aria-label={`Une fois de moins : ${activity.label}`}
                >
                  −
                </button>
                <output className="quantite-valeur">{nf.format(quantity)}</output>
                <button
                  type="button"
                  className="bouton rond"
                  disabled={!canAfford(activity, 1)}
                  onClick={() => set(activity.id, quantity + 1)}
                  aria-label={`Une fois de plus : ${activity.label}`}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Etiquette({
  activity,
  cost,
  budget,
}: {
  activity: Activity;
  cost: number;
  budget: number;
}) {
  const part = budget > 0 ? (cost / budget) * 100 : 0;
  return (
    <div className="etiquette">
      <span className="emoji" aria-hidden="true">
        {activity.emoji}
      </span>
      <div>
        <h3 className="activite-titre">{activity.label}</h3>
        <p className="activite-detail">{activity.detail}</p>
        <p className="activite-cout">
          {hours(cost)} h
          {part >= 1 && <span className="activite-part"> · {Math.round(part)} % de ta vie</span>}
        </p>
        <p className="activite-source">{activity.source}</p>
      </div>
    </div>
  );
}

/* --- Écran 3 : la révélation ------------------------------------------------ */

function Bilan({
  carte,
  country,
  basket,
  spent,
  budget,
  onReplay,
  onBack,
}: {
  carte?: ReactNode;
  country: Country;
  basket: Basket;
  spent: number;
  budget: number;
  onReplay: () => void;
  onBack: () => void;
}) {
  const subi = basketHours(
    Object.fromEntries(habits.map((a) => [a.id, basket[a.id] ?? 0])),
    country.years,
  );
  const choisi = spent - subi;

  const surplus = lifetimeHours(best.years) - budget;
  const manque = budget - lifetimeHours(worst.years);

  // Le même panier, recalculé pour une vie plus courte : les habitudes bornées
  // par l'âge (école, travail) ne rétrécissent pas au même rythme que la vie.
  const panierAilleurs = basketHours(basket, worst.years);
  const debordement = panierAilleurs - lifetimeHours(worst.years);

  return (
    <section className="ecran bilan">
      <h1 className="titre">Ta vie est finie.</h1>
      <p className="intro">
        Tu es né en {country.name}. Tu as eu <strong>{hours(budget)} heures</strong>, soit{' '}
        {years(country.years)} ans.
      </p>

      <ul className="reparti">
        <Part label="Pris par les habitudes" value={subi} total={budget} />
        <Part label="Vraiment choisi" value={choisi} total={budget} />
        <Part label="Jamais dépensé" value={budget - spent} total={budget} />
      </ul>

      {surplus > 0 ? (
        <div className="chute">
          <h2 className="chute-titre">
            Ailleurs : <em>{best.name}</em>
          </h2>
          <p>
            Là-bas, tu aurais vécu {years(best.years)} ans. C’est{' '}
            <strong>{hours(surplus)} heures de plus</strong> — le même corps, le même effort, juste
            un autre lieu de naissance.
          </p>
          <p className="chute-liste-intro">Ce que tu aurais pu en faire :</p>
          <ul className="chute-liste">
            {translate(surplus).map(({ activity, count }) => (
              <li key={activity.id}>
                <span className="emoji" aria-hidden="true">
                  {activity.emoji}
                </span>
                <strong>{nf.format(count)}</strong> × {activity.label.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="chute">
          <h2 className="chute-titre">Tu as tiré le meilleur numéro</h2>
          <p>
            {country.name} est le pays où l’on vit le plus longtemps. Personne sur cette carte n’a
            eu plus d’heures que toi.
          </p>
        </div>
      )}

      {manque > 0 && (
        <div className="chute sombre">
          <h2 className="chute-titre">
            Ailleurs : <em>{worst.name}</em>
          </h2>
          <p>
            Là-bas, tu serais mort à {years(worst.years)} ans, avec{' '}
            <strong>{hours(manque)} heures de moins</strong>.
          </p>
          {debordement > 0 ? (
            <p>
              La vie que tu viens de composer n’y tiendrait pas : elle déborde de{' '}
              <strong>{hours(debordement)} heures</strong>. Il aurait fallu renoncer à quelque chose
              — et l’école, elle, coûte le même prix pour tout le monde.
            </p>
          ) : (
            <p>
              Ton panier y tiendrait encore, mais il ne resterait plus que{' '}
              <strong>{hours(lifetimeHours(worst.years) - panierAilleurs)} heures</strong> pour tout
              le reste.
            </p>
          )}
        </div>
      )}

      <h2 className="section-titre">La carte, maintenant</h2>
      <p className="section-note">
        Années perdues par rapport au maximum mondial ({best.name}, {years(best.years)} ans).
        Espérance de vie à la naissance, Banque mondiale, {dataYear}.
        {worldAverage !== null && ` Moyenne mondiale : ${years(worldAverage)} ans.`}
      </p>
      <div className="carte-boite revelee" data-choisi={country.id}>
        {carte}
      </div>
      <ul className="legende">
        {['0 à 6 ans', '6 à 12', '12 à 18', '18 à 24', '24 à 30'].map((label, index) => (
          <li key={label}>
            <span className="pastille" data-bucket={index} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>

      <div className="compteur-actions">
        <button type="button" className="bouton primaire" onClick={onReplay}>
          Renaître ailleurs
        </button>
        <button type="button" className="bouton discret" onClick={onBack}>
          Revenir à ma vie
        </button>
      </div>
    </section>
  );
}

function Part({ label, value, total }: { label: string; value: number; total: number }) {
  const part = total > 0 ? (value / total) * 100 : 0;
  return (
    <li className="part">
      <div className="part-tete">
        <span>{label}</span>
        <strong>{hours(value)} h</strong>
      </div>
      <div className="jauge">
        <div className="jauge-remplie" style={{ width: `${Math.max(0, part)}%` }} />
      </div>
      <span className="part-pourcent">{Math.round(part)} %</span>
    </li>
  );
}
