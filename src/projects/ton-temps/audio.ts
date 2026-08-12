/**
 * Le son du jeu, à partir d'échantillons réels.
 *
 * Les sources sont de vraies machines — un tableau à palettes Pragotron, une
 * machine à écrire, un relais, un moteur, une cloche de Notre-Dame. Elles ont
 * été découpées, normalisées à −3 dBFS et réencodées en Opus mono : 66 kB pour
 * les dix-sept fichiers. Voir `assets/sons/CREDITS.md` — trois d'entre eux
 * imposent l'attribution, et les palettes interdisent l'usage commercial.
 *
 * Ce qui reste de l'ancien moteur synthétique, et qu'il ne faut pas simplifier :
 *
 *   · aucune frappe n'est identique à la précédente. Un échantillon unique
 *     rejoué 27 fois d'affilée sonne mitraillette, quelle que soit sa qualité.
 *     Hauteur, gain et panoramique varient à chaque fois, et six palettes
 *     différentes se relaient ;
 *   · une petite réverbération à convolution, dont la réponse impulsionnelle
 *     est synthétisée. Elle place les sons dans un même volume — sans elle,
 *     huit enregistrements d'origines différentes ne font pas une machine ;
 *   · un compresseur en sortie, qui tient l'ensemble quand les palettes
 *     partent en rafale.
 *
 * Contrainte navigateur : un `AudioContext` créé avant tout geste de
 * l'utilisateur démarre suspendu. Les fichiers sont donc téléchargés dès le
 * chargement de la page (66 kB, sans contexte), mais décodés seulement au
 * premier son demandé — qui arrive forcément après un clic.
 */
import { createRng } from '@/shared/engine/rng';

/*
 * Aléa seedé, comme partout ailleurs dans le projet : la variation d'une
 * frappe à l'autre reste reproductible, donc un rendu douteux peut être rejoué
 * à l'identique.
 */
const alea = createRng('ton-temps:audio');

/*
 * Vite copie et empreinte chaque fichier, et nous rend son URL finale. Passer
 * par `glob` plutôt que par dix-sept imports veut dire qu'ajouter une variante
 * ne demande aucune ligne de code : il suffit de déposer le fichier.
 *
 * `?no-inline` est indispensable : sans lui, Vite intègre en base64 tout asset
 * sous 4 ko, c'est-à-dire treize de nos dix-sept sons. Le bundle de l'île
 * passait alors de 30 à 42 kB gzip, l'audio se retéléchargeait au moindre
 * changement de code, et son décodage retardait l'hydratation. En fichiers
 * séparés, il est mis en cache une fois pour toutes et chargé en parallèle.
 */
const FICHIERS = import.meta.glob('./assets/sons/*.ogg', {
  eager: true,
  query: '?no-inline',
  import: 'default',
}) as Record<string, string>;

const URLS = new Map(
  Object.entries(FICHIERS).map(([chemin, url]) => [
    chemin.replace(/^.*\/(.+)\.ogg$/, '$1'),
    url as string,
  ]),
);

/** Les variantes d'un même rôle, pour tirer au sort à chaque frappe. */
const familles = (prefixe: string): string[] =>
  [...URLS.keys()].filter((nom) => nom.startsWith(prefixe)).sort();

const PALETTES = familles('palette');
const CLICS = familles('clic-');
const STATIQUES = familles('statique');

let ctx: AudioContext | null = null;
let maitre: GainNode | null = null;
let versReverb: GainNode | null = null;
let impossible = false;

const octets = new Map<string, ArrayBuffer>();
const tampons = new Map<string, AudioBuffer>();

/** Téléchargement anticipé, sans contexte audio : 66 kB, une fois. */
if (typeof window !== 'undefined') {
  for (const [nom, url] of URLS) {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => octets.set(nom, data))
      .catch(() => {
        // Un son manquant ne doit jamais casser la partie.
      });
  }
}

/** Réponse impulsionnelle : du bruit qui décroît. Une pièce petite et mate. */
function reponseImpulsionnelle(audio: AudioContext): AudioBuffer {
  const duree = 0.34;
  const echantillons = Math.floor(audio.sampleRate * duree);
  const tampon = audio.createBuffer(2, echantillons, audio.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const donnees = tampon.getChannelData(canal);
    for (let i = 0; i < echantillons; i++) {
      donnees[i] = (alea.next() * 2 - 1) * (1 - i / echantillons) ** 3.6;
    }
  }
  return tampon;
}

const VOLUME = 0.55;

function assure(): AudioContext | null {
  if (impossible || typeof window === 'undefined') return null;

  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  const Constructeur =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructeur) {
    impossible = true;
    return null;
  }

  try {
    ctx = new Constructeur();
  } catch {
    // Navigateur qui refuse : le jeu doit rester jouable, simplement muet.
    impossible = true;
    return null;
  }

  const compresseur = ctx.createDynamicsCompressor();
  compresseur.threshold.value = -16;
  compresseur.ratio.value = 5;
  compresseur.attack.value = 0.004;
  compresseur.release.value = 0.18;
  compresseur.connect(ctx.destination);

  maitre = ctx.createGain();
  maitre.gain.value = actif ? VOLUME : 0;
  maitre.connect(compresseur);

  const reverb = ctx.createConvolver();
  reverb.buffer = reponseImpulsionnelle(ctx);
  reverb.connect(maitre);

  versReverb = ctx.createGain();
  versReverb.gain.value = 1;
  versReverb.connect(reverb);

  // Le décodage n'est possible qu'ici : il lui faut un contexte.
  Promise.all(
    [...octets].map(([nom, data]) =>
      // biome-ignore lint/style/noNonNullAssertion: `ctx` vient d'être créé.
      ctx!.decodeAudioData(data.slice(0)).then(
        (tampon) => tampons.set(nom, tampon),
        () => {},
      ),
    ),
  ).then(() => {
    const differe = enAttente;
    enAttente = null;
    differe?.();
  });

  return ctx;
}

/**
 * Le tout premier son est demandé dans le geste même qui crée le contexte —
 * les tampons sont alors encore en train de se décoder, et il partait à la
 * poubelle. On le garde, et il se joue dès que c'est prêt : quelques dizaines
 * de millisecondes plus tard, imperceptible.
 */
let enAttente: (() => void) | null = null;

function lancer(action: () => void): void {
  if (tampons.size > 0) action();
  else enAttente = action;
}

/* --- L'interrupteur ---------------------------------------------------------- */

let actif = true;
const abonnes = new Set<(actif: boolean) => void>();

export function sonActif(): boolean {
  return actif;
}

/** Pose l'état sans rien jouer. Sert à appliquer la préférence enregistrée. */
export function reglerSon(valeur: boolean): void {
  actif = valeur;
  if (maitre && ctx) {
    maitre.gain.setTargetAtTime(actif ? VOLUME : 0, ctx.currentTime, 0.02);
  }
  for (const abonne of abonnes) abonne(actif);
}

export function abonnerSon(abonne: (actif: boolean) => void): () => void {
  abonnes.add(abonne);
  return () => {
    abonnes.delete(abonne);
  };
}

/* --- Lecture ----------------------------------------------------------------- */

interface Options {
  quand?: number;
  gain?: number;
  hauteur?: number;
  pan?: number;
  envoi?: number;
}

interface Voix {
  source: AudioBufferSourceNode;
  volume: GainNode;
}

/**
 * Joue un échantillon. Rend la source ET son gain, pour les rares cas où
 * l'appelant doit encore agir dessus — le balayage qui accélère et gonfle,
 * les éclats de statique qu'on coupe court.
 */
function jouer(
  audio: AudioContext,
  nom: string,
  { quand, gain = 1, hauteur = 1, pan = 0, envoi = 0.1 }: Options = {},
): Voix | null {
  const tampon = tampons.get(nom);
  if (!tampon) return null;

  const source = audio.createBufferSource();
  source.buffer = tampon;
  source.playbackRate.value = hauteur;

  const volume = audio.createGain();
  volume.gain.value = gain;

  const panoramique = audio.createStereoPanner();
  panoramique.pan.value = pan;

  source.connect(volume);
  volume.connect(panoramique);
  if (maitre) panoramique.connect(maitre);
  if (versReverb && envoi > 0) {
    const depart = audio.createGain();
    depart.gain.value = envoi;
    panoramique.connect(depart);
    depart.connect(versReverb);
  }

  source.start(quand ?? audio.currentTime);
  return { source, volume };
}

/* --- Les sons du jeu --------------------------------------------------------- */

/**
 * Une palette qui bascule. La brique la plus jouée du projet.
 *
 * `hauteur` permet d'accorder la frappe : c'est ce qui fait qu'une activité
 * coûteuse sonne plus grave et plus lourde qu'une broutille.
 */
function palette(audio: AudioContext, quand: number, force = 1, hauteur?: number): void {
  if (PALETTES.length === 0) return;
  jouer(audio, alea.pick(PALETTES), {
    quand,
    gain: force * alea.float(0.82, 1),
    hauteur: hauteur ?? alea.float(0.93, 1.08),
    pan: alea.float(-0.35, 0.35),
    envoi: 0.12,
  });
}

/*
 * Débit maximal des palettes.
 *
 * Le compteur se redessine à chaque image, soit 60 changements par seconde :
 * sans bride, on obtiendrait plus de cent clacs par seconde, c'est-à-dire du
 * bruit continu. À 60 ms d'écart et deux clacs par rafale, on plafonne autour
 * de trente — le débit d'un vrai tableau en pleine bascule, mesuré à 27 clacs
 * sur une chute complète. La décrue vient toute seule : quand le compteur
 * ralentit, moins de cases changent, donc les rafales maigrissent.
 */
const ECART_MINIMAL = 0.06;
let dernierePalette = 0;

/** Une rafale de palettes. `changements` = nombre de cases qui ont tourné. */
export function palettes(changements: number): void {
  const audio = assure();
  if (!audio || !actif || changements <= 0) return;

  const maintenant = audio.currentTime;
  if (maintenant - dernierePalette < ECART_MINIMAL) return;
  dernierePalette = maintenant;

  const combien = Math.min(2, Math.ceil(changements / 2));
  for (let i = 0; i < combien; i++) {
    palette(audio, maintenant + i * 0.012, 1 - i * 0.2);
  }
}

/** Le clic sur un pays : une touche de machine à écrire. */
export function clic(): void {
  const audio = assure();
  if (!audio || !actif || CLICS.length === 0) return;
  lancer(() =>
    jouer(audio, alea.pick(CLICS), {
      gain: alea.float(0.7, 0.9),
      hauteur: alea.float(0.95, 1.06),
      pan: alea.float(-0.2, 0.2),
      envoi: 0.08,
    }),
  );
}

/** L'interrupteur qu'on abaisse pour aller dormir. Un vrai relais. */
export function clunk(): void {
  const audio = assure();
  if (!audio || !actif) return;
  lancer(() => jouer(audio, 'clunk-1', { gain: 1, envoi: 0.22 }));
}

/**
 * Le balayage du zoom.
 *
 * L'échantillon est un moteur à régime constant : c'est l'accélération de la
 * lecture qui fabrique la montée. Un moteur qui prend de la vitesse, obtenu
 * depuis une vraie matière plutôt qu'un balayage de synthèse.
 */
export function balayage(duree = 1.2): void {
  const audio = assure();
  if (!audio || !actif) return;
  const t = audio.currentTime;
  const voix = jouer(audio, 'balayage', { gain: 0.0001, envoi: 0.25 });
  if (!voix) return;

  voix.source.playbackRate.setValueAtTime(0.62, t);
  voix.source.playbackRate.exponentialRampToValueAtTime(1.75, t + duree);

  // Le moteur monte en régime, puis se coupe net quand la carte se fige.
  voix.volume.gain.setValueAtTime(0.0001, t);
  voix.volume.gain.exponentialRampToValueAtTime(0.6, t + duree * 0.8);
  voix.volume.gain.exponentialRampToValueAtTime(0.0001, t + duree + 0.15);
  voix.source.stop(t + duree + 0.2);
}

/*
 * Les instants du scintillement, en fraction de sa durée.
 *
 * Ce sont EXACTEMENT les images de `ton-temps-scintille` dans la feuille de
 * style. Si tu retouches l'une, retouche l'autre : c'est la coïncidence des
 * deux qui fait passer le bug pour un vrai défaut de machine.
 */
const IMAGES_BUG = [0.09, 0.15, 0.24, 0.31, 0.43, 0.51, 0.63, 0.71, 0.84, 0.92];

/** La statique du scintillement. `retard` cale la rafale sur l'animation CSS. */
export function statique(retard: number, duree: number): void {
  const audio = assure();
  if (!audio || !actif || STATIQUES.length === 0) return;
  const base = audio.currentTime + retard;

  for (const image of IMAGES_BUG) {
    const voix = jouer(audio, alea.pick(STATIQUES), {
      quand: base + image * duree,
      gain: alea.float(0.35, 0.75),
      hauteur: alea.float(0.75, 1.5),
      pan: alea.float(-0.6, 0.6),
      envoi: 0.1,
    });
    // Des éclats courts : on coupe bien avant la fin de l'échantillon.
    voix?.source.stop(base + image * duree + alea.float(0.03, 0.09));
  }
}

/**
 * Une activité prise ou rendue.
 *
 * Le prix est encodé dans la hauteur de la frappe : une broutille claque haut
 * et sec, un tiers de vie tombe une octave plus bas et traîne. L'échelle est
 * logarithmique — sans ça, tout ce qui coûte peu sonnerait pareil.
 */
export function prise(fractionDuBudget: number): void {
  const audio = assure();
  if (!audio || !actif) return;
  const poids = Math.min(1, Math.max(0, fractionDuBudget) / 0.33);
  palette(audio, audio.currentTime, 1, 1.3 * 0.5 ** (poids * 1.25));
}

/** La cascade entre deux étapes du bilan, calée sur le décalage visuel. */
export function cascade(lignes: number): void {
  const audio = assure();
  if (!audio || !actif) return;
  const t = audio.currentTime;
  for (let i = 0; i < Math.min(8, lignes); i++) {
    palette(audio, t + i * 0.07, 0.8 - i * 0.06);
  }
}

/** La cloche, à l'entrée du bilan. Une vie qui se termine. */
export function cloche(): void {
  const audio = assure();
  if (!audio || !actif) return;
  jouer(audio, 'cloche', { gain: 0.85, envoi: 0.3 });
}

/**
 * Le bourdon du dernier écran, en boucle sans raccord.
 *
 * Rendu comme une fonction d'arrêt, à appeler au démontage — sinon il
 * continuerait après le départ du joueur.
 */
export function bourdon(): () => void {
  const audio = assure();
  if (!audio || !actif) return () => {};
  const tampon = tampons.get('bourdon');
  if (!tampon) return () => {};

  const t = audio.currentTime;
  const source = audio.createBufferSource();
  source.buffer = tampon;
  source.loop = true;

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.5, t + 2.5);

  source.connect(gain);
  if (maitre) gain.connect(maitre);
  source.start(t);

  return () => {
    const fin = audio.currentTime;
    gain.gain.cancelScheduledValues(fin);
    gain.gain.setValueAtTime(Math.max(0.0002, gain.gain.value), fin);
    gain.gain.exponentialRampToValueAtTime(0.0001, fin + 0.6);
    source.stop(fin + 0.7);
  };
}
