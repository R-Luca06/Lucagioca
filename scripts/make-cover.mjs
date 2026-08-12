/**
 * Fabrique l'image de couverture de « Ton temps ».
 *
 * On ne redessine rien : la carte vient de `map-paths.ts` et les couleurs de
 * `buckets.ts`, donc l'image ne peut pas diverger du jeu. Le rendu passe par
 * Chromium, ce qui donne accès à la vraie police du projet.
 *
 * Format 1200 × 630 : le standard Open Graph. La carte d'accueil la recadre en
 * 16/9, et le sujet est centré, donc le recadrage ne coupe rien d'important.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { byId, countries } from './src/projects/ton-temps/data/countries.ts';
import { shapes, viewBox } from './src/projects/ton-temps/data/map-paths.ts';

/*
 * On importe les deux modules de données — qui n'ont eux-mêmes aucun import,
 * donc Node les charge tels quels — mais pas `buckets.ts`, dont les imports
 * sans extension ne sont pas résolus hors de Vite.
 *
 * Le découpage est donc recopié ici. C'est la seule duplication du script :
 * trois lignes, et elle se lit depuis les mêmes chiffres, donc elle suit
 * automatiquement une mise à jour des données.
 */
const annees = countries.map((c) => c.years);
const PIRE = Math.min(...annees);
const BANDE = (Math.max(...annees) - PIRE) / 5;
const lifeBucket = (ans) => Math.min(4, Math.max(0, Math.floor((ans - PIRE) / BANDE)));

const RAMPE = ['#6b4a00', '#966800', '#c28800', '#e0a41a', '#ffc247'];
const TERRE_VIDE = '#191913';
const NUIT = '#0a0b09';

const police = readFileSync('./src/projects/ton-temps/assets/ibm-plex-mono-latin-600.woff2');

const chemins = shapes
  .map((forme) => {
    const pays = forme.id ? byId.get(forme.id) : undefined;
    const teinte = pays ? RAMPE[lifeBucket(pays.years)] : TERRE_VIDE;
    return `<path d="${forme.d}" fill="${teinte}" />`;
  })
  .join('');

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: "Plex";
    src: url(data:font/woff2;base64,${police.toString('base64')}) format("woff2");
    font-weight: 600;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: ${NUIT}; overflow: hidden; }
  .cadre { position: relative; width: 1200px; height: 630px; }

  /* La carte déborde volontairement : on veut les continents en grand,
     pas une mappemonde entière perdue au milieu du cadre. */
  svg {
    position: absolute;
    top: 50%; left: 50%;
    width: 128%;
    transform: translate(-50%, -46%);
  }

  /* Le voile doit protéger la lisibilité du titre SANS effacer la carte : elle
     est le sujet de l'image, pas une texture. D'où un assombrissement léger,
     complété par une ombre portée sur le texte lui-même — c'est elle qui fait
     le vrai travail au-dessus de l'Eurasie, la zone la plus claire. */
  .voile {
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 60% 42% at 50% 50%, rgba(10,11,9,0.55), rgba(10,11,9,0) 72%),
      linear-gradient(to bottom, rgba(10,11,9,0.35), rgba(10,11,9,0.05) 45%, rgba(10,11,9,0.5));
  }

  .titre {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 26px;
    font-family: "Plex", monospace;
    text-align: center;
  }
  .titre h1 {
    font-size: 168px;
    font-weight: 600;
    line-height: 0.92;
    letter-spacing: -0.055em;
    text-transform: uppercase;
    color: #ffffff;
    text-shadow:
      0 0 18px rgba(10, 11, 9, 0.95),
      0 0 60px rgba(10, 11, 9, 0.85),
      0 3px 6px rgba(10, 11, 9, 0.7);
  }
  .titre p {
    font-size: 23px;
    font-weight: 600;
    letter-spacing: 0.34em;
    text-transform: uppercase;
    color: #ffb000;
    text-shadow: 0 0 14px rgba(10, 11, 9, 0.95), 0 0 40px rgba(10, 11, 9, 0.9);
  }
</style>
<div class="cadre">
  <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${chemins}</svg>
  <div class="voile"></div>
  <div class="titre">
    <h1>Ton temps</h1>
    <p>Une vie, en heures</p>
  </div>
</div>`;

writeFileSync('.cover.html', html);

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`file://${process.cwd().replace(/\\/g, '/')}/.cover.html`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/og/ton-temps.png' });
await navigateur.close();

console.log('public/og/ton-temps.png écrit');
