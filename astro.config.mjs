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
   * C'est le sous-domaine offert par Cloudflare Pages. Le jour où un vrai nom
   * de domaine est acheté, cette ligne est la seule à changer : ne pas laisser
   * une adresse traîner en dur ailleurs.
   */
  site: 'https://lucagioca.pages.dev',

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
