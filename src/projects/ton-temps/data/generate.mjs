/**
 * Génère les données du jeu depuis des sources publiques.
 *
 *   node src/projects/ton-temps/data/generate.mjs
 *
 * Produit deux fichiers, commités dans le dépôt :
 *   - countries.ts  : espérance de vie par pays (léger, part dans le bundle client)
 *   - map-paths.ts  : géométrie SVG (lourd, importé uniquement côté serveur)
 *
 * Le jeu ne fait AUCUN appel réseau à l'exécution : la règle « jouable même si
 * l'API est indisponible » est respectée par construction. Relancer ce script
 * est un geste manuel et volontaire, quand on veut rafraîchir les chiffres.
 *
 * Aucune dépendance : uniquement `fetch` et la lib standard de Node.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const SOURCES = {
  // Espérance de vie à la naissance, dernière année non vide par pays.
  lifeExpectancy:
    'https://api.worldbank.org/v2/country/all/indicator/SP.DYN.LE00.IN?format=json&mrnev=1&per_page=400',
  // Table ISO 3166 : [alpha2, alpha3, numérique, ...]. Le numérique est la clé
  // de jointure avec la carte, l'alpha3 celle de la Banque mondiale.
  isoCodes: 'https://cdn.jsdelivr.net/npm/i18n-iso-countries/codes.json',
  isoNamesFr: 'https://cdn.jsdelivr.net/npm/i18n-iso-countries/langs/fr.json',
  // Natural Earth 110m, domaine public.
  geometry: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
};

/*
 * Projection Equal Earth (Šavrič, Patterson & Jenny, 2018).
 *
 * Choix délibéré : c'est une projection ÉQUIVALENTE, les surfaces sont donc
 * exactes. Mercator rétrécit l'Afrique de moitié — sur un jeu dont le propos
 * est l'inégalité entre pays, ce serait un contresens graphique.
 */
const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;

function equalEarth(lon, lat) {
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const theta = Math.asin(M * Math.sin(phi));
  const t2 = theta * theta;
  const t6 = t2 * t2 * t2;
  const x = (lambda * Math.cos(theta)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  const y = theta * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [x, y];
}

/* --- Décodage TopoJSON (delta-encodé et quantifié) ------------------------ */

function decodeArcs(topology) {
  const [sx, sy] = topology.transform.scale;
  const [tx, ty] = topology.transform.translate;
  return topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
}

/** Un index négatif désigne l'arc ~i parcouru à l'envers. */
function arcPoints(arcs, index) {
  return index < 0 ? arcs[~index].slice().reverse() : arcs[index];
}

function ringPoints(arcs, ring) {
  const points = [];
  for (const index of ring) {
    const segment = arcPoints(arcs, index);
    // Le dernier point d'un arc est le premier du suivant : on ne le répète pas.
    points.push(...(points.length ? segment.slice(1) : segment));
  }
  return points;
}

/* --- Découpe à l'antiméridien --------------------------------------------- */

/*
 * Fidji et la Russie franchissent la ligne des 180°. Leur anneau saute alors
 * de +179 à -179, et le tracé se referme en traversant toute la carte : un
 * ruban horizontal de 1000 px de large en plein océan.
 *
 * On déroule d'abord les longitudes pour supprimer ces sauts, puis on découpe
 * l'anneau en bandes de 360° dont chacune est rognée à [-180, 180]. Le pays
 * ressort en deux morceaux, un à chaque bord — ce que fait toute vraie carte.
 */
function unwrapLongitudes(ring) {
  let offset = 0;
  return ring.map(([lon, lat], index) => {
    if (index > 0) {
      const delta = lon - ring[index - 1][0];
      if (delta > 180) offset -= 360;
      else if (delta < -180) offset += 360;
    }
    return [lon + offset, lat];
  });
}

/** Sutherland–Hodgman contre une verticale, en interpolant la latitude. */
function clipEdge(points, isInside, atX) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const previous = points[(i + points.length - 1) % points.length];
    const currentIn = isInside(current);
    const previousIn = isInside(previous);
    const crossing = () => {
      const t = (atX - previous[0]) / (current[0] - previous[0]);
      return [atX, previous[1] + t * (current[1] - previous[1])];
    };
    if (currentIn) {
      if (!previousIn) out.push(crossing());
      out.push(current);
    } else if (previousIn) {
      out.push(crossing());
    }
  }
  return out;
}

function splitAtAntimeridian(ring) {
  const unwrapped = unwrapLongitudes(ring);
  const lons = unwrapped.map(([lon]) => lon);
  const first = Math.floor((Math.min(...lons) + 180) / 360);
  const last = Math.floor((Math.max(...lons) + 180) / 360);

  const pieces = [];
  for (let band = first; band <= last; band++) {
    const shifted = unwrapped.map(([lon, lat]) => [lon - 360 * band, lat]);
    let clipped = clipEdge(shifted, (p) => p[0] >= -180, -180);
    if (clipped.length === 0) continue;
    clipped = clipEdge(clipped, (p) => p[0] <= 180, 180);
    if (clipped.length >= 3) pieces.push(clipped);
  }
  return pieces;
}

function polygonsOf(geometry) {
  if (geometry.type === 'Polygon') return [geometry.arcs];
  if (geometry.type === 'MultiPolygon') return geometry.arcs;
  return [];
}

/* --- Génération ----------------------------------------------------------- */

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
  return response.json();
}

function frenchName(entry) {
  // fr.json donne parfois plusieurs formes : ['Bolivie', 'État plurinational de…'].
  return Array.isArray(entry) ? entry[0] : entry;
}

async function main() {
  console.log('Téléchargement des sources…');
  const [lifeRaw, isoRaw, namesRaw, topology] = await Promise.all([
    getJson(SOURCES.lifeExpectancy),
    getJson(SOURCES.isoCodes),
    getJson(SOURCES.isoNamesFr),
    getJson(SOURCES.geometry),
  ]);

  // numérique ISO → alpha3, et alpha3 → nom français
  const numericToAlpha3 = new Map();
  const alpha3ToName = new Map();
  for (const [alpha2, alpha3, numeric] of isoRaw) {
    numericToAlpha3.set(String(Number(numeric)), alpha3);
    const name = frenchName(namesRaw.countries[alpha2]);
    if (name) alpha3ToName.set(alpha3, name);
  }

  // Espérance de vie par alpha3. Les agrégats (UE, monde, régions) ne sont pas
  // dans la table ISO et disparaissent donc naturellement — sauf « monde »,
  // qu'on garde exprès comme point de comparaison.
  const lifeByAlpha3 = new Map();
  let world = null;
  let latestYear = 0;
  for (const row of lifeRaw[1] ?? []) {
    if (row.value === null) continue;
    const code = row.countryiso3code;
    const record = { years: Math.round(row.value * 10) / 10, year: Number(row.date) };
    if (code === 'WLD') {
      world = record;
      continue;
    }
    if (!alpha3ToName.has(code)) continue;
    lifeByAlpha3.set(code, record);
    latestYear = Math.max(latestYear, record.year);
  }

  // Géométrie → chemins SVG projetés.
  const arcs = decodeArcs(topology);
  const shapes = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const geometry of topology.objects.countries.geometries) {
    // L'Antarctique n'a pas de population : hors sujet ici, et sa masse écrase
    // le bas de la carte. On l'écarte, la carte gagne en lisibilité et en poids.
    if (geometry.id === '010') continue;

    const alpha3 = numericToAlpha3.get(String(Number(geometry.id))) ?? null;
    const rings = [];

    for (const polygon of polygonsOf(geometry)) {
      for (const ring of polygon) {
        for (const piece of splitAtAntimeridian(ringPoints(arcs, ring))) {
          const projected = piece.map(([lon, lat]) => equalEarth(lon, lat));
          if (projected.length < 3) continue;
          for (const [x, y] of projected) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          rings.push(projected);
        }
      }
    }

    if (rings.length === 0) continue;
    shapes.push({
      id: alpha3,
      name: alpha3
        ? (alpha3ToName.get(alpha3) ?? geometry.properties.name)
        : geometry.properties.name,
      rings,
    });
  }

  // Mise à l'échelle dans un viewBox propre, y inversé (SVG descend, la Terre monte).
  const WIDTH = 1000;
  const scale = WIDTH / (maxX - minX);
  const HEIGHT = Math.round((maxY - minY) * scale);

  const toPath = (rings) =>
    rings
      .map((ring) => {
        const d = ring
          .map(([x, y], i) => {
            const px = ((x - minX) * scale).toFixed(1);
            const py = ((maxY - y) * scale).toFixed(1);
            return `${i === 0 ? 'M' : 'L'}${px} ${py}`;
          })
          .join('');
        return `${d}Z`;
      })
      .join('');

  const mapEntries = shapes
    .map((shape) => ({ id: shape.id, name: shape.name, d: toPath(shape.rings) }))
    .sort((a, b) => (a.id ?? 'zz').localeCompare(b.id ?? 'zz'));

  // Les pays sans espérance de vie connue restent affichés mais non cliquables :
  // les effacer donnerait une carte trouée et mensongère.
  const playable = mapEntries.filter((entry) => entry.id && lifeByAlpha3.has(entry.id));

  const countries = playable
    .map((entry) => {
      const record = lifeByAlpha3.get(entry.id);
      return { id: entry.id, name: entry.name, years: record.years, year: record.year };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  // La suppression est portée par le fichier généré lui-même, et non par
  // `biome.json` : ajouter un projet ne doit modifier aucun fichier central.
  const header = (
    extra,
  ) => `// biome-ignore-all format: fichier généré, la mise en forme vient du script
/*
 * FICHIER GÉNÉRÉ — ne pas éditer à la main.
 * Régénérer : node src/projects/ton-temps/data/generate.mjs
 *
 * Sources :
 *   · Espérance de vie à la naissance — Banque mondiale, SP.DYN.LE00.IN
 *   · Géométrie — Natural Earth 110m via world-atlas (domaine public)
 *   · Codes et noms ISO 3166 — i18n-iso-countries
${extra}
 */
`;

  writeFileSync(
    join(HERE, 'countries.ts'),
    `${header(` *
 * ${countries.length} pays, données ${latestYear}.`)}
export interface Country {
  /** Code ISO 3166-1 alpha-3. */
  id: string;
  name: string;
  /** Espérance de vie à la naissance, en années. */
  years: number;
  /** Année de la mesure — elle varie d'un pays à l'autre. */
  year: number;
}

export const countries: readonly Country[] = ${JSON.stringify(countries, null, 2)};

/** Moyenne mondiale, utilisée comme repère dans l'écran final. */
export const worldAverage = ${world ? world.years : 'null'};

export const dataYear = ${latestYear};

export const byId = new Map(countries.map((c) => [c.id, c]));
`,
    'utf8',
  );

  writeFileSync(
    join(HERE, 'map-paths.ts'),
    `${header(` *
 * Projection Equal Earth (équivalente : les surfaces sont exactes).
 * L'Antarctique est écarté — aucune population concernée.
 *
 * Ce fichier est volumineux et n'est importé QUE depuis WorldMap.astro,
 * donc rendu côté serveur : il ne pèse rien sur le budget JS client.`)}
export interface MapShape {
  /** Code ISO alpha-3, ou null pour les territoires sans code (jouables : non). */
  id: string | null;
  name: string;
  /** Attribut \`d\` du <path>, dans le viewBox ci-dessous. */
  d: string;
}

export const viewBox = '0 0 ${WIDTH} ${HEIGHT}';

export const shapes: readonly MapShape[] = ${JSON.stringify(mapEntries, null, 2)};
`,
    'utf8',
  );

  const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
  console.log(`\n✓ ${countries.length} pays jouables (données ${latestYear})`);
  console.log(`  ${mapEntries.length - playable.length} territoires affichés sans données`);
  console.log(`  moyenne mondiale : ${world ? `${world.years} ans` : 'indisponible'}`);
  console.log(
    `  carte : ${WIDTH}×${HEIGHT}, ${kb(mapEntries.reduce((n, e) => n + e.d.length, 0))} de chemins`,
  );
}

main().catch((error) => {
  console.error(`\n✗ Génération impossible : ${error.message}`);
  process.exit(1);
});
