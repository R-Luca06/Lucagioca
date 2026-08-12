import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { createStore } from '@/shared/engine/storage';
import { useGameLoop, usePrefersReducedMotion } from '@/shared/engine/useGameLoop';
import {
  type Activity,
  allActivities,
  type Basket,
  basketHours,
  byActivityId,
  habits,
  hoursFor,
  lifetimeHours,
  mandatoryIds,
  translate,
  withMandatory,
  yearsFromHours,
} from './activities';
import {
  abonnerSon,
  balayage,
  bourdon,
  cascade,
  clic,
  cloche,
  clunk,
  prise,
  reglerSon,
  palettes as sonPalettes,
  statique,
} from './audio';
import { lifeLabels } from './buckets';
import { type Chiffre, chiffres, organisations } from './causes';
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

const storeSon = createStore({
  project: 'ton-temps',
  key: 'son',
  version: 1,
  schema: z.object({ actif: z.boolean() }),
  fallback: { actif: true },
});

/**
 * L'ouverture est une petite mise en scène en quatre temps :
 *
 *   choix → zoom (la carte se resserre) → dormir (le joueur clique, et c'est
 *   le seul moment où la machine attend) → nuit (le noir, et ce qu'on vient
 *   de perdre) → depense.
 *
 * `dormir` n'a pas de durée : il tient tant que le joueur n'a pas cliqué. Le
 * reste s'enchaîne sur minuteur, avec un « Passer » à chaque étape.
 */
type Phase = 'choix' | 'zoom' | 'dormir' | 'nuit' | 'depense' | 'bilan';

/** Doit rester aligné sur la transition de `.carte-boite.zoome .carte`. */
const ZOOM_MS = 1500;
/** Voile, apparition du texte, temps de lecture, scintillement. */
const NUIT_MS = 4300;

/* --- Compteurs --------------------------------------------------------------- */

/**
 * Fait défiler un compteur au lieu de le téléporter.
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

  /*
   * Rattrapage de la dernière unité.
   *
   * `settled` coupe la boucle dès que l'écart passe sous 1, donc le tour qui
   * aurait calé la valeur exacte n'a jamais lieu : le compteur se figeait à
   * une unité de la cible, et 2 100 000 000 s'affichait « 2 099 999 999 ».
   * Le même effet sert au cas `prefers-reduced-motion`, où l'on saute
   * directement à la cible.
   */
  useEffect(() => {
    if (!reduced && !settled) return;
    current.current = target;
    setDisplay(target);
  }, [reduced, settled, target]);

  return Math.round(reduced ? target : display);
}

/**
 * Le compteur, avec un point de départ facultatif.
 *
 * `useCountUp` seul ne bouge pas au premier rendu : il s'initialise sur sa
 * cible. Pour ouvrir sur une course, on lui donne donc `depart`, puis la vraie
 * valeur dans un effet. Les changements suivants s'animent depuis la valeur
 * courante dans les deux cas.
 */
function useCompteur(cible: number, depart?: number): number {
  const [vise, setVise] = useState(depart ?? cible);
  useEffect(() => setVise(cible), [cible]);
  return useCountUp(vise);
}

/**
 * L'interrupteur du son.
 *
 * `prefers-reduced-motion` ne couvre pas l'audio et il n'existe pas
 * d'équivalent normalisé : ce bouton EST le dispositif d'accessibilité, d'où
 * sa présence sur tous les écrans plutôt qu'en pied de page.
 *
 * L'état part à `true` des deux côtés — la préférence enregistrée n'est lue
 * qu'après le montage, sinon le rendu serveur et le client divergeraient.
 */
function useSon() {
  const [actif, setActif] = useState(true);

  useEffect(() => {
    // On s'abonne avant d'appliquer : c'est la notification de `reglerSon`
    // qui met l'état React au diapason de la préférence relue.
    const desabonner = abonnerSon(setActif);
    reglerSon(storeSon.read().actif);
    return desabonner;
  }, []);

  const basculer = () => {
    const suivant = !actif;
    reglerSon(suivant);
    storeSon.write({ actif: suivant });
  };

  return { actif, basculer };
}

function BoutonSon() {
  const { actif, basculer } = useSon();
  return (
    <button
      type="button"
      className={`bouton bouton-son${actif ? ' allume' : ''}`}
      onClick={basculer}
      aria-pressed={actif}
    >
      <span className="bouton-son-barres" aria-hidden="true">
        {actif ? '▮▮▮' : '▯▯▯'}
      </span>
      Son
    </button>
  );
}

/**
 * Marque le pays choisi dans le SVG rendu par Astro.
 *
 * La carte est du HTML statique que React ne possède pas, et aucun sélecteur
 * CSS ne sait comparer le `data-id` d'un enfant au `data-choisi` de son
 * parent : la classe se pose donc à la main.
 */
function useMarquePays(boite: RefObject<HTMLDivElement | null>, selected: string | null) {
  useEffect(() => {
    const noeud = boite.current;
    if (!noeud) return;
    for (const ancien of noeud.querySelectorAll('.pays.choisi')) {
      ancien.classList.remove('choisi');
    }
    if (selected) noeud.querySelector(`.pays[data-id="${selected}"]`)?.classList.add('choisi');
  }, [boite, selected]);
}

export default function TonTemps({ carte }: { carte?: ReactNode }) {
  const [countryId, setCountryId] = useState<string | null>(null);
  const [basket, setBasket] = useState<Record<string, number>>(() => withMandatory({}));
  const [phase, setPhase] = useState<Phase>('choix');
  /** Vrai tant que l'ouverture (montée du budget, puis sommeil) n'a pas été jouée. */
  const [ouvrir, setOuvrir] = useState(false);
  const reduced = usePrefersReducedMotion();

  // Les deux temps minutés se terminent seuls ; `dormir` attend le joueur.
  useEffect(() => {
    if (phase === 'zoom') {
      const fin = setTimeout(() => setPhase('dormir'), ZOOM_MS);
      return () => clearTimeout(fin);
    }
    if (phase === 'nuit') {
      // Calé sur les délais CSS de `.nuit-mot` : le scintillement démarre à
      // 3,1 s et dure 1,1 s. Programmé d'un coup, donc au sample près.
      statique(3.1, 1.1);
      const fin = setTimeout(() => setPhase('depense'), NUIT_MS);
      return () => clearTimeout(fin);
    }
  }, [phase]);

  const commencer = () => {
    setOuvrir(!reduced);
    setPhase(reduced ? 'depense' : 'zoom');
    if (!reduced) balayage(1.2);
  };

  // La sauvegarde n'est lue qu'après le montage : au rendu serveur elle
  // n'existe pas, et repartir de zéro éviterait une divergence d'hydratation.
  useEffect(() => {
    const saved = store.read();
    if (saved.countryId && byId.has(saved.countryId)) {
      setCountryId(saved.countryId);
      setBasket(withMandatory(saved.basket));
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

  /** Ce que le sommeil prend. Le nombre que porte tout l'écran de nuit. */
  const sommeil = useMemo(
    () =>
      country
        ? basketHours(
            Object.fromEntries(mandatoryIds.map((id) => [id, basket[id] ?? 0])),
            country.years,
          )
        : 0,
    [basket, country],
  );

  const reset = () => {
    store.clear();
    setCountryId(null);
    setBasket(withMandatory({}));
    setPhase('choix');
  };

  if (phase === 'choix' || phase === 'zoom' || phase === 'dormir' || phase === 'nuit' || !country) {
    return (
      <>
        <BoutonSon />
        <Choix
          carte={carte}
          selected={countryId}
          onSelect={setCountryId}
          onStart={commencer}
          zoom={phase !== 'choix'}
          dormir={phase === 'dormir'}
          onDormir={() => setPhase('nuit')}
        />
        {phase === 'nuit' && (
          <Nuit sommeil={sommeil} budget={budget} onPasser={() => setPhase('depense')} />
        )}
      </>
    );
  }

  if (phase === 'bilan') {
    return (
      <>
        <BoutonSon />
        <Bilan
          carte={carte}
          country={country}
          basket={basket}
          spent={spent}
          budget={budget}
          onReplay={reset}
          onBack={() => setPhase('depense')}
        />
      </>
    );
  }

  return (
    <>
      <BoutonSon />
      <Depense
        country={country}
        basket={basket}
        budget={budget}
        remaining={remaining}
        onChange={setBasket}
        onFinish={() => {
          // La cloche de Notre-Dame, une fois, sur « Ta vie est finie ».
          cloche();
          setPhase('bilan');
        }}
        onReset={reset}
        ouverture={ouvrir}
        onOuverte={() => setOuvrir(false)}
      />
    </>
  );
}

/* --- La carte, partagée entre le choix et le dernier écran ------------------- */

/**
 * La boîte du plus gros morceau d'un pays.
 *
 * `getBBox()` sur le tracé entier engloberait les territoires d'outre-mer : le
 * centre de la France tomberait au milieu de l'Atlantique, entre la métropole
 * et la Guyane, et le zoom cadrerait l'océan. Les tracés générés n'utilisent
 * que des commandes absolues `M`/`L`/`Z`, donc découper sur « M » isole
 * proprement chaque morceau, qu'on mesure un par un.
 */
function plusGrosMorceau(svg: SVGSVGElement, trace: SVGPathElement): DOMRect {
  const entier = trace.getBBox();
  const morceaux = (trace.getAttribute('d') ?? '')
    .split('M')
    .filter(Boolean)
    .map((part) => `M${part}`);
  if (morceaux.length < 2) return entier;

  const sonde = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  sonde.style.visibility = 'hidden';
  svg.appendChild(sonde);

  let meilleur = entier;
  let aire = 0;
  for (const morceau of morceaux) {
    sonde.setAttribute('d', morceau);
    const boite = sonde.getBBox();
    const surface = boite.width * boite.height;
    if (surface > aire) {
      aire = surface;
      meilleur = boite;
    }
  }

  sonde.remove();
  return meilleur;
}

/**
 * Cadre le SVG sur un pays.
 *
 * On ne touche pas au `viewBox` — il n'est pas animable en CSS. On applique
 * une échelle au SVG entier avec l'origine posée sur le centre du pays, ce
 * qui donne le même cadrage et se laisse transitionner par le compositeur.
 *
 * Le pourcentage d'origine se lit directement dans le repère du `viewBox` :
 * `.carte` est en largeur pleine et hauteur automatique, donc la boîte du
 * SVG a exactement le rapport de son `viewBox`.
 */
function useZoomPays(boite: RefObject<HTMLDivElement | null>, vers: string | null) {
  useEffect(() => {
    const svg = boite.current?.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) return;

    if (!vers) {
      svg.style.removeProperty('transform');
      svg.style.removeProperty('transform-origin');
      return;
    }

    const cible = boite.current?.querySelector(`.pays[data-id="${vers}"]`);
    if (!(cible instanceof SVGPathElement)) return;

    const vue = svg.viewBox.baseVal;
    const boitePays = plusGrosMorceau(svg, cible);
    if (boitePays.width <= 0 || boitePays.height <= 0) return;

    const cx = boitePays.x + boitePays.width / 2;
    const cy = boitePays.y + boitePays.height / 2;
    // 0,55 pour laisser de l'air autour ; borné, sinon le Vatican part à 400×
    // et la Russie ne bouge pas du tout.
    const brut = Math.min(vue.width / boitePays.width, vue.height / boitePays.height) * 0.55;
    const echelle = Math.min(9, Math.max(2.5, brut));

    const ox = ((cx - vue.x) / vue.width) * 100;
    const oy = ((cy - vue.y) / vue.height) * 100;

    // Une image après la pose de la classe : sans ça, transition et transform
    // changeraient dans la même passe de style et le saut serait instantané.
    const image = requestAnimationFrame(() => {
      svg.style.transformOrigin = `${ox}% ${oy}%`;
      // L'échelle laisse le pays là où il était ; la translation l'amène au
      // centre du cadre. Les deux pourcentages portent sur la boîte du SVG.
      svg.style.transform = `translate(${50 - ox}%, ${50 - oy}%) scale(${echelle})`;
    });
    return () => cancelAnimationFrame(image);
  }, [boite, vers]);
}

function Carte({
  carte,
  variante,
  selected,
  onSelect,
  zoom = false,
}: {
  carte?: ReactNode;
  variante: 'choix' | 'finale';
  selected: string | null;
  onSelect?: (id: string) => void;
  zoom?: boolean;
}) {
  const [survol, setSurvol] = useState<{ id: string; x: number; y: number } | null>(null);
  const survole = survol ? (byId.get(survol.id) ?? null) : null;
  const boite = useRef<HTMLDivElement>(null);

  useMarquePays(boite, selected);
  useZoomPays(boite, zoom ? selected : null);

  // Délégation : les 169 pays sont du HTML statique, un seul écouteur suffit.
  const paysSous = (event: React.MouseEvent<HTMLDivElement>) =>
    (event.target as Element).closest?.('path[data-id]')?.getAttribute('data-id') ?? null;

  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const id = paysSous(event);
    if (id) onSelect?.(id);
  };

  // La bulle est positionnée dans le repère de la boîte, pas de la page :
  // elle suit donc la carte si la page défile pendant le survol.
  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const id = paysSous(event);
    if (!id || !byId.has(id)) {
      setSurvol(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    // Bornée à 7rem des bords : la bulle reste entière même sur la Nouvelle-Zélande.
    const marge = Math.min(112, rect.width / 2);
    const x = Math.min(Math.max(event.clientX - rect.left, marge), rect.width - marge);
    setSurvol({ id, x, y: event.clientY - rect.top });
  };

  const classes = [
    'carte-boite',
    variante,
    selected && onSelect ? 'a-choisi' : '',
    zoom ? 'zoome' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    /* biome-ignore lint/a11y/noStaticElementInteractions: la carte est un
       raccourci à la souris ; le <select> de l'écran de choix fait le même
       travail au clavier et au lecteur d'écran, et la carte finale est
       purement illustrative. */
    /* biome-ignore lint/a11y/useKeyWithClickEvents: idem. */
    <div
      ref={boite}
      className={classes}
      onClick={zoom ? undefined : onClick}
      onMouseMove={zoom ? undefined : onMove}
      onMouseLeave={() => setSurvol(null)}
    >
      {carte}
      {survol && survole && (
        <div className="carte-bulle" style={{ left: survol.x, top: survol.y }} aria-hidden="true">
          <strong>{survole.name}</strong>
          <span>{years(survole.years)} ans</span>
        </div>
      )}
    </div>
  );
}

/* --- Écran 1 : le choix du pays -------------------------------------------- */

function Choix({
  carte,
  selected,
  onSelect,
  onStart,
  zoom,
  dormir,
  onDormir,
}: {
  carte?: ReactNode;
  selected: string | null;
  onSelect: (id: string) => void;
  onStart: () => void;
  zoom: boolean;
  dormir: boolean;
  onDormir: () => void;
}) {
  const country = selected ? (byId.get(selected) ?? null) : null;

  const choisir = (id: string) => {
    clic();
    onSelect(id);
  };

  return (
    <section className={`ecran${zoom ? ' sortie' : ''}`}>
      <h1 className="titre">Ton temps</h1>
      <p className="intro">
        Tu n’as pas d’argent à dépenser ici, <em>seulement des heures</em>. Ton pays de naissance
        décide combien.
      </p>

      <Carte carte={carte} variante="choix" selected={selected} onSelect={choisir} zoom={zoom} />

      {/* Le seul temps de l'ouverture qui attende le joueur : rien ne bouge
          tant qu'il n'a pas décidé d'aller dormir. */}
      {dormir && country && (
        <div className="veille">
          <p className="veille-mot">
            {country.name} — {years(country.years)} ans devant toi.
          </p>
          <button
            type="button"
            className="bouton primaire pouls"
            onClick={() => {
              clunk();
              onDormir();
            }}
          >
            Dormir
          </button>
        </div>
      )}

      <div className="choix-barre">
        <label className="choix-label" htmlFor="pays">
          Pays de naissance
          <select
            id="pays"
            value={selected ?? ''}
            onChange={(event) => choisir(event.target.value)}
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

        {/* Le pouls ne bat qu'une fois le pays choisi : c'est lui qui dit que
            la machine attend, et il s'arrête dès qu'on la lance. */}
        <button
          type="button"
          className={`bouton primaire${country && !zoom ? ' pouls' : ''}`}
          disabled={!country}
          onClick={onStart}
        >
          Commencer ma vie
        </button>
      </div>
    </section>
  );
}

/* --- L'entre-deux : la nuit -------------------------------------------------- */

/**
 * Le noir, et ce qu'on vient d'y laisser.
 *
 * Le minuteur qui mène à l'écran suivant vit dans le composant racine, comme
 * celui du zoom ; ici on ne fait que la mise en scène. Le déroulé exact
 * (voile, apparition, lecture, scintillement) est écrit en CSS, avec des
 * délais qui totalisent `NUIT_MS`.
 */
function Nuit({
  sommeil,
  budget,
  onPasser,
}: {
  sommeil: number;
  budget: number;
  onPasser: () => void;
}) {
  const part = budget > 0 ? Math.round((sommeil / budget) * 100) : 0;

  return (
    <div className="nuit">
      <p className="nuit-mot">
        Tu viens de perdre <strong>{part} % de ta vie</strong>, soit{' '}
        <strong>{years(yearsFromHours(sommeil))} années</strong>.
        <span className="nuit-sous">{hours(sommeil)} heures de sommeil. Non négociable.</span>
      </p>
      <button type="button" className="bouton nuit-passer" onClick={onPasser}>
        Passer
      </button>
    </div>
  );
}

/* --- Écran 2 : la dépense --------------------------------------------------- */

function Depense({
  country,
  basket,
  budget,
  remaining,
  onChange,
  onFinish,
  onReset,
  ouverture: demarre,
  onOuverte,
}: {
  country: Country;
  basket: Basket;
  budget: number;
  remaining: number;
  onChange: (basket: Record<string, number>) => void;
  onFinish: () => void;
  onReset: () => void;
  ouverture: boolean;
  onOuverte: () => void;
}) {
  /*
   * En arrivant de la nuit, le compteur part de la vie entière et tombe vers
   * ce qui reste : la jauge se remplit donc toute seule sous les yeux du
   * joueur, et c'est le sommeil qu'il voit se prendre. En revenant du bilan,
   * il n'y a rien à rejouer.
   */
  const affiche = useCompteur(remaining, demarre ? budget : undefined);
  const part = budget > 0 ? Math.min(100, ((budget - affiche) / budget) * 100) : 0;

  // Une seule fois : sans ça, un aller-retour par le bilan rejouerait la chute.
  useEffect(() => {
    if (demarre) onOuverte();
  }, [demarre, onOuverte]);

  const set = (id: string, quantity: number) => {
    // La note du clac est accordée sur le poids de l'activité dans la vie.
    const activite = byActivityId.get(id);
    if (activite && budget > 0) prise(hoursFor(activite, country.years) / budget);

    const next = { ...basket };
    if (quantity <= 0) delete next[id];
    else next[id] = quantity;
    onChange(next);
  };

  return (
    <section className="ecran">
      <header className="compteur">
        <span className="compteur-legende">Temps restant</span>
        <div className="compteur-chiffre">
          <Palettes texte={hours(affiche)} />
          <span className="compteur-unite">heures</span>
          <span className="compteur-annees">≈ {years(yearsFromHours(affiche))} ans</span>
        </div>
        <Jauge part={part} />
        <p className="compteur-pays">
          {country.name} · {years(country.years)} ans · {hours(budget)} h au départ
        </p>
        <div className="compteur-actions">
          <button type="button" className="bouton primaire" onClick={onFinish}>
            Voir ma vie
          </button>
          <button type="button" className="bouton" onClick={onReset}>
            Changer de pays
          </button>
        </div>
      </header>

      <h2 className="section-titre">Ce que tu fais de ta vie</h2>
      <ul className="grille">
        {allActivities.map((activity) => {
          const cost = hoursFor(activity, country.years);
          const quantity = basket[activity.id] ?? 0;
          const poids = budget > 0 ? (cost / budget) * 100 : 0;
          const classes = ['ligne'];
          if (quantity > 0) classes.push('prise');
          if (activity.mandatory) classes.push('subie');
          return (
            <li key={activity.id} className={classes.join(' ')}>
              <div className="ligne-tete">
                <span className="ligne-marque" aria-hidden="true">
                  &gt;
                </span>
                <h3 className="activite-titre">{activity.label}</h3>
                <span className="conduite" aria-hidden="true" />
                <p className="activite-cout">
                  {hours(cost)} h
                  {poids >= 1 && <span className="activite-part"> · {Math.round(poids)} %</span>}
                </p>
              </div>
              <p className="ligne-note">
                {activity.detail ? `${activity.detail} — ` : ''}
                <span className="activite-source">{activity.source}</span>
              </p>
              <div className="ligne-controle">
                <Controle
                  activity={activity}
                  quantity={quantity}
                  cost={cost}
                  remaining={remaining}
                  onSet={(next) => set(activity.id, next)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Le compteur en palettes : un caractère par case, comme un afficheur
 * mécanique. Le nombre entier est donné une seule fois à l'assistance
 * vocale — lui faire épeler sept cases séparées ne dirait rien.
 */
function Palettes({ texte }: { texte: string }) {
  // Les clés sont positionnelles : la case 3 reste la case 3 quand son chiffre
  // change, ce qui est exactement ce qu'il faudra pour l'animation de bascule.
  const cases = useMemo(
    () => [...texte].map((glyphe, index) => ({ cle: `case-${index}`, glyphe })),
    [texte],
  );

  // Une palette qui bascule = un clac. On compte les cases qui ont changé,
  // le moteur se charge de brider le débit quand le compteur s'emballe.
  const precedent = useRef(texte);
  useEffect(() => {
    const avant = precedent.current;
    if (avant === texte) return;
    precedent.current = texte;
    let changements = 0;
    for (let i = 0; i < Math.max(avant.length, texte.length); i++) {
      if (avant[i] !== texte[i]) changements++;
    }
    sonPalettes(changements);
  }, [texte]);

  return (
    <div className="palettes" role="img" aria-label={`${texte} heures`}>
      {cases.map(({ cle, glyphe }) =>
        // Les séparateurs de milliers du français sont des espaces insécables
        // étroites : `trim` les reconnaît, un test sur `' '` non.
        glyphe.trim() === '' ? (
          <span key={cle} className="palette-espace" />
        ) : (
          <span key={cle} className="palette">
            {glyphe}
          </span>
        ),
      )}
    </div>
  );
}

function Jauge({ part }: { part: number }) {
  const borne = Math.max(0, Math.min(100, part));
  return (
    <div className="jauge">
      <span aria-hidden="true">[</span>
      <div className="jauge-piste">
        <div className="jauge-remplie" style={{ width: `${borne}%` }} />
      </div>
      <span aria-hidden="true">]</span>
      <span>{Math.round(borne)} %</span>
    </div>
  );
}

/**
 * Le contrôle d'une ligne. Trois formes, parce qu'il y a trois natures de
 * ligne : ce qu'on subit, ce qu'on prend ou pas, ce qu'on dose.
 */
function Controle({
  activity,
  quantity,
  cost,
  remaining,
  onSet,
}: {
  activity: Activity;
  quantity: number;
  cost: number;
  remaining: number;
  onSet: (quantity: number) => void;
}) {
  if (activity.mandatory) {
    return <p className="verrou">Non négociable</p>;
  }

  if (activity.cost.kind === 'once') {
    // Le maximum abordable englobe ce qui est déjà pris : sinon le champ
    // refuserait de ressaisir la quantité qu'il affiche déjà.
    const max = cost > 0 ? Math.floor((remaining + quantity * cost + 0.5) / cost) : quantity;
    return <Quantite activity={activity} quantity={quantity} max={max} onSet={onSet} />;
  }

  const pris = quantity > 0;
  return (
    <button
      type="button"
      className={`bouton${pris ? '' : ' primaire'}`}
      disabled={!pris && cost > remaining + 0.5}
      onClick={() => onSet(pris ? 0 : 1)}
    >
      {pris ? 'Y renoncer' : 'Prendre'}
    </button>
  );
}

/**
 * Le pas à pas, plus la saisie directe : à 8 h l'unité, atteindre 300 romans
 * au bouton « + » n'est pas une interface, c'est une punition.
 */
function Quantite({
  activity,
  quantity,
  max,
  onSet,
}: {
  activity: Activity;
  quantity: number;
  max: number;
  onSet: (quantity: number) => void;
}) {
  // Pendant la frappe le champ garde son texte brut : sans ça, effacer le « 1 »
  // de « 12 » remettrait le panier à zéro entre deux touches.
  const [saisie, setSaisie] = useState<string | null>(null);

  const valider = (brut: string) => {
    const lu = Number.parseInt(brut, 10);
    setSaisie(null);
    onSet(Number.isNaN(lu) ? 0 : Math.min(max, Math.max(0, lu)));
  };

  return (
    <div className="quantite">
      <button
        type="button"
        className="bouton rond"
        disabled={quantity === 0}
        onClick={() => onSet(quantity - 1)}
        aria-label={`Une fois de moins : ${activity.label}`}
      >
        −
      </button>
      <input
        type="number"
        className="quantite-champ"
        inputMode="numeric"
        min={0}
        max={max}
        value={saisie ?? String(quantity)}
        aria-label={`Combien de fois : ${activity.label}`}
        onChange={(event) => setSaisie(event.target.value)}
        onBlur={(event) => valider(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <button
        type="button"
        className="bouton rond"
        disabled={quantity >= max}
        onClick={() => onSet(quantity + 1)}
        aria-label={`Une fois de plus : ${activity.label}`}
      >
        +
      </button>
    </div>
  );
}

/* --- Écran 3 : le bilan, en quatre temps ------------------------------------ */

const ETAPES = 4;

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
  const [etape, setEtape] = useState(0);
  const haut = useRef<HTMLElement>(null);

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

  const aller = (vers: number) => {
    // Une palette par ligne, au même rythme que la cascade visuelle.
    cascade(6);
    setEtape(vers);
    haut.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return (
    <section className="ecran bilan" ref={haut}>
      {/* La clé force le remontage : c'est elle qui rejoue la cascade. */}
      <div className="etape" key={etape}>
        {etape === 0 && (
          <Resume country={country} budget={budget} spent={spent} subi={subi} choisi={choisi} />
        )}
        {etape === 1 && <Chance budget={budget} surplus={surplus} />}
        {etape === 2 && (
          <Manque manque={manque} debordement={debordement} panierAilleurs={panierAilleurs} />
        )}
        {etape === 3 && <Agir carte={carte} country={country} />}
      </div>

      <nav className="etape-nav">
        <span className="etape-rang">
          [{etape + 1} / {ETAPES}]
        </span>
        {etape > 0 && (
          <button type="button" className="bouton" onClick={() => aller(etape - 1)}>
            Retour
          </button>
        )}
        {etape < ETAPES - 1 ? (
          <button type="button" className="bouton primaire" onClick={() => aller(etape + 1)}>
            Continuer
          </button>
        ) : (
          <>
            <button type="button" className="bouton primaire" onClick={onReplay}>
              Renaître ailleurs
            </button>
            <button type="button" className="bouton" onClick={onBack}>
              Revenir à ma vie
            </button>
          </>
        )}
      </nav>
    </section>
  );
}

/*
 * Chaque étape rend une suite d'éléments frères, sans conteneur : ce sont eux
 * que la cascade fait basculer, l'un après l'autre.
 *
 * Les titres évitent la préposition (« — France » plutôt que « en France ») :
 * elle varie selon le pays — en France, au Nigéria, aux Philippines, à Cuba —
 * et le jeu de données ne la porte pas. Un dash est correct pour les 169.
 */

function Resume({
  country,
  budget,
  spent,
  subi,
  choisi,
}: {
  country: Country;
  budget: number;
  spent: number;
  subi: number;
  choisi: number;
}) {
  return (
    <>
      <h1 className="titre">Résumé de ta vie</h1>
      <p className="etape-lieu">— {country.name}</p>
      <p className="intro">
        Tu as eu <em>{hours(budget)} heures</em>, soit {years(country.years)} ans. Voilà ce que tu
        en as fait.
      </p>
      <ul className="reparti">
        <Part label="Pris par les habitudes" value={subi} total={budget} />
        <Part label="Vraiment choisi" value={choisi} total={budget} />
        <Part label="Jamais dépensé" value={budget - spent} total={budget} />
      </ul>
    </>
  );
}

function Chance({ budget, surplus }: { budget: number; surplus: number }) {
  if (surplus <= 0) {
    return (
      <>
        <h1 className="titre">Tu as tiré le meilleur numéro.</h1>
        <p className="intro">
          {best.name} est le pays où l’on vit le plus longtemps. Personne sur cette carte n’a eu
          plus d’heures que toi : <em>{hours(budget)}</em>.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="titre">Parfois il suffit d’un peu de chance…</h1>
      <p className="intro">
        Né en <em>{best.name}</em>, tu aurais vécu {years(best.years)} ans. Le même corps, le même
        effort, juste un autre lieu de naissance.
      </p>
      <div className="chute">
        <p className="chute-chiffre">
          <strong>{hours(surplus)}</strong> heures de plus
        </p>
        <p className="chute-liste-intro">Ce que tu aurais pu en faire :</p>
        <ul className="chute-liste">
          {translate(surplus).map(({ activity, count }) => (
            <li key={activity.id}>
              <strong>{nf.format(count)}</strong> × {activity.label.toLowerCase()}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Manque({
  manque,
  debordement,
  panierAilleurs,
}: {
  manque: number;
  debordement: number;
  panierAilleurs: number;
}) {
  if (manque <= 0) {
    return (
      <>
        <h1 className="titre">…que d’autres n’ont pas.</h1>
        <p className="intro">
          Tu es né dans le pays où l’on vit le moins longtemps. C’est de ton côté de la carte que
          l’écart se creuse.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="titre">…que certains n’ont pas.</h1>
      <p className="intro">
        Né en <em>{worst.name}</em>, tu serais mort à {years(worst.years)} ans.
      </p>
      <div className="chute sombre">
        <p className="chute-chiffre">
          <strong>{hours(manque)}</strong> heures de moins
        </p>
        {debordement > 0 ? (
          <p>
            La vie que tu viens de composer n’y tiendrait pas : elle déborde de{' '}
            <strong>{hours(debordement)} heures</strong>. Il aurait fallu renoncer à quelque chose —
            et l’école, elle, coûte le même prix pour tout le monde.
          </p>
        ) : (
          <p>
            Ton panier y tiendrait encore, mais il ne resterait plus que{' '}
            <strong>{hours(lifetimeHours(worst.years) - panierAilleurs)} heures</strong> pour tout
            le reste.
          </p>
        )}
      </div>
    </>
  );
}

function Agir({ carte, country }: { carte?: ReactNode; country: Country }) {
  // `bourdon()` rend sa propre fonction d'arrêt : elle sert de nettoyage, donc
  // le bourdon ne peut pas survivre au départ du joueur.
  useEffect(() => bourdon(), []);

  return (
    <>
      <h1 className="titre">Alors ouvrons les yeux, et agissons.</h1>
      <p className="intro">
        La même carte, sans ménagement : le noir est une vie de {years(worst.years)} ans, la lumière
        une vie de {years(best.years)}. Tout ce que tu viens de dépenser dépend de cette seule
        couleur.
      </p>

      <Carte carte={carte} variante="finale" selected={country.id} />

      <ul className="legende" data-echelle="finale">
        {lifeLabels.map((label, index) => (
          <li key={label}>
            <span className="pastille" data-bucket={index} aria-hidden="true" />
            {label} ans
          </li>
        ))}
      </ul>
      <p className="section-note">
        Espérance de vie à la naissance, Banque mondiale, {dataYear}.
        {worldAverage !== null && ` Moyenne mondiale : ${years(worldAverage)} ans.`} Survole un pays
        pour lire sa valeur.
      </p>

      <h2 className="section-titre">Ce que cette couleur veut dire</h2>
      <ul className="chiffres">
        {chiffres.map((chiffre) => (
          <ChiffreLigne key={chiffre.id} chiffre={chiffre} />
        ))}
      </ul>

      <h2 className="section-titre">Où agir</h2>
      <ul className="organisations">
        {organisations.map((org) => (
          <li key={org.url}>
            <a href={org.url} target="_blank" rel="noreferrer noopener">
              <span className="ligne-marque" aria-hidden="true">
                &gt;
              </span>
              {org.name}
            </a>
            <span className="organisation-mission">{org.mission}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function ChiffreLigne({ chiffre }: { chiffre: Chiffre }) {
  const monte = useCompteur(chiffre.value, 0);
  return (
    <li className="chiffre">
      <p className="chiffre-valeur">
        {chiffre.prefix && <span className="chiffre-prefixe">{chiffre.prefix} </span>}
        {nf.format(monte)}
      </p>
      <p className="chiffre-label">{chiffre.label}</p>
      <p className="chiffre-source">{chiffre.source}</p>
    </li>
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
      <Jauge part={part} />
    </li>
  );
}
