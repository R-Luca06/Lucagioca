// @ts-check
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  /*
   * L'adresse réelle du site. Elle sert aux URLs canoniques, aux images de
   * partage et au plan du site — tout ce qui doit être absolu.
   *
   * C'est l'adresse donnée par Cloudflare — un sous-domaine `workers.dev`, et
   * non `pages.dev` : les deux produits ont fusionné, et un site statique créé
   * aujourd'hui atterrit côté Workers.
   *
   * C'EST LE SEUL ENDROIT où l'adresse est écrite. `robots.txt` et le plan du
   * site la dérivent d'ici. Le jour où un vrai nom de domaine est acheté, cette
   * ligne suffit : ne jamais réintroduire une adresse en dur ailleurs.
   */
  site: 'https://lucagioca.escalade-motte-5u.workers.dev',

  integrations: [react(), sitemap()],

  build: {
    // Inline les toutes petites feuilles de style pour éviter un aller-retour réseau.
    inlineStylesheets: 'auto',
  },

  vite: {
    build: {
      assetsInlineLimit: 2048,
    },
  },
});
