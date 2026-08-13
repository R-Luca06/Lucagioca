/**
 * Réduit une couverture en vignette WebP.
 *
 * Pourquoi un script plutôt que la couverture affichée en petit : une image
 * Open Graph fait 1200 × 630 et pèse des centaines de kilo-octets. La montrer
 * au survol d'une ligne du sommaire, c'est faire payer au visiteur le prix
 * d'une image de partage pour une décoration. Ici, ~15 ko.
 *
 *   node scripts/make-thumb.mjs public/og/ton-temps.png public/og/ton-temps-thumb.webp
 *
 * Générique à dessein : chaque projet appelle le même script sur sa propre
 * image, sans qu'on ait à toucher quoi que ce soit de central.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { chromium } from '@playwright/test';

const [source, destination, largeurArg] = process.argv.slice(2);

if (!source || !destination) {
  console.error('usage : node scripts/make-thumb.mjs <source> <destination.webp> [largeur=480]');
  process.exit(1);
}

const LARGEUR = Number(largeurArg ?? 480);
const QUALITE = 0.82;

const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }[
  extname(source).toLowerCase()
];
if (!type) throw new Error(`format non géré : ${extname(source)}`);

// Passer l'image en data URI plutôt qu'en file:// : un canvas alimenté par un
// fichier local serait considéré comme contaminé, et `toDataURL` refuserait.
const entree = `data:${type};base64,${readFileSync(source).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();

const sortie = await page.evaluate(
  async ({ entree, largeur, qualite }) => {
    const img = new Image();
    img.src = entree;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = largeur;
    canvas.height = Math.round((largeur * img.naturalHeight) / img.naturalWidth);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('contexte 2d indisponible');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return {
      donnees: canvas.toDataURL('image/webp', qualite),
      largeur: canvas.width,
      hauteur: canvas.height,
    };
  },
  { entree, largeur: LARGEUR, qualite: QUALITE },
);

await browser.close();

if (!sortie.donnees.startsWith('data:image/webp')) {
  throw new Error('le navigateur n’a pas produit de WebP');
}

const octets = Buffer.from(sortie.donnees.split(',')[1], 'base64');
writeFileSync(destination, octets);

const avant = readFileSync(source).length;
console.log(
  `${basename(destination)} — ${sortie.largeur}×${sortie.hauteur}, ` +
    `${(octets.length / 1024).toFixed(1)} ko (contre ${(avant / 1024).toFixed(0)} ko)`,
);
