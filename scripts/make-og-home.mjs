/**
 * L'image de partage de l'accueil.
 *
 * Elle ne redessine rien : le logo vient du même SVG que la page, et les trois
 * couleurs des mêmes jetons. Une carte de partage qui diverge de son site est
 * pire que pas de carte du tout.
 *
 *   node scripts/make-og-home.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PAPER = '#f2efe7';
const INK = '#1b1b18';

const logo = readFileSync('src/shared/assets/lucagioca.svg', 'utf8')
  .replace('fill="currentColor"', `fill="${INK}"`)
  .replace('var(--red, #E8412A)', '#e8412a');

/*
 * Pas de grain ici, contrairement à la page.
 *
 * Le bruit est incompressible : la même carte avec sa texture pesait 741 ko en
 * PNG, contre quelques dizaines sans. Or le grain est un effet de surface, qui
 * ne se lit qu'à taille réelle — sur une vignette de partage, il ne reste que
 * son coût.
 */

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.setContent(`<!doctype html>
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px;
    background: ${PAPER};
    color: ${INK};
    font-family: "Segoe UI", system-ui, sans-serif;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 96px;
    position: relative; overflow: hidden;
  }
  .marque { width: 380px; position: relative; }
  .marque svg { display: block; width: 100%; height: auto; }
  p {
    position: relative;
    margin-top: 56px;
    font-size: 30px;
    line-height: 1.4;
    color: ${INK}99;
    max-width: 24ch;
  }
</style>
<div class="marque">${logo}</div>
<p>Une collection de petites expériences interactives.</p>`);

// La police système doit être posée avant la capture, sinon le texte saute.
await page.evaluate(() => document.fonts.ready);

writeFileSync('public/og/accueil.png', await page.screenshot({ type: 'png' }));
await browser.close();

console.log(
  `accueil.png — 1200×630, ${(readFileSync('public/og/accueil.png').length / 1024).toFixed(0)} ko`,
);
